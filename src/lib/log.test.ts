import { describe, expect, it } from 'vitest';
import { appendLog, type LogEntry } from './log';

describe('appendLog', () => {
  it('caps the buffer', () => {
    const seed: LogEntry[] = [];
    let buf = seed;
    for (let i = 0; i < 5; i++) {
      buf = appendLog(buf, { ts: i, level: 'info', message: String(i) }, 3);
    }
    expect(buf.map((e) => e.message)).toEqual(['2', '3', '4']);
  });
});
