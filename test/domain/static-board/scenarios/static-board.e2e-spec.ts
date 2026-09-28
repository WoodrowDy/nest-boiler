import { closeTestApp, launchAppAndGetTestAppAndDb } from "test/utils/e2e-helper";
import { StaticBoardFixture } from "test/domain/static-board/fixtures/static-board.fixture";
import { generateStaticBoardMockDto } from "../mocks/static-board.mock";
import { HttpStatus } from "@nestjs/common";

describe(`static board test (e2e)`, () => {
  let app;

  beforeAll(async () => {
    const launchResult = await launchAppAndGetTestAppAndDb();
    app = launchResult.app;
  });

  // 앱을 닫아야 TypeORM 커넥션 풀이 함께 정리된다.
  // 닫지 않으면 테스트는 통과해도 jest 가 종료되지 못한다.
  afterAll(async () => {
    await closeTestApp(app);
  });

  it(`테스트 게시판을 생성 할 수 있다`, async () => {
    const result = await StaticBoardFixture.generateStaticBoard(app, generateStaticBoardMockDto);

    console.log(result.body);
    console.log(result.status);

    expect(result.status).toEqual(HttpStatus.CREATED);
  });

  it(`테스트 게시판 리스트 조회가 가능하다.`, async () => {
    const result = await StaticBoardFixture.getStaticBoardListAndCount(app, {});

    expect(result.status).toEqual(HttpStatus.OK);
    expect(result.body.rows[0].id).toEqual(1);
  });

  it(`테스트 게시판 상세 조회가 가능하다.`, async () => {
    const result = await StaticBoardFixture.getStaticBoard(app, 1);

    expect(result.status).toEqual(HttpStatus.OK);
    expect(result.body.row.id).toEqual(1);
  });

  // 아래 네 개는 포트/어댑터 전환으로 새로 생긴 경로를 본다.
  // 도메인 예외가 HTTP 로 번역되는지, 트랜잭션 경계가 쓰기를 실제로 수행하는지.

  it(`없는 게시판을 조회하면 404 로 번역된다`, async () => {
    const result = await StaticBoardFixture.getStaticBoard(app, 9999);

    expect(result.status).toEqual(HttpStatus.NOT_FOUND);
    expect(result.body.meta.traceId).toBeDefined();
  });

  it(`수정하면 반영된다`, async () => {
    const modified = await StaticBoardFixture.modifyStaticBoard(app, 1, { writer: `이작가` });
    expect(modified.status).toEqual(HttpStatus.OK);

    const result = await StaticBoardFixture.getStaticBoard(app, 1);
    expect(result.body.row.writer).toEqual(`이작가`);
    // 넘기지 않은 필드는 그대로다
    expect(result.body.row.category).toEqual(generateStaticBoardMockDto.category);
  });

  it(`없는 게시판을 수정하면 쓰기 전에 404 로 막힌다`, async () => {
    const result = await StaticBoardFixture.modifyStaticBoard(app, 9999, { writer: `이작가` });

    expect(result.status).toEqual(HttpStatus.NOT_FOUND);
  });

  it(`삭제하면 더 이상 조회되지 않는다`, async () => {
    const removed = await StaticBoardFixture.removeStaticBoard(app, 1);
    expect(removed.status).toEqual(HttpStatus.OK);

    const result = await StaticBoardFixture.getStaticBoard(app, 1);
    expect(result.status).toEqual(HttpStatus.NOT_FOUND);
  });
});
