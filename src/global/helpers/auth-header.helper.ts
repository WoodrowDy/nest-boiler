export interface ParsedAuthHeader {
  /** 보낸 그대로. 비교하는 쪽이 대소문자를 무시한다 (RFC 7235). */
  scheme: string;
  credential: string;
}

// 스킴을 20자 이내로 제한해, 공백이 섞인 자격증명의 앞부분이 스킴으로 읽히지 않게 한다.
const AUTH_HEADER_PATTERN = /^([A-Za-z][A-Za-z0-9-]{0,19})[ \t]+(\S.*)$/;

export const parseAuthHeader = function (value: unknown): ParsedAuthHeader | undefined {
  const matched = typeof value === "string" ? AUTH_HEADER_PATTERN.exec(value) : undefined;

  return matched ? { scheme: matched[1], credential: matched[2].trim() } : undefined;
};
