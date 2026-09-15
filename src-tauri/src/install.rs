use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::Stdio;

use serde::Deserialize;
use tauri::AppHandle;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

use crate::cuda;
use crate::log;
use crate::persist::{self, SavedState};
use crate::probe;
use crate::Error;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallRequest {
    pub install_dir: String,
    pub mode: String,
    pub cpu: bool,
    pub openrouter_api_key: String,
}

const COMFY: &str = "https://github.com/comfyanonymous/ComfyUI.git";
const NODES: &[(&str, &str)] = &[
    (
        "ComfyUI-Manager",
        "https://github.com/Comfy-Org/ComfyUI-Manager.git",
    ),
];
// Node dirs known to break startup (map None classes into NODE_CLASS_MAPPINGS,
// crashing server.py node_info). Pruned whenever the tree is touched.
const BROKEN_NODES: &[&str] = &["ComfyUI-OpenRouterImage"];

fn prune_broken_nodes(app: &AppHandle, dir: &Path) {
    let nodes = dir.join("custom_nodes");
    for name in BROKEN_NODES {
        let dest = nodes.join(name);
        if dest.exists() {
            log::emit(app, "install", "warn", format!("removing broken node {name}"));
            let _ = std::fs::remove_dir_all(&dest);
        }
    }
}

pub async fn run(app: &AppHandle, req: InstallRequest) -> Result<SavedState, Error> {
    let dir = PathBuf::from(req.install_dir.trim());
    if dir.as_os_str().is_empty() {
        return Err(Error::msg("install path is empty"));
    }

    let key = if req.openrouter_api_key.is_empty() {
        persist::load().openrouter_api_key
    } else {
        req.openrouter_api_key.clone()
    };
    let saved = SavedState {
        install_dir: dir.display().to_string(),
        openrouter_api_key: key,
        port: 8188,
    };
    persist::save(&saved)?;

    prune_broken_nodes(app, &dir);

    if req.mode == "use" && persist::is_ready(&dir) {
        log::emit(app, "install", "info", "using existing install");
        write_launchers(&dir, &saved)?;
        return Ok(saved);
    }

    ensure_tools(app).await?;

    if req.mode == "wipe" && dir.exists() {
        log::emit(app, "install", "warn", format!("wiping {}", dir.display()));
        std::fs::remove_dir_all(&dir)?;
    }

    if !persist::exists_tree(&dir) {
        if let Some(parent) = dir.parent() {
            std::fs::create_dir_all(parent)?;
        }
        log::emit(app, "install", "info", "cloning ComfyUI");
        run_cmd(
            app,
            "git",
            &[
                "clone",
                "--depth",
                "1",
                COMFY,
                dir.to_str().ok_or_else(|| Error::msg("path"))?,
            ],
            None,
        )
        .await?;
    } else if req.mode == "repair" {
        log::emit(app, "install", "info", "git pull");
        run_cmd(app, "git", &["-C", &saved.install_dir, "pull", "--ff-only"], None).await?;
    }

    let uv = probe::find_uv().ok_or_else(|| Error::msg("uv not found"))?;
    let uv_s = uv.to_str().ok_or_else(|| Error::msg("uv path"))?;
    let py = persist::python_bin(&dir);
    let py_s = py.to_str().ok_or_else(|| Error::msg("python path"))?;

    log::emit(app, "install", "info", "creating Python 3.11 venv");
    run_cmd(
        app,
        uv_s,
        &["venv", "--python", "3.11"],
        Some(&dir),
    )
    .await?;

    let smi = tokio::process::Command::new("nvidia-smi")
        .output()
        .await
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
        .unwrap_or_default();
    let (maj, min) = cuda::parse_cuda_version(&smi).unwrap_or((13, 0));
    let index = cuda::torch_index_url(maj, min, req.cpu);
    log::emit(app, "install", "info", format!("PyTorch index {index}"));
    install_torch(app, uv_s, py_s, index, &dir).await?;

    let reqs = dir.join("requirements.txt");
    if reqs.is_file() {
        log::emit(app, "install", "info", "installing ComfyUI requirements");
        let reqs_s = reqs.to_str().unwrap();
        run_cmd(
            app,
            uv_s,
            &["pip", "install", "--python", py_s, "-r", reqs_s],
            Some(&dir),
        )
        .await?;
        install_torch(app, uv_s, py_s, index, &dir).await?;
    }

    let nodes_dir = dir.join("custom_nodes");
    std::fs::create_dir_all(&nodes_dir)?;
    for (name, url) in NODES {
        let dest = nodes_dir.join(name);
        if dest.exists() {
            if req.mode == "repair" {
                log::emit(app, "install", "info", format!("updating {name}"));
                run_cmd(
                    app,
                    "git",
                    &["-C", dest.to_str().unwrap(), "pull", "--ff-only"],
                    None,
                )
                .await?;
            }
        } else {
            log::emit(app, "install", "info", format!("cloning {name}"));
            run_cmd(
                app,
                "git",
                &["clone", "--depth", "1", url, dest.to_str().unwrap()],
                None,
            )
            .await?;
        }
        let node_req = dest.join("requirements.txt");
        if node_req.is_file() {
            log::emit(app, "install", "info", format!("pip {name}"));
            run_cmd(
                app,
                uv_s,
                &[
                    "pip",
                    "install",
                    "--python",
                    py_s,
                    "-r",
                    node_req.to_str().unwrap(),
                ],
                Some(&dir),
            )
            .await?;
        }
    }

    write_launchers(&dir, &saved)?;
    log::emit(app, "install", "info", "smoke import");
    run_cmd(app, py_s, &["-c", "import comfy.utils"], Some(&dir)).await?;
    log::emit(app, "install", "info", "install complete");
    Ok(saved)
}

async fn install_torch(
    app: &AppHandle,
    uv: &str,
    py: &str,
    index: &str,
    dir: &Path,
) -> Result<(), Error> {
    run_cmd(
        app,
        uv,
        &[
            "pip",
            "install",
            "--python",
            py,
            "torch>=2.7",
            "torchvision",
            "torchaudio",
            "--index-url",
            index,
        ],
        Some(dir),
    )
    .await
}

fn write_launchers(dir: &Path, saved: &SavedState) -> Result<(), Error> {
    persist::write_env_file(dir, &saved.openrouter_api_key)?;
    let script = probe::launch_script(dir);
    let body = format!(
        "#!/bin/sh\nDIR=\"{dir}\"\nset -a\n[ -f \"$DIR/.env\" ] && . \"$DIR/.env\"\nset +a\nexec \"$DIR/.venv/bin/python\" \"$DIR/main.py\" --listen 127.0.0.1 --port {port} --disable-auto-launch --enable-cors-header\n",
        dir = dir.display(),
        port = saved.port
    );
    std::fs::write(&script, body)?;
    let mut perms = std::fs::metadata(&script)?.permissions();
    perms.set_mode(0o755);
    std::fs::set_permissions(&script, perms)?;

    if let Some(apps) = dirs::data_local_dir().map(|d| d.join("applications")) {
        std::fs::create_dir_all(&apps)?;
        let desktop = apps.join("comfyui.desktop");
        let text = format!(
            "[Desktop Entry]\nType=Application\nName=ComfyUI\nComment=Launch ComfyUI\nExec={}\nTerminal=false\nCategories=Graphics;\n",
            script.display()
        );
        std::fs::write(desktop, text)?;
    }
    Ok(())
}

async fn ensure_tools(app: &AppHandle) -> Result<(), Error> {
    let mut pkgs: Vec<&str> = Vec::new();
    if which::which("git").is_err() {
        pkgs.push("git");
    }
    if probe::find_uv().is_none() {
        pkgs.push("uv");
    }
    if pkgs.is_empty() {
        return Ok(());
    }
    log::emit(app, "install", "info", format!("installing {}", pkgs.join(" ")));
    let mut args = vec!["/usr/bin/pacman", "-S", "--noconfirm", "--needed"];
    args.extend(pkgs);
    let status = Command::new("pkexec")
        .args(&args)
        .status()
        .await
        .map_err(|e| Error::msg(format!("pkexec: {e}")))?;
    if !status.success() {
        return Err(Error::msg(
            "could not install git/uv via pacman (pkexec cancelled or failed)",
        ));
    }
    Ok(())
}

async fn run_cmd(
    app: &AppHandle,
    program: &str,
    args: &[&str],
    cwd: Option<&Path>,
) -> Result<(), Error> {
    let mut cmd = Command::new(program);
    cmd.args(args).stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    let mut child = cmd
        .spawn()
        .map_err(|e| Error::msg(format!("{program}: {e}")))?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let app_out = app.clone();
    let app_err = app.clone();
    let t1 = tokio::spawn(async move { drain(app_out, stdout, "info").await });
    let t2 = tokio::spawn(async move { drain(app_err, stderr, "warn").await });
    let status = child
        .wait()
        .await
        .map_err(|e| Error::msg(format!("{program} wait: {e}")))?;
    let _ = t1.await;
    let _ = t2.await;
    if !status.success() {
        return Err(Error::msg(format!(
            "{program} {} failed ({status})",
            args.join(" ")
        )));
    }
    Ok(())
}

async fn drain<T>(app: AppHandle, pipe: Option<T>, level: &'static str)
where
    T: tokio::io::AsyncRead + Unpin,
{
    let Some(pipe) = pipe else {
        return;
    };
    let mut lines = BufReader::new(pipe).lines();
    while let Ok(Some(line)) = lines.next_line().await {
        if !line.is_empty() {
            log::emit(&app, "install", level, line);
        }
    }
}
