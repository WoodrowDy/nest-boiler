import { buildPendingMigrationsMessage } from "./pending-migrations.helper";

describe("buildPendingMigrationsMessage", () => {
  it("환경과 DB 이름을 담아 무엇을 해야 하는지 알려준다", () => {
    const message = buildPendingMigrationsMessage("local", "nest-boiler");
    expect(message).toContain("local");
    expect(message).toContain("nest-boiler");
    expect(message).toContain("migration:run");
  });

  it("값이 비어 있어도 빈칸을 남기지 않는다", () => {
    const message = buildPendingMigrationsMessage();
    expect(message).not.toContain('""');
    expect(message).toContain("(없음)");
  });
});
