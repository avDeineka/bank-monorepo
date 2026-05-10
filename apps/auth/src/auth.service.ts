// auth.service.ts
import * as bcrypt from 'bcrypt';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';
import { SERVICES, PATTERNS, rpc } from '@app/common';
import { UsersService } from './users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @Inject(SERVICES.LOGGER) private loggerClient: ClientProxy,
  ) {}

  async login(email: string, pass: string) {
    // 1. Шукаємо юзера в базі через наш Knex-сервіс
    const user = await this.usersService.findByEmail(email);

    // 2. Порівнюємо введений пароль з хешем
    if (user && await bcrypt.compare(pass, user.password)) {
      rpc.emit (this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.AUTH,
        event: 'LOGIN',
        payload: { userId: user.id, email: user.email }
      });
      // 3. Якщо все ок, формуємо корисне навантаження (payload)
      const payload = { email: user.email, sub: user.id, role: user.role };
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
    
    // Якщо пароль не підійшов — "викидаємо" клієнта
    throw new UnauthorizedException('Invalid credentials');
  }
}
