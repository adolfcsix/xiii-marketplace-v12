#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${STAGING_ENV_FILE:-.env.staging}"
export STAGING_ENV_FILE="$ENV_FILE"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f docker-compose.staging.yml)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy .env.staging.example and configure it first." >&2
  exit 1
fi

export IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short=12 HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)}"
export APP_RELEASE="$IMAGE_TAG"
mkdir -p .deploy
PREVIOUS_TAG=""
[[ -f .deploy/current-staging-tag ]] && PREVIOUS_TAG="$(cat .deploy/current-staging-tag)"

STAGING_ENV_FILE="$ENV_FILE" node tools/staging-preflight.mjs
"${COMPOSE[@]}" config -q

echo "Building staging images for release $IMAGE_TAG ..."
"${COMPOSE[@]}" build --pull api web seller admin

echo "Starting data services ..."
"${COMPOSE[@]}" up -d mongodb mongo-init-replica redis

echo "Starting application services ..."
DEPLOY_ACTIVE=1
rollback_failed_activation() {
  local status=$?
  if [[ "${DEPLOY_ACTIVE:-0}" == "1" && -n "$PREVIOUS_TAG" && "$PREVIOUS_TAG" != "$IMAGE_TAG" ]]; then
    echo "Activation failed; attempting automatic application rollback to $PREVIOUS_TAG ..." >&2
    export IMAGE_TAG="$PREVIOUS_TAG"
    "${COMPOSE[@]}" up -d --no-build --remove-orphans api web seller admin || true
    "${COMPOSE[@]}" up -d --no-deps --force-recreate nginx || true
  fi
  exit "$status"
}
trap rollback_failed_activation ERR
"${COMPOSE[@]}" up -d --no-build --remove-orphans api web seller admin

# Internal readiness does not depend on public DNS/TLS.
echo "Waiting for internal readiness ..."
for attempt in {1..60}; do
  if "${COMPOSE[@]}" exec -T api node -e "fetch('http://127.0.0.1:4000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "60" ]]; then
    echo "API did not become ready." >&2
    "${COMPOSE[@]}" ps
    exit 1
  fi
  sleep 2
done

for service in web seller admin; do
  if ! "${COMPOSE[@]}" exec -T "$service" node -e "fetch('http://127.0.0.1:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "$service did not pass its internal smoke check" >&2
    exit 1
  fi
done

# Recreate Nginx after app containers so upstream DNS is refreshed to their current container IPs.
"${COMPOSE[@]}" up -d --no-deps --force-recreate nginx

echo "Staging release $IMAGE_TAG is internally healthy."
if [[ "${SKIP_EXTERNAL_SMOKE:-0}" != "1" ]]; then
  echo "Running external HTTPS smoke tests ..."
  STAGING_ENV_FILE="$ENV_FILE" EXPECTED_RELEASE="$IMAGE_TAG" node tools/staging-smoke.mjs
fi

# Persist deployment state only after every requested smoke check has passed.
if [[ -n "$PREVIOUS_TAG" && "$PREVIOUS_TAG" != "$IMAGE_TAG" ]]; then
  printf '%s' "$PREVIOUS_TAG" > .deploy/previous-staging-tag
fi
printf '%s' "$IMAGE_TAG" > .deploy/current-staging-tag
DEPLOY_ACTIVE=0
trap - ERR
echo "Deploy complete: $IMAGE_TAG"
