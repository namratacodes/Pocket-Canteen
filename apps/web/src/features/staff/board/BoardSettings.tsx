import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { playDing } from '@/lib/audio/audioService';
import { useKitchenPrefs } from '@/stores/kitchenPrefsStore';

const SCALES = [0.9, 1, 1.15, 1.3];

export function BoardSettings() {
  const [open, setOpen] = useState(false);
  const p = useKitchenPrefs();
  return (
    <div className="relative">
      <button type="button" aria-label="Board settings" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted">
        <Settings className="h-5 w-5" aria-hidden />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 space-y-4 rounded-xl border border-border bg-card p-4 shadow-xl" role="dialog" aria-label="Board settings">
            <label className="flex items-center justify-between">
              <span>Sound</span>
              <Switch checked={p.soundOn} onCheckedChange={(v) => p.set({ soundOn: v })} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm">Volume</span>
              <input
                type="range" min={0} max={1} step={0.05} value={p.volume}
                onChange={(e) => p.set({ volume: Number(e.target.value) })}
                onPointerUp={() => p.soundOn && playDing(p.volume)}
                className="w-full" aria-label="Volume"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Remind me about waiting orders</span>
              <Switch checked={p.nagMode} onCheckedChange={(v) => p.set({ nagMode: v })} />
            </label>
            <div className="space-y-1">
              <p className="text-sm">Card size</p>
              <div className="grid grid-cols-2 gap-2">
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button key={d} type="button" onClick={() => p.set({ density: d })} aria-pressed={p.density === d}
                    className={`h-10 rounded-lg border text-sm capitalize ${p.density === d ? 'border-primary bg-primary/10' : 'border-border'}`}>{d}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm">Text size</p>
              <div className="grid grid-cols-4 gap-2">
                {SCALES.map((s) => (
                  <button key={s} type="button" onClick={() => p.set({ fontScale: s })} aria-pressed={p.fontScale === s}
                    className={`h-10 rounded-lg border text-sm ${p.fontScale === s ? 'border-primary bg-primary/10' : 'border-border'}`}>{Math.round(s * 100)}%</button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}