use std::fs;
use std::io::Write;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::Error;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedState {
    pub install_dir: String,
    #[serde(default)]
    pub openrouter_api_key: String,
    #[serde(default = "default_port")]
    pub port: u16,
}

fn default_port() -> u16 {
    8188
}

impl Default for SavedState {
    fn default() -> Self {
        Self {
            install_dir: default_install_dir().display().to_string(),
            openrouter_api_key: String::new(),
            port: default_port(),
        }
    }
}

pub fn default_install_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/tmp"))
        .join("ComfyUI")
}

pub fn config_path() -> Result<PathBuf, Error> {
    let dir = dirs::config_dir()
        .ok_or_else(|| Error::msg("no config dir"))?
        .join("comfyui-installer");
    Ok(dir.join("state.json"))
}

pub fn load() -> SavedState {
    let path = match config_path() {
        Ok(p) => p,
        Err(_) => return SavedState::default(),
    };
    fs::read_to_string(&path)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

pub fn save(state: &SavedState) -> Result<(), Error> {
    let path = config_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let raw = serde_json::to_string_pretty(state).map_err(|e| Error::msg(e.to_string()))?;
    let mut file = fs::File::create(&path)?;
    file.write_all(raw.as_bytes())?;
    let mut perms = file.metadata()?.permissions();
    perms.set_mode(0o600);
    file.set_permissions(perms)?;
    Ok(())
}

pub fn write_env_file(install_dir: &Path, key: &str) -> Result<(), Error> {
    let path = install_dir.join(".env");
    if key.is_empty() {
        if path.exists() {
            fs::remove_file(path)?;
        }
        return Ok(());
    }
    let mut file = fs::File::create(&path)?;
    writeln!(file, "OPENROUTER_API_KEY={key}")?;
    let mut perms = file.metadata()?.permissions();
    perms.set_mode(0o600);
    file.set_permissions(perms)?;
    Ok(())
}

pub fn python_bin(install_dir: &Path) -> PathBuf {
    install_dir.join(".venv").join("bin").join("python")
}

pub fn main_py(install_dir: &Path) -> PathBuf {
    install_dir.join("main.py")
}

pub fn is_ready(install_dir: &Path) -> bool {
    python_bin(install_dir).is_file() && main_py(install_dir).is_file()
}

pub fn exists_tree(install_dir: &Path) -> bool {
    main_py(install_dir).is_file()
}
