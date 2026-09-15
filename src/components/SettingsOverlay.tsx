import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Status } from '@/types';

interface SettingsOverlayProps {
  status: Status;
  saving: boolean;
  onSaveKey: (key: string) => Promise<void>;
  onClose: () => void;
}

export function SettingsOverlay({ status, saving, onSaveKey, onClose }: SettingsOverlayProps) {
  const [key, setKey] = useState('');
  const submit = async () => {
    await onSaveKey(key);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <button
        className="absolute inset-0 w-full cursor-default bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close settings"
      />
      <div className="relative w-[min(92vw,26rem)] rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Settings</h2>
          <button
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/10"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Install path</span>
            <p className="truncate rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 font-mono text-xs">
              {status.installDir}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">OpenRouter API key</span>
            <Input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={status.hasOpenrouterKey ? 'saved · enter to replace' : 'optional'}
              className="border-white/15 bg-black/30"
            />
            <p className="text-[11px] leading-4 text-muted-foreground">
              Stored in {status.installDir}/.env (0600). Used by OpenRouter nodes installed via
              ComfyUI-Manager.
            </p>
          </div>

          <Button className="w-full" disabled={saving || !key.trim()} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save key
          </Button>
        </div>
      </div>
    </div>
  );
}
