// node setup-ml-p6.mjs "<path to phase-6-worker-ops-deployment.md>" [repoRoot]
// Writes apps/ml-service: shared foundation (only files that do not exist yet) + the ops module (worker, admin jobs, deployment) and its tests.
import fs from 'fs'; import path from 'path';
const [spec, repo = '.'] = process.argv.slice(2);
if (!spec) { console.error('usage: node setup-ml-p6.mjs <spec.md> [repoRoot]'); process.exit(1); }
const out = path.join(repo, 'apps', 'ml-service');
const L = fs.readFileSync(spec, 'utf8').split(/\r?\n/);
const a12 = L.findIndex((l) => l.startsWith('## A12.'));
let written = 0, kept = 0;
for (let i = a12; i < L.length; i++) {
  const m = L[i].match(/^\*\*`([^`]+)`\*\*\s*$/);
  if (!m) continue;
  let j = i + 1;
  while (j < L.length && !L[j].startsWith('```')) j++;
  const body = []; j++;
  while (j < L.length && !L[j].startsWith('```')) body.push(L[j++]);
  const f = path.join(out, m[1]);
  const isPhase = /^(app\/modules\/ops\/|app\/worker\.py|scripts\/|Dockerfile|\.dockerignore|ops\/|tests\/p6\/)/.test(m[1]);
  if (fs.existsSync(f) && !isPhase) { kept++; continue; } // never overwrite foundation files other phases may share
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body.join('\n') + '\n');
  written++;
}
for (const f of ['app/__init__.py', 'app/eta/__init__.py', 'app/intelligence/__init__.py', 'app/modules/__init__.py', 'tests/__init__.py', 'tests/integration/__init__.py', 'tests/p6/__init__.py', 'scripts/__init__.py']) {
  const p = path.join(out, f); fs.mkdirSync(path.dirname(p), { recursive: true });
  if (!fs.existsSync(p)) fs.writeFileSync(p, '');
}
fs.writeFileSync(path.join(out, '.gitattributes'), '*.sh text eol=lf\nDockerfile text eol=lf\n');
if (!fs.existsSync(path.join(out, '.env'))) fs.copyFileSync(path.join(out, '.env.example'), path.join(out, '.env'));
console.log(`ml-service: ${written} files written, ${kept} existing foundation files kept`);
