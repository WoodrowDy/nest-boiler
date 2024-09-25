import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '../services/jwt.service';
import { NextFunction, Request, Response } from 'express';
import { constants } from '../jwt.constants';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const { headers } = req;
    const authorization = headers[constants.props.AUTHORIZATION] as string;

    if (authorization && authorization.substring(0, 7) === 'Bearer ') {
      try {
        const jwtToken = authorization.replace('Bearer ', '');
        const sessionDto = this.jwtService.verify(jwtToken);

        req['session'] = sessionDto;
      } catch (e) {
        throw new ForbiddenException({
          statusCode: 403,
          message: constants.errorMessages.JWT_INVALID_TOKEN.ko,
          errorCode: constants.errorMessages.JWT_INVALID_TOKEN.errorCode,
        });
      }
    }
    next();
  }
}
