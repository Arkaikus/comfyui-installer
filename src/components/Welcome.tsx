import { ExternalLink, Loader2, Play, RotateCcw, Sparkles } from 'lucide-react';
import { ComfyWordmark } from '@/components/ComfyWordmark';
import { Stepper } from '@/components/Stepper';
import { Button } from '@/components/ui/button';
import { INSTALL_STEPS, type InstallPhase } from '@/lib/installPhase';
import { cn } from '@/lib/utils';
import type { Status } from '@/types';

const INK = '#211927';
const YELLOW = '#F2FF59';
const WHITE = '#F0EFED';
const GRAY = '#7E7C78';
const LINE = '#3C3C3C';

export type DotColor = 'red' | 'yellow' | 'green';

export function dotColor(status: Status, busy: boolean): DotColor {
  if (busy) return 'yellow';
  if (status.installReady) return 'green';
  return status.existing ? 'yellow' : 'red';
}

interface WelcomeProps {
  status: Status;
  busy: boolean;
  installing: boolean;
  phase: InstallPhase | null;
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

export function Welcome({
  status,
  busy,
  installing,
  phase,
  onInstall,
  onRepair,
  onStart,
}: WelcomeProps) {
  const dot = dotColor(status, busy);
  const canStart = status.installReady && !busy;
  const current = phase ? phase.index : -1;
  const complete = installing && phase ? phase.index >= phase.total - 1 : false;

  return (
    <div className="flex h-full flex-col" style={{ background: INK, color: WHITE }}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 p-8">
        <div className="flex items-center justify-center gap-2" style={{ color: WHITE }}>
          <span className="text-xl font-bold italic tracking-tight">Unofficial</span>
          <ComfyWordmark className="h-8 w-auto" />
          <span className="text-xl font-bold italic tracking-tight">launcher</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-muted-foreground" style={{ color: GRAY }}>
            {status.gpuName ?? 'No NVIDIA GPU'}
            {status.cuda ? ` · CUDA ${status.cuda}` : ''}
          </p>
          <p className="max-w-md truncate font-mono text-xs" style={{ color: GRAY }}>
            {status.installDir}
          </p>
          <p className="flex items-center gap-2 font-mono text-xs" style={{ color: GRAY }}>
            <span className={cn('size-2 rounded-full', DOT[dot])} />
            {DOT_LABEL[dot]}
          </p>
          {!status.distroOk ? (
            <p className="text-xs font-medium text-destructive">
              {status.distro} is not Arch/CachyOS
            </p>
          ) : null}
        </div>

        {installing ? (
          <div className="w-56">
            <Stepper steps={INSTALL_STEPS} current={current} complete={complete} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              className="h-10"
              disabled={busy}
              onClick={() => void onInstall()}
              title="Install or repair ComfyUI"
              style={{ background: YELLOW, color: INK }}
            >
              {busy && dot === 'yellow' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Install
            </Button>
            <Button
              variant="outline"
              className="h-10"
              disabled={busy || !status.existing}
              onClick={() => void onRepair()}
              style={{ borderColor: LINE, color: WHITE }}
            >
              <RotateCcw className="size-3.5" />
              Repair
            </Button>
            <Button
              className="h-10"
              disabled={!canStart}
              onClick={() => void onStart()}
              style={{ borderColor: YELLOW, color: YELLOW }}
            >
              {status.running ? (
                <ExternalLink className="size-3.5" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
              {status.running ? 'Open' : 'Start'}
            </Button>
          </div>
        )}
      </div>

      <footer
        className="border-t px-5 py-2 text-center text-[10px] leading-relaxed"
        style={{ borderColor: LINE, color: GRAY }}
      >
        Independent launcher. Not affiliated with, endorsed by, or sponsored by Comfy Org. ComfyUI
        is a trademark of Comfy Org.
      </footer>
    </div>
  );
}
