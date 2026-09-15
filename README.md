# ComfyUI Launcher

Arch / CachyOS AppImage that installs and runs [ComfyUI](https://github.com/comfyanonymous/ComfyUI). No terminal.

## Use

1. Install `webkit2gtk-4.1` if needed: `sudo pacman -S webkit2gtk-4.1`
2. Download the AppImage from [Releases](https://github.com/Arkaikus/comfyui-installer/releases)
3. `chmod +x` and run it

Needs an NVIDIA driver. The launcher owns start / stop / open. It never calls system `python` — only `{install}/.venv/bin/python`.

First run clones ComfyUI, creates a Python 3.11 venv via [uv](https://docs.astral.sh/uv/), installs CUDA PyTorch, then ComfyUI-Manager plus OpenRouter nodes. After that it is a Start / Stop / Open UI panel.

Default install path: `~/ComfyUI`. Existing trees can be used, repaired, or wiped.

## Dev

```sh
bun install
bun run tauri dev
```

```sh
bun run lint
bun run typecheck
bun run test
cd src-tauri && cargo test
```
