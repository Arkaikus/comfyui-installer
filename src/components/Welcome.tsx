import { Loader2, Play, RotateCcw, Sparkles } from 'lucide-react';
import comfyLogo from '@/assets/comfy-logo.svg';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Status } from '@/types';

export type DotColor = 'red' | 'yellow' | 'green';

export function dotColor(status: Status, busy: boolean): DotColor {
  if (busy) return 'yellow';
  if (status.installReady) return 'green';
  return status.existing ? 'yellow' : 'red';
}

interface WelcomeProps {
  status: Status;
  busy: boolean;
  onInstall: () => void;
  onRepair: () => void;
  onStart: () => void;
}

const DOT: Record<DotColor, string> = {
  red: 'bg-destructive',
  yellow: 'bg-warning',
  green: 'bg-success',
};

const DOT_LABEL: Record<DotColor, string> = {
  red: 'not installed',
  yellow: 'progress…',
  green: 'ready',
};

export function Welcome({ status, busy, onInstall, onRepair, onStart }: WelcomeProps) {
  const dot = dotColor(status, busy);
  const canStart = status.installReady && !busy;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <span className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          ComfyUI Launcher
        </span>
        <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span className={cn('size-2 rounded-full', DOT[dot])} />
          {DOT_LABEL[dot]}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 p-8">
        <img
          src={comfyLogo}
          alt="ComfyUI"
          className="h-8"
          style={{ filter: 'saturate(0.8) brightness(1.4)' }}
        />

        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-muted-foreground">
            {status.gpuName ?? 'No NVIDIA GPU'}
            {status.cuda ? ` · CUDA ${status.cuda}` : ''}
          </p>
          <p className="max-w-md truncate font-mono text-xs text-muted-foreground">
            {status.installDir}
          </p>
          {!status.distroOk ? (
            <p className="text-xs font-medium text-destructive">
              {status.distro} is not Arch/CachyOS
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            className="h-10 w-56"
            disabled={busy}
            onClick={() => void onInstall()}
            title="Install or repair ComfyUI"
          >
            {busy && dot === 'yellow' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Install
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={busy || !status.existing}
              onClick={() => void onRepair()}
            >
              <RotateCcw className="size-3.5" />
              Repair
            </Button>
            <Button disabled={!canStart} onClick={() => void onStart()}>
              <Play className="size-3.5 fill-current" />
              Start
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
