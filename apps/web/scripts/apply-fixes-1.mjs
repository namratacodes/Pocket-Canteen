// Fixes found after the offline step. Safe to run twice. Run from apps/web:
//   node scripts/apply-fixes-1.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- 1. New files (only created when missing) ----
const newFiles = {
  // Gives TypeScript the type of import.meta.env. Fixes the "Property 'env' does not exist" errors.
  'src/vite-env.d.ts': `/// <reference types="vite/client" />\n`,

  // Keys for the admin portal and analytics. Their own file, so they cannot go missing when
  // queryKeys.ts is merged differently between branches.
  'src/lib/api/featureKeys.ts': `// Query keys used by the admin portal and the analytics dashboard.
export const adminCanteenKey = (id: string) => ['admin', 'canteens', id] as const;

export const analyticsKey = (name: string, params: object) => ['analytics', name, params] as const;
`,

  // Must be the FIRST mock handler (see src/mocks/browser.ts).
  'src/mocks/handlers/viteGuard.ts': `import { http, passthrough } from 'msw';

/**
 * The dev server hands out source files from URLs like /src/features/student/canteens/CanteenCard.tsx.
 * Mock API handlers whose paths end in "/canteens/:id" or "/orders/:id" would otherwise answer those
 * requests with JSON or a 404, and the page fails with "Failed to fetch dynamically imported module".
 */
export const viteSourceGuard = http.all('*', ({ request }) => {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith('/src/') || pathname.startsWith('/node_modules/') || pathname.startsWith('/@')) {
    return passthrough();
  }
  return undefined;
});
`,
};

// ---- 2. Edits ----
// step: find (string|RegExp, exactly one match) + replace, and either
//   done (text present once applied) or doneWhenAbsent (text that disappears once applied).
const edits = {
  'src/features/admin/canteens/CanteenDetailPage.tsx': [
    { name: 'key import', find: "import { queryKeys } from '@/lib/api/queryKeys';", replace: "import { adminCanteenKey } from '@/lib/api/featureKeys';", done: "from '@/lib/api/featureKeys'" },
    { name: 'key use', find: 'queryKeys.admin.canteen(id)', replace: 'adminCanteenKey(id)', done: 'adminCanteenKey(id)' },
  ],
  'src/features/admin/canteens/CanteenInfoForm.tsx': [
    { name: 'key import', find: "import { queryKeys } from '@/lib/api/queryKeys';", replace: "import { queryKeys } from '@/lib/api/queryKeys';\nimport { adminCanteenKey } from '@/lib/api/featureKeys';", done: "from '@/lib/api/featureKeys'" },
    { name: 'key use', find: 'queryKeys.admin.canteen(canteen.id)', replace: 'adminCanteenKey(canteen.id)', done: 'adminCanteenKey(canteen.id)' },
  ],
  'src/features/analytics/useAnalytics.ts': [
    { name: 'key import', find: "import { queryKeys } from '@/lib/api/queryKeys';", replace: "import { analyticsKey } from '@/lib/api/featureKeys';", done: "from '@/lib/api/featureKeys'" },
    { name: 'key use', find: 'queryKeys.analytics(name, params)', replace: 'analyticsKey(name, params)', done: 'analyticsKey(name, params)' },
  ],
  'src/mocks/browser.ts': [
    { name: 'guard import', find: "import { setupWorker } from 'msw/browser';", replace: "import { setupWorker } from 'msw/browser';\nimport { viteSourceGuard } from './handlers/viteGuard';", done: "import { viteSourceGuard }" },
    { name: 'guard first', find: 'setupWorker(', replace: 'setupWorker(\n  viteSourceGuard,', done: 'setupWorker(\n  viteSourceGuard,' },
  ],
  // Install card from the start (not only after the first order).
  'src/features/student/canteens/CanteenSelectorPage.tsx': [
    {
      name: 'remove the "has ordered" check',
      find: /\n[ \t]*\/\/ Offer "Install app" once the student has placed an order\.\n[ \t]*const hasOrdered = usePickupCodeStore\(\(state\) => Object\.keys\(state\.codes\)\.length > 0\);/,
      replace: '',
      doneWhenAbsent: 'const hasOrdered',
    },
    { name: 'always show the card', find: '{hasOrdered && <InstallAppCard />}', replace: '<InstallAppCard />', doneWhenAbsent: '{hasOrdered && <InstallAppCard />}' },
    { name: 'remove unused import', find: "\nimport { usePickupCodeStore } from '@/stores/pickupCodeStore';", replace: '', doneWhenAbsent: "import { usePickupCodeStore }" },
  ],
};

const count = (text, find) => {
  if (typeof find === 'string') return text.split(find).length - 1;
  const flags = find.flags.includes('g') ? find.flags : find.flags + 'g';
  return (text.match(new RegExp(find.source, flags)) || []).length;
};

let failed = 0;

for (const [rel, content] of Object.entries(newFiles)) {
  const file = path.join(root, rel);
  if (existsSync(file)) { console.log(`exists   ${rel}`); continue; }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, 'utf8');
  console.log(`created  ${rel}`);
}

for (const [rel, steps] of Object.entries(edits)) {
  const file = path.join(root, rel);
  if (!existsSync(file)) { console.log(`MISSING  ${rel} (file not found, skipped)`); failed++; continue; }
  const raw = readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  let text = raw.replace(/\r\n/g, '\n');
  const problems = [];
  let changed = 0;
  let already = 0;

  for (const s of steps) {
    const isDone = s.done !== undefined ? text.includes(s.done) : !text.includes(s.doneWhenAbsent);
    if (isDone) { already++; continue; }
    const n = count(text, s.find);
    if (n !== 1) { problems.push(`  - "${s.name}": expected 1 match, found ${n}`); continue; }
    text = typeof s.find === 'string' ? text.replace(s.find, () => s.replace) : text.replace(s.find, s.replace);
    changed++;
  }

  if (problems.length) { failed++; console.log(`FAILED   ${rel}  (file left untouched)\n${problems.join('\n')}`); }
  else if (changed === 0) console.log(`already  ${rel}`);
  else {
    writeFileSync(file, crlf ? text.replace(/\n/g, '\r\n') : text, 'utf8');
    console.log(`edited   ${rel}  (${changed} change${changed > 1 ? 's' : ''})`);
  }
}
console.log(failed ? `\n${failed} file(s) need attention. Send me the FAILED lines.` : '\nAll fixes applied.');
process.exit(failed ? 1 : 0);