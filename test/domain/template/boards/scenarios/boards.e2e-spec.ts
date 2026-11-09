import { HttpStatus, INestApplication } from "@nestjs/common";
import { closeTestApp, launchAppAndGetTestAppAndDb } from "test/utils/e2e-helper";
import { BoardsFixture } from "test/domain/template/boards/fixtures/boards.fixture";
import { UsersFixture } from "test/domain/template/users/fixtures/users.fixture";
import { postUserMockDto } from "test/domain/template/users/mocks/users.mock";
import { postBoardMockDto } from "../mocks/boards.mock";

/**
 * 한 DB 에서 위에서 아래로 이어진다. 작성자는 사용자 1, 글 id 는 1 부터.
 * 없는 사용자로 만든 글은 INSERT 전에 404 가 나서 글 시퀀스를 쓰지 않는다 — 그래서 두 번째 글이 2 다.
 */
describe(`boards (e2e)`, () => {
  let app: INestApplication;

  beforeAll(async () => {
    const launchResult = await launchAppAndGetTestAppAndDb();
    app = launchResult.app;
    await UsersFixture.postUser(app, postUserMockDto);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it(`글을 생성하면 작성자의 boardCount 가 오른다`, async () => {
    const result = await BoardsFixture.postBoard(app, postBoardMockDto(1));
    const writer = await UsersFixture.getUser(app, 1);

    expect(result.status).toEqual(HttpStatus.CREATED);
    expect(result.body.row.id).toEqual(1);
    expect(result.body.row.status).toEqual("DRAFT");
    expect(writer.body.row.boardCount).toEqual(1);
  });

  it(`없는 사용자로는 404 이고, 글이 남지 않는다`, async () => {
    const result = await BoardsFixture.postBoard(app, postBoardMockDto(999));
    const list = await BoardsFixture.getBoards(app, {});

    expect(result.status).toEqual(HttpStatus.NOT_FOUND);
    expect(list.body.count).toEqual(1);
  });

  it(`목록에는 본문이 없다`, async () => {
    const result = await BoardsFixture.getBoards(app, {});

    expect(result.status).toEqual(HttpStatus.OK);
    expect(result.body.rows[0].content).toBeUndefined();
    expect(result.body.rows[0].publishedAt).toBeNull();
  });

  it(`필터가 걸리고, titleLike 의 % 는 글자로 찾는다`, async () => {
    await BoardsFixture.postBoard(app, { userId: 1, title: "50% 할인", content: "x" });

    const count = async (query: object): Promise<number> => {
      const result = await BoardsFixture.getBoards(app, query);

      return result.body.count;
    };

    expect(await count({ titleLike: "%" })).toEqual(1);
    expect(await count({ titleLike: "할인" })).toEqual(1);
    expect(await count({ status: "DRAFT" })).toEqual(2);
    expect(await count({ status: "PUBLISHED" })).toEqual(0);
    expect(await count({ userId: 1 })).toEqual(2);
    expect(await count({ userId: 2 })).toEqual(0);
  });

  it(`상세는 본문을 싣는다`, async () => {
    const result = await BoardsFixture.getBoard(app, 1);

    expect(result.status).toEqual(HttpStatus.OK);
    expect(result.body.row.content).toEqual("본문입니다.");
  });

  it(`발행하면 PUBLISHED 가 되고 발행 일시가 찍힌다`, async () => {
    const published = await BoardsFixture.postPublishBoard(app, 1);
    const detail = await BoardsFixture.getBoard(app, 1);

    expect(published.status).toEqual(HttpStatus.OK);
    expect(detail.body.row.status).toEqual("PUBLISHED");
    expect(detail.body.row.publishedAt).not.toBeNull();
  });

  it(`이미 발행한 글은 409, 없는 글은 404`, async () => {
    const again = await BoardsFixture.postPublishBoard(app, 1);
    const missing = await BoardsFixture.postPublishBoard(app, 999);

    expect(again.status).toEqual(HttpStatus.CONFLICT);
    expect(missing.status).toEqual(HttpStatus.NOT_FOUND);
  });

  it(`수정하면 반영되고, 없는 글은 404`, async () => {
    const patched = await BoardsFixture.patchBoard(app, 1, { title: "수정" });
    const detail = await BoardsFixture.getBoard(app, 1);
    const missing = await BoardsFixture.patchBoard(app, 999, { title: "수정" });

    expect(patched.status).toEqual(HttpStatus.OK);
    expect(detail.body.row.title).toEqual("수정");
    expect(missing.status).toEqual(HttpStatus.NOT_FOUND);
  });

  it(`페이지는 선택이다 — 없으면 전부, 있으면 그 페이지만, 0 페이지는 400`, async () => {
    const all = await BoardsFixture.getBoards(app, {});
    const page = await BoardsFixture.getBoards(app, { page: 1, pageSize: 1 });
    const zero = await BoardsFixture.getBoards(app, { page: 0 });

    expect(all.body.rows).toHaveLength(2);
    expect(all.body.count).toEqual(2);
    expect(page.body.rows).toHaveLength(1);
    expect(page.body.count).toEqual(2);
    expect(zero.status).toEqual(HttpStatus.BAD_REQUEST);
  });

  it(`삭제하면 작성자의 boardCount 가 내려가고, 그 글은 404`, async () => {
    const deleted = await BoardsFixture.deleteBoard(app, 1);
    const writer = await UsersFixture.getUser(app, 1);
    const detail = await BoardsFixture.getBoard(app, 1);
    const missing = await BoardsFixture.deleteBoard(app, 999);

    expect(deleted.status).toEqual(HttpStatus.OK);
    expect(writer.body.row.boardCount).toEqual(1);
    expect(detail.status).toEqual(HttpStatus.NOT_FOUND);
    expect(missing.status).toEqual(HttpStatus.NOT_FOUND);
  });

  it(`작성자가 탈퇴해도 글은 남는다`, async () => {
    await UsersFixture.deleteUser(app, 1);
    const result = await BoardsFixture.getBoard(app, 2);

    expect(result.status).toEqual(HttpStatus.OK);
    expect(result.body.row.userId).toEqual(1);
  });

  it(`탈퇴한 작성자의 글도 지워진다`, async () => {
    const deleted = await BoardsFixture.deleteBoard(app, 2);
    const detail = await BoardsFixture.getBoard(app, 2);

    expect(deleted.status).toEqual(HttpStatus.OK);
    expect(detail.status).toEqual(HttpStatus.NOT_FOUND);
  });
});
