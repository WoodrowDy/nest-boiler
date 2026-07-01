import { DataSource, DataSourceOptions } from "typeorm";
import { config } from "dotenv";
import envFilePath from "envs/env";
import * as path from "node:path";
import { SeederOptions } from "typeorm-extension";

config({ path: envFilePath });

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  schema: process.env.DB_SCHEMA,
  logging: false,
  synchronize: false,
  entities: [path.resolve(__dirname, "../../domain/**/entities/*.entity.{js,ts}")],
  migrations: [path.join(__dirname, "../migrations/*.{js,ts}")],
  migrationsTableName: "migrations",
};

const seederOptions: SeederOptions = {
  seeds: ["src/database/seeds/*.seed.{js,ts}", "src/domain/*/seeds/*.seed.{js,ts}"],
  factories: [
    "src/domain/*/seeds/*.factory.{js,ts}",
    //templates 폴더 내부를 위한 경로 추가
    "src/domain/*/*/seeds/*.factory.{js,ts}",
  ],
};

//AppDataSource.options 에 포함된 모든 객체
export const AppDataSource = new DataSource({
  ...dataSourceOptions,
  ...seederOptions,
});
