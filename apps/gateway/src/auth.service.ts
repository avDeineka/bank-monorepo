// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async login(email: string, pass: string) {
    // 1. Шукаємо юзера в базі через наш Knex-сервіс
    const user = await this.usersService.findByEmail(email);

    // 2. Порівнюємо введений пароль з хешем
    if (user && await bcrypt.compare(pass, user.password)) {
      // 3. Якщо все ок, формуємо корисне навантаження (payload)
      const payload = { email: user.email, sub: user.id };
      
      return {
        access_token: this.jwtService.sign(payload),
      };
    }
    
    // Якщо пароль не підійшов — "викидаємо" клієнта
    throw new UnauthorizedException('Invalid credentials');
  }
}