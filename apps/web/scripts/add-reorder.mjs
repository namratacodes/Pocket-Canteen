import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/features/student/tracker/OrderTrackerPage.tsx';
let src = readFileSync(file, 'utf8');
if (src.includes('ReorderButton')) { console.log('already added'); process.exit(0); }

const a = "import { PickupCodeCard } from './PickupCodeCard';";
const b = "{order.status === 'completed' && (";
const count = (s, t) => s.split(t).length - 1;
if (count(src, a) !== 1 || count(src, b) !== 1) { console.error('Could not find the spots to edit. Nothing changed.'); process.exit(1); }

const eol = src.includes('\r\n') ? '\r\n' : '\n';
src = src.replace(a, a + eol + "import { ReorderButton } from '../orders/ReorderButton';");
src = src.replace(b, "{order.status === 'completed' && <ReorderButton order={order} />}" + eol + '        ' + b);
writeFileSync(file, src);
console.log('Reorder button added to the tracker');