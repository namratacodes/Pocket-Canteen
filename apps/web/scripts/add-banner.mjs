import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2] ?? 'src/features/student/canteens/CanteenSelectorPage.tsx';
let src = readFileSync(file, 'utf8');
if (src.includes('ActiveOrderBanner')) { console.log('already added'); process.exit(0); }

const m = /return\s*\(\s*<([A-Za-z][\w.]*)?/.exec(src);
if (!m) { console.error('Could not find the returned JSX in', file, '- nothing changed'); process.exit(1); }

// walk to the end of the first opening tag (skipping anything inside { } and quotes)
let i = m.index + m[0].length;
let depth = 0;
let quote = null;
for (; i < src.length; i++) {
  const c = src[i];
  if (quote) { if (c === quote && src[i - 1] !== '\\') quote = null; continue; }
  if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
  if (c === '{') { depth++; continue; }
  if (c === '}') { depth--; continue; }
  if (c === '>' && depth === 0 && src[i - 1] !== '=') break;
}
if (src[i - 1] === '/') { console.error('The first JSX element is self-closing. Add the banner by hand.'); process.exit(1); }

const eol = src.includes('\r\n') ? '\r\n' : '\n';
src = src.slice(0, i + 1) + eol + '      <ActiveOrderBanner />' + src.slice(i + 1);

const importLines = [...src.matchAll(/^.*from\s+['"][^'"]+['"];?[ \t]*$/gm)];
const last = importLines[importLines.length - 1];
const at = last ? last.index + last[0].length : 0;
src = src.slice(0, at) + eol + "import { ActiveOrderBanner } from '@/features/student/orders/ActiveOrderBanner';" + src.slice(at);

writeFileSync(file, src);
console.log('banner added to', file);