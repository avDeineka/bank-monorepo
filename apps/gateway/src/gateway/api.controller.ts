// gateway/api.controller.ts
import { Controller, Inject, Get, Post, Body, Param, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransferDto } from '@app/common';
import { SERVICES, PATTERNS, CreateUserDto, LoginDto, rpc } from '@app/common';

@Controller('api')
export class ApiController {
  constructor(
    @Inject(SERVICES.ACCOUNTS) private accountsClient: any,
    @Inject(SERVICES.AUTH) private authService: any,
  ) {}

  @Get('ping')
  accountsPing() {
    return rpc.send (this.accountsClient, PATTERNS.ACCOUNTS.PING, { hello: 'from gateway' });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  findAll() {
    return rpc.send(this.authService, PATTERNS.AUTH.USERS, {});
  }

  // Цей метод відповідатиме на GET /users/:id
  @UseGuards(AuthGuard('jwt'))
  @Get('users/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return rpc.send(this.authService, PATTERNS.AUTH.USER, { id });
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return rpc.send(this.authService, PATTERNS.AUTH.REGISTER, createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return rpc.send(this.authService, PATTERNS.AUTH.LOGIN, { email: loginDto.email, password: loginDto.password });
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  async getMyBalance(@Req() req) {
    return rpc.send (this.accountsClient, PATTERNS.ACCOUNTS.GET_BALANCE, { userId: req.user.userId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('transfer')
  async transfer(
    @Req() req,
    @Body() body: Omit<TransferDto, 'fromUserId'> // Беремо DTO, але ігноруємо fromUserId
  ) {
    const fromUserId = req.user.userId;
    const fullData: TransferDto = { ...body, fromUserId };
    return rpc.send (this.accountsClient, PATTERNS.ACCOUNTS.DO_TRANSFER, fullData);
  }
}
