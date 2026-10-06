import React from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Price } from '@/components/common/Price';
import type { ComboSuggestion, MenuItem } from '@/types';
import { useCartStore } from '@/stores/cartStore';

interface ComboCarouselProps {
  combos: ComboSuggestion[];
  menuItems: MenuItem[];
  canteenName: string;
  isCanteenOpen: boolean;
  onNeedsSwitch: (item: MenuItem) => void;
}

export const ComboCarousel: React.FC<ComboCarouselProps> = ({
  combos,
  menuItems,
  canteenName,
  isCanteenOpen,
  onNeedsSwitch,
}) => {
  const add = useCartStore((state) => state.add);

  if (!combos || combos.length === 0) return null;

  const handleAddCombo = (combo: ComboSuggestion) => {
    if (!isCanteenOpen) return;

    for (const id of combo.itemIds) {
      const item = menuItems.find((m) => m.id === id);
      if (item && item.isAvailable) {
        const result = add(item, canteenName);
        if (result === 'needs_switch') {
          onNeedsSwitch(item);
          return;
        }
      }
    }
  };

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-1.5 px-0.5">
        <Sparkles className="h-4 w-4 text-brand" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Frequently ordered together
        </h3>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-none snap-x -mx-4 px-4">
        {combos.map((combo, idx) => {
          // Calculate total base price if comboPrice is provided or derived
          const items = combo.itemIds
            .map((id) => menuItems.find((m) => m.id === id))
            .filter(Boolean) as MenuItem[];

          const originalTotal = items.reduce((sum, item) => sum + item.price, 0);
          const finalPrice = combo.comboPrice ?? (combo.savings ? originalTotal - combo.savings : originalTotal);
          const hasSoldOut = items.some((item) => !item.isAvailable);

          return (
            <Card
              key={idx}
              className="min-w-[240px] max-w-[260px] flex-shrink-0 snap-start rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/5 via-card to-card shadow-card"
            >
              <CardContent className="p-3.5 space-y-2.5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-semibold text-brand tracking-wide uppercase">
                      Combo Saver
                    </span>
                    {combo.savings && combo.savings > 0 ? (
                      <Badge className="bg-success-soft text-success border-success/30 text-[10px] py-0 px-1.5 font-bold">
                        Save ₹{combo.savings}
                      </Badge>
                    ) : null}
                  </div>

                  <h4 className="font-semibold text-sm text-foreground leading-snug line-clamp-2">
                    {combo.label}
                  </h4>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <div className="flex items-baseline gap-1.5">
                    <Price
                      amount={finalPrice}
                      className="text-sm font-bold text-foreground"
                    />
                    {combo.savings && combo.savings > 0 && originalTotal > finalPrice && (
                      <span className="text-[11px] text-muted-foreground line-through">
                        ₹{originalTotal}
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    disabled={!isCanteenOpen || hasSoldOut}
                    onClick={() => handleAddCombo(combo)}
                    className="h-8 px-3 rounded-xl bg-brand text-white text-xs font-semibold hover:opacity-90 active:scale-95 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Add both</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
