import { Inject, Injectable } from '@nestjs/common';
import { JwtConfigOptionsDto } from '../dtos/jwt-config-option.dto';
import { constants } from '../jwt.constants';
import * as jwt from 'jsonwebtoken';
import { JswSignInOptionsDto } from '../dtos/jwt-signin-option.dto';

@Injectable()
export class JwtService {
  constructor(
    @Inject(constants.injectionToken.JWT_CONFIG_OPTION)
    private readonly jwtConfigOptionsDto: JwtConfigOptionsDto,
  ) {}

  sign(payload: object, options?: JswSignInOptionsDto): string {
    return jwt.sign(payload, this.jwtConfigOptionsDto.jwtSecret, options);
  }

  verify(jwtToken: string) {
    return jwt.verify(jwtToken, this.jwtConfigOptionsDto.jwtSecret);
  }
}
