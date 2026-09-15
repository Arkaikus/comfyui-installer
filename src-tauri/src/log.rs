use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub fn emit(app: &AppHandle, level: &str, message: impl AsRef<str>) {
    let payload = LogEvent {
        level: level.to_string(),
        message: message.as_ref().to_string(),
    };
    let _ = app.emit("comfy://log", payload);
}

#[derive(Clone, Serialize)]
struct LogEvent {
    level: String,
    message: String,
}
