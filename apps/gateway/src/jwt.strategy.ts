// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Використовуємо сервіс замість прямого звернення до процесу
      secretOrKey: secret as string
    });
  }

  async validate(payload: any) {
    // Те, що ми повернемо тут, NestJS покладе в req.user
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
