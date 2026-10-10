import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { TrackedOrder } from '../tracker/types';
import { addToCart, fetchCanteenMenu } from './reorderAdapter';
import { flattenMenu, planReorder } from './reorderPlan';

export function useReorder() {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);

  const reorder = async (order: TrackedOrder) => {
    setBusyId(order.id);
    try {
      const menu = flattenMenu(await fetchCanteenMenu(order.canteenId));
      const { add, skipped } = planReorder(order, menu);
      if (add.length === 0) { toast.error('None of these items are available right now'); return; }
      if (!addToCart(order.canteenId, order.canteenName, add)) return;
      if (skipped.length > 0) toast.info(`Skipped (unavailable): ${skipped.join(', ')}`);
      navigate(`/student/c/${order.canteenId}`);
    } catch {
      toast.error("Couldn't reorder right now. Try again");
    } finally {
      setBusyId(null);
    }
  };

  return { reorder, busyId };
}