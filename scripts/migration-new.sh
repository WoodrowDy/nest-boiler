#!/usr/bin/env bash
#
# 마이그레이션 파일을 만든다. 이름이 규칙(_migration-name.sh)에 맞지 않으면 만들지 않는다.
#
#   pnpm migration:generate <이름>   엔티티와 로컬 DB 의 차이로 생성
#   pnpm migration:create <이름>     빈 파일 (데이터 변경 · generate 가 못 쓰는 SQL)
#
# ★ generate 는 로컬 DB 를 먼저 최신으로 올린다 (migration:run).
#   generate 는 엔티티와 "로컬 DB" 를 비교한다. 다른 곳에서 만든 마이그레이션을 아직 안
#   돌렸으면 그 변경까지 내 파일에 또 들어가고, 배포 환경에서 "already exists" 로 깨진다.
#   대상은 언제나 로컬이다 (NODE_ENV=local 고정).
#
# ★ 못 잡는 것: DB 가 코드보다 앞선 경우. 다른 브랜치에서 적용한 컬럼이 로컬 DB 에 남아
#   있으면 generate 가 그 컬럼을 DROP 한다. 생성 직후 migration:lint 가 "파괴적" 으로 보여준다.
#
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck disable=SC1091  # 같은 폴더의 규칙 파일
. scripts/_migration-name.sh

MODE="${1:-}"
NAME="${2:-}"
DIR="src/database/migrations"

case "$MODE" in
  generate | create) ;;
  *)
    echo "사용법: pnpm migration:{generate|create} <이름>"
    exit 1
    ;;
esac

if ! echo "$NAME" | grep -Eq "$MIGRATION_NAME_RE"; then
  if [ -z "$NAME" ]; then
    echo "✗ 이름이 없습니다."
  else
    echo "✗ 이름이 규칙에 맞지 않습니다: $NAME"
  fi
  echo
  print_migration_name_rule
  exit 1
fi

if [ "$MODE" = "create" ]; then
  pnpm exec ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:create "$DIR/$NAME"
  exit 0
fi

echo "▶ 로컬 DB 를 최신으로 올립니다 (migration:run)"
NODE_ENV=local pnpm run typeorm migration:run

echo
echo "▶ 엔티티와 비교해 생성합니다 (migration:generate)"
set +e
OUT=$(NODE_ENV=local pnpm run typeorm migration:generate "$DIR/$NAME" 2>&1)
CODE=$?
set -e
echo "$OUT"

if [ "$CODE" -ne 0 ]; then
  # 차이가 없으면 TypeORM 은 종료코드 1 을 준다. 실패가 아니라 "만들 게 없다" 이다.
  if echo "$OUT" | grep -q "No changes in database schema were found"; then
    echo
    echo "✓ 엔티티와 로컬 DB 가 같습니다. 만들 마이그레이션이 없습니다."
    exit 0
  fi
  exit "$CODE"
fi

# 만든 순간 SQL 을 한 번 보여준다. 커밋할 때는 lint-staged 가 통과한 출력을 숨긴다.
FILE=$(find "$DIR" -name "*-${NAME}.ts" | sort | tail -1)
echo
bash scripts/migration-lint.sh "$FILE"
