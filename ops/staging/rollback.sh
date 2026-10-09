#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${STAGING_ENV_FILE:-.env.staging}"
export STAGING_ENV_FILE="$ENV_FILE"
if [[ ! -f .deploy/previous-staging-tag ]]; then
  echo "No previous staging image tag is recorded in .deploy/previous-staging-tag" >&2
  exit 1
fi
export IMAGE_TAG="${IMAGE_TAG:-$(cat .deploy/previous-staging-tag)}"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f docker-compose.staging.yml)

echo "Rolling staging back to image tag: $IMAGE_TAG"
"${COMPOSE[@]}" up -d --no-build --remove-orphans api web seller admin
for attempt in {1..45}; do
  if "${COMPOSE[@]}" exec -T api node -e "fetch('http://127.0.0.1:4000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    "${COMPOSE[@]}" up -d --no-deps --force-recreate nginx
    printf '%s' "$IMAGE_TAG" > .deploy/current-staging-tag
    echo "Rollback health check passed."
    exit 0
  fi
  sleep 2
done
echo "Rollback target did not become healthy." >&2
exit 1
