import fs from 'node:fs';
const required=[
  'services/api/src/common/config/env.validation.ts',
  'services/api/src/common/request-id.middleware.ts',
  'services/api/src/common/logging/request-logging.interceptor.ts',
  'services/api/src/common/rate-limit/rate-limit.guard.ts',
  'services/api/src/storage/storage.controller.ts',
  'services/api/src/storage/storage.service.ts',
  'docker/Dockerfile.api','docker/Dockerfile.next','docker-compose.prod.yml',
  'ops/nginx/xiii.conf','scripts/backup-mongo.sh','scripts/restore-mongo.sh','docs/PRODUCTION_HARDENING.md'
];
for(const f of required)if(!fs.existsSync(f))throw new Error(`Missing ${f}`);
const app=fs.readFileSync('services/api/src/app.module.ts','utf8');
for(const token of ['RateLimitModule','RateLimitGuard','RequestLoggingInterceptor','StorageModule','RequestIdMiddleware'])if(!app.includes(token))throw new Error(`AppModule missing ${token}`);
const main=fs.readFileSync('services/api/src/main.ts','utf8');
for(const token of ['helmet','CORS_ORIGINS','enableShutdownHooks','HTTP_JSON_LIMIT'])if(!main.includes(token))throw new Error(`main.ts missing ${token}`);
const storage=fs.readFileSync('services/api/src/storage/storage.service.ts','utf8');
for(const token of ['createPresignedPost','content-length-range','image/webp'])if(!storage.includes(token))throw new Error(`storage missing ${token}`);
const env=fs.readFileSync('.env.production.example','utf8');
if(/JWT_ACCESS_SECRET=change-me/.test(env))throw new Error('Production env contains default JWT secret');
console.log('Production hardening verification: PASS');
