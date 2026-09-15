import { useCallback, useEffect, useState } from 'react';
import { Home } from '@/components/Home';
import { Setup } from '@/components/Setup';
import {
  status as fetchStatus,
  installComfy,
  openUi,
  saveSettings,
  startComfy,
  stopComfy,
} from '@/lib/api';
import { initLogListener, pushLog } from '@/lib/log';
import type { InstallRequest, Status } from '@/types';

initLogListener();

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const next = await fetchStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(String(err)));
  }, [refresh]);

  const wrap = async (fn: () => Promise<Status | undefined>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await fn();
      if (next) setStatus(next);
      else await refresh();
    } catch (err) {
      const msg = String(err);
      setError(msg);
      pushLog('err', msg);
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {error ?? 'Loading…'}
      </div>
    );
  }

  if (!status.installReady) {
    return (
      <Setup
        status={status}
        busy={busy}
        onInstall={(req: InstallRequest) => wrap(() => installComfy(req))}
      />
    );
  }

  return (
    <>
      {error ? <p className="px-5 pt-3 text-sm text-destructive">{error}</p> : null}
      <Home
        status={status}
        busy={busy}
        onStart={() => wrap(() => startComfy())}
        onStop={() => wrap(() => stopComfy())}
        onOpen={() =>
          wrap(async () => {
            await openUi();
            return undefined;
          })
        }
        onRepair={() =>
          wrap(() =>
            installComfy({
              installDir: status.installDir,
              mode: 'repair',
              cpu: false,
              openrouterApiKey: '',
            }),
          )
        }
        onSaveKey={(openrouterApiKey) =>
          wrap(() =>
            saveSettings({
              installDir: status.installDir,
              openrouterApiKey,
            }),
          )
        }
      />
    </>
  );
}
