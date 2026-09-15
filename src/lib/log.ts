import { listen } from '@tauri-apps/api/event';
import type { LogScope } from '@/types';

export type LogLevel = 'info' | 'warn' | 'err';

export interface LogEntry {
  ts: number;
  level: LogLevel;
  scope: LogScope;
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

export function pushLog(level: LogLevel, message: string, scope: LogScope = 'app'): void {
  const entry: LogEntry = { ts: Date.now(), level, scope, message };
  buffer = appendLog(buffer, entry);
  for (const cb of listeners) cb(entry);
}

export function onLog(cb: (entry: LogEntry) => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function initLogListener(): void {
  try {
    listen<{ scope?: string; level?: string; message?: string }>('comfy://log', (e) => {
      const scope =
        e.payload?.scope === 'install' || e.payload?.scope === 'exec' ? e.payload.scope : 'app';
      const level =
        e.payload?.level === 'warn' || e.payload?.level === 'err' ? e.payload.level : 'info';
      const message = e.payload?.message ?? '';
      if (message) pushLog(level, message, scope);
    }).catch(() => {});
  } catch {
    // browser preview
  }
}
