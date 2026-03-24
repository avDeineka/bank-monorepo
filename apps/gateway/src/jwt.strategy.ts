// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'SUPER_SECRET_KEY', // В реалі це має бути в .env
    });
  }

  async validate(payload: any) {
    // Те, що ми повернемо тут, NestJS покладе в req.user
    return { userId: payload.sub, email: payload.email };
  }
}