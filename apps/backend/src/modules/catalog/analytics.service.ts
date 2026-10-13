import type { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { toPaise } from '../../lib/money';
import { prisma } from '../../lib/prisma';
import { campusDay, campusStartOfDay } from '../../lib/time';

export interface AnalyticsSummaryDTO {
  days: number;
  from: string;
  to: string;
  totals: {
    orders: number;
    revenuePaise: number;
  };
  byHour: Array<{
    hour: number;
    orders: number;
    revenuePaise: number;
  }>;
  byDay: Array<{
    day: string;
    orders: number;
    revenuePaise: number;
  }>;
  topItems: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    revenuePaise: number;
  }>;
}

interface HourRow {
  hour: number;
  orders: number;
  revenue: Prisma.Decimal | number | string;
}

interface DayRow {
  day: string;
  orders: number;
  revenue: Prisma.Decimal | number | string;
}

interface TopItemRow {
  menu_item_id: string;
  name: string;
  quantity: number;
  revenue: Prisma.Decimal | number | string;
}

export class AnalyticsService {
  async getSummary(canteenId: string, days: number = 7): Promise<AnalyticsSummaryDTO> {
    const now = new Date();
    const tz = env.CAMPUS_TZ;

    // Window: the last `days` campus days including today
    const daysList: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const instant = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const cd = campusDay(instant);
      if (!daysList.includes(cd)) {
        daysList.push(cd);
      }
    }
    // Ensure we have exactly `days` days if possible or at least from the earliest day start
    const from = campusStartOfDay(daysList[0]);
    const to = now;

    // Query 1: By hour (campus time)
    const byHourRaw = await prisma.$queryRaw<HourRow[]>`
      SELECT EXTRACT(HOUR FROM (o.placed_at AT TIME ZONE ${tz}))::int AS hour,
             COUNT(*)::int AS orders,
             COALESCE(SUM(o.total_amount), 0) AS revenue
      FROM orders o
      WHERE o.canteen_id = ${canteenId}::uuid
        AND o.status = 'completed'
        AND o.placed_at >= ${from}
        AND o.placed_at < ${to}
      GROUP BY 1
    `;

    // Query 2: By day
    const byDayRaw = await prisma.$queryRaw<DayRow[]>`
      SELECT to_char(o.placed_at AT TIME ZONE ${tz}, 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS orders,
             COALESCE(SUM(o.total_amount), 0) AS revenue
      FROM orders o
      WHERE o.canteen_id = ${canteenId}::uuid
        AND o.status = 'completed'
        AND o.placed_at >= ${from}
        AND o.placed_at < ${to}
      GROUP BY 1
      ORDER BY 1
    `;

    // Query 3: Top items (top 10 by quantity)
    const topItemsRaw = await prisma.$queryRaw<TopItemRow[]>`
      SELECT oi.menu_item_id, mi.name,
             SUM(oi.quantity)::int AS quantity,
             COALESCE(SUM(oi.quantity * oi.price_at_order_time), 0) AS revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.canteen_id = ${canteenId}::uuid
        AND o.status = 'completed'
        AND o.placed_at >= ${from}
        AND o.placed_at < ${to}
      GROUP BY 1, 2
      ORDER BY quantity DESC
      LIMIT 10
    `;

    // Zero-fill 24 hours (0..23)
    const hourMap = new Map<number, { orders: number; revenuePaise: number }>();
    for (const r of byHourRaw) {
      hourMap.set(Number(r.hour), {
        orders: Number(r.orders),
        revenuePaise: toPaise(r.revenue),
      });
    }

    const byHour = Array.from({ length: 24 }, (_, h) => {
      const match = hourMap.get(h);
      return {
        hour: h,
        orders: match?.orders ?? 0,
        revenuePaise: match?.revenuePaise ?? 0,
      };
    });

    // Zero-fill days of the window
    const dayMap = new Map<string, { orders: number; revenuePaise: number }>();
    for (const r of byDayRaw) {
      dayMap.set(r.day, {
        orders: Number(r.orders),
        revenuePaise: toPaise(r.revenue),
      });
    }

    const byDay = daysList.map((day) => {
      const match = dayMap.get(day);
      return {
        day,
        orders: match?.orders ?? 0,
        revenuePaise: match?.revenuePaise ?? 0,
      };
    });

    // Compute totals from completed orders in window
    let totalOrders = 0;
    let totalRevenuePaise = 0;
    for (const r of byHour) {
      totalOrders += r.orders;
      totalRevenuePaise += r.revenuePaise;
    }

    const topItems = topItemsRaw.map((r) => ({
      menuItemId: r.menu_item_id,
      name: r.name,
      quantity: Number(r.quantity),
      revenuePaise: toPaise(r.revenue),
    }));

    return {
      days,
      from: from.toISOString(),
      to: to.toISOString(),
      totals: {
        orders: totalOrders,
        revenuePaise: totalRevenuePaise,
      },
      byHour,
      byDay,
      topItems,
    };
  }
}

export const analyticsService = new AnalyticsService();
