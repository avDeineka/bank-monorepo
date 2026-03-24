// users.controller.ts
import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; 
import { CreateUserDto } from './dto/create-user.dto'; 
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

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

  @Post('register') // Можна змінити шлях для ясності
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }
}