import { runSeeders } from "typeorm-extension";
import { AppDataSource } from "../config/typeorm.config";
import { MainSeeder } from "./main.seed";
import { StaticBoardFactory } from "src/domain/template/static-board/seeds/static-board.factory";

/**
 * 시드 실행 진입점.
 *
 * ★ typeorm-extension 의 CLI 를 쓰지 않고 runSeeders 를 직접 부른다.
 *
 *   4.x 부터 CLI 가 ESM 전용이 되면서 .ts 를 Node 가 그대로 ESM 으로 파싱한다.
 *   그래서 두 가지가 동시에 깨진다 —
 *     1) `envs/env` 같은 baseUrl 절대 import 를 해석하지 못한다
 *        (--tsconfig 를 줘도 내부 로더가 paths 를 읽지 않는다)
 *     2) 데코레이터 등 TS 문법에서 SyntaxError 가 난다 (ts-node 가 빠졌다)
 *
 *   runSeeders 는 CLI 가 내부에서 부르는 바로 그 공식 API 다. 진입점만 우리가 쥐면
 *   migration:run 과 같은 환경(ts-node + tsconfig-paths)에서 돌아 둘 다 해결된다.
 *
 * ★ 글로브 문자열이 아니라 클래스를 직접 넘긴다.
 *   문자열을 주면 라이브러리가 같은 ESM 로더로 파일을 다시 찾아 읽어서 같은 벽에 부딪힌다.
 *   여기서 import 하면 ts-node 가 이미 읽은 것을 그대로 넘기게 된다.
 *   대신 새 도메인의 시드·팩토리는 이 파일에 한 줄씩 등록해야 한다 — main.seed.ts 에
 *   시더를 등록하는 것과 같은 자리다.
 */
async function run(): Promise<void> {
  const dataSource = await AppDataSource.initialize();

  try {
    await runSeeders(dataSource, {
      seeds: [MainSeeder],
      factories: [StaticBoardFactory],
    });
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error) => {
  console.error("시드 실행에 실패했습니다:", error);
  process.exitCode = 1;
});
