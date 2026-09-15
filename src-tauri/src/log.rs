use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub fn emit(app: &AppHandle, scope: &'static str, level: &str, message: impl AsRef<str>) {
    let payload = LogEvent {
        scope: scope.to_string(),
        level: level.to_string(),
        message: message.as_ref().to_string(),
    };
    let _ = app.emit("comfy://log", payload);
}

#[derive(Clone, Serialize)]
struct LogEvent {
    scope: String,
    level: String,
    message: String,
}