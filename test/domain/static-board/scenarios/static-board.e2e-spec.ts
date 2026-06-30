import { launchAppAndGetTestAppAndDb } from "test/utils/e2e-helper";
import { StaticBoardFixture } from "test/domain/static-board/fixtures/static-board.fixture";
import { generateStaticBoardMockDto } from "../mocks/static-board.mock";
import { HttpStatus } from "@nestjs/common";

describe(`static board test (e2e)`, () => {
  let app;

  beforeAll(async () => {
    const launchResult = await launchAppAndGetTestAppAndDb();
    app = launchResult.app;
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
});
