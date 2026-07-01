import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ResponseLoggerInterceptor } from "./global/interceptors/response-logger.interceptor";
import { ConfigModule } from "@nestjs/config";
import envFilePath from "../envs/env";
import * as Joi from "joi";
import { commonConstants } from "./global/constants/common.constants";
import { AppDataSource } from "./database/config/typeorm.config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtMiddleware } from "./domain/jwt/middlewares/jwt.middleware";
import { TraceIdMiddleware } from "./global/middlewares/trace-id.middleware";
import { RequestLoggerMiddleware } from "./global/middlewares/request-logger.middleware";
import { WinstonModule } from "nest-winston";
import { winstonConfig } from "./global/logger/winston.config";
import { JwtModule } from "./domain/jwt/jwt.module";
import { StaticBoardModule } from "./domain/template/static-board/static-board.module";

@Module({
  imports: [
    WinstonModule.forRoot(winstonConfig),
    ConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid(...commonConstants.props.NODE_ENV_ARRAY)
          .required(),
        TZ: Joi.string().valid("Asia/Seoul").required(),
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
    TypeOrmModule.forRoot(AppDataSource.options),
    JwtModule.forRoot({
      jwtSecret: process.env.JWT_SECRET,
    }),
    //Templates
    StaticBoardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 전역 응답 로그(상태코드+소요시간). traceId 는 winston 포맷에서 자동 부착
    { provide: APP_INTERCEPTOR, useClass: ResponseLoggerInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    // TraceIdMiddleware 를 가장 먼저 등록 → 이후 미들웨어/컨트롤러 전체가 요청 컨텍스트 안에서 실행
    // 순서: TraceId(컨텍스트) → RequestLogger(traceId 포함 로깅) → Jwt
    consumer
      .apply(TraceIdMiddleware, RequestLoggerMiddleware, JwtMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
