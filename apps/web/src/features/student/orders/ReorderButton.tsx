import type { TrackedOrder } from '../tracker/types';
import { useReorder } from './useReorder';

export function ReorderButton({ order }: { order: TrackedOrder }) {
  const { reorder, busyId } = useReorder();
  return (
    <button
      type="button"
      onClick={() => void reorder(order)}
      disabled={busyId === order.id}
      className="h-12 w-full rounded-lg border border-primary font-semibold text-primary disabled:opacity-50"
    >
      {busyId === order.id ? 'Checking menu…' : 'Reorder'}
    </button>
  );
}