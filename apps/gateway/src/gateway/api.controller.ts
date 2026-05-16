// gateway/api.controller.ts
import { Controller, Inject, Get, Post, Body, Param, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SERVICES, PATTERNS, ROLES, CreateAccountDto, CreateUserDto, LoginDto, OpenAccountDto, SetRoleDto, TransferDto, rpc } from '@app/common';
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
  @Roles(ROLES.ADMIN)
  @Get('users')
  findAll() {
    return rpc.send(this.authService, PATTERNS.USER.GET_ALL, {});
  }

  // Цей метод відповідатиме на GET /users/:id
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get('users/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return rpc.send(this.authService, PATTERNS.USER.GET_ONE, { id });
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return rpc.send(this.authService, PATTERNS.USER.REGISTER, createUserDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.ADMIN)
  @Post('set-role')
  async setRole(@Body() setRoleDto: SetRoleDto) {
    return rpc.send(this.authService, PATTERNS.USER.SET_ROLE, setRoleDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return rpc.send(this.authService, PATTERNS.USER.LOGIN, { email: loginDto.email, password: loginDto.password });
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Req() req) {
    return rpc.send(this.authService, PATTERNS.USER.GET_ONE, { id: req.user.userId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  async getMyBalance(@Req() req) {
    return rpc.send(this.accountsClient, PATTERNS.ACCOUNT.GET_ACCOUNTS, { userId: req.user.userId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('accounts')
  async createAccount(
    @Req() req,
    @Body() body: OpenAccountDto,
  ) {
    const createAccountDto: CreateAccountDto = {
      user_id: req.user.userId,
      currency: body.currency,
    };

    return rpc.send(this.accountsClient, PATTERNS.ACCOUNT.CREATE, createAccountDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('transfer')
  async transfer(
    @Req() req,
    @Body() body: TransferDto
  ) {
    const fromUserId = req.user.userId;
    const fullData = { ...body, fromUserId };
    return rpc.send (this.accountsClient, PATTERNS.ACCOUNT.TRANSFER, fullData);
  }
}
