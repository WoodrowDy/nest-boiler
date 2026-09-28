/**
 * 도메인 예외 — HTTP 를 모른다.
 *
 * ★ 판별: 이 코드가 배치나 CLI 에서 불려도 말이 되는가.
 *   "404" 는 HTTP 의 어휘다. 도메인은 "없다" 까지만 말하고,
 *   상태코드로의 번역은 인바운드 경계(DomainExceptionFilter)가 한 곳에서 한다.
 */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** 요청한 대상이 없다. */
export class NotFoundDomainError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** 입력이나 현재 상태가 요청을 받아들일 수 없다. */
export class InvalidRequestDomainError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}
