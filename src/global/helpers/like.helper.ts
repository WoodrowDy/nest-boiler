/**
 * LIKE / ILIKE 의 부분검색 패턴을 만든다. 예: "김" → "%김%"
 *
 * 사용자가 넣은 `%` `_` `\` 는 와일드카드가 아니라 글자로 찾아야 하므로 `\` 로 이스케이프한다.
 * PostgreSQL 의 기본 ESCAPE 문자가 `\` 라서 별도 ESCAPE 절은 필요 없다.
 * 두 도메인의 buildSelectQuery 가 `iLike :x` 의 값으로 같이 쓴다.
 */
export const toLikePattern = (term: string): string =>
  `%${term.replaceAll(/[\\%_]/g, (char) => `\\${char}`)}%`;
