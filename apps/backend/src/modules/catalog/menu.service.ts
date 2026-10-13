import { AppError } from '../../lib/errors';
import { fromPaise, toPaise } from '../../lib/money';
import { prisma } from '../../lib/prisma';
import { runTx } from '../../lib/tx';
import { realtime } from '../../realtime/emitter';
import type { MenuItemDTO, StaffMenuItemDTO } from './types';
import { toMenuItemDTO, toStaffMenuItemDTO } from './types';

export interface CreateMenuItemInput {
  name: string;
  pricePaise: number;
  category: string;
  imageUrl?: string | null;
  isAvailable?: boolean;
  prep?: {
    basePrepSeconds?: number;
    complexityWeight?: number;
    cookingStation?: string;
    batchable?: boolean;
  };
}

export interface UpdateMenuItemInput {
  name?: string;
  pricePaise?: number;
  category?: string;
  imageUrl?: string | null;
  isAvailable?: boolean;
  prep?: {
    basePrepSeconds?: number;
    complexityWeight?: number;
    cookingStation?: string;
    batchable?: boolean;
  };
}

interface DiffEntry {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export class MenuService {
  async getStudentMenu(canteenId: string): Promise<{
    canteen: { id: string; name: string; isOpen: boolean };
    items: MenuItemDTO[];
  }> {
    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId },
      select: { id: true, name: true, isOpen: true },
    });

    if (!canteen) {
      throw new AppError('NOT_FOUND', 'Canteen not found');
    }

    const items = await prisma.menuItem.findMany({
      where: { canteenId },
      include: { prep: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return {
      canteen,
      items: items.map(toMenuItemDTO),
    };
  }

  async getStaffMenu(canteenId: string): Promise<StaffMenuItemDTO[]> {
    const items = await prisma.menuItem.findMany({
      where: { canteenId },
      include: { prep: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return items.map(toStaffMenuItemDTO);
  }

  async createMenuItem(
    canteenId: string,
    userId: string,
    data: CreateMenuItemInput,
  ): Promise<StaffMenuItemDTO> {
    return runTx(async (ctx) => {
      const createdItem = await ctx.tx.menuItem.create({
        data: {
          canteenId,
          name: data.name,
          price: fromPaise(data.pricePaise),
          category: data.category,
          imageUrl: data.imageUrl ?? null,
          isAvailable: data.isAvailable ?? true,
          updatedByUserId: userId,
        },
      });

      const prep = await ctx.tx.menuItemPrepMetadata.create({
        data: {
          menuItemId: createdItem.id,
          basePrepSeconds: data.prep?.basePrepSeconds ?? 180,
          prepComplexityWeight: data.prep?.complexityWeight ?? 1.0,
          cookingStation: data.prep?.cookingStation ?? 'main_counter',
          batchable: data.prep?.batchable ?? false,
        },
      });

      await ctx.tx.menuAuditLog.create({
        data: {
          menuItemId: createdItem.id,
          userId,
          field: 'created',
          oldValue: null,
          newValue: data.name,
        },
      });

      ctx.afterCommit(() => {
        const payload = {
          canteenId,
          itemId: createdItem.id,
          changes: { created: data.name },
        };
        realtime.toMenuRoom(canteenId, 'menu:updated', payload);
        realtime.toCanteen(canteenId, 'menu:updated', payload);
      });

      return toStaffMenuItemDTO({ ...createdItem, prep });
    });
  }

  async updateMenuItem(
    canteenId: string,
    userId: string,
    itemId: string,
    data: UpdateMenuItemInput,
  ): Promise<StaffMenuItemDTO> {
    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, canteenId },
      include: { prep: true },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Menu item not found');
    }

    const diffs: DiffEntry[] = [];

    if (data.name !== undefined && data.name !== existing.name) {
      diffs.push({ field: 'name', oldValue: existing.name, newValue: data.name });
    }

    if (data.pricePaise !== undefined && data.pricePaise !== toPaise(existing.price)) {
      diffs.push({
        field: 'price',
        oldValue: String(toPaise(existing.price)),
        newValue: String(data.pricePaise),
      });
    }

    if (data.category !== undefined && data.category !== existing.category) {
      diffs.push({ field: 'category', oldValue: existing.category, newValue: data.category });
    }

    if (data.imageUrl !== undefined && data.imageUrl !== existing.imageUrl) {
      diffs.push({ field: 'imageUrl', oldValue: existing.imageUrl, newValue: data.imageUrl });
    }

    if (data.isAvailable !== undefined && data.isAvailable !== existing.isAvailable) {
      diffs.push({
        field: 'isAvailable',
        oldValue: String(existing.isAvailable),
        newValue: String(data.isAvailable),
      });
    }

    const existingPrep = existing.prep;
    if (data.prep) {
      if (
        data.prep.basePrepSeconds !== undefined &&
        data.prep.basePrepSeconds !== (existingPrep?.basePrepSeconds ?? 180)
      ) {
        diffs.push({
          field: 'prep.basePrepSeconds',
          oldValue: String(existingPrep?.basePrepSeconds ?? 180),
          newValue: String(data.prep.basePrepSeconds),
        });
      }

      if (
        data.prep.complexityWeight !== undefined &&
        data.prep.complexityWeight !== Number(existingPrep?.prepComplexityWeight ?? 1)
      ) {
        diffs.push({
          field: 'prep.complexityWeight',
          oldValue: String(Number(existingPrep?.prepComplexityWeight ?? 1)),
          newValue: String(data.prep.complexityWeight),
        });
      }

      if (
        data.prep.cookingStation !== undefined &&
        data.prep.cookingStation !== (existingPrep?.cookingStation ?? 'main_counter')
      ) {
        diffs.push({
          field: 'prep.cookingStation',
          oldValue: existingPrep?.cookingStation ?? 'main_counter',
          newValue: data.prep.cookingStation,
        });
      }

      if (
        data.prep.batchable !== undefined &&
        data.prep.batchable !== (existingPrep?.batchable ?? false)
      ) {
        diffs.push({
          field: 'prep.batchable',
          oldValue: String(existingPrep?.batchable ?? false),
          newValue: String(data.prep.batchable),
        });
      }
    }

    // If nothing changed, return the item without writing
    if (diffs.length === 0) {
      return toStaffMenuItemDTO(existing);
    }

    return runTx(async (ctx) => {
      const updateItemData: Record<string, unknown> = { updatedByUserId: userId };
      if (data.name !== undefined) updateItemData.name = data.name;
      if (data.pricePaise !== undefined) updateItemData.price = fromPaise(data.pricePaise);
      if (data.category !== undefined) updateItemData.category = data.category;
      if (data.imageUrl !== undefined) updateItemData.imageUrl = data.imageUrl;
      if (data.isAvailable !== undefined) updateItemData.isAvailable = data.isAvailable;

      const updatedItem = await ctx.tx.menuItem.update({
        where: { id: itemId },
        data: updateItemData,
      });

      let updatedPrep = existing.prep;
      if (data.prep) {
        updatedPrep = await ctx.tx.menuItemPrepMetadata.upsert({
          where: { menuItemId: itemId },
          update: {
            ...(data.prep.basePrepSeconds !== undefined ? { basePrepSeconds: data.prep.basePrepSeconds } : {}),
            ...(data.prep.complexityWeight !== undefined ? { prepComplexityWeight: data.prep.complexityWeight } : {}),
            ...(data.prep.cookingStation !== undefined ? { cookingStation: data.prep.cookingStation } : {}),
            ...(data.prep.batchable !== undefined ? { batchable: data.prep.batchable } : {}),
          },
          create: {
            menuItemId: itemId,
            basePrepSeconds: data.prep.basePrepSeconds ?? 180,
            prepComplexityWeight: data.prep.complexityWeight ?? 1.0,
            cookingStation: data.prep.cookingStation ?? 'main_counter',
            batchable: data.prep.batchable ?? false,
          },
        });
      }

      for (const diff of diffs) {
        await ctx.tx.menuAuditLog.create({
          data: {
            menuItemId: itemId,
            userId,
            field: diff.field,
            oldValue: diff.oldValue,
            newValue: diff.newValue,
          },
        });
      }

      ctx.afterCommit(() => {
        const changes: Record<string, unknown> = {};
        for (const d of diffs) {
          changes[d.field] = d.newValue;
        }
        const payload = { canteenId, itemId, changes };
        realtime.toMenuRoom(canteenId, 'menu:updated', payload);
        realtime.toCanteen(canteenId, 'menu:updated', payload);
      });

      return toStaffMenuItemDTO({ ...updatedItem, prep: updatedPrep });
    });
  }

  async toggleAvailability(
    canteenId: string,
    userId: string,
    itemId: string,
    isAvailable: boolean,
  ): Promise<StaffMenuItemDTO> {
    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, canteenId },
      include: { prep: true },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Menu item not found');
    }

    return runTx(async (ctx) => {
      const updated = await ctx.tx.menuItem.update({
        where: { id: itemId },
        data: {
          isAvailable,
          updatedByUserId: userId,
        },
      });

      if (existing.isAvailable !== isAvailable) {
        await ctx.tx.menuAuditLog.create({
          data: {
            menuItemId: itemId,
            userId,
            field: 'isAvailable',
            oldValue: String(existing.isAvailable),
            newValue: String(isAvailable),
          },
        });
      }

      ctx.afterCommit(() => {
        const payload = {
          canteenId,
          itemId,
          changes: { isAvailable },
        };
        realtime.toMenuRoom(canteenId, 'menu:updated', payload);
        realtime.toCanteen(canteenId, 'menu:updated', payload);
      });

      return toStaffMenuItemDTO({ ...updated, prep: existing.prep });
    });
  }
}

export const menuService = new MenuService();
