import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cartStore';
import type { MenuItem } from '@/types';

interface CanteenSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingItem: MenuItem | null;
  newCanteenName: string;
}

export const CanteenSwitchDialog: React.FC<CanteenSwitchDialogProps> = ({
  open,
  onOpenChange,
  pendingItem,
  newCanteenName,
}) => {
  const existingCanteenName = useCartStore((state) => state.canteenName);
  const forceReplace = useCartStore((state) => state.forceReplace);

  const handleConfirm = () => {
    if (pendingItem) {
      forceReplace(pendingItem, newCanteenName);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm p-5 space-y-4">
        <DialogHeader className="text-left space-y-2">
          <DialogTitle className="text-lg font-bold text-foreground">
            Start a new cart?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Your cart currently has items from{' '}
            <span className="font-semibold text-foreground">
              {existingCanteenName || 'another canteen'}
            </span>
            . Adding items from{' '}
            <span className="font-semibold text-foreground">
              {newCanteenName}
            </span>{' '}
            will clear your existing cart.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl h-11"
          >
            Keep existing
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 rounded-xl h-11 bg-brand text-white font-semibold hover:opacity-90 shadow-sm"
          >
            Start new cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
