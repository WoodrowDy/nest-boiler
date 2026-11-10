/**
 * 반드시 있어야 하는 환경 변수를 읽는다. 비어 있으면 그 자리에서 이름을 대고 던진다.
 *
 * ★ Number.parseInt(process.env.X) 는 값이 없으면 NaN 을 돌려주고 아무 말도 하지 않는다.
 *   그 NaN 은 포트 바인딩이나 DB 접속처럼 한참 뒤에서, 원인과 상관없는 메시지로 터진다.
 * ★ app.module 의 Joi 검증은 Nest 가 뜰 때만 돈다. typeorm.config 는 마이그레이션 CLI 가
 *   Nest 없이 직접 읽으므로, 거기서 쓰는 값은 이 함수가 지킨다.
 * ★ 빈 문자열도 없는 것으로 본다 — env 파일에 `KEY=` 한 줄만 남은 경우다.
 */
export const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(
      `환경 변수 ${key} 가 비어 있습니다 — NODE_ENV="${process.env.NODE_ENV ?? "(없음)"}"`
    );
  }

  return value;
};
