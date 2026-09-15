import { invoke } from '@tauri-apps/api/core';
import type { InstallRequest, Settings, Status } from '@/types';

export function status(): Promise<Status> {
  return invoke('status');
}

export function saveSettings(settings: Settings): Promise<Status> {
  return invoke('save_settings', { settings });
}

export function installComfy(request: InstallRequest): Promise<Status> {
  return invoke('install_comfy', { request });
}

export function startComfy(): Promise<Status> {
  return invoke('start_comfy');
}

export function stopComfy(): Promise<Status> {
  return invoke('stop_comfy');
}

export function openUi(): Promise<void> {
  return invoke('open_ui');
}
