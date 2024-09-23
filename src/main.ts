import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { join } from 'path';
import { commonConstants } from './global/constants/common.constants';
import { swaggerConstants } from './global/constants/swagger.constants';
import basicAuth from 'express-basic-auth';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {});
  const port = parseInt(process.env.PORT, 10);
  const env = process.env.NODE_ENV;
  const timezone = process.env.TZ;

  /**
   * CORS
   */
  app.enableCors({
    credentials: true,
    exposedHeaders: [
      'Authorization',
      'Content-Disposition', //파일 다운로드 시, 프론트에서 파일명 읽을 수 있도록
    ],
  });

  /**
   * Body-parser
   */
  app.use(
    bodyParser.urlencoded({
      limit: '50mb', //maximum request body size, default = 100kb
      extended: true, // for any value types. not only string or Array
    }),
  );

  /**
   * use custom logger
   */
  // const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  // by using this pattern, we instruct Nest to use the same singleton instance of WINSTON_MODULE_NEST_PROVIDER
  // app.useLogger(logger);
  // when instantiating Logger(from '@nestjs/common') class, Nest will use WINSTON_MODULE_NEST_PROVIDER internally

  /**
   * GlobalInterceptors
   */
  // app.useGlobalInterceptors(new ResponseLoggerInterceptor(logger));

  /**
   * GlobalPipes
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // When set to true, this will automatically remove non-whitelisted properties (those without any decorator in the validation class).
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes.
    }),
  );

  /**
   * GlobalFilters
   */

  /**
   * DB
   */
  // const dataSource = app.get<DataSource>(DataSource);

  // TODO: filter 수정.
  // app.useGlobalFilters(
  //   new HttpExceptionFilter(logger, dataSource, app.get(SlackService)),
  // );
  app.enableShutdownHooks();

  /**
   * Versioning
   */
  app.enableVersioning({ type: VersioningType.URI });

  /**
   * 소셜 로그인 관련 페이지 띄워줄 수 있는 루트 패스를 위해
   */
  const rootPath = join(__dirname, '..', '..', 'public');
  app.useStaticAssets(rootPath);
  app.setViewEngine('html');

  /**
   * 서버에서 view 파일로 필요한 부분을 처리 하기 위해
   */
  const viewBasePath = join(__dirname, '..', '..', 'views');
  app.setBaseViewsDir(viewBasePath);
  app.setViewEngine('hbs');

  /**
   * swagger
   */

  if (process.env.NODE_ENV !== commonConstants.props.nodeEnvs.LOCAL) {
    app.use(
      [swaggerConstants.props.SWAGGER_VERSION],
      basicAuth({
        challenge: true,
        users: {
          [swaggerConstants.props.SWAGGER_USER]:
          swaggerConstants.props.SWAGGER_PASSWORD,
        },
      }),
    );
  }

  const config = new DocumentBuilder()
    .setTitle(swaggerConstants.props.SWAGGER_TITLE)
    .setDescription(swaggerConstants.props.SWAGGER_DESCRIPTION)
    .setVersion(swaggerConstants.props.SWAGGER_VERSION)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'jwt' },
      swaggerConstants.auth.BEARER_TOKEN,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerConstants.props.SWAGGER_PATH, app, document),
    {
      swaggerOptions: {
        persistAuthorization: true,
        filter: true,
        docExpansion: 'none',
        tagsSorter: 'alpha',
      },
    };

  const cspOptions = {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'script-src': [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        // "'*.server-domain.com'", TODO:서버 도메인 설정
      ],
      'form-action': [
        "'self'",
        '*.checkplus.co.kr',
        "'unsafe-inline'",
        "'unsafe-eval'",
      ],
      'base-uri': ['/', 'http:'],
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
    }),
  ); // Always apply helmet after Swagger! https://dev.to/starlingroot/helmetjs-and-swaggerui-avoiding-headaches-in-your-nodejs-app-29l3

  await app.listen(port, '0.0.0.0', function () {
    if (typeof process.send === 'function') {
      process.send('ready');
    }
  });

  process.on('SIGINT', function () {
    // SIGINT: Interrupt from keyboard(such as Ctrl C)
    process.exit();
  });
}
bootstrap();
