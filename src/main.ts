import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as express from "express";
import helmet from "helmet";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { join } from "node:path";
import { commonConstants } from "./global/constants/common.constants";
import { swaggerConstants } from "./global/constants/swagger.constants";
import basicAuth from "express-basic-auth";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { assertNoPendingMigrations } from "./global/helpers/pending-migrations.helper";
import { HttpExceptionFilter } from "./global/filters/http-exception.filter";

async function bootstrap() {
  // 스키마가 코드보다 뒤쳐진 채로 뜨지 않게 한다. 앱을 만들기 전에 본다.
  await assertNoPendingMigrations();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  // Nest 기본 로거를 winston 으로 교체 (로그에 traceId 자동 부착)
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const port = Number.parseInt(process.env.PORT, 10);
  const env = process.env.NODE_ENV;
  const timezone = process.env.TZ;

  /**
   * CORS
   */
  app.enableCors({
    credentials: true,
    exposedHeaders: [
      "Authorization",
      "Content-Disposition", //파일 다운로드 시, 프론트에서 파일명 읽을 수 있도록
    ],
  });

  /**
   * Body-parser
   */
  // ★ Express 5 부터 urlencoded · json 이 내장이다. body-parser 직접 의존은 걷어냈다.
  app.use(
    express.urlencoded({
      limit: "50mb", // 요청 본문 상한. 기본값은 100kb
      extended: true, // 문자열·배열 외의 값 타입도 받는다
    })
  );

  /**
   * use custom logger
   */
  // const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  // by using this pattern, we instruct Nest to use the same singleton
  // instance of WINSTON_MODULE_NEST_PROVIDER
  // app.useLogger(logger);
  // when instantiating Logger(from '@nestjs/common') class, Nest will
  // use WINSTON_MODULE_NEST_PROVIDER internally

  /**
   * GlobalInterceptors
   */
  // app.useGlobalInterceptors(new ResponseLoggerInterceptor(logger));

  /**
   * GlobalPipes
   */
  app.useGlobalPipes(
    new ValidationPipe({
      // When set to true, this will automatically remove non-whitelisted properties
      // (those without any decorator in the validation class).
      whitelist: true,
      // Automatically transform payloads to be objects typed according to their DTO classes.
      transform: true,
    })
  );

  /**
   * GlobalFilters
   */
  /**
   * 전역 예외 필터 — 모든 에러 응답에 meta(traceId·timestamp)를 붙인다.
   * 제약 위반(unique·FK)은 409 로 옮기고, 그 외 DB 에러는 500 으로 둔다.
   */
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  /**
   * Versioning
   */
  app.enableVersioning({ type: VersioningType.URI });

  /**
   * 소셜 로그인 관련 페이지 띄워줄 수 있는 루트 패스를 위해
   */
  const rootPath = join(__dirname, "..", "..", "public");
  app.useStaticAssets(rootPath);
  app.setViewEngine("html");

  /**
   * 서버에서 view 파일로 필요한 부분을 처리 하기 위해
   */
  const viewBasePath = join(__dirname, "..", "..", "views");
  app.setBaseViewsDir(viewBasePath);
  app.setViewEngine("hbs");

  /**
   * swagger
   */

  /**
   * ★ local 이 아니면 문서를 Basic 인증 뒤에 둔다.
   *
   *   경로는 SWAGGER_PATH 다. 전에는 SWAGGER_VERSION("1.0") 에 걸고 있어서
   *   /api-docs 와 맞지 않아 보호가 **전혀 걸리지 않았다** — 코드만 보면 걸린 것처럼 보인다.
   *
   *   자격증명은 env 에서 읽는다. 소스에 두면 저장소를 받은 사람이 그대로 본다.
   *   비어 있으면 띄우지 않는다 — 빠뜨린 채 뜨면 문서가 무방비로 열리는데,
   *   그것은 "틀린 채로도 정상으로 보이는" 부류라 부팅에서 막는다.
   */
  if (process.env.NODE_ENV !== commonConstants.props.nodeEnvs.LOCAL) {
    const swaggerUser = process.env.SWAGGER_USER;
    const swaggerPassword = process.env.SWAGGER_PASSWORD;

    if (!swaggerUser || !swaggerPassword) {
      throw new Error(
        `SWAGGER_USER · SWAGGER_PASSWORD required — NODE_ENV="${process.env.NODE_ENV}"`
      );
    }

    app.use(
      swaggerConstants.props.SWAGGER_PATH,
      basicAuth({ challenge: true, users: { [swaggerUser]: swaggerPassword } })
    );
  }

  const config = new DocumentBuilder()
    .setTitle(swaggerConstants.props.SWAGGER_TITLE)
    .setDescription(swaggerConstants.props.SWAGGER_DESCRIPTION)
    .setVersion(swaggerConstants.props.SWAGGER_VERSION)
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "jwt" },
      swaggerConstants.auth.BEARER_TOKEN
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerConstants.props.SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      filter: true,
      docExpansion: "none",
      tagsSorter: "alpha",
    },
  });

  const cspOptions = {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        // "'*.server-domain.com'", TODO:서버 도메인 설정
      ],
      "form-action": ["'self'", "*.checkplus.co.kr", "'unsafe-inline'", "'unsafe-eval'"],
      "base-uri": ["/", "http:"],
    },
  };

  /**
   * Helmet
   */
  app.use(
    helmet({
      //cspOptions
      contentSecurityPolicy: cspOptions,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    })
  ); // Always apply helmet after Swagger! https://dev.to/starlingroot/helmetjs-and-swaggerui-avoiding-headaches-in-your-nodejs-app-29l3

  await app.listen(port, "0.0.0.0", function () {
    if (typeof process.send === "function") {
      process.send("ready");
    }
  });

  const appUrl = `http://127.0.0.1:${port}`;
  const isLocal = env === commonConstants.props.nodeEnvs.LOCAL;
  // 로컬 외 환경에선 Swagger가 basic-auth 뒤에 있으므로 URL 대신 표기만 노출
  const swaggerInfo = isLocal ? `${appUrl}${swaggerConstants.props.SWAGGER_PATH}` : "인증 필요";
  console.log("------------------------------------------------------------");
  console.log(
    "\u001B[1m\u001B[32m%s\u001B[0m",
    `서버환경=${env} | 주소=${appUrl} | Swagger=${swaggerInfo} | TZ=${timezone}`
  );
  console.log("------------------------------------------------------------");

  process.on("SIGINT", function () {
    // SIGINT: Interrupt from keyboard(such as Ctrl C)
    process.exit();
  });
}

bootstrap();
