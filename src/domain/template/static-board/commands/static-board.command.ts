/**
 * 유스케이스 입력 어휘 — 전송(HTTP) 타입이 아니다.
 *
 * ★ 서비스가 GenerateStaticBoardPayload 를 직접 받으면, 컨트롤러가 사라지는 순간
 *   서비스 시그니처가 같이 깨진다. 애플리케이션 계층이 전송 타입에 의존하는 역전이다.
 *   요청 DTO → 커맨드 변환은 컨트롤러 경계(StaticBoardMapper)가 한다.
 */
export interface CreateStaticBoardCommand {
  category: string;
  writer: string;
  birth: Date;
  phone: string;
  body: string;
  isActivated: boolean;
}

/** 수정은 부분 갱신 — 넘어온 필드만 바꾼다. */
export type UpdateStaticBoardCommand = Partial<CreateStaticBoardCommand>;

/** 조회 조건. 쿼리스트링이 아니라 도메인이 이해하는 조건이다. */
export interface StaticBoardCriteria {
  id?: number;
  category?: string;
  writerLike?: string;
}

/** 페이지 요청. 컨트롤러의 Pagination 데코레이터와 형태는 같지만 HTTP 를 모른다. */
export interface PageRequest {
  page: number;
  pageSize: number;
}
