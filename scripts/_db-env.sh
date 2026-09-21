# shellcheck shell=bash
#
# 환경 판정 · env 파일 확인 · 접속 대상 표시.  ★ 실행하지 말고 source 로 부른다.
#
#   ENV=dev . scripts/_db-env.sh
#
# 부르고 나면 이것들이 잡혀 있다 — ENV · ENV_FILE · DB_HOST · DB_PORT · DB_NAME
#
# ★ 한 곳에 모아둔 이유.
#   "어느 DB 에 붙는가" 를 확인하는 검사가 스크립트마다 복사되면, 한쪽만 고쳐지고
#   다른 쪽은 뚫린 채로 남는다. 붙기 전에 대상을 보여주는 일은 한 군데서만 한다.

case "${ENV:-}" in
  dev | prod) ;;
  *)
    echo "✗ ENV 가 dev · prod 중 하나여야 합니다 (받은 값: '${ENV:-}')"
    exit 1
    ;;
esac

ENV_FILE="envs/.env.${ENV}"
if [ ! -f "$ENV_FILE" ]; then
  echo "✗ ${ENV_FILE} 이 없습니다."
  echo "  → cp envs/.env.${ENV}.example ${ENV_FILE} 후 값을 채우세요."
  exit 1
fi

# 어느 DB 에 붙는지 눈에 보여준다. 암호는 찍지 않는다.
_read_env() {
  grep -E "^${1}=" "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

DB_HOST="$(_read_env DB_HOST)"
# shellcheck disable=SC2034  # migrate.sh 가 접속 대상을 찍을 때 읽는다
DB_PORT="$(_read_env DB_PORT)"
DB_NAME="$(_read_env DB_NAME)"
EXPECTED_DB_NAME="$(_read_env EXPECTED_DB_NAME)"

# ★ DB 에 닿는 방법은 인프라마다 다르다 — ssh 터널 · cloud-sql-proxy · IAM 토큰.
#   그 부분만 scripts/db-connect.sh 로 갈아끼운다. 이 파일은 고치지 않는다.
#
#   보일러를 업데이트할 때 프로젝트 코드와 충돌하지 않게 하려는 것이다. 여기를 직접
#   고치기 시작하면 다음 업데이트마다 그 자리가 부딪힌다.
#
#   ★ env 를 읽은 뒤에 부른다. 그래야 그 값을 보고 터널을 뚫을 수 있고, 덮어쓴 값이
#     살아남는다. 순서가 반대면 _read_env 가 터널이 잡은 포트를 지워버린다.
#
#   ★ 덮어쓸 때는 반드시 export 해야 한다. 실제 접속은 자식 프로세스(typeorm)가 하고,
#     dotenv 는 이미 있는 process.env 를 덮지 않으므로 export 한 값이 이긴다.
if [ -f scripts/db-connect.sh ]; then
  # shellcheck disable=SC1091  # 프로젝트가 두는 선택 파일이라 정적 분석이 못 따라간다
  . scripts/db-connect.sh
fi

if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ]; then
  echo "✗ ${ENV_FILE} 에 DB_HOST 또는 DB_NAME 이 비어 있습니다."
  exit 1
fi

# ★ 선택 검사 — 환경과 DB 가 어긋나는 것을 잡는다.
#
#   EXPECTED_DB_NAME 이 env 파일에 적혀 있을 때만 돈다. 인자로 준 환경과 실제 붙는
#   DB 가 같은지 보는 것이라, prod 설정을 .env.dev 에 잘못 복사한 경우를 잡는다.
#   환경마다 DB 가 완전히 분리돼 있으면 비워두면 된다 — 그때는 검사 없이 넘어간다.
if [ -n "$EXPECTED_DB_NAME" ] && [ "$DB_NAME" != "$EXPECTED_DB_NAME" ]; then
  echo "✗ ${ENV_FILE} 의 DB_NAME 이 ${ENV} 환경과 맞지 않습니다."
  echo "  기대: ${EXPECTED_DB_NAME}"
  echo "  실제: ${DB_NAME}"
  exit 1
fi
