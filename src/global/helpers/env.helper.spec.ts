import { requireEnv } from "./env.helper";

describe("requireEnv", () => {
  const KEY = "REQUIRE_ENV_SPEC_KEY";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("값이 있으면 그대로 돌려준다", () => {
    process.env[KEY] = "5434";

    expect(requireEnv(KEY)).toEqual("5434");
  });

  it("없으면 변수 이름을 대고 던진다", () => {
    expect(() => requireEnv(KEY)).toThrow(KEY);
  });

  it("빈 문자열도 없는 것으로 본다 — env 파일의 KEY= 한 줄", () => {
    process.env[KEY] = "";

    expect(() => requireEnv(KEY)).toThrow(KEY);
  });
});
