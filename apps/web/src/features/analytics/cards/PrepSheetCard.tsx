import React from 'react';
import { addDays, format } from 'date-fns';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ForecastRow } from '@/types/admin';
import type { AnalyticsParams } from '@/lib/api/analyticsApi';
import { AnalyticsCard } from './AnalyticsCard';
import { useAnalytics } from '../useAnalytics';

// Print rules show ONLY this card, on A4. Self-contained so no shared CSS file is touched.
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 14mm; }
  body * { visibility: hidden !important; }
  #prep-sheet-print, #prep-sheet-print * { visibility: visible !important; }
  #prep-sheet-print { position: absolute; left: 0; top: 0; width: 100%; border: 0 !important; box-shadow: none !important; background: white !important; color: black !important; }
  #prep-sheet-print .no-print { display: none !important; }
  #prep-sheet-print .print-title { display: block !important; }
  #prep-sheet-print .range-cell { color: dimgray !important; }
}
`;

export interface PrepSheetCardProps {
  params: AnalyticsParams;
  canteenName?: string;
}

export const PrepSheetCard: React.FC<PrepSheetCardProps> = ({ params, canteenName = 'Canteen' }) => {
  const tomorrow = addDays(new Date(), 1);
  const date = format(tomorrow, 'yyyy-MM-dd');
  const query = useAnalytics<ForecastRow[]>('forecast', { canteenId: params.canteenId, date });
  const title = `Prep sheet — ${canteenName} — ${format(tomorrow, 'EEE d MMM')}`;

  return (
    <>
      <style>{PRINT_CSS}</style>
      <AnalyticsCard
        id="prep-sheet-print"
        title="Tomorrow's prep sheet"
        subtitle="Predicted portions to prepare"
        query={query}
        errorTitle="Forecast unavailable. ML service offline"
        emptyText="No forecast yet for tomorrow."
        isEmpty={(d) => d.length === 0}
        action={
          <Button type="button" size="sm" variant="outline" className="no-print gap-1.5" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden /> Print
          </Button>
        }
      >
        {(rows) => (
          <>
            <p className="print-title hidden text-lg font-bold">{title}</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Item</th>
                  <th className="py-2 pr-2 text-right font-medium">Predicted</th>
                  <th className="py-2 text-right font-medium">Range</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a, b) => b.predicted - a.predicted).map((r) => (
                  <tr key={r.menuItemId} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2">{r.name}</td>
                    <td className="py-2 pr-2 text-right font-bold tabular-nums">{r.predicted}</td>
                    <td className="range-cell py-2 text-right tabular-nums text-muted-foreground">
                      {r.low}–{r.high}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </AnalyticsCard>
    </>
  );
};