import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { DataSource } from 'typeorm';

jest.setTimeout(3 * 60 * 1000);

export async function launchAppAndGetTestAppAndDb() {
  if (process.env.NODE_ENV !== 'test')
    throw new BadRequestException(`Not TEST ENV`);

  const moduleWrapper: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleWrapper.createNestApplication();
  const dataSource: DataSource = moduleWrapper.get<DataSource>(DataSource);

  await dataSource.dropDatabase();
  await dataSource.synchronize();

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();

  return { app, dataSource };
}

export async function closeTestApp(app) {
  jest.resetAllMocks();

  await app.close();
}
