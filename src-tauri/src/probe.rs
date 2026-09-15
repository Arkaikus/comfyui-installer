use std::path::{Path, PathBuf};
use std::process::Command as StdCommand;

use serde::Serialize;

use crate::cuda;
use crate::persist::{self, SavedState};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub distro_ok: bool,
    pub distro: String,
    pub gpu_name: Option<String>,
    pub cuda: Option<String>,
    pub git: bool,
    pub uv: Option<String>,
    pub install_dir: String,
    pub install_ready: bool,
    pub existing: bool,
    pub running: bool,
    pub port: u16,
    pub has_openrouter_key: bool,
}

pub fn collect(saved: &SavedState, running: bool) -> Status {
    let (distro_ok, distro) = read_distro();
    let (gpu_name, cuda) = read_nvidia();
    let install_dir = PathBuf::from(&saved.install_dir);
    Status {
        distro_ok,
        distro,
        gpu_name,
        cuda,
        git: which::which("git").is_ok(),
        uv: find_uv().map(|p| p.display().to_string()),
        install_ready: persist::is_ready(&install_dir),
        existing: persist::exists_tree(&install_dir),
        running,
        port: saved.port,
        has_openrouter_key: !saved.openrouter_api_key.is_empty(),
        install_dir: saved.install_dir.clone(),
    }
}

pub fn find_uv() -> Option<PathBuf> {
    if let Ok(p) = which::which("uv") {
        return Some(p);
    }
    let home = dirs::home_dir()?;
    let local = home.join(".local").join("bin").join("uv");
    if local.is_file() {
        Some(local)
    } else {
        None
    }
}

fn read_distro() -> (bool, String) {
    let raw = std::fs::read_to_string("/etc/os-release").unwrap_or_default();
    let mut id = String::new();
    let mut like = String::new();
    for line in raw.lines() {
        if let Some(v) = line.strip_prefix("ID=") {
            id = v.trim_matches('"').to_string();
        }
        if let Some(v) = line.strip_prefix("ID_LIKE=") {
            like = v.trim_matches('"').to_string();
        }
    }
    let ok = id == "arch" || id == "cachyos" || like.split_whitespace().any(|s| s == "arch");
    let label = if id.is_empty() {
        "unknown".into()
    } else {
        id
    };
    (ok, label)
}

fn read_nvidia() -> (Option<String>, Option<String>) {
    let name = StdCommand::new("nvidia-smi")
        .args(["--query-gpu=name", "--format=csv,noheader"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if s.is_empty() { None } else { Some(s) }
        });
    let cuda = StdCommand::new("nvidia-smi")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| {
            let s = String::from_utf8_lossy(&o.stdout);
            cuda::parse_cuda_version(&s).map(|(maj, min)| format!("{maj}.{min}"))
        });
    (name, cuda)
}

pub fn port_open(port: u16) -> bool {
    std::net::TcpStream::connect(("127.0.0.1", port)).is_ok()
}

pub fn launch_script(install_dir: &Path) -> PathBuf {
    install_dir.join("comfyui-launch.sh")
}
