import { listen } from '@tauri-apps/api/event';

export interface InstallPhase {
  phase: string;
  index: number;
  total: number;
}

export interface PhaseStep {
  id: string;
  label: string;
}

export const INSTALL_STEPS: PhaseStep[] = [
  { id: 'env', label: 'Checking environment' },
  { id: 'clone', label: 'Downloading ComfyUI' },
  { id: 'venv', label: 'Creating Python environment' },
  { id: 'deps', label: 'Installing dependencies' },
  { id: 'nodes', label: 'Installing extensions' },
  { id: 'launch', label: 'Verifying' },
];

let current: InstallPhase | null = null;
const listeners = new Set<(phase: InstallPhase | null) => void>();

export function getInstallPhase(): InstallPhase | null {
  return current;
}

export function onInstallPhase(cb: (phase: InstallPhase | null) => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function resetInstallPhase(): void {
  current = null;
  for (const cb of listeners) cb(current);
}

export function initInstallPhaseListener(): void {
  try {
    listen<InstallPhase>('comfy://install-phase', (e) => {
      current = e.payload ?? null;
      for (const cb of listeners) cb(current);
    }).catch(() => {});
  } catch {
    // browser preview
  }
}
