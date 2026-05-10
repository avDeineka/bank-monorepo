// gateway/api.controller.ts
import { Controller, Inject, Get, Post, Body, Param, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { readFileSync } from 'fs';
import { join } from 'path';
import { TransferDto } from '@app/common';
import { SERVICES, PATTERNS, CreateUserDto, LoginDto, rpc } from '@app/common';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

@Controller('api')
export class ApiController {
  constructor(
    @Inject(SERVICES.ACCOUNTS) private accountsClient: any,
    @Inject(SERVICES.AUTH) private authService: any,
  ) {}

  private readonly version = JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
  ).version;

  @Get('ping')
  accountsPing() {
    return rpc.send (this.accountsClient, PATTERNS.SYSTEM.PING, { hello: 'from gateway' });
  }

  @Get('version')
  getVersion() {
    return { version: this.version };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('users')
  findAll() {
    return rpc.send(this.authService, PATTERNS.USER.GET_ALL, {});
  }

  // Цей метод відповідатиме на GET /users/:id
  @UseGuards(AuthGuard('jwt'))
  @Get('users/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return rpc.send(this.authService, PATTERNS.USER.GET_ONE, { id });
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return rpc.send(this.authService, PATTERNS.USER.REGISTER, createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return rpc.send(this.authService, PATTERNS.USER.LOGIN, { email: loginDto.email, password: loginDto.password });
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  async getMyBalance(@Req() req) {
    return rpc.send (this.accountsClient, PATTERNS.ACCOUNT.GET_BALANCE, { userId: req.user.userId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('transfer')
  async transfer(
    @Req() req,
    @Body() body: Omit<TransferDto, 'fromUserId'> // Беремо DTO, але ігноруємо fromUserId
  ) {
    const fromUserId = req.user.userId;
    const fullData: TransferDto = { ...body, fromUserId };
    return rpc.send (this.accountsClient, PATTERNS.ACCOUNT.TRANSFER, fullData);
  }
}
