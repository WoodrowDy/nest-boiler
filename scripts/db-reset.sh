#!/usr/bin/env bash
# 로컬 Postgres 완전 초기화 (볼륨 삭제 후 재기동 → init 스크립트 재실행)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "♻️  Resetting local Postgres (volume will be removed)..."
docker compose down -v
bash "$(dirname "$0")/db-up.sh"
