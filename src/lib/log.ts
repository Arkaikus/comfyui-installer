import { listen } from '@tauri-apps/api/event';

export type LogLevel = 'info' | 'warn' | 'err';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  message: string;
}

export const LOG_CAP = 400;

export function appendLog(buffer: LogEntry[], entry: LogEntry, cap = LOG_CAP): LogEntry[] {
  const next = [...buffer, entry];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

let buffer: LogEntry[] = [];
const listeners = new Set<(entry: LogEntry) => void>();

export function drainLogs(): LogEntry[] {
  return [...buffer];
}

export function pushLog(level: LogLevel, message: string): void {
  const entry: LogEntry = { ts: Date.now(), level, message };
  buffer = appendLog(buffer, entry);
  for (const cb of listeners) cb(entry);
}

export function onLog(cb: (entry: LogEntry) => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function initLogListener(): void {
  try {
    listen<{ level?: string; message?: string }>('comfy://log', (e) => {
      const level =
        e.payload?.level === 'warn' || e.payload?.level === 'err' ? e.payload.level : 'info';
      const message = e.payload?.message ?? '';
      if (message) pushLog(level, message);
    }).catch(() => {});
  } catch {
    // browser preview
  }
}
