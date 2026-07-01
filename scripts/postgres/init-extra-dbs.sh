#!/bin/bash
# Postgres 컨테이너 최초 기동 시 1회 실행됨 (/docker-entrypoint-initdb.d).
# POSTGRES_DB(=nest-boiler-test) 외에 로컬 개발용 DB(nest-boiler)를 추가 생성한다.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  SELECT 'CREATE DATABASE "nest-boiler"'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nest-boiler')\gexec
EOSQL

echo "✅ extra database ensured: nest-boiler"
