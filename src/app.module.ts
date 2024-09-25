import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import envFilePath from '../envs/env';
import * as Joi from 'joi';
import { commonConstants } from './global/constants/common.constants';
import { dataSourceOptions } from './config/typeorm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtMiddleware } from './domain/jwt/middlewares/jwt.middleware';
import { JwtModule } from './domain/jwt/jwt.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid(...commonConstants.props.NODE_ENV_ARRAY)
          .required(),
        TZ: Joi.string().valid('Asia/Seoul').required(),
        /**
         * TODO: JWT, AWS_URL, AWS_SECRET
         *         DB_SSL: Joi.string().required(),
         *         DB_LOGGING: Joi.string().required(),
         *         JWT_SECRET: Joi.string().required(),
         *         AWS_CDN_URL: Joi.string().required(),
         *         AWS_S3_BUCKET_NAME: Joi.string().required(),
         *         AWS_S3_ACCESS_KEY_ID: Joi.string().required(),
         *         AWS_S3_SECRET_ACCESS_KEY: Joi.string().required(),
         *         AWS_S3_REGION: Joi.string().required(),
         */
      }),
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    JwtModule.forRoot({
      jwtSecret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer
      .apply(JwtMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
