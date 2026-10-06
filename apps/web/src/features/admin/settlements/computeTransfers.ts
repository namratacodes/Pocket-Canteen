import type { SettlementRow, SettlementTransfer } from '@/types/admin';

// All money maths runs in integer paise to avoid float drift (0.1 + 0.2 problems).
const toPaise = (n: number): number => Math.round(n * 100);

/**
 * Who pays whom. Greedy two-pointer: the biggest debtor pays the biggest creditor
 * until one side is used up. Δ = redeemed - issued, so Δ < 0 pays and Δ > 0 receives.
 * Any debt left over after creditors are fully paid is floating wallet credit.
 */
export function computeTransfers(
  rows: Pick<SettlementRow, 'canteenName' | 'netPayable'>[]
): SettlementTransfer[] {
  const byBiggest = (a: { left: number; name: string }, b: { left: number; name: string }) =>
    b.left - a.left || a.name.localeCompare(b.name);

  const debtors = rows
    .filter((r) => toPaise(r.netPayable) < 0)
    .map((r) => ({ name: r.canteenName, left: -toPaise(r.netPayable) }))
    .sort(byBiggest);
  const creditors = rows
    .filter((r) => toPaise(r.netPayable) > 0)
    .map((r) => ({ name: r.canteenName, left: toPaise(r.netPayable) }))
    .sort(byBiggest);

  const transfers: SettlementTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amount = Math.min(d.left, c.left);
    if (amount > 0) transfers.push({ from: d.name, to: c.name, amount: amount / 100 });
    d.left -= amount;
    c.left -= amount;
    if (d.left === 0) i += 1;
    if (c.left === 0) j += 1;
  }
  return transfers;
}

export interface ConservationResult {
  /** Σ Δ across all canteens */
  sum: number;
  /** Σ Δ + floating credit. Zero when the books balance. */
  gap: number;
  balanced: boolean;
}

/** Conservation rule: Σ Δ (all canteens) + unspent floating wallet credit = 0. */
export function checkConservation(
  rows: Pick<SettlementRow, 'netPayable'>[],
  floatingCredit: number
): ConservationResult {
  const sumPaise = rows.reduce((acc, r) => acc + toPaise(r.netPayable), 0);
  const gapPaise = sumPaise + toPaise(floatingCredit);
  return { sum: sumPaise / 100, gap: gapPaise / 100, balanced: Math.abs(gapPaise) < 1 };
}