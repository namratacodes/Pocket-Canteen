import fs from 'fs';
import path from 'path';
import { prisma } from '../src/lib/prisma';

/** Runs every prisma/seeds/NN-*.ts (not files starting with _) in name order. Each exports `default async function seed()`. Seeds must be idempotent. */
async function main() {
  const dir = path.join(__dirname, 'seeds');
  const files = fs.readdirSync(dir).filter((f) => /^\d+-.*\.ts$/.test(f)).sort();
  for (const f of files) {
    console.log(`seeding ${f}`);
    const mod = await import(path.join(dir, f));
    await mod.default();
  }
}
main().finally(() => prisma.$disconnect());
