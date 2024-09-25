import { DynamicModule, Global } from '@nestjs/common';
import { constants } from './jwt.constants';
import { JwtConfigOptionsDto } from './dtos/jwt-config-option.dto';
import { JwtService } from './services/jwt.service';

@Global()
export class JwtModule {
  static forRoot(jwtConfigOptionDto: JwtConfigOptionsDto): DynamicModule {
    return {
      module: JwtModule,
      providers: [
        {
          provide: constants.injectionToken.JWT_CONFIG_OPTION,
          useValue: jwtConfigOptionDto,
        },
        JwtService,
      ],
      exports: [JwtService],
    };
  }
}