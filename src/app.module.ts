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
      /**
       * 없으면 앱이 제 기능을 못 하는 값만 적는다. 빠뜨린 채 뜨면 연결 재시도 끝에
       * 실패하는데, 그 메시지로는 설정 누락인지 DB 가 죽었는지 구분할 수 없다.
       *
       * 여기 없는 것: SWAGGER_* 는 local 에서 불필요해 main.ts 가 환경을 보고 검사한다.
       * SALT·ITERATIONS·KEYLEN·DIGEST 는 읽는 함수(crypto.helper)를 부르는 곳이 아직 없다.
       */
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid(...commonConstants.props.NODE_ENV_ARRAY)
          .required(),
        TZ: Joi.string().required(),

        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().required(),
        DB_NAME: Joi.string().required(),
        DB_USERNAME: Joi.string().required(),
        // 빈 값은 드라이버가 받지 못한다 — 접속 단계의 SASL 에러보다 여기서 끊는 편이 낫다.
        DB_PASSWORD: Joi.string().required(),

        DB_SCHEMA: Joi.string(),
        DB_LOGGING: Joi.boolean(),
        DB_MAX_QUERY_EXECUTION: Joi.number(),
        USE_LOCAL_HTTPS_OPTIONS: Joi.boolean(),

        JWT_SECRET: Joi.string().required(),

        EXPECTED_DB_NAME: Joi.string().allow(""), // migrate.sh 용. 비우면 검사하지 않는다
      }),
    }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      /**
       * ★ 연결 실패를 빨리 드러낸다.
       *
       *   기본값은 10회 x 3초라 30초 가까이 아무 말 없이 멈춰 있다가 실패한다.
       *   붙을 수 없는 이유(도커 미기동 · 주소 오타 · 방화벽)는 재시도로 해결되지
       *   않는 것이 대부분이고, 그 시간은 처음 접하는 사람에게 "먹통" 으로 보인다.
       *   일시적 끊김을 위한 여유만 남긴다.
       *
       *   ★ 이 옵션은 TypeOrmModule 의 것이다. dataSourceOptions 에 넣으면
       *     PostgresConnectionOptions 에 없는 속성이라 컴파일이 깨진다.
       */
      retryAttempts: 2,
      retryDelay: 1000,
    }),
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
