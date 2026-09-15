import { useEffect, useRef, useState } from 'react';
import { appendLog, drainLogs, type LogEntry, type LogLevel, onLog } from '@/lib/log';
import type { LogScope } from '@/types';

const LEVEL: Record<LogLevel, string> = {
  info: 'text-muted-foreground',
  warn: 'text-warning',
  err: 'text-destructive',
};

export function LogPanel({ scope = 'all' }: { scope?: LogScope | 'all' }) {
  const [logs, setLogs] = useState<LogEntry[]>(drainLogs);
  const end = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onLog((entry) => {
        setLogs((prev) => appendLog(prev, entry));
      }),
    [],
  );

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [logs, scope]);

  const visible = scope === 'all' ? logs : logs.filter((e) => e.scope === scope);

  return (
    <div className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-xs leading-5">
      {visible.length === 0 ? (
        <p className="text-muted-foreground">No output yet.</p>
      ) : (
        visible.map((e, i) => (
          <div key={`${e.ts}-${i}`} className={LEVEL[e.level]}>
            <span className="mr-2 text-muted-foreground/50">[{e.scope}]</span>
            {e.message}
          </div>
        ))
      )}
      <div ref={end} />
    </div>
  );
}
