import { useEffect, useRef, useState } from 'react';
import { appendLog, drainLogs, type LogEntry, type LogLevel, onLog } from '@/lib/log';

const LEVEL: Record<LogLevel, string> = {
  info: 'text-muted-foreground',
  warn: 'text-warning',
  err: 'text-destructive',
};

export function LogPanel() {
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
  }, [logs]);

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card p-2 font-mono text-xs leading-5">
      {logs.length === 0 ? (
        <p className="text-muted-foreground">No output yet.</p>
      ) : (
        logs.map((e, i) => (
          <div key={`${e.ts}-${i}`} className={LEVEL[e.level]}>
            {e.message}
          </div>
        ))
      )}
      <div ref={end} />
    </div>
  );
}
