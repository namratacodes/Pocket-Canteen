import type { MenuItem, MenuItemPrepMetadata } from '@prisma/client';
import { toPaise } from '../../lib/money';

export interface MenuItemDTO {
  id: string;
  canteenId: string;
  name: string;
  pricePaise: number;
  category: string;
  isAvailable: boolean;
  imageUrl: string | null;
  basePrepSeconds: number;
}

export interface StaffMenuItemDTO extends MenuItemDTO {
  prep: {
    basePrepSeconds: number;
    complexityWeight: number;
    cookingStation: string;
    batchable: boolean;
  };
  updatedAt: string;
}

export function toMenuItemDTO(item: MenuItem & { prep?: MenuItemPrepMetadata | null }): MenuItemDTO {
  return {
    id: item.id,
    canteenId: item.canteenId,
    name: item.name,
    pricePaise: toPaise(item.price),
    category: item.category,
    isAvailable: item.isAvailable,
    imageUrl: item.imageUrl,
    basePrepSeconds: item.prep?.basePrepSeconds ?? 180,
  };
}

export function toStaffMenuItemDTO(item: MenuItem & { prep?: MenuItemPrepMetadata | null }): StaffMenuItemDTO {
  const base = toMenuItemDTO(item);
  return {
    ...base,
    prep: {
      basePrepSeconds: item.prep?.basePrepSeconds ?? 180,
      complexityWeight: Number(item.prep?.prepComplexityWeight ?? 1),
      cookingStation: item.prep?.cookingStation ?? 'main_counter',
      batchable: item.prep?.batchable ?? false,
    },
    updatedAt: item.updatedAt.toISOString(),
  };
}
