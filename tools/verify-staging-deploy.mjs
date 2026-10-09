import fs from 'node:fs';

const failures = [];
const required = [
  '.env.staging.example',
  'docker-compose.staging.yml',
  'ops/nginx/staging.conf.template',
  'ops/staging/deploy.sh',
  'ops/staging/rollback.sh',
  'tools/staging-preflight.mjs',
  'tools/staging-smoke.mjs',
  '.github/workflows/ci.yml',
  '.github/workflows/staging-deploy.yml',
  'docs/STAGING_DEPLOY.md',
  'docs/GO_LIVE_CHECKLIST.md',
];
for (const file of required) if (!fs.existsSync(file)) failures.push(`missing ${file}`);

function requireMarkers(file, markers) {
  const text = fs.readFileSync(file, 'utf8');
  for (const marker of markers) if (!text.includes(marker)) failures.push(`${file} missing marker: ${marker}`);
}

requireMarkers('docker-compose.staging.yml', ['--replSet','service_healthy','APP_RELEASE','staging.conf.template','no-new-privileges','mongo_staging']);
requireMarkers('ops/staging/deploy.sh', ['staging-preflight','config -q','--remove-orphans','previous-staging-tag','staging-smoke','automatic application rollback','force-recreate nginx','EXPECTED_RELEASE']);
requireMarkers('ops/staging/rollback.sh', ['previous-staging-tag','--no-build','health/ready']);
requireMarkers('.github/workflows/ci.yml', ['npm run typecheck','npm run build','npm run e2e:stack','upload-artifact']);
requireMarkers('.github/workflows/staging-deploy.yml', ['workflow_dispatch','STAGING_SSH_PRIVATE_KEY','known_hosts','ops/staging/deploy.sh','Invalid ref']);
requireMarkers('.env.staging.example', ['xiii_marketplace_staging','https://','STORAGE_BUCKET=xiii-media-staging','IMAGE_TAG']);

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const script of ['verify:staging','staging:preflight','staging:smoke','staging:deploy','staging:rollback']) {
  if (!pkg.scripts?.[script]) failures.push(`package.json missing script ${script}`);
}

if (failures.length) {
  for (const failure of failures) console.error('FAIL:', failure);
  process.exit(1);
}
console.log('Staging/deploy verification passed: environment template, compose, CI, deploy, rollback and smoke-test assets are present.');
