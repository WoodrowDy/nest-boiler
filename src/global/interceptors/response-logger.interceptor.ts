import {
    CallHandler,
    ExecutionContext,
    Inject,
    NestInterceptor,
} from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import { map, Observable } from 'rxjs';
import { responseLoggerHelper } from '../helpers/http-logger.helper';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';

/**
 * 400 미만의 statusCode를 갖는 response에 대해
 * (1) data에 대한 logger의 역할을 하며,
 * (2) data에 statusCode를 포함시킨다.
 * cf> 400이상의 statusCode를 갖거나 error의 경우, HttpExceptionFilter가 logger의 역할을 한다.
 */
export class ResponseLoggerInterceptor implements NestInterceptor {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: WinstonLogger,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => {
                const req = context.switchToHttp().getRequest();
                const res = context.switchToHttp().getResponse();
                const statusCode = res.statusCode;

                const resData = {
                    statusCode,
                    ...instanceToPlain(data),
                };

                const { loggingMessage, loggingContext } = responseLoggerHelper(
                    req,
                    resData,
                    statusCode,
                );

                if (req.originalUrl !== '/health-check')
                    this.logger.log(loggingMessage, loggingContext);

                return resData;
            }),
        );
    }
}
