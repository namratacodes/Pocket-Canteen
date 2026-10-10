import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;
const parts = [
  { f: 523, start: 0, dur: 0.5 },
  { f: 659, start: 0.18, dur: 0.5 },
  { f: 784, start: 0.36, dur: 0.7 },
];
const n = Math.floor(Math.max(...parts.map((p) => p.start + p.dur)) * RATE);
const mix = new Float32Array(n);
for (const p of parts) {
  const s = Math.floor(p.start * RATE);
  const len = Math.floor(p.dur * RATE);
  for (let i = 0; i < len && s + i < n; i++) {
    const t = i / RATE;
    mix[s + i] += Math.sin(2 * Math.PI * p.f * t) * Math.min(1, i / 200) * Math.exp((-4 * t) / p.dur) * 0.4;
  }
}
const out = Buffer.alloc(44 + n * 2);
out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
out.writeUInt32LE(RATE, 24); out.writeUInt32LE(RATE * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i])) * 32767), 44 + i * 2);
mkdirSync('public/sounds', { recursive: true });
writeFileSync('public/sounds/chime.wav', out);
console.log('public/sounds/chime.wav written');