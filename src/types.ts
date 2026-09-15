export interface Status {
  distroOk: boolean;
  distro: string;
  gpuName: string | null;
  cuda: string | null;
  git: boolean;
  uv: string | null;
  installDir: string;
  installReady: boolean;
  existing: boolean;
  running: boolean;
  port: number;
  hasOpenrouterKey: boolean;
}

export const DEFAULT_STATUS: Status = {
  distroOk: true,
  distro: 'unknown',
  gpuName: null,
  cuda: null,
  git: false,
  uv: null,
  installDir: '',
  installReady: false,
  existing: false,
  running: false,
  port: 8188,
  hasOpenrouterKey: false,
};

export interface InstallRequest {
  installDir: string;
  mode: 'use' | 'repair' | 'wipe' | 'fresh';
  cpu: boolean;
  openrouterApiKey: string;
}

export interface Settings {
  installDir: string;
  openrouterApiKey: string;
}

export type LogScope = 'app' | 'install' | 'exec';
