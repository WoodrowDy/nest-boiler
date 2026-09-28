import { StaticBoard } from "../entities/static-board.entity";
import { Transaction } from "src/global/transaction/transaction.port";
import {
  CreateStaticBoardCommand,
  PageRequest,
  StaticBoardCriteria,
  UpdateStaticBoardCommand,
} from "../commands/static-board.command";

/**
 * StaticBoard 아웃바운드 포트 — 도메인이 저장소에게 요구하는 계약.
 *
 * ★ 인터페이스는 런타임에 없다. DI 로 꽂으려면 토큰이 필요하다.
 *   모듈이 이 토큰에 구현을 연결한다(운영: TypeORM, 테스트: 인메모리).
 *
 * ★ 모든 메서드가 transaction 을 선택적으로 받는다.
 *   호출자가 이미 트랜잭션을 열었다면 그 안에서 실행되고, 없으면 각자 원자적으로 실행된다.
 *   넘어오는 것은 불투명 핸들이라 이 파일은 ORM 을 모른다.
 *
 * ★ 쓰기는 "몇 행이 바뀌었는가" 를 돌려준다.
 *   존재 확인과 쓰기를 한 문장으로 합치기 위해서다 — 두 문장이면 그 사이에
 *   남이 지울 수 있고, 그 틈을 막으려고 트랜잭션을 열게 된다.
 *
 * ★ 반환 타입이 엔티티인 것은 이 도메인이 순수 CRUD 라서다.
 *   계산·집계·다른 저장소 값이 섞이면 그때가 도메인 모델을 분리할 시점이다.
 */
export const STATIC_BOARD_PORT = Symbol("STATIC_BOARD_PORT");

export interface StaticBoardPort {
  create(command: CreateStaticBoardCommand, transaction?: Transaction): Promise<StaticBoard>;

  /** 없으면 null. 없는 것은 사실이지 예외가 아니다 — 404 로 볼지는 유스케이스가 정한다. */
  findOne(criteria: StaticBoardCriteria, transaction?: Transaction): Promise<StaticBoard | null>;

  findListAndCount(
    criteria: StaticBoardCriteria,
    page: PageRequest,
    transaction?: Transaction
  ): Promise<{ list: StaticBoard[]; count: number }>;

  /** @returns 수정된 행 수. 0 이면 대상이 없다. */
  update(id: number, command: UpdateStaticBoardCommand, transaction?: Transaction): Promise<number>;

  /** @returns 삭제된 행 수. 0 이면 대상이 없거나 이미 삭제됐다. */
  softDelete(id: number, transaction?: Transaction): Promise<number>;
}
