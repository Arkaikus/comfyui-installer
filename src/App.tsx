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
import {
  type InstallPhase,
  initInstallPhaseListener,
  onInstallPhase,
  resetInstallPhase,
} from '@/lib/installPhase';
import { initLogListener, onError, pushLog } from '@/lib/log';
import { DEFAULT_STATUS, type Status } from '@/types';

initLogListener();
initInstallPhaseListener();

export function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [view, setView] = useState<'welcome' | 'comfy'>('welcome');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [phase, setPhase] = useState<InstallPhase | null>(null);

  const current = status ?? DEFAULT_STATUS;
  const checking = status === null && !error;

  const refresh = useCallback(async () => {
    const next = await fetchStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(String(err)));
  }, [refresh]);

  useEffect(() => onInstallPhase((p) => setPhase(p)), []);

  useEffect(
    () =>
      onError((msg) => {
        setBackendError(msg);
        setError(msg);
      }),
    [],
  );

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

  if (view === 'comfy') {
    return (
      <div className="relative h-full">
        <ComfyView
          status={current}
          onBack={() => setView('welcome')}
          onOpenSettings={() => setSettingsOpen(true)}
          onStop={async () => {
            await wrap(() => stopComfy());
            setView('welcome');
          }}
        />
        {settingsOpen ? (
          <SettingsOverlay
            status={current}
            saving={busy}
            onSaveKey={(key) =>
              wrap(
                () =>
                  saveSettings({
                    installDir: current.installDir,
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
        status={current}
        checking={checking}
        busy={busy}
        installing={installing}
        phase={phase}
        onInstall={() => {
          setInstalling(true);
          resetInstallPhase();
          void wrap(() =>
            installComfy({
              installDir: current.installDir,
              mode: current.existing ? 'repair' : 'fresh',
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
              installDir: current.installDir,
              mode: 'repair',
              cpu: false,
              openrouterApiKey: '',
            }),
          ).finally(() => setInstalling(false));
        }}
        onStart={async () => {
          try {
            if (!current.running) {
              await wrap(() => startComfy());
            }
            setView('comfy');
          } catch {
            // wrap surfaced the error
          }
        }}
      />
      {!busy && current.installReady && !current.running ? (
        <button
          className="absolute right-3 bottom-3 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur hover:bg-muted"
          onClick={() => void openUi()}
        >
          Open in browser
        </button>
      ) : null}
      {(error || backendError) && !busy ? (
        <div className="absolute bottom-3 left-3 right-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-card/90 px-3 py-2 text-xs text-destructive backdrop-blur">
          <span className="min-w-0 flex-1 break-words">{backendError ?? error}</span>
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setError(null);
              setBackendError(null);
            }}
          >
            ✕
          </button>
        </div>
      ) : null}
      {settingsOpen ? (
        <SettingsOverlay
          status={current}
          saving={busy}
          onSaveKey={(key) =>
            wrap(
              () =>
                saveSettings({
                  installDir: current.installDir,
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
