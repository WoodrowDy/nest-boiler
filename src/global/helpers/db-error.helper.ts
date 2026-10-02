/**
 * PostgreSQL 제약 위반 판별.
 *
 * DB 에러는 의미에 따라 다르게 다룬다.
 * - 업무 규칙 위반(중복, 사용 중 삭제)은 catch 한 자리에서 도메인 예외로 바꾼다.
 * - 그 외(연결 끊김, 타임아웃 등)는 잡지 않고 그대로 올린다.
 *
 * TypeORM 0.3 의 QueryFailedError 는 드라이버 에러의 code 를 그대로 가진다.
 */
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

const getCode = (error: unknown): string | undefined => (error as { code?: string })?.code;

/** 유니크 제약 위반. 중복을 업무 충돌(409)로 바꿀 때 쓴다 */
export const isUniqueViolation = (error: unknown): boolean =>
  getCode(error) === PG_UNIQUE_VIOLATION;

/** FK 제약 위반. 참조 중인 행 삭제를 "사용 중"으로 바꿀 때 쓴다 */
export const isForeignKeyViolation = (error: unknown): boolean =>
  getCode(error) === PG_FOREIGN_KEY_VIOLATION;
