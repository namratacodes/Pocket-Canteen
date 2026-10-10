import { Howl, Howler } from 'howler';

let newSnd: Howl | null = null;
let dingSnd: Howl | null = null;

function load() {
  newSnd ??= new Howl({ src: ['/sounds/new-order.wav'], preload: true });
  dingSnd ??= new Howl({ src: ['/sounds/ding.wav'], preload: true });
}

/** Burst debounce: fires on the first call, then ignores calls until `gap` ms of quiet. */
export function createBurstDebounce(fn: () => void, gap = 1500, now: () => number = () => Date.now()) {
  let last = -Infinity;
  return () => {
    const t = now();
    const fire = t - last >= gap;
    last = t;
    if (fire) fn();
  };
}

/** Call from a user tap. Resumes the audio context and plays a silent sound. */
export function unlockAudio() {
  load();
  try { (Howler as unknown as { ctx?: AudioContext }).ctx?.resume?.(); } catch { /* ignore */ }
  if (dingSnd) {
    const v = dingSnd.volume();
    dingSnd.volume(0);
    dingSnd.play();
    setTimeout(() => dingSnd?.volume(v), 400);
  }
}

let vol = 0.8;
const burst = createBurstDebounce(() => {
  load();
  newSnd!.volume(vol);
  newSnd!.play();
});

export function playNew(volume: number) { vol = volume; burst(); }
export function playDing(volume: number) {
  load();
  dingSnd!.volume(Math.min(1, volume * 0.6));
  dingSnd!.play();
}