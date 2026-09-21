#!/usr/bin/env bash
#
# 배포 환경 마이그레이션. 배포와 분리해서 사람이 확인하고 돌린다.
#
#   pnpm migrate:show:dev      적용 예정 목록만 확인
#   pnpm migrate:run:dev       확인하고 적용
#   pnpm migrate:revert:dev    마지막 한 건 철회
#
# ★ 서버에서 돌린다. 배포 서버에 ssh 로 들어가 거기서 실행한다 —
#   DB 가 사설 서브넷에 있어도 서버는 이미 그 안에 있어서 터널이 필요 없다.
#
# ★ 왜 배포 스크립트에 넣지 않았나.
#   스키마 변경은 되돌리기가 비싸다. 배포가 자동으로 돌리면 그런 변경이 아무도
#   안 본 채로 나간다. 순서는 언제나 마이그레이션 먼저, 배포 나중이고,
#   순서를 어기면 앱이 부팅을 거부한다(assertNoPendingMigrations).
#
set -euo pipefail

ENV="${1:-}"
ACTION="${2:-run}"
case "$ACTION" in
  run | show | revert) ;;
  *)
    echo "사용법: pnpm migrate:{show|run|revert}:{dev|prod}"
    exit 1
    ;;
esac

cd "$(dirname "$0")/.."

# 환경 판정 · env 파일 확인 · DB 이름 가드
# shellcheck disable=SC1091  # 실행 시점에만 존재하는 경로라 정적 분석이 못 따라간다
. scripts/_db-env.sh

echo "════════════════════════════════════════════════════════════"
echo " 환경 : ${ENV}"
echo " 대상 : ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "════════════════════════════════════════════════════════════"
echo
echo "▶ 현재 상태  ([X] 적용됨 · [ ] 적용 예정)"
NODE_ENV="$ENV" pnpm run typeorm migration:show

if [ "$ACTION" = "show" ]; then
  exit 0
fi

# ★ TTY 가 없으면 거부한다.
#   ssh host '명령' 형태로 돌리면 read 가 그냥 통과해서 확인이 무력해진다.
if [ ! -t 0 ]; then
  echo
  echo "✗ 확인 입력을 받을 수 없습니다 (TTY 없음)."
  echo "  ssh 로 접속한 뒤 셸에서 직접 실행해주세요."
  exit 1
fi

echo
if [ "$ACTION" = "revert" ]; then
  # ★ 철회는 적용보다 위험하다. 컬럼을 되돌리면 그 안에 있던 값은 돌아오지 않는다.
  echo "⚠ 마지막에 적용된 한 건을 되돌립니다. [X] 중 가장 아래 항목입니다."
  echo "  데이터가 함께 사라질 수 있습니다."
  read -rp "되돌리려면 revert-${ENV} 를 그대로 입력: " CONFIRM
  [ "$CONFIRM" = "revert-${ENV}" ] || {
    echo "취소했습니다."
    exit 1
  }
  NODE_ENV="$ENV" pnpm run typeorm migration:revert
else
  # ★ y 한 글자로 넘기지 않는다. prod 를 dev 로 착각한 채 엔터를 치는 것을 막는다.
  read -rp "위 [ ] 항목을 ${DB_NAME} 에 적용합니다. 계속하려면 ${ENV} 를 그대로 입력: " CONFIRM
  [ "$CONFIRM" = "$ENV" ] || {
    echo "취소했습니다."
    exit 1
  }
  NODE_ENV="$ENV" pnpm run typeorm migration:run
fi

echo
echo "▶ 이후 상태"
NODE_ENV="$ENV" pnpm run typeorm migration:show
