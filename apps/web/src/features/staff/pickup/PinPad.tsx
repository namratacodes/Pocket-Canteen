import { Delete } from 'lucide-react';

interface Props {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const keyCls =
  'h-[72px] w-full rounded-xl bg-muted text-2xl font-semibold text-foreground transition active:scale-95 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:pointer-events-none';

export function PinPad({ onDigit, onBackspace, onClear, disabled }: Props) {
  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button key={k} type="button" className={keyCls} disabled={disabled} onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      <button type="button" className={keyCls} disabled={disabled} onClick={onBackspace} aria-label="Backspace">
        <Delete className="mx-auto h-6 w-6" aria-hidden />
      </button>
      <button type="button" className={keyCls} disabled={disabled} onClick={() => onDigit('0')}>
        0
      </button>
      <button type="button" className={`${keyCls} text-base`} disabled={disabled} onClick={onClear}>
        Clr
      </button>
    </div>
  );
}