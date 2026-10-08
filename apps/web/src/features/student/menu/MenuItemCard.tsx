import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VegDot } from '@/components/common/VegDot';
import { Price } from '@/components/common/Price';
import { QtyStepper } from './QtyStepper';
import type { MenuItem } from '@/types';
import { useCartStore } from '@/stores/cartStore';
import { cn } from '@/lib/utils';
import { useIsOnline } from '@/lib/network/useOnlineStatus';

interface MenuItemCardProps {
  item: MenuItem;
  canteenName: string;
  isCanteenOpen: boolean;
  onSelect: (item: MenuItem) => void;
  onNeedsSwitch: (item: MenuItem) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  canteenName,
  isCanteenOpen,
  onSelect,
  onNeedsSwitch,
}) => {
  const lines = useCartStore((state) => state.lines);
  const add = useCartStore((state) => state.add);
  const inc = useCartStore((state) => state.inc);
  const dec = useCartStore((state) => state.dec);
  const online = useIsOnline();

  const currentLine = lines[item.id];
  const qty = currentLine?.qty ?? 0;
  const prepMins = Math.ceil((item.basePrepSeconds ?? 180) / 60);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = add(item, canteenName);
    if (result === 'needs_switch') {
      onNeedsSwitch(item);
    }
  };

  return (
    <Card
      onClick={() => onSelect(item)}
      className={cn(
        'group cursor-pointer overflow-hidden rounded-2xl border border-border shadow-card transition-all duration-200',
        'hover:border-brand/40 hover:shadow-sm active:scale-[0.99]',
        (!item.isAvailable || !isCanteenOpen) && 'opacity-70 bg-muted/20'
      )}
    >
      <CardContent className="p-3.5 flex gap-3 items-center justify-between">
        {/* Left Info Column */}
        <div className="flex-1 min-w-0 pr-1 space-y-1">
          <div className="flex items-center gap-2">
            <VegDot isVeg={Boolean(item.isVeg)} />
            <span className="text-[11px] font-medium text-muted-foreground">
              ~{prepMins} min
            </span>
          </div>

          <h4 className="font-semibold text-sm text-foreground truncate group-hover:text-brand transition-colors">
            {item.name}
          </h4>

          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="pt-1 flex items-center justify-between">
            <Price
              amount={item.price}
              className="text-sm font-bold text-foreground"
            />
          </div>
        </div>

        {/* Right Thumbnail & Action */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="relative h-20 w-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <UtensilsCrossed className="h-6 w-6 stroke-1" />
              </div>
            )}

            {!item.isAvailable && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider text-center px-1">
                  Sold Out
                </span>
              </div>
            )}
          </div>

          {/* Action Button / Stepper */}
          <div onClick={(e) => e.stopPropagation()}>
            {!isCanteenOpen ? (
              <Button
                disabled
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs rounded-xl"
              >
                Closed
              </Button>
            ) : !item.isAvailable ? (
              <span className="text-[11px] font-medium text-destructive">
                Unavailable
              </span>
            ) : qty > 0 ? (
              <QtyStepper
                size="sm"
                qty={qty}
                onInc={() => inc(item.id)}
                onDec={() => dec(item.id)}
              />
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleAdd}
                disabled={!online}
                aria-label={online ? undefined : 'Connect to order'}
                className="h-8 px-4 text-xs font-bold rounded-xl bg-brand text-white shadow-sm hover:opacity-90 active:scale-95"
              >
                {online ? 'ADD' : 'OFFLINE'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
