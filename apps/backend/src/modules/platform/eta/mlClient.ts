/** Read from process.env at call time so tests (and ops) can change it. */
export const mlUrl = () => process.env.ML_SERVICE_URL || '';
export const mlTimeoutMs = () => Number(process.env.ML_TIMEOUT_MS ?? 50) || 50;

export interface MlRequest {
  canteenId: string;
  queueDepth: number;
  strainSeconds: number;
  now: string;
  items: { menuItemId: string; qty: number; basePrepSeconds: number; weight: number; station: string }[];
}

export async function predictEta(body: MlRequest): Promise<{ etaSeconds: number; modelVersion?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), mlTimeoutMs());
  try {
    const res = await fetch(`${mlUrl().replace(/\/$/, '')}/predict-eta`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`ml status ${res.status}`);
    const j: any = await res.json();
    const n = Number(j?.etaSeconds);
    if (!Number.isFinite(n) || n <= 0) throw new Error('ml bad etaSeconds');
    return { etaSeconds: Math.min(7200, Math.max(60, Math.round(n))), modelVersion: typeof j.modelVersion === 'string' ? j.modelVersion : undefined };
  } finally {
    clearTimeout(timer);
  }
}
