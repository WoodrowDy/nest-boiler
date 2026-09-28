import { Test } from "@nestjs/testing";
import { StaticBoardService } from "src/domain/template/static-board/services/static-board.service";
import { STATIC_BOARD_PORT } from "src/domain/template/static-board/ports/static-board.port";
import { TRANSACTION_PORT, Transaction } from "src/global/transaction/transaction.port";
import { NotFoundDomainError } from "src/global/errors/domain.error";
import { InMemoryStaticBoardAdapter } from "../fakes/in-memory-static-board.adapter";
import { ImmediateTransactionAdapter } from "test/utils/immediate-transaction.adapter";
import { generateStaticBoardMockDto } from "../mocks/static-board.mock";

/**
 * 이 파일이 포트 도입의 실익이다 — 도커도, DB 도, 마이그레이션도 필요 없다.
 * 토큰에 인메모리 구현을 꽂는 것으로 끝난다.
 */
describe("StaticBoardService (단위)", () => {
  let service: StaticBoardService;
  let staticBoards: InMemoryStaticBoardAdapter;
  let transaction: ImmediateTransactionAdapter;

  const page = { page: 1, pageSize: 10 };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StaticBoardService,
        { provide: STATIC_BOARD_PORT, useClass: InMemoryStaticBoardAdapter },
        { provide: TRANSACTION_PORT, useClass: ImmediateTransactionAdapter },
      ],
    }).compile();

    service = moduleRef.get(StaticBoardService);
    staticBoards = moduleRef.get(STATIC_BOARD_PORT);
    transaction = moduleRef.get(TRANSACTION_PORT);
  });

  it("생성하면 id 가 붙어 돌아온다", async () => {
    const created = await service.generateStaticBoard(generateStaticBoardMockDto);

    expect(created.id).toBe(1);
    expect(created.writer).toBe(generateStaticBoardMockDto.writer);
  });

  it("없는 id 를 조회하면 도메인 예외를 던진다", async () => {
    await expect(service.getStaticBoard({ id: 404 })).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("수정하면 바뀐 값이 조회된다", async () => {
    const created = await service.generateStaticBoard(generateStaticBoardMockDto);

    await service.modifyStaticBoard(created.id, { writer: "이작가" });

    const found = await service.getStaticBoard({ id: created.id });
    expect(found.writer).toBe("이작가");
    // 넘기지 않은 필드는 그대로다
    expect(found.category).toBe(generateStaticBoardMockDto.category);
  });

  it("없는 id 를 수정하면 도메인 예외를 던진다", async () => {
    await expect(service.modifyStaticBoard(404, { writer: "이작가" })).rejects.toBeInstanceOf(
      NotFoundDomainError
    );
  });

  it("삭제하면 더 이상 조회되지 않는다", async () => {
    const created = await service.generateStaticBoard(generateStaticBoardMockDto);

    await service.removeStaticBoard(created.id);

    await expect(service.getStaticBoard({ id: created.id })).rejects.toBeInstanceOf(
      NotFoundDomainError
    );
  });

  it("이미 삭제된 글을 다시 삭제하면 도메인 예외를 던진다", async () => {
    const created = await service.generateStaticBoard(generateStaticBoardMockDto);
    await service.removeStaticBoard(created.id);

    await expect(service.removeStaticBoard(created.id)).rejects.toBeInstanceOf(NotFoundDomainError);
  });

  it("조회 조건과 페이지가 목록에 적용된다", async () => {
    await service.generateStaticBoard(generateStaticBoardMockDto);
    await service.generateStaticBoard({ ...generateStaticBoardMockDto, category: "FAQ" });
    await service.generateStaticBoard({ ...generateStaticBoardMockDto, writer: "박작가" });

    const all = await service.getStaticBoardListAndCount({}, page);
    expect(all.count).toBe(3);

    const faq = await service.getStaticBoardListAndCount({ category: "FAQ" }, page);
    expect(faq.count).toBe(1);

    const firstPage = await service.getStaticBoardListAndCount({}, { page: 1, pageSize: 2 });
    expect(firstPage.list).toHaveLength(2);
    expect(firstPage.count).toBe(3);
  });

  it("외부 트랜잭션에 합류하면 핸들이 포트까지 그대로 전달된다", async () => {
    const created = await service.generateStaticBoard(generateStaticBoardMockDto);

    await transaction.run(async (handle: Transaction) => {
      await service.modifyStaticBoard(created.id, { writer: "이작가" }, handle);

      expect(staticBoards.lastTransaction).toBe(handle);
    });
  });

  it("트랜잭션을 넘기지 않으면 포트도 받지 않는다", async () => {
    await service.generateStaticBoard(generateStaticBoardMockDto);

    expect(staticBoards.lastTransaction).toBeUndefined();
  });
});
