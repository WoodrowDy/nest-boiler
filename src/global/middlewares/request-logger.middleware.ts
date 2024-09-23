import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { requestLoggerHelper } from '../helpers/http-logger.helper';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: WinstonLogger,
    ) {}

    use(req: Request, res: Response, next: NextFunction) {
        const { loggingMessage, loggingContext } = requestLoggerHelper(req);

        if (req.originalUrl !== '/health-check')
            this.logger.log(loggingMessage, loggingContext);

        next();
    }
}
