import { Repository } from "typeorm";
import { TypeOrmStaticBoardAdapter } from "./typeorm-static-board.adapter";
import { StaticBoard } from "../../entities/static-board.entity";
import { toTransaction } from "src/global/transaction/transaction.bridge";
import { generateStaticBoardMockDto } from "test/domain/static-board/mocks/static-board.mock";

/**
 * 어댑터가 어느 매니저로 쿼리를 날리는지 고정한다. DB 는 붙지 않는다.
 *
 * ★ 시더가 이 경로를 탄다 — Nest 밖에서 `dataSource.getRepository()` 로 어댑터를 만들고,
 *   `dataSource.transaction()` 이 준 매니저를 핸들로 감싸 넘긴다.
 *   생성자가 평범한 Repository 로 서는지, 핸들이 그 매니저로 라우팅되는지가 여기서 갈린다.
 */
const fakeManager = () => ({
  create: jest.fn((_entity, plain) => plain),
  save: jest.fn(async (row) => ({ id: 1, ...row })),
  update: jest.fn(async (..._args: unknown[]) => ({ affected: 1 })),
  softDelete: jest.fn(async (..._args: unknown[]) => ({ affected: 1 })),
  countBy: jest.fn(async (..._args: unknown[]) => 1),
});

describe("TypeOrmStaticBoardAdapter 매니저 선택", () => {
  let own: ReturnType<typeof fakeManager>;
  let outer: ReturnType<typeof fakeManager>;
  let adapter: TypeOrmStaticBoardAdapter;

  beforeEach(() => {
    own = fakeManager();
    outer = fakeManager();
    // 시더와 같은 방식: 평범한 Repository 하나만 있으면 선다
    adapter = new TypeOrmStaticBoardAdapter({ manager: own } as unknown as Repository<StaticBoard>);
  });

  it("트랜잭션을 안 받으면 레포지토리 자신의 매니저로 실행한다", async () => {
    await adapter.create(generateStaticBoardMockDto);

    expect(own.save).toHaveBeenCalled();
    expect(outer.save).not.toHaveBeenCalled();
  });

  it("트랜잭션 핸들을 받으면 그 매니저로 실행한다", async () => {
    await adapter.create(generateStaticBoardMockDto, toTransaction(outer as never));

    expect(outer.save).toHaveBeenCalled();
    expect(own.save).not.toHaveBeenCalled();
  });

  it("수정은 삭제되지 않은 행만 대상으로 하고 영향 행 수를 돌려준다", async () => {
    const affected = await adapter.update(1, { writer: "이작가" });

    expect(affected).toBe(1);
    const [, criteria] = own.update.mock.calls[0];
    expect(criteria).toHaveProperty("id", 1);
    expect(criteria).toHaveProperty("deletedAt");
  });

  it("바꿀 값이 없으면 UPDATE 대신 존재 여부만 센다", async () => {
    const affected = await adapter.update(1, {});

    expect(affected).toBe(1);
    expect(own.update).not.toHaveBeenCalled();
    expect(own.countBy).toHaveBeenCalled();
  });
});
