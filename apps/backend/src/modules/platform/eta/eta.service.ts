import { logger } from '../../../lib/logger';
import { prisma } from '../../../lib/prisma';
import type { EtaPort } from '../../../ports';
import { mlBreaker } from './breaker';
import { fallbackSeconds } from './fallback';
import { mlUrl, predictEta } from './mlClient';
import { queueStats } from './queueStats';

type Result = Awaited<ReturnType<EtaPort['estimate']>>;

/** NEVER throws. Falls back to the formula on any problem. */
export const etaService: EtaPort = {
  async estimate({ canteenId, items }): Promise<Result> {
    let lines: { menuItemId: string; baseSeconds: number; weight: number; station: string; quantity: number }[] = [];
    let depth = 0;
    let strain = 0;
    try {
      const meta = await prisma.menuItemPrepMetadata.findMany({ where: { menuItemId: { in: items.map((i) => i.menuItemId) } } });
      const byId = new Map(meta.map((m) => [m.menuItemId, m]));
      lines = items.map((i) => {
        const m = byId.get(i.menuItemId);
        return { menuItemId: i.menuItemId, quantity: i.quantity, baseSeconds: m?.basePrepSeconds ?? 180, weight: m ? Number(m.prepComplexityWeight) : 1, station: m?.cookingStation ?? 'main_counter' };
      });
      ({ depth, strain } = await queueStats(canteenId));

      if (mlUrl() && mlBreaker.allow()) {
        try {
          const r = await predictEta({
            canteenId,
            queueDepth: depth,
            strainSeconds: strain,
            now: new Date().toISOString(),
            items: lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.quantity, basePrepSeconds: l.baseSeconds, weight: l.weight, station: l.station })),
          });
          mlBreaker.success();
          return { seconds: r.etaSeconds, source: 'ml', modelVersion: r.modelVersion };
        } catch (err) {
          mlBreaker.failure();
          logger.warn({ err: String(err) }, 'ML eta failed, using fallback');
        }
      }
      return { seconds: fallbackSeconds(lines, depth), source: 'fallback' };
    } catch (err) {
      logger.warn({ err: String(err) }, 'eta estimate failed');
      try {
        return { seconds: lines.length ? fallbackSeconds(lines, depth) : 600, source: 'fallback' };
      } catch {
        return { seconds: 600, source: 'fallback' };
      }
    }
  },
};
