// users.controller.ts
import { Controller, Get, Post, Body, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; 
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { PATTERNS } from '@app/common';
import { CreateUserDto } from './dto/create-user.dto'; 
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  private readonly logger = new Logger(UsersController.name);

  // Цей метод відповідатиме на GET /users
  @UseGuards(AuthGuard('jwt')) // Цей метод тепер доступний ТІЛЬКИ з токеном
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // Цей метод відповідатиме на GET /users/:id
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @EventPattern(PATTERNS.AUTH.REGISTRATION_FAILED)
  async handleRegistrationRollback(@Payload() data: { userId: number, reason: string }) {
    this.logger.warn(`🔄 Saga Compensating Action: Deleting user ${data.userId} because of ${data.reason}`);
    await this.usersService.deleteUser(data.userId);
  }
}