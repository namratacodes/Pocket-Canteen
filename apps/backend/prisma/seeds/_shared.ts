import { prisma } from '../../src/lib/prisma';

export const CANTEENS = [
  { prefix: 'A', name: 'Main Canteen', location: 'Central Block, Ground Floor' },
  { prefix: 'B', name: 'Tech Park Cafe', location: 'Engineering Block' },
  { prefix: 'C', name: 'Hostel Mess Cafe', location: 'Boys Hostel Road' },
  { prefix: 'D', name: 'Library Cafe', location: 'Library Annexe' },
  { prefix: 'E', name: 'Sports Complex Snacks', location: 'Sports Complex' },
] as const;

/** Idempotent. Every seed file that needs canteens calls this first. Returns canteens keyed by token prefix. */
export async function ensureCanteens() {
  const out: Record<string, { id: string; name: string }> = {};
  for (const c of CANTEENS) {
    const row = await prisma.canteen.upsert({
      where: { tokenPrefix: c.prefix },
      update: {},
      create: {
        tokenPrefix: c.prefix,
        name: c.name,
        location: c.location,
        fssaiLicenseNo: `FSSAI-DEMO-${c.prefix}`,
        operatingHours: { open: '08:00', close: '22:00' },
      },
    });
    out[c.prefix] = { id: row.id, name: row.name };
  }
  return out;
}
