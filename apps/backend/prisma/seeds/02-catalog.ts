import { fromPaise } from '../../src/lib/money';
import { prisma } from '../../src/lib/prisma';
import { CANTEENS, ensureCanteens } from './_shared';

interface SeedMenuItem {
  name: string;
  priceRupees: number;
  category: string;
  prepSeconds: number;
  weight: number;
  station: string;
}

const CATALOG_ITEMS: SeedMenuItem[] = [
  { name: 'Samosa', priceRupees: 15, category: 'Snacks', prepSeconds: 60, weight: 1.0, station: 'fryer' },
  { name: 'Tea', priceRupees: 10, category: 'Beverages', prepSeconds: 60, weight: 1.0, station: 'beverage' },
  { name: 'Coffee', priceRupees: 20, category: 'Beverages', prepSeconds: 90, weight: 1.0, station: 'beverage' },
  { name: 'Cold Coffee', priceRupees: 40, category: 'Beverages', prepSeconds: 120, weight: 1.2, station: 'beverage' },
  { name: 'Veg Sandwich', priceRupees: 45, category: 'Snacks', prepSeconds: 240, weight: 1.2, station: 'main_counter' },
  { name: 'Grilled Sandwich', priceRupees: 60, category: 'Snacks', prepSeconds: 300, weight: 1.4, station: 'griddle' },
  { name: 'Masala Dosa', priceRupees: 70, category: 'South Indian', prepSeconds: 360, weight: 1.4, station: 'griddle' },
  { name: 'Veg Burger', priceRupees: 55, category: 'Fast Food', prepSeconds: 300, weight: 1.5, station: 'griddle' },
  { name: 'Chicken Burger', priceRupees: 85, category: 'Fast Food', prepSeconds: 420, weight: 1.6, station: 'griddle' },
  { name: 'Veg Fried Rice', priceRupees: 80, category: 'Meals', prepSeconds: 420, weight: 1.5, station: 'wok' },
  { name: 'Maggi', priceRupees: 40, category: 'Snacks', prepSeconds: 240, weight: 1.2, station: 'main_counter' },
  { name: 'French Fries', priceRupees: 50, category: 'Snacks', prepSeconds: 240, weight: 1.2, station: 'fryer' },
];

export default async function seed() {
  const canteens = await ensureCanteens();

  for (const c of CANTEENS) {
    const canteen = canteens[c.prefix];

    for (const item of CATALOG_ITEMS) {
      const existing = await prisma.menuItem.findFirst({
        where: {
          canteenId: canteen.id,
          name: item.name,
        },
      });

      if (!existing) {
        await prisma.menuItem.create({
          data: {
            canteenId: canteen.id,
            name: item.name,
            price: fromPaise(item.priceRupees * 100),
            category: item.category,
            isAvailable: true,
            prep: {
              create: {
                basePrepSeconds: item.prepSeconds,
                prepComplexityWeight: item.weight,
                cookingStation: item.station,
                batchable: false,
              },
            },
          },
        });
      }
    }
  }
}
