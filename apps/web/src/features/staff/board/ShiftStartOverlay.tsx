import { ChefHat } from 'lucide-react';
import { unlockAudio } from '@/lib/audio/audioService';

export function ShiftStartOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/95 p-6">
      <button
        type="button"
        autoFocus
        onClick={() => { unlockAudio(); onStart(); }}
        className="flex flex-col items-center gap-4 rounded-3xl border-2 border-primary bg-card px-12 py-10 text-2xl font-bold shadow-2xl active:scale-95"
      >
        <ChefHat className="h-14 w-14 text-primary" aria-hidden />
        Tap to start your shift
        <span className="text-sm font-normal text-muted-foreground">Turns on order sounds and keeps the screen awake</span>
      </button>
    </div>
  );
}