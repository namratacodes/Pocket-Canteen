/** seconds = max(60, round(sum(base * quantity) + 120 * queueDepth)) */
export function fallbackSeconds(lines: { baseSeconds: number; quantity: number }[], queueDepth: number): number {
  const sum = lines.reduce((s, l) => s + l.baseSeconds * l.quantity, 0);
  return Math.max(60, Math.round(sum + 120 * queueDepth));
}
