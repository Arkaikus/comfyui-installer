const APPIMAGE_ENV: &[&str] = &[
    "PYTHONHOME",
    "PYTHONPATH",
    "PYTHONEXECUTABLE",
    "PYTHONDONTWRITEBYTECODE",
    "LD_LIBRARY_PATH",
];

pub fn sanitize_std(cmd: &mut std::process::Command) {
    for k in APPIMAGE_ENV {
        cmd.env_remove(k);
    }
}

pub fn sanitize_tokio(cmd: &mut tokio::process::Command) {
    for k in APPIMAGE_ENV {
        cmd.env_remove(k);
    }
}
