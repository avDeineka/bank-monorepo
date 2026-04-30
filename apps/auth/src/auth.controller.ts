// auth.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { PATTERNS, LoginDto } from '@app/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @MessagePattern({ cmd: PATTERNS.AUTH.LOGIN })
  async login(@Payload() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}