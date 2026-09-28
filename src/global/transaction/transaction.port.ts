declare const transactionBrand: unique symbol;

/**
 * 열린 트랜잭션을 가리키는 불투명 핸들.
 *
 * ★ 서비스는 이것을 받아서 넘기기만 한다 — 열어볼 수도, 직접 만들 수도 없다.
 *   그래서 "이 함수는 남의 트랜잭션에 합류할 수 있다" 가 시그니처에 드러나면서도
 *   ORM 타입(EntityManager)은 도메인 쪽으로 새지 않는다.
 */
export interface Transaction {
  readonly [transactionBrand]: true;
}

/**
 * 트랜잭션 경계 포트.
 *
 * 여러 서비스를 한 묶음으로 커밋해야 하는 호출자가 쓴다.
 * 어떻게 여는지(queryRunner · connect · commit · rollback · release)는 어댑터가 안다.
 */
export const TRANSACTION_PORT = Symbol("TRANSACTION_PORT");

export interface TransactionPort {
  /**
   * work 를 하나의 트랜잭션 안에서 실행한다.
   * transaction 을 받으면 새로 열지 않고 그대로 합류한다 — commit/rollback 은 연 쪽의 몫.
   */
  run<T>(work: (transaction: Transaction) => Promise<T>, transaction?: Transaction): Promise<T>;
}
