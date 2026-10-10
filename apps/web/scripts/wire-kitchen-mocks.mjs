import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/mocks/browser.ts';
let src = readFileSync(file, 'utf8');
if (src.includes('kitchenHandlers')) { console.log('already wired'); process.exit(0); }

const eol = src.includes('\r\n') ? '\r\n' : '\n';
const m = src.match(/setupWorker\(\s*(viteSourceGuard\s*,\s*)?/);
if (!m) { console.error('Could not find setupWorker( in', file, '- nothing changed'); process.exit(1); }
src = src.replace(m[0], m[0] + '...kitchenHandlers, ');

const imports = [...src.matchAll(/^import .*$/gm)];
const last = imports[imports.length - 1];
const at = last ? last.index + last[0].length : 0;
src = src.slice(0, at) + eol + "import { kitchenHandlers } from './handlers/kitchen';" + src.slice(at);

writeFileSync(file, src);
console.log('wired kitchen mocks into', file);