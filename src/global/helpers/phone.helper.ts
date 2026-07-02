import { regexConstants } from "../constants/regex.constants";

/**
 * 전화번호에서 숫자 외 문자를 제거해 정규화한다.
 * 예: "010-1234-5678" → "01012345678"
 *
 * DTO(@Transform)와 시드 등 DTO 를 거치지 않는 경로에서 공통으로 사용하는 단일 소스.
 */
export const normalizePhone = (value: string): string =>
  value.replace(regexConstants.props.EVERY_NON_INT, "");
