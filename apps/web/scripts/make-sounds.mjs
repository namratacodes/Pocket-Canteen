import { mkdirSync, writeFileSync } from 'node:fs';

const RATE = 22050;

function render(parts) {
  const total = Math.max(...parts.map((p) => p.start + p.dur));
  const n = Math.floor(total * RATE);
  const mix = new Float32Array(n);
  for (const p of parts) {
    const s = Math.floor(p.start * RATE);
    const len = Math.floor(p.dur * RATE);
    for (let i = 0; i < len && s + i < n; i++) {
      const t = i / RATE;
      const env = Math.min(1, i / 200) * Math.exp((-4 * t) / p.dur);
      mix[s + i] += Math.sin(2 * Math.PI * p.f * t) * env * 0.5;
    }
  }
  const out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(RATE, 24); out.writeUInt32LE(RATE * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[i])) * 32767), 44 + i * 2);
  return out;
}

mkdirSync('public/sounds', { recursive: true });
writeFileSync('public/sounds/new-order.wav', render([
  { f: 880, start: 0, dur: 0.35 },
  { f: 1318, start: 0.25, dur: 0.45 },
]));
writeFileSync('public/sounds/ding.wav', render([{ f: 988, start: 0, dur: 0.3 }]));
console.log('sounds written to public/sounds');