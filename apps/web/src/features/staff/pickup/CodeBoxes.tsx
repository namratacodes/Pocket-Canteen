import '../staff.css';

interface Props {
  value: string;
  length?: number;
  shakeKey?: number; // change it to replay the shake
}

export function CodeBoxes({ value, length = 4, shakeKey = 0 }: Props) {
  return (
    <div
      key={shakeKey}
      className={`flex justify-center gap-3 ${shakeKey ? 'pc-shake' : ''}`}
      role="group"
      aria-label={`Pickup code, ${value.length} of ${length} digits entered`}
    >
      {Array.from({ length }, (_, i) => (
        <div
          key={i}
          data-testid="code-box"
          className={`flex h-16 w-14 items-center justify-center rounded-xl border-2 font-mono text-3xl font-bold ${
            i === value.length ? 'border-primary' : 'border-border'
          } bg-card`}
        >
          {value[i] ?? ''}
        </div>
      ))}
    </div>
  );
}