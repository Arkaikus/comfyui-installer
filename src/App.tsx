import { useCallback, useEffect, useState } from 'react';
import { ComfyView } from '@/components/ComfyView';
import { SettingsOverlay } from '@/components/SettingsOverlay';
import { Welcome } from '@/components/Welcome';
import {
  status as fetchStatus,
  installComfy,
  openUi,
  saveSettings,
  startComfy,
  stopComfy,
} from '@/lib/api';
import { initLogListener, pushLog } from '@/lib/log';
import {
  initInstallPhaseListener,
  onInstallPhase,
  resetInstallPhase,
  type InstallPhase,
} from '@/lib/installPhase';
import type { Status } from '@/types';

initLogListener();
initInstallPhaseListener();

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'welcome' | 'comfy'>('welcome');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [phase, setPhase] = useState<InstallPhase | null>(null);

  const refresh = useCallback(async () => {
    const next = await fetchStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(String(err)));
  }, [refresh]);

  useEffect(() => onInstallPhase((p) => setPhase(p)), []);

  const wrap = async (fn: () => Promise<Status | undefined>, opts?: { silent?: boolean }) => {
    setBusy(true);
    if (!opts?.silent) setError(null);
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

  if (view === 'comfy') {
    return (
      <div className="relative h-full">
        <ComfyView
          status={status}
          onBack={() => setView('welcome')}
          onOpenSettings={() => setSettingsOpen(true)}
          onStop={async () => {
            await wrap(() => stopComfy());
            setView('welcome');
          }}
        />
        {settingsOpen ? (
          <SettingsOverlay
            status={status}
            saving={busy}
            onSaveKey={(key) =>
              wrap(
                () =>
                  saveSettings({
                    installDir: status.installDir,
                    openrouterApiKey: key,
                  }),
                { silent: true },
              ).then(() => setSettingsOpen(false))
            }
            onClose={() => setSettingsOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <Welcome
        status={status}
        busy={busy}
        installing={installing}
        phase={phase}
        onInstall={() => {
          setInstalling(true);
          resetInstallPhase();
          void wrap(() =>
            installComfy({
              installDir: status.installDir,
              mode: status.existing ? 'repair' : 'fresh',
              cpu: false,
              openrouterApiKey: '',
            }),
          ).finally(() => setInstalling(false));
        }}
        onRepair={() => {
          setInstalling(true);
          resetInstallPhase();
          void wrap(() =>
            installComfy({
              installDir: status.installDir,
              mode: 'repair',
              cpu: false,
              openrouterApiKey: '',
            }),
          ).finally(() => setInstalling(false));
        }}
        onStart={async () => {
          try {
            if (!status.running) {
              await wrap(() => startComfy());
            }
            setView('comfy');
          } catch {
            // wrap surfaced the error
          }
        }}
      />
      {!busy && status.installReady && !status.running ? (
        <button
          className="absolute right-3 bottom-3 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur hover:bg-muted"
          onClick={() => void openUi()}
        >
          Open in browser
        </button>
      ) : null}
      {error && !busy ? (
        <p className="absolute bottom-3 left-3 max-w-[70%] truncate text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {settingsOpen ? (
        <SettingsOverlay
          status={status}
          saving={busy}
          onSaveKey={(key) =>
            wrap(
              () =>
                saveSettings({
                  installDir: status.installDir,
                  openrouterApiKey: key,
                }),
              { silent: true },
            ).then(() => setSettingsOpen(false))
          }
          onClose={() => setSettingsOpen(false)}
        />
      ) : null}
    </div>
  );
}
