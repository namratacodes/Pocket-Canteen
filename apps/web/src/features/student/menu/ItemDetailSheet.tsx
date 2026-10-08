import React from 'react';
import { Clock, UtensilsCrossed } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { VegDot } from '@/components/common/VegDot';
import { Price } from '@/components/common/Price';
import { QtyStepper } from './QtyStepper';
import type { MenuItem } from '@/types';
import { useCartStore } from '@/stores/cartStore';
import { useIsOnline } from '@/lib/network/useOnlineStatus';

interface ItemDetailSheetProps {
  item: MenuItem | null;
  canteenName: string;
  isCanteenOpen: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNeedsSwitch: (item: MenuItem) => void;
}

export const ItemDetailSheet: React.FC<ItemDetailSheetProps> = ({
  item,
  canteenName,
  isCanteenOpen,
  open,
  onOpenChange,
  onNeedsSwitch,
}) => {
  if (!item) return null;

  const lines = useCartStore((state) => state.lines);
  const add = useCartStore((state) => state.add);
  const inc = useCartStore((state) => state.inc);
  const dec = useCartStore((state) => state.dec);
  const online = useIsOnline();

  const currentLine = lines[item.id];
  const qty = currentLine?.qty ?? 0;

  const prepMins = Math.ceil((item.basePrepSeconds ?? 180) / 60);

  const handleAdd = () => {
    const result = add(item, canteenName);
    if (result === 'needs_switch') {
      onNeedsSwitch(item);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-w-[480px] mx-auto p-0 overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Large Image Header */}
        <div className="relative aspect-[16/10] w-full bg-muted flex-shrink-0">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 stroke-1" />
            </div>
          )}

          {!item.isAvailable && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
              <span className="rounded-full bg-destructive px-3.5 py-1 text-xs font-bold text-white shadow-md">
                SOLD OUT
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center gap-2">
              <VegDot isVeg={Boolean(item.isVeg)} />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {item.category}
              </span>
            </div>
            <SheetTitle className="text-xl font-bold tracking-tight text-foreground">
              {item.name}
            </SheetTitle>
          </SheetHeader>

          <div className="flex items-center gap-4 text-xs text-muted-foreground border-y border-border/60 py-2.5">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Prep time: ~{prepMins} min</span>
            </div>
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">Total Price</div>
            <Price
              amount={item.price}
              className="text-xl font-bold text-foreground"
            />
          </div>

          <div>
            {!isCanteenOpen ? (
              <Button disabled variant="outline" className="rounded-xl h-11 px-5">
                Canteen Closed
              </Button>
            ) : !item.isAvailable ? (
              <Button disabled variant="outline" className="rounded-xl h-11 px-5 border-destructive/40 text-destructive">
                Sold Out
              </Button>
            ) : qty > 0 ? (
              <QtyStepper
                qty={qty}
                onInc={() => inc(item.id)}
                onDec={() => dec(item.id)}
              />
            ) : (
              <Button
                onClick={handleAdd}
                disabled={!online}
                className="h-11 px-8 rounded-xl font-semibold bg-brand text-white shadow-sm hover:opacity-90 active:scale-95"
              >
                {online ? 'Add to Cart' : 'Connect to order'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
