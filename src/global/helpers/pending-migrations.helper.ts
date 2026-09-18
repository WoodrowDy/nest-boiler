import { DataSource } from "typeorm";
import { dataSourceOptions } from "../../database/config/typeorm.config";

/**
 * 적용되지 않은 마이그레이션이 있을 때 띄울 문구.
 *
 * ★ 메시지를 따로 뺀 이유 — 여기가 이 가드의 값어치 전부다.
 *   "부팅 실패" 만으로는 무엇을 해야 하는지 알 수 없다. 어느 환경의 어느 DB 인지와
 *   다음에 칠 명령까지 한 줄에 있어야 처음 온 사람이 혼자 풀 수 있다.
 */
export function buildPendingMigrationsMessage(nodeEnv?: string, dbName?: string): string {
  return (
    `적용되지 않은 마이그레이션이 있습니다 — NODE_ENV="${nodeEnv ?? "(없음)"}" ` +
    `DB_NAME="${dbName ?? "(없음)"}". 먼저 적용해주세요:  pnpm migration:run`
  );
}

/**
 * 적용되지 않은 마이그레이션이 있으면 부팅을 거부한다.
 *
 * ★ 왜 경고가 아니라 거부인가.
 *   스키마가 어긋나도 앱은 그냥 뜬다. 그리고 서비스 코드의 try/catch 가 그 에러를
 *   삼키면, 기능이 멈춰 있어도 겉으로는 아무 일도 없어 보인다. 조용히 잘못되느니
 *   그 자리에서 죽는 편이 낫다.
 *
 * ★ NestFactory.create 앞에서 검사한다 — 커넥션 풀과 스케줄러가 뜨기 전이다.
 *
 * ★ 이 검사가 배포 순서를 강제한다. 마이그레이션 없이 배포가 나가면 앱이 안 뜨고,
 *   그래서 배포가 실패한다. 순서는 언제나 마이그레이션 먼저, 배포 나중.
 */
export async function assertNoPendingMigrations(): Promise<void> {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    if (await dataSource.showMigrations()) {
      throw new Error(
        buildPendingMigrationsMessage(process.env.NODE_ENV, dataSourceOptions.database as string)
      );
    }
  } finally {
    await dataSource.destroy();
  }
}
