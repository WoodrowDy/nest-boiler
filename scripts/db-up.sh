#!/usr/bin/env bash
# 로컬 Postgres 기동 후 healthy 상태가 될 때까지 대기
set -euo pipefail
cd "$(dirname "$0")/.."

CONTAINER="nest-boiler-postgres"

echo "🐘 Starting local Postgres (docker compose)..."
docker compose up -d

echo "⏳ Waiting for Postgres to be healthy..."
for _ in $(seq 1 30); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo "starting")"
  if [ "$status" = "healthy" ]; then
    echo "✅ Postgres is healthy."
    exit 0
  fi
  sleep 2
done

echo "❌ Postgres did not become healthy in time."
docker compose logs --tail=30 postgres || true
exit 1
