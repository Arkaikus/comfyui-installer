import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { LogPanel } from '@/components/LogPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { InstallRequest, Status } from '@/types';

interface SetupProps {
  status: Status;
  busy: boolean;
  onInstall: (req: InstallRequest) => Promise<void>;
}

export function Setup({ status, busy, onInstall }: SetupProps) {
  const [installDir, setInstallDir] = useState(status.installDir);
  const [mode, setMode] = useState<InstallRequest['mode']>(status.existing ? 'use' : 'fresh');
  const [cpu, setCpu] = useState(false);
  const [key, setKey] = useState('');

  const submit = () => {
    void onInstall({
      installDir,
      mode: status.existing ? mode : 'fresh',
      cpu,
      openrouterApiKey: key,
    });
  };

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <header>
        <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">ComfyUI</p>
        <h1 className="text-lg font-medium">Install</h1>
        <p className="text-sm text-muted-foreground">
          {status.distroOk ? status.distro : `${status.distro} is not Arch/CachyOS`}
          {status.gpuName ? ` · ${status.gpuName}` : ' · no NVIDIA GPU'}
        </p>
      </header>

      <div className="space-y-3">
        <div className="block space-y-1">
          <span className="text-xs text-muted-foreground">Install path</span>
          <Input
            value={installDir}
            onChange={(e) => setInstallDir(e.target.value)}
            spellCheck={false}
          />
        </div>

        {status.existing ? (
          <fieldset className="flex flex-wrap gap-3 text-sm">
            {(['use', 'repair', 'wipe'] as const).map((m) => (
              <label key={m} className="flex items-center gap-1.5">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                {m}
              </label>
            ))}
          </fieldset>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cpu} onChange={(e) => setCpu(e.target.checked)} />
          CPU PyTorch (slow)
        </label>

        <div className="block space-y-1">
          <span className="text-xs text-muted-foreground">OpenRouter API key</span>
          <Input
            type="password"
            autoComplete="off"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="optional"
          />
        </div>

        <Button
          className="w-full"
          disabled={busy || !status.distroOk || !installDir.trim()}
          onClick={submit}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy
            ? 'Installing…'
            : status.existing && mode === 'use'
              ? 'Use this install'
              : 'Install'}
        </Button>
      </div>

      <LogPanel />
    </div>
  );
}
