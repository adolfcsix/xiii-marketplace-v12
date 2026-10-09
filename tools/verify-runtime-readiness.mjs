import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];
const notes = [];

function fail(message) { failures.push(message); }
function warn(message) { warnings.push(message); }
function ok(message) { notes.push(message); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

const required = [
  'package.json',
  '.env.example',
  'docker-compose.yml',
  'services/api/package.json',
  'services/api/src/main.ts',
  'apps/web/package.json',
  'apps/seller/package.json',
  'apps/admin/package.json',
];
for (const rel of required) exists(rel) ? ok(`present: ${rel}`) : fail(`missing required file: ${rel}`);

// Check local TS/TSX imports resolve to a source file.
const sourceRoots = ['services/api/src', 'apps/web', 'apps/seller', 'apps/admin'];
const sourceFiles = [];
function walk(dir) {
  if (!exists(dir)) return;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) sourceFiles.push(rel);
  }
}
for (const dir of sourceRoots) walk(dir);

const importRe = /(?:from\s+|require\(|import\s*\()\s*["']([^"']+)["']/g;
for (const rel of sourceFiles) {
  const text = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const match of text.matchAll(importRe)) {
    const spec = match[1];
    if (!spec.startsWith('.')) continue;
    const base = path.resolve(root, path.dirname(rel), spec);
    const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.js')];
    if (!candidates.some(p => fs.existsSync(p))) fail(`broken local import in ${rel}: ${spec}`);
  }
}

// Verify package manifests declare every external package imported from source.
for (const ws of ['services/api', 'apps/web', 'apps/seller', 'apps/admin']) {
  const pkgPath = path.join(root, ws, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const declared = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
  const builtins = new Set(['fs','path','crypto','os','url','stream','util','http','https','events','assert','buffer','querystring','zlib']);
  const wsFiles = sourceFiles.filter(f => f === ws || f.startsWith(`${ws}${path.sep}`));
  for (const rel of wsFiles) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    for (const match of text.matchAll(importRe)) {
      const spec = match[1];
      if (spec.startsWith('.') || spec.startsWith('/')) continue;
      if (spec.startsWith('node:')) continue;
      const packageName = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (builtins.has(packageName)) continue;
      if (!declared.has(packageName)) fail(`undeclared dependency in ${ws}: ${packageName} imported by ${rel}`);
    }
  }
}

// Next.js 15 App Router: page params/searchParams are asynchronous.
for (const app of ['apps/web/app', 'apps/seller/app', 'apps/admin/app']) {
  const pages = sourceFiles.filter(f => f.startsWith(`${app}${path.sep}`) && f.endsWith('page.tsx'));
  for (const rel of pages) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    if (rel.includes('[') && /params\s*:\s*\{/.test(text)) fail(`Next 15 sync params detected: ${rel}`);
    if (/searchParams\s*:\s*\{/.test(text)) fail(`Next 15 sync searchParams detected: ${rel}`);
  }
}

// Reject generated build artifacts in source archive; they can hide stale build results.
for (const rel of ['services/api/dist', 'apps/web/.next', 'apps/seller/.next', 'apps/admin/.next']) {
  if (exists(rel)) warn(`generated artifact exists and should normally be excluded from a clean source archive: ${rel}`);
}

if (!exists('package-lock.json')) warn('package-lock.json is not present yet. Generate and commit it after the first successful npm install for reproducible builds.');

console.log(`Runtime-readiness static checks: ${sourceFiles.length} JS/TS source files inspected.`);
for (const message of warnings) console.log(`WARN: ${message}`);
if (failures.length) {
  for (const message of failures) console.error(`FAIL: ${message}`);
  process.exit(1);
}
console.log(`PASS: local imports, dependency declarations and Next.js 15 async route props are consistent.`);
