import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const npx = isWin ? 'npx.cmd' : 'npx';
let devProcess = null;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
}

function commandWorks(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'ignore', env: process.env });
  return !result.error && result.status === 0;
}

async function waitFor(url, label, timeoutMs = 120_000) {
  const started = Date.now();
  let lastError = '';
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) { console.log(`READY ${label}: ${url}`); return; }
      lastError = `HTTP ${response.status}`;
    } catch (error) { lastError = error instanceof Error ? error.message : String(error); }
    await new Promise(resolve => setTimeout(resolve, 1_000));
  }
  throw new Error(`Timeout waiting for ${label}: ${url}. Last error: ${lastError}`);
}

async function waitForMongoReplica(timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = spawnSync('docker', ['compose','exec','-T','mongodb','mongosh','--quiet','--eval','try { print(rs.status().ok) } catch(e) { print(0) }'], { cwd: root, encoding: 'utf8' });
    if (!result.error && result.status === 0 && String(result.stdout).trim().endsWith('1')) return;
    await new Promise(resolve => setTimeout(resolve, 1_500));
  }
  throw new Error('MongoDB replica set did not become ready in time.');
}

function stopDev() {
  if (!devProcess || !devProcess.pid) return;
  if (isWin) spawnSync('taskkill', ['/PID', String(devProcess.pid), '/T', '/F'], { stdio: 'ignore' });
  else {
    try { process.kill(-devProcess.pid, 'SIGTERM'); } catch { try { devProcess.kill('SIGTERM'); } catch {} }
  }
  devProcess = null;
}

async function main() {
  if (!fs.existsSync(path.join(root, '.env'))) {
    fs.copyFileSync(path.join(root, '.env.example'), path.join(root, '.env'));
    console.log('Created .env from .env.example for local E2E.');
  }
  if (!fs.existsSync(path.join(root, 'node_modules'))) throw new Error('node_modules is missing. Run npm install first.');
  if (!commandWorks('docker', ['compose','version'])) throw new Error('Docker Compose is unavailable. Install/start Docker Desktop first.');

  run(npm, ['run','runtime:preflight']);
  run(npm, ['run','verify:runtime-readiness']);
  run(npm, ['run','verify:e2e']);

  run('docker', ['compose','up','-d','mongodb','mongo-init-replica','redis','minio','minio-init']);
  await waitForMongoReplica();
  run(npm, ['run','seed','--workspace','services/api']);

  devProcess = spawn(npm, ['run','dev'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    detached: !isWin,
  });
  devProcess.on('exit', code => { if (code && code !== 0) console.error(`Development stack exited with code ${code}`); });

  try {
    await Promise.all([
      waitFor('http://127.0.0.1:4000/api/v1/health/ready', 'API readiness'),
      waitFor('http://127.0.0.1:3000', 'Buyer web'),
      waitFor('http://127.0.0.1:3001/login', 'Seller web'),
      waitFor('http://127.0.0.1:3002/login', 'Admin web'),
    ]);
    run(npx, ['playwright','test','-c','e2e/playwright.config.ts']);
    console.log('\nE2E PASS: critical Buyer → Seller → Buyer → Admin browser flow completed.');
  } finally {
    stopDev();
  }
}

process.on('SIGINT', () => { stopDev(); process.exit(130); });
process.on('SIGTERM', () => { stopDev(); process.exit(143); });
main().catch(error => { stopDev(); console.error('\nE2E STACK FAILED:', error instanceof Error ? error.message : error); process.exit(1); });
