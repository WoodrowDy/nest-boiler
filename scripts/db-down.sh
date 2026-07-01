#!/usr/bin/env bash
# 로컬 Postgres 중지 (데이터 볼륨은 유지)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "🛑 Stopping local Postgres..."
docker compose down
echo "✅ Stopped."
