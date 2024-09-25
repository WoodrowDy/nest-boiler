import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import envFilePAth from '../../envs/env';

config({path:envFilePAth});

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  schema: process.env.DB_SCHEMA,
  logging: false,
  synchronize: false,
  entities: [__dirname + '/../../**/*.entity.{js,ts}'],
  migrations: ['/../database/migrations/*.ts'],
  migrationsTableName: 'migrations',
}

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;

