import { ExternalLink, Loader2, Play, Square } from 'lucide-react';
import { useState } from 'react';
import { LogPanel } from '@/components/LogPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pushLog } from '@/lib/log';
import type { Status } from '@/types';

interface HomeProps {
  status: Status;
  busy: boolean;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onOpen: () => Promise<void>;
  onRepair: () => Promise<void>;
  onSaveKey: (key: string) => Promise<void>;
}

export function Home({ status, busy, onStart, onStop, onOpen, onRepair, onSaveKey }: HomeProps) {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);

  const saveKey = async () => {
    setSaving(true);
    try {
      await onSaveKey(key);
      setKey('');
    } catch (err) {
      pushLog('err', String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">ComfyUI</p>
          <h1 className="text-lg font-medium">{status.running ? 'Running' : 'Stopped'}</h1>
          <p className="text-sm text-muted-foreground">
            {status.gpuName ?? 'No NVIDIA GPU'}
            {status.cuda ? ` · CUDA ${status.cuda}` : ''}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{status.installDir}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {status.running ? (
            <Button variant="danger" disabled={busy} onClick={() => void onStop()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-3.5" />}
              Stop
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => void onStart()}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
              Start
            </Button>
          )}
          <Button
            variant="outline"
            disabled={!status.running || busy}
            onClick={() => void onOpen()}
          >
            <ExternalLink className="size-3.5" />
            Open UI
          </Button>
        </div>
      </header>

      <LogPanel />

      <footer className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">OpenRouter key</span>
          <Input
            type="password"
            autoComplete="off"
            placeholder={status.hasOpenrouterKey ? 'saved · enter to replace' : 'optional'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving || !key.trim()} onClick={() => void saveKey()}>
            Save key
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => void onRepair()}>
            Repair
          </Button>
        </div>
      </footer>
    </div>
  );
}
