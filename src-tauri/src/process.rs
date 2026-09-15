use std::path::Path;
use std::process::Stdio;
use std::sync::Arc;

use tauri::AppHandle;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};

use crate::log;
use crate::persist::{self, SavedState};
use crate::Error;

pub struct Runtime {
    pub child: Mutex<Option<Child>>,
}

impl Runtime {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
        }
    }
}

pub async fn start(app: &AppHandle, runtime: &Runtime, saved: &SavedState) -> Result<(), Error> {
    let dir = Path::new(&saved.install_dir);
    if !persist::is_ready(dir) {
        return Err(Error::msg("ComfyUI is not installed yet"));
    }
    if crate::probe::port_open(saved.port) {
        log::emit(app, "exec", "info", format!("already running on :{}", saved.port));
        return Ok(());
    }

    let python = persist::python_bin(dir);
    let main = persist::main_py(dir);
    let mut cmd = Command::new(&python);
    cmd.arg(&main)
        .arg("--listen")
        .arg("127.0.0.1")
        .arg("--port")
        .arg(saved.port.to_string())
        .arg("--disable-auto-launch")
        .arg("--enable-cors-header")
        .current_dir(dir)
        .env("PYTHONUNBUFFERED", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(false);
    if !saved.openrouter_api_key.is_empty() {
        cmd.env("OPENROUTER_API_KEY", &saved.openrouter_api_key);
    }

    let mut child = cmd.spawn().map_err(|e| Error::msg(format!("spawn: {e}")))?;
    pipe_output(app.clone(), child.stdout.take(), "info");
    pipe_output(app.clone(), child.stderr.take(), "warn");

    let pid = child.id().unwrap_or(0);
    write_pid(dir, pid)?;
    *runtime.child.lock().await = Some(child);

    log::emit(
        app,
        "exec",
        "info",
        format!("started pid {pid} → http://127.0.0.1:{}", saved.port),
    );

    let deadline = tokio::time::Instant::now() + Duration::from_secs(120);
    while tokio::time::Instant::now() < deadline {
        if crate::probe::port_open(saved.port) {
            log::emit(app, "exec", "info", "ComfyUI is up");
            return Ok(());
        }
        if let Some(child) = runtime.child.lock().await.as_mut() {
            if let Ok(Some(status)) = child.try_wait() {
                return Err(Error::msg(format!("ComfyUI exited: {status}")));
            }
        }
        sleep(Duration::from_millis(400)).await;
    }
    Err(Error::msg(format!("timed out waiting for :{}", saved.port)))
}

pub async fn stop(app: &AppHandle, runtime: &Runtime, saved: &SavedState) -> Result<(), Error> {
    let dir = Path::new(&saved.install_dir);
    let mut slot = runtime.child.lock().await;
    if let Some(mut child) = slot.take() {
        let _ = child.start_kill();
        let _ = child.wait().await;
        log::emit(app, "exec", "info", "stopped");
    } else if let Some(pid) = read_pid(dir) {
        let _ = Command::new("kill").arg("-TERM").arg(pid.to_string()).status().await;
        log::emit(app, "exec", "info", format!("sent SIGTERM to {pid}"));
    }
    let _ = std::fs::remove_file(dir.join("comfyui.pid"));
    if crate::probe::port_open(saved.port) {
        let _ = Command::new("fuser")
            .arg("-k")
            .arg(format!("{}/tcp", saved.port))
            .status()
            .await;
    }
    Ok(())
}

pub fn running(runtime_has_child: bool, port: u16) -> bool {
    runtime_has_child || crate::probe::port_open(port)
}

fn write_pid(dir: &Path, pid: u32) -> Result<(), Error> {
    std::fs::write(dir.join("comfyui.pid"), pid.to_string())?;
    Ok(())
}

fn read_pid(dir: &Path) -> Option<u32> {
    std::fs::read_to_string(dir.join("comfyui.pid"))
        .ok()?
        .trim()
        .parse()
        .ok()
}

fn pipe_output<T>(app: AppHandle, pipe: Option<T>, level: &'static str)
where
    T: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    let Some(pipe) = pipe else {
        return;
    };
    let app = Arc::new(app);
    tokio::spawn(async move {
        let mut lines = BufReader::new(pipe).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            if !line.is_empty() {
                log::emit(app.as_ref(), "exec", level, line);
            }
        }
    });
}
