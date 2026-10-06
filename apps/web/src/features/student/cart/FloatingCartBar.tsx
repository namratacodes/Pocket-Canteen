import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Price } from '@/components/common/Price';
import { useCartStore, selectCount, selectSubtotal } from '@/stores/cartStore';

interface FloatingCartBarProps {
  canteenId: string;
  onOpenCart: () => void;
}

export const FloatingCartBar: React.FC<FloatingCartBarProps> = ({
  canteenId,
  onOpenCart,
}) => {
  const currentCanteenId = useCartStore((state) => state.canteenId);
  const count = useCartStore(selectCount);
  const subtotal = useCartStore(selectSubtotal);

  // Only show if cart belongs to this canteen and has items
  if (currentCanteenId !== canteenId || count === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 flex justify-center px-4 pointer-events-none">
      <div className="w-full max-w-[448px] pointer-events-auto">
        <button
          type="button"
          onClick={onOpenCart}
          className="w-full h-14 rounded-2xl bg-brand text-white shadow-float flex items-center justify-between px-5 font-medium transition-all hover:opacity-95 active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-medium text-white/90">
                {count} {count === 1 ? 'item' : 'items'}
              </div>
              <Price amount={subtotal} className="text-sm font-bold text-white" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm font-bold tracking-tight">
            <span>View Cart</span>
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </div>
        </button>
      </div>
    </div>
  );
};
