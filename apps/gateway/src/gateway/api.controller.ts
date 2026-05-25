// gateway/api.controller.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import { Controller, Inject, Get, OnModuleInit, Post, Body, Param, Query, Req, ParseIntPipe, UseGuards } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import { SERVICES, PATTERNS, ROLES, CreateAccountDto, CreateUserDto, LoginDto, OpenAccountDto, SetRoleDto, TransferDto, rpc } from '@app/common';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

// Інтерфейс для клієнта, який повторює proto-файл
interface RaterServiceClient {
  pingRater(request: {}): any;
}

@Controller('api')
export class ApiController implements OnModuleInit {
  // 💡 Знак виклику '!' каже TypeScript, що змінна буде ініціалізована в onModuleInit, а не в конструкторі
  private raterService!: RaterServiceClient;
  private readonly version: string;

  constructor(
    @Inject('RATER_PACKAGE') private readonly raterClient: ClientGrpc, // 💡 Згрупували всі інжекції в один конструктор
    @Inject(SERVICES.ACCOUNTS) private readonly accountsClient: any,
    @Inject(SERVICES.AUTH) private readonly authService: any,
  ) {
    this.version = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
    ).version;
  }

  onModuleInit() {
    // Отримуємо gRPC сервіс за ім'ям з proto-файлу
    this.raterService = this.raterClient.getService<RaterServiceClient>('RaterService');
  }

  @Get('health')
  health() {
    return rpc.send(this.accountsClient, PATTERNS.SYSTEM.HEALTH, {});
  }

  @Get('ping')
  accountsPing() {
    return rpc.send(this.accountsClient, PATTERNS.SYSTEM.PING, { hello: 'from gateway' });
  }

  @Get('pingRater')
  async pingRater() {
    try {
      // firstValueFrom забирає перший івент з потоку gRPC і перетворює на Promise
      const response = await firstValueFrom(this.raterService.pingRater({}));
      return response;
    } catch (error: any) {
      return { error: 'gRPC request failed', details: error.message };
    }
  }

  @Get('version')
  getVersion() {
    return { version: this.version };
  }

  // --- AUTH / USERS ЕНДПОІНТИ ---
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(ROLES.ADMIN)
  @Get('users')
  findAll() {
    return rpc.send(this.authService, PATTERNS.USER.GET_ALL, {});
  }

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

  // --- ACCOUNTS ЕНДПОІНТИ ---
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

  @Get('accountsRate')
  async accountsRate(
    @Query('base') base: string,
    @Query('quote') quote: string
  ) {
    try {
      // Відправляємо запит через RabbitMQ в мікросервіс accounts
      const rawResponse = await firstValueFrom(
        rpc.send(this.accountsClient, PATTERNS.ACCOUNT.GET_RATE, { base, quote })
      );
      const response = rawResponse as { rate: number };
      return {
        success: true,
        message: 'Full chain transport test passed!',
        rate: response?.rate
      };
    } catch (error: any) {
      console.error('Error in accountsRate endpoint:', error);
      return {
        success: false,
        error: 'Transport chain broken',
        details: error.message
      };
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('transfer')
  async transfer(
    @Req() req,
    @Body() body: TransferDto
  ) {
    const fromUserId = req.user.userId;
    const fullData = { ...body, fromUserId };
    return rpc.send(this.accountsClient, PATTERNS.ACCOUNT.TRANSFER, fullData);
  }

}
