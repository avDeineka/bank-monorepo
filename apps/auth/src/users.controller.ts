// users.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { PATTERNS, CreateUserDto } from '@app/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  private readonly logger = new Logger(UsersController.name);

  // Цей метод відповідатиме на GET /users
  @MessagePattern({ cmd: PATTERNS.AUTH.USERS })
  findAll() {
    return this.usersService.findAll();
  }

  // Цей метод відповідатиме на GET /users/:id
  @MessagePattern({ cmd: PATTERNS.AUTH.USER })
  findOne(@Payload() id: number) {
    return this.usersService.getUserById(id);
  }

  @MessagePattern({ cmd: PATTERNS.AUTH.REGISTER })
  async register(@Payload() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @EventPattern(PATTERNS.AUTH.REGISTRATION_FAILED)
  async handleRegistrationRollback(@Payload() data: { userId: number, reason: string }) {
    this.logger.warn(`🔄 Saga Compensating Action: Deleting user ${data.userId} because of ${data.reason}`);
    await this.usersService.deleteUser(data.userId);
  }
}