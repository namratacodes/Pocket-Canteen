import type { MenuItem } from '@prisma/client';
import { toPaise } from '../../lib/money';

export interface CartLine { menuItemId: string; quantity: number }
export interface PricedLine extends CartLine { unitPricePaise: number }

/** Prices come ONLY from the database, never from the client. */
export function priceCart(lines: CartLine[], menu: MenuItem[]) {
  const byId = new Map(menu.map((m) => [m.id, m]));
  const priced: PricedLine[] = lines.map((l) => ({ ...l, unitPricePaise: toPaise(byId.get(l.menuItemId)!.price) }));
  const totalPaise = priced.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
  return { priced, totalPaise };
}

export function splitPayment(balancePaise: number, totalPaise: number, useWallet: boolean) {
  const walletPaise = useWallet ? Math.max(0, Math.min(balancePaise, totalPaise)) : 0;
  return { walletPaise, gatewayPaise: totalPaise - walletPaise };
}
