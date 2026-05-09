// users.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { PATTERNS, CreateUserDto } from '@app/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  private readonly logger = new Logger(UsersController.name);

  // Цей метод відповідатиме на GET /users
  @MessagePattern({ cmd: PATTERNS.USER.GET_ALL })
  findAll() {
    return this.usersService.findAll();
  }

  // Цей метод відповідатиме на GET /users/:id
  @MessagePattern({ cmd: PATTERNS.USER.GET_ONE })
  findOne(@Payload() id: number) {
    return this.usersService.getUserById(id);
  }

  @MessagePattern({ cmd: PATTERNS.USER.REGISTER })
  async register(@Payload() createUserDto: CreateUserDto) {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new RpcException({
        code: 'REGISTRATION_FAILED',
        message,
        statusCode: 409,
      });
    }
  }

  @EventPattern(PATTERNS.ACCOUNT.CREATE_FAILED)
  async handleRegistrationRollback(@Payload() data: { userId: number, reason: string }) {
    this.logger.warn(`🔄 Saga Compensating Action: Deleting user ${data.userId} because of ${data.reason}`);
    await this.usersService.deleteUser(data.userId);
  }
}
