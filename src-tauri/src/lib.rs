mod cuda;
mod env;
mod install;
mod log;
mod persist;
mod probe;
mod process;

use std::sync::Mutex;

use persist::SavedState;
use process::Runtime;
use serde::Deserialize;
use tauri::{AppHandle, State};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0}")]
    Msg(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
}

impl Error {
    pub fn msg(msg: impl Into<String>) -> Self {
        Self::Msg(msg.into())
    }
}

pub struct AppState {
    saved: Mutex<SavedState>,
    runtime: Runtime,
}

impl AppState {
    fn new() -> Self {
        Self {
            saved: Mutex::new(persist::load()),
            runtime: Runtime::new(),
        }
    }
}

fn snapshot(state: &AppState) -> probe::Status {
    let saved = lock_saved(state);
    let has_child = state
        .runtime
        .child
        .try_lock()
        .map(|g| g.is_some())
        .unwrap_or(true);
    let running = process::running(has_child, saved.port);
    probe::collect(&saved, running)
}

fn lock_saved(state: &AppState) -> SavedState {
    state
        .saved
        .lock()
        .map(|g| g.clone())
        .unwrap_or_else(|p| (*p.into_inner()).clone())
}

fn emit_err(app: &AppHandle, msg: impl Into<String>) -> String {
    let msg = msg.into();
    log::error(app, &msg);
    msg
}

#[tauri::command]
fn status(state: State<AppState>) -> probe::Status {
    snapshot(&state)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    install_dir: String,
    openrouter_api_key: String,
}

#[tauri::command]
fn save_settings(
    app: AppHandle,
    state: State<AppState>,
    settings: Settings,
) -> Result<probe::Status, String> {
    let mut saved = lock_saved(&state);
    saved.install_dir = settings.install_dir;
    saved.openrouter_api_key = settings.openrouter_api_key;
    persist::save(&saved).map_err(|e| emit_err(&app, e.to_string()))?;
    let dir = std::path::Path::new(&saved.install_dir);
    if dir.is_dir() {
        persist::write_env_file(dir, &saved.openrouter_api_key).map_err(|e| emit_err(&app, e.to_string()))?;
    }
    drop(saved);
    Ok(snapshot(&state))
}

#[tauri::command]
async fn install_comfy(
    app: AppHandle,
    state: State<'_, AppState>,
    request: install::InstallRequest,
) -> Result<probe::Status, String> {
    let saved = install::run(&app, request)
        .await
        .map_err(|e| emit_err(&app, e.to_string()))?;
    *state.saved.lock().unwrap_or_else(|p| p.into_inner()) = saved;
    Ok(snapshot(&state))
}

#[tauri::command]
async fn start_comfy(app: AppHandle, state: State<'_, AppState>) -> Result<probe::Status, String> {
    let saved = lock_saved(&state);
    process::start(&app, &state.runtime, &saved)
        .await
        .map_err(|e| emit_err(&app, e.to_string()))?;
    Ok(snapshot(&state))
}

#[tauri::command]
async fn stop_comfy(app: AppHandle, state: State<'_, AppState>) -> Result<probe::Status, String> {
    let saved = lock_saved(&state);
    process::stop(&app, &state.runtime, &saved)
        .await
        .map_err(|e| emit_err(&app, e.to_string()))?;
    Ok(snapshot(&state))
}

#[tauri::command]
fn open_ui(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let port = state
        .saved
        .lock()
        .map(|g| g.port)
        .unwrap_or_else(|p| p.into_inner().port);
    app.opener()
        .open_url(format!("http://127.0.0.1:{port}"), None::<String>)
        .map_err(|e| emit_err(&app, e.to_string()))
}

#[tauri::command]
fn report(app: AppHandle, message: String) {
    eprintln!("[webview] {message}");
    log::emit(&app, "app", "warn", message);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default();

    #[cfg(feature = "webdriver")]
    {
        builder = builder.plugin(tauri_plugin_wdio_webdriver::init());
    }

    builder
        .on_page_load(|_webview, payload| {
            eprintln!("[webview] page load: {}", payload.url());
        })
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            status,
            save_settings,
            install_comfy,
            start_comfy,
            stop_comfy,
            open_ui,
            report,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
