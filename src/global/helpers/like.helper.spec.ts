import { toLikePattern } from "./like.helper";

describe("toLikePattern", () => {
  it("양쪽에 % 를 붙인다", () => {
    expect(toLikePattern("김")).toBe("%김%");
  });

  it(String.raw`% _ \ 를 이스케이프한다`, () => {
    expect(toLikePattern(String.raw`50%_a\b`)).toBe(String.raw`%50\%\_a\\b%`);
  });

  it("빈 문자열은 %% 다", () => {
    expect(toLikePattern("")).toBe("%%");
  });
});
