#!/usr/bin/env bash
#
# 마이그레이션 작성 단계 가드. 파일 이름 규칙과, up() 안에서 되돌리기 어려운 구문을 본다.
#
#   pnpm migration:lint              스테이징된 것만
#   pnpm migration:lint --all        전체
#   bash scripts/migration-lint.sh <파일...>   (pre-commit 은 lint-staged 가 이 형태로 부른다)
#
# ★ 이름은 막는다. 규칙(_migration-name.sh)에 맞는지는 판단할 여지가 없다.
#
# ★ SQL 은 막지 않고 보여준다.
#   여기 걸리는 구문은 대부분 의도한 것이다. 판단은 사람이 한다.
#   --strict 를 주면 종료코드 1 로 끊는다.
#   pre-commit 에서는 이 경고가 화면에 안 나온다 — lint-staged 는 통과한 작업의 출력을 숨긴다.
#   그래서 migration:generate 가 만든 직후에 한 번 돌려 보여준다.
#
# ★ bash 3.2 에서 돈다. mapfile 을 쓰지 않는다 — macOS 기본 bash 에 없다.
#
set -euo pipefail
cd "$(dirname "$0")/.."

# shellcheck disable=SC1091  # 같은 폴더의 규칙 파일
. scripts/_migration-name.sh

STRICT=0
MODE=""
FILES=""

for a in "$@"; do
  case "$a" in
    --strict) STRICT=1 ;;
    --all)    MODE="all" ;;
    -*)       echo "모르는 옵션: $a"; exit 1 ;;
    *)        MODE="args"; FILES="$FILES $a" ;;
  esac
done

if [ "$MODE" = "all" ]; then
  FILES=$(find src/database/migrations -name '*.ts' 2>/dev/null | sort)
elif [ "$MODE" != "args" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null \
            | grep -E 'src/database/migrations/.*\.ts$' || true)
fi

if [ -z "$(echo "$FILES" | tr -d '[:space:]')" ]; then
  echo "검사할 마이그레이션이 없습니다."
  exit 0
fi

COUNT=0
FOUND=0
NAME_BAD=0

for f in $FILES; do
  [ -f "$f" ] || continue
  COUNT=$((COUNT + 1))

  # 0. 파일 이름 — <타임스탬프 13자리>-동사-대상.ts
  NAME_MSG=""
  if ! basename "$f" .ts | grep -Eq "$MIGRATION_FILE_RE"; then
    NAME_MSG="   ✗ 이름     '<타임스탬프>-동사-대상.ts' 가 아닙니다."
    NAME_BAD=1
  fi

  DOWN_AT=$(grep -n 'public async down' "$f" | head -1 | cut -d: -f1 || true)
  if [ -z "$DOWN_AT" ]; then
    echo "═══ $f"
    if [ -n "$NAME_MSG" ]; then echo "$NAME_MSG"; fi
    echo "   ✗ down() 이 없습니다 — 되돌릴 수 없습니다."
    echo
    FOUND=1
    continue
  fi

  UP=$(sed -n "1,$((DOWN_AT - 1))p" "$f")
  DOWN=$(sed -n "${DOWN_AT},\$p" "$f")

  # 1. 데이터가 사라지는 구문
  D=$(echo "$UP" | grep -nE 'DROP[[:space:]]+(COLUMN|TABLE)' || true)

  # 2. rename — revert 하면 이름은 돌아오지만 값은 안 돌아온다
  R=$(echo "$UP" | grep -nE 'RENAME[[:space:]]+(COLUMN|TO)' || true)

  # 3. 기존 행 처리 없는 NOT NULL. CREATE TABLE 안의 NOT NULL 은 세지 않는다.
  #    ★ 처리 방법은 UPDATE 만이 아니다 — 낡은 행을 DELETE 하거나, 남아 있으면
  #      RAISE EXCEPTION 으로 멈춰 사람에게 넘기는 것도 정당한 처리다. 셋 다 인정한다.
  N=$(echo "$UP" | grep -nE 'ALTER[[:space:]]+COLUMN.*SET[[:space:]]+NOT[[:space:]]+NULL' || true)
  HAS_BACKFILL=$(echo "$UP" | grep -cE 'UPDATE[[:space:]]|DELETE[[:space:]]+FROM|RAISE[[:space:]]+EXCEPTION' || true)
  NN=""
  if [ -n "$N" ] && [ "$HAS_BACKFILL" -eq 0 ]; then NN="1"; fi

  # 4. down() 이 비었는지
  DOWN_STMT=$(echo "$DOWN" | grep -cE 'queryRunner\.(query|dropTable|dropColumn)' || true)

  # 5. 같은 컬럼을 DROP 하고 다시 ADD — ALTER 로 합칠 후보
  DROPPED=$(echo "$UP" | grep -oE 'DROP[[:space:]]+COLUMN[[:space:]]+"[^"]+"' | grep -oE '"[^"]+"' | sort -u || true)
  ADDED=$(echo "$UP" | grep -oE 'ADD([[:space:]]+COLUMN)?[[:space:]]+"[^"]+"' | grep -oE '"[^"]+"' | sort -u || true)
  BOTH=$(comm -12 <(echo "$DROPPED") <(echo "$ADDED") 2>/dev/null | tr -d '"' | tr '\n' ' ' | sed 's/ *$//' || true)

  if [ -z "$NAME_MSG$D$R$NN$BOTH" ] && [ "$DOWN_STMT" -gt 0 ]; then
    continue
  fi

  echo "═══ $f"
  if [ -n "$NAME_MSG" ]; then echo "$NAME_MSG"; fi
  if [ -n "$D" ]; then
    echo "$D" | sed 's/^/   ⚠ 파괴적  /' | cut -c1-110
    FOUND=1
  fi
  if [ -n "$R" ]; then
    echo "$R" | sed 's/^/   ⚠ rename   /' | cut -c1-110
    FOUND=1
  fi
  if [ -n "$NN" ]; then
    echo "   ⚠ NOT NULL  기존 행 처리(UPDATE·DELETE·RAISE) 없이 SET NOT NULL 입니다."
    FOUND=1
  fi
  if [ "$DOWN_STMT" -eq 0 ]; then
    echo "   ⚠ down 빈껍데기  down() 에 실행 구문이 없습니다 — revert 해도 아무 일도 안 일어납니다."
    FOUND=1
  fi
  if [ -n "$BOTH" ]; then
    echo "   ⚠ DROP+ADD  같은 컬럼을 지웠다 다시 추가합니다 ($BOTH) — ALTER 로 합칠 수 있는지 보세요."
    FOUND=1
  fi
  echo
done

if [ "$FOUND" -eq 0 ] && [ "$NAME_BAD" -eq 0 ]; then
  echo "✓ 걸리는 구문 없음 (${COUNT}건 검사)"
  exit 0
fi

echo "────────────────────────────────────────────────────────"
if [ "$NAME_BAD" -eq 1 ]; then
  print_migration_name_rule
  echo
  echo "✗ 이름이 규칙에 맞지 않는 파일이 있습니다."
  echo "  새 파일이면 지우고 이름을 붙여 다시 만드세요: pnpm migration:generate <이름>"
  exit 1
fi
echo "위 구문들이 의도한 것인지 확인하세요. 의도한 것이면 그대로 진행하면 됩니다."
if [ "$STRICT" -eq 1 ]; then exit 1; fi
exit 0
