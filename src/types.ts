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
