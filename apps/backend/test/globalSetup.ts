import { execSync } from 'child_process';

/** Rebuilds the test database schema + constraints once per test run. Needs a reachable Postgres at DATABASE_URL. */
export default function setup() {
  process.env.DATABASE_URL ??= 'postgresql://pc:pc@localhost:5432/pocketcanteen_test';
  execSync('npx prisma db push --force-reset --skip-generate --accept-data-loss', { stdio: 'inherit', env: process.env });
  execSync('npx prisma db execute --file prisma/constraints.sql --schema prisma/schema.prisma', { stdio: 'inherit', env: process.env });
}
