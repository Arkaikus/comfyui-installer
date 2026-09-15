import { Check } from 'lucide-react';
import type { PhaseStep } from '@/lib/installPhase';

const INK = '#211927';
const YELLOW = '#F2FF59';
const WHITE = '#F0EFED';
const GRAY = '#7E7C78';
const LINE = '#3C3C3C';

interface StepperProps {
  steps: PhaseStep[];
  current: number;
  complete: boolean;
}

export function Stepper({ steps, current, complete }: StepperProps) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const done = complete || i < current;
        const active = !complete && i === current;
        const last = i === steps.length - 1;
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold"
                style={{
                  borderColor: done || active ? YELLOW : LINE,
                  background: done ? YELLOW : 'transparent',
                  color: done ? INK : active ? YELLOW : GRAY,
                }}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
              </div>
              {!last ? (
                <div
                  className="mt-1 w-px flex-1"
                  style={{ background: done ? YELLOW : LINE }}
                />
              ) : null}
            </div>
            <div className="pb-4 pt-0.5">
              <span
                className="text-xs"
                style={{
                  color: active ? YELLOW : done ? WHITE : GRAY,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
