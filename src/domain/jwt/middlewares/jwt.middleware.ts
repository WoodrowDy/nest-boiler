import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { JwtService } from "../services/jwt.service";
import { NextFunction, Request, Response } from "express";
import { constants } from "../jwt.constants";
import { parseAuthHeader } from "src/global/helpers/auth-header.helper";

/**
 * 쓸 수 있는 토큰이 있으면 세션을 붙인다. 차단은 가드가 한다 —
 * 이 미들웨어는 모든 라우트에 걸려 있어서, 공개 엔드포인트를 막으면 안 된다.
 */
@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const parsed = parseAuthHeader(req.headers[constants.props.AUTHORIZATION]);
    const { BEARER_SCHEME } = constants.props;

    if (parsed?.scheme.toLowerCase() === BEARER_SCHEME.toLowerCase()) {
      try {
        req["session"] = this.jwtService.verify(parsed.credential);
      } catch {
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
