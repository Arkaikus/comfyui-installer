import { ArrowLeft, ChevronDown, GripHorizontal, RefreshCw, Settings, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LogPanel } from '@/components/LogPanel';
import type { LogScope, Status } from '@/types';

interface ComfyViewProps {
  status: Status;
  onBack: () => void;
  onOpenSettings: () => void;
  onStop: () => void;
}

const SCOPE_TABS: { id: LogScope | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'app', label: 'App' },
  { id: 'install', label: 'Install' },
  { id: 'exec', label: 'Exec' },
];

export function ComfyView({ status, onBack, onOpenSettings, onStop }: ComfyViewProps) {
  const [frameKey, setFrameKey] = useState(0);
  const [scope, setScope] = useState<LogScope | 'all'>('all');
  const [logOpen, setLogOpen] = useState(false);
  const url = `http://127.0.0.1:${status.port}`;

  useEffect(() => {
    const cancel = () => setLogOpen(false);
    return () => cancel();
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card/80 px-3 py-2 backdrop-blur">
        <button
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          onClick={onBack}
          title="Back to welcome"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {url}
        </span>
        <button
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings className="size-4" />
        </button>
        <button
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          onClick={() => setFrameKey((k) => k + 1)}
          title="Reload ComfyUI"
        >
          <RefreshCw className="size-4" />
        </button>
        <button
          className="flex size-8 items-center justify-center rounded-lg text-destructive hover:bg-muted"
          onClick={onStop}
          title="Stop ComfyUI"
        >
          <Square className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 bg-black">
        <iframe key={frameKey} src={url} title="ComfyUI" className="h-full w-full border-0" />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card/90 backdrop-blur">
        <button
          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/60"
          onClick={() => setLogOpen((o) => !o)}
        >
          <span className="text-muted-foreground/70">
            <GripHorizontal className="size-4" />
          </span>
          <span className="flex items-center gap-1 text-[10px] tracking-wider uppercase">Logs</span>
          <span className="flex-1" />
          <ChevronDown className={`size-3.5 transition-transform ${logOpen ? 'rotate-180' : ''}`} />
        </button>
        {logOpen ? (
          <div className="flex h-40 flex-col border-t border-border">
            <div className="flex gap-1 border-b border-border px-3 py-1">
              {SCOPE_TABS.map((t) => (
                <button
                  key={t.id}
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    scope === t.id
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/60'
                  }`}
                  onClick={() => setScope(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <LogPanel scope={scope} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
