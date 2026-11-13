#!/usr/bin/env bash
#
# 마이그레이션 이름 규칙. migration-new.sh(만들 때) 와 migration-lint.sh(커밋할 때) 가 함께 읽는다.
#
#   형식  동사-대상 (kebab-case, 소문자 · 숫자)      예) add-board-status
#   동사  스키마  create | add | alter | rename | drop
#         데이터  insert | update | delete
#
# ★ repository 와 같은 원칙이다 — 마이그레이션도 SQL 동사를 쓴다.
#   remove 는 drop 과 겹쳐서 받지 않는다.
#
# ★ 파일은 <타임스탬프 13자리>-<이름>.ts, 클래스는 <PascalCase 이름><타임스탬프> 가 된다.
#   add-board-status → 1794…-add-board-status.ts / AddBoardStatus1794…  (TypeORM 이 변환한다)
#

# shellcheck disable=SC2034  # source 하는 쪽에서 쓴다
MIGRATION_NAME_RE='^(create|add|alter|rename|drop|insert|update|delete)(-[a-z0-9]+)+$'
# shellcheck disable=SC2034
MIGRATION_FILE_RE="^[0-9]{13}-${MIGRATION_NAME_RE#^}"

print_migration_name_rule() {
  cat <<'EOF'
마이그레이션 이름 규칙: 동사-대상 (kebab-case, 소문자 · 숫자)
  스키마  create | add | alter | rename | drop
  데이터  insert | update | delete
  예) create-user-table · add-board-status · rename-user-phone · update-board-status-default
EOF
}
