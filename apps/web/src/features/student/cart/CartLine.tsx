import React from 'react';
import { VegDot } from '@/components/common/VegDot';
import { Price } from '@/components/common/Price';
import { QtyStepper } from '@/features/student/menu/QtyStepper';
import type { CartLine as CartLineType } from '@/stores/cartStore';

interface CartLineProps {
  line: CartLineType;
  onInc: () => void;
  onDec: () => void;
}

export const CartLine: React.FC<CartLineProps> = ({ line, onInc, onDec }) => {
  const lineTotal = +(line.item.price * line.qty).toFixed(2);

  return (
    <div className="py-3 flex items-center justify-between gap-3 border-b border-border/50 last:border-0">
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="pt-0.5">
          <VegDot isVeg={Boolean(line.item.isVeg)} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {line.item.name}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">
              ₹{line.item.price} each
            </span>
            {line.priceChanged && (
              <span className="text-[10px] font-medium text-warning bg-warning-soft px-1.5 py-0.2 rounded">
                Price updated
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <QtyStepper size="sm" qty={line.qty} onInc={onInc} onDec={onDec} />
        <Price
          amount={lineTotal}
          className="text-sm font-bold text-foreground min-w-[3.5rem] text-right"
        />
      </div>
    </div>
  );
};
