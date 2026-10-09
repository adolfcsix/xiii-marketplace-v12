import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'scripts/windows/preflight.ps1',
  'scripts/windows/start-local.ps1',
  'scripts/windows/diagnose-local.ps1',
  'scripts/windows/stop-infra.ps1',
  'RUN_XIII_WINDOWS.bat',
  'CHECK_XIII_WINDOWS.bat',
  'DIAGNOSE_XIII_WINDOWS.bat',
  'STOP_XIII_INFRA.bat',
  'RESET_XIII_LOCAL_DATA.bat',
  'TEST_XIII_E2E_WINDOWS.bat',
  'docs/LOCAL_WINDOWS_RUNBOOK.md',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing ${file}`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for (const script of ['local:windows:check','local:windows','local:windows:diagnose','local:windows:stop']) {
  if (!pkg.scripts?.[script]) throw new Error(`Missing package script ${script}`);
}
const start = fs.readFileSync(path.join(root,'scripts/windows/start-local.ps1'),'utf8');
for (const needle of ['npm install','verify:runtime-readiness','npm run typecheck','docker compose up','mongo-init-replica','npm run seed --workspace services/api','npm run dev']) {
  if (!start.includes(needle)) throw new Error(`start-local.ps1 missing ${needle}`);
}
const diag = fs.readFileSync(path.join(root,'scripts/windows/diagnose-local.ps1'),'utf8');
if (!diag.includes('***REDACTED***')) throw new Error('Diagnostics must redact env values');
if (diag.includes('Get-Content ".env" -Raw')) throw new Error('Diagnostics must not dump raw .env');
console.log(`Windows local runner verification passed: ${required.length} required files.`);
