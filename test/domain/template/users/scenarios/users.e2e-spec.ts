import { HttpStatus, INestApplication } from "@nestjs/common";
import { closeTestApp, launchAppAndGetTestAppAndDb } from "test/utils/e2e-helper";
import { UsersFixture } from "test/domain/template/users/fixtures/users.fixture";
import { postUserMockDto } from "../mocks/users.mock";

/** 한 DB 에서 위에서 아래로 이어진다. id 는 1 부터. */
describe(`users (e2e)`, () => {
  let app: INestApplication;

  beforeAll(async () => {
    const launchResult = await launchAppAndGetTestAppAndDb();
    app = launchResult.app;
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it(`사용자를 생성한다 — 생성 응답에 휴대폰 번호는 없다`, async () => {
    const result = await UsersFixture.postUser(app, postUserMockDto);

    expect(result.status).toEqual(HttpStatus.CREATED);
    expect(result.body.row.id).toEqual(1);
    expect(result.body.row.email).toEqual(postUserMockDto.email);
    expect(result.body.row.phone).toBeUndefined();
  });

  it(`같은 이메일은 409`, async () => {
    const result = await UsersFixture.postUser(app, postUserMockDto);

    expect(result.status).toEqual(HttpStatus.CONFLICT);
  });

  it(`목록은 count 와 boardCount 를 싣고 휴대폰 번호는 없다`, async () => {
    const result = await UsersFixture.getUsers(app, {});

    expect(result.status).toEqual(HttpStatus.OK);
    expect(result.body.count).toEqual(1);
    expect(result.body.rows[0].boardCount).toEqual(0);
    expect(result.body.rows[0].phone).toBeUndefined();
  });

  it(`nameLike 로 걸러진다`, async () => {
    const hit = await UsersFixture.getUsers(app, { nameLike: "테스" });
    const miss = await UsersFixture.getUsers(app, { nameLike: "없음" });

    expect(hit.body.count).toEqual(1);
    expect(miss.body.count).toEqual(0);
  });

  it(`상세는 정규화된 휴대폰 번호를 싣는다`, async () => {
    const result = await UsersFixture.getUser(app, 1);

    expect(result.status).toEqual(HttpStatus.OK);
    expect(result.body.row.phone).toEqual("01012345678");
  });

  it(`id 0 은 404, 숫자가 아니면 400`, async () => {
    const zero = await UsersFixture.getUser(app, 0);
    const notNumber = await UsersFixture.getUser(app, "abc");

    expect(zero.status).toEqual(HttpStatus.NOT_FOUND);
    expect(notNumber.status).toEqual(HttpStatus.BAD_REQUEST);
  });

  it(`수정하면 반영되고, 없는 사용자는 404`, async () => {
    const patched = await UsersFixture.patchUser(app, 1, { name: "변경" });
    const detail = await UsersFixture.getUser(app, 1);
    const missing = await UsersFixture.patchUser(app, 999, { name: "변경" });

    expect(patched.status).toEqual(HttpStatus.OK);
    expect(detail.body.row.name).toEqual("변경");
    expect(missing.status).toEqual(HttpStatus.NOT_FOUND);
  });

  it(`삭제하면 404 가 되고, 같은 이메일로 다시 가입할 수 있다`, async () => {
    const deleted = await UsersFixture.deleteUser(app, 1);
    const detail = await UsersFixture.getUser(app, 1);
    const recreated = await UsersFixture.postUser(app, postUserMockDto);

    expect(deleted.status).toEqual(HttpStatus.OK);
    expect(detail.status).toEqual(HttpStatus.NOT_FOUND);
    expect(recreated.status).toEqual(HttpStatus.CREATED);
    // 새 행이다. id 는 2 가 아니다 — 409 로 실패한 INSERT 도 시퀀스 값을 하나 썼다.
    expect(recreated.body.row.id).not.toEqual(1);
  });
});
