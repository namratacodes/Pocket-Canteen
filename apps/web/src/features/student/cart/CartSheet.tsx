import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Sparkles, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/common/Price';
import { EmptyState } from '@/components/common/EmptyState';
import { CartLine } from './CartLine';
import {
  useCartStore,
  selectSubtotal,
  selectCount,
} from '@/stores/cartStore';
import type { MenuItem, ComboSuggestion } from '@/types';

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItems?: MenuItem[];
  combos?: ComboSuggestion[];
}

export const CartSheet: React.FC<CartSheetProps> = ({
  open,
  onOpenChange,
  menuItems = [],
  combos = [],
}) => {
  const navigate = useNavigate();
  const canteenName = useCartStore((state) => state.canteenName);
  const lines = useCartStore((state) => state.lines);
  const inc = useCartStore((state) => state.inc);
  const dec = useCartStore((state) => state.dec);
  const clear = useCartStore((state) => state.clear);
  const add = useCartStore((state) => state.add);
  const reconcileWithMenu = useCartStore((state) => state.reconcileWithMenu);

  const subtotal = useCartStore(selectSubtotal);
  const count = useCartStore(selectCount);

  // Reconcile with menu on open
  useEffect(() => {
    if (open && menuItems.length > 0) {
      const { removed, priceChanged } = reconcileWithMenu(menuItems);
      if (removed.length > 0) {
        removed.forEach((item) => {
          toast.error(`${item.name} just sold out and was removed from your cart.`);
        });
      }
      if (priceChanged.length > 0) {
        toast.info('Some item prices have updated, please review your cart.');
      }
    }
  }, [open, menuItems, reconcileWithMenu]);

  const lineEntries = Object.values(lines);

  // Find a smart combo upsell: if an item in the cart is part of a combo, suggest adding the complementary item
  const upsellCombo = combos.find((combo) => {
    const hasAtLeastOne = combo.itemIds.some((id) => Boolean(lines[id]));
    const hasAll = combo.itemIds.every((id) => Boolean(lines[id]));
    return hasAtLeastOne && !hasAll;
  });

  const upsellMissingItem = upsellCombo
    ? menuItems.find(
        (m) => upsellCombo.itemIds.includes(m.id) && !lines[m.id] && m.isAvailable
      )
    : null;

  const handleCheckout = () => {
    onOpenChange(false);
    navigate('/student/checkout');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-w-[480px] mx-auto p-0 overflow-hidden max-h-[85vh] flex flex-col"
      >
        <SheetHeader className="p-4 border-b border-border/80 text-left flex-row items-center justify-between">
          <div>
            <SheetTitle className="text-base font-bold text-foreground">
              Your Cart
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {canteenName || 'Pocket Canteen'}
            </p>
          </div>
          {lineEntries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="text-xs text-muted-foreground hover:text-danger h-8 px-2"
            >
              Clear Cart
            </Button>
          )}
        </SheetHeader>

        {/* Content list or EmptyState */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {lineEntries.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Your cart is empty"
              description="Add your favourite meals or snacks from the menu."
              action={
                <Button
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl bg-brand text-white h-10 px-5 text-xs font-semibold shadow-sm"
                >
                  Browse Menu
                </Button>
              }
            />
          ) : (
            <div>
              {lineEntries.map((line) => (
                <CartLine
                  key={line.item.id}
                  line={line}
                  onInc={() => inc(line.item.id)}
                  onDec={() => dec(line.item.id)}
                />
              ))}

              {/* Smart Combo Upsell */}
              {upsellMissingItem && (
                <div className="mt-4 rounded-xl border border-brand/20 bg-brand-soft/50 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-4 w-4 text-brand flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        Add {upsellMissingItem.name} for ₹{upsellMissingItem.price}?
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Pairs great with your order
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => add(upsellMissingItem, canteenName || '')}
                    className="h-8 px-3 rounded-lg text-xs font-bold text-brand border-brand/30 hover:bg-brand/10 flex-shrink-0"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with subtotal and checkout button */}
        {lineEntries.length > 0 && (
          <div className="p-4 border-t border-border bg-card space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Item Total ({count} {count === 1 ? 'item' : 'items'})
              </span>
              <Price amount={subtotal} className="text-base font-bold text-foreground" />
            </div>

            <Button
              type="button"
              onClick={handleCheckout}
              className="w-full h-12 rounded-xl bg-brand text-white font-bold text-sm shadow-sm hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
