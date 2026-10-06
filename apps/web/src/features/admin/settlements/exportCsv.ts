import Papa from 'papaparse';
import type { SettlementRow } from '@/types/admin';

export function settlementsToCsv(rows: SettlementRow[]): string {
  return Papa.unparse(
    rows.map((r) => ({
      canteen: r.canteenName,
      issued: r.creditIssued.toFixed(2),
      redeemed: r.creditRedeemed.toFixed(2),
      net: r.netPayable.toFixed(2),
      status: r.status,
    })),
    { columns: ['canteen', 'issued', 'redeemed', 'net', 'status'] }
  );
}

export function downloadSettlementsCsv(period: string, rows: SettlementRow[]): void {
  const blob = new Blob([settlementsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `settlements-${period}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}