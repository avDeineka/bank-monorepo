// gateway/api.controller.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { firstValueFrom } from 'rxjs';
import { Controller, Inject, Get, OnModuleInit, Body, Param, Post, Redirect, Res, Req, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import type { ClientProxy, ClientGrpc } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import { getMemoryHealthIndicator } from '@app/common';
import { SERVICES, PATTERNS, ROLES, CreateAccountDto, CreateUserDto, LoginDto, OpenAccountDto, SetRoleDto, TransferDto, rpc } from '@app/common';
import { SESSION_COOKIE_NAME } from '@app/common';
import { Roles } from '../roles.decorator';
import { RolesGuard } from '../roles.guard';

// Інтерфейс для клієнта, який повторює proto-файл
interface RaterServiceClient {
  pingRater(request: {}): any;
  checkHealth(request: {}): any;
}

@Controller('api')
export class ApiController implements OnModuleInit {
  // 💡 Знак виклику '!' каже TypeScript, що змінна буде ініціалізована в onModuleInit, а не в конструкторі
  private raterServiceClient!: RaterServiceClient;
  private readonly version: string;

  constructor(
    @Inject(SERVICES.RATER) private readonly raterService: ClientGrpc, // 💡 Згрупували всі інжекції в один конструктор
    @Inject(SERVICES.ACCOUNTS) private readonly accountsService: ClientProxy,
    @Inject(SERVICES.AUTH) private readonly authService: ClientProxy,
    @Inject(SERVICES.LOGGER) private readonly loggerService: ClientProxy,
  ) {
    this.version = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf-8'),
    ).version;
  }

  onModuleInit() {
    // Отримуємо gRPC сервіс за ім'ям з proto-файлу
    this.raterServiceClient = this.raterService.getService<RaterServiceClient>('RaterService');
  }

  @Get('health')
  async getSystemHealth() {
    const timeoutMs = 2000;

    // Функція-обгортка, яка обірве запит, якщо сервіс завис
    const withTimeout = async (promise: Promise<any>, serviceName: string) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout exceeded')), timeoutMs)
      );
      try {
        // Хто швидше: відповідь сервісу чи таймер?
        return await Promise.race([promise, timeoutPromise]);
      } catch (err: any) {
        return {
          status: 'down',
          error: `Error checking ${serviceName}: ${err?.message || String(err)}`
        };
      }
    };

    const gatewayMemory = getMemoryHealthIndicator();

    const askHealth = (serviceName: string, client: any) => {
      const rmqCall = firstValueFrom(rpc.send(client, PATTERNS.SYSTEM.HEALTH, {}));
      return withTimeout(rmqCall, serviceName);
    };
    const authHealthPromise = askHealth(SERVICES.AUTH, this.authService);
    const accountsHealthPromise = askHealth(SERVICES.ACCOUNTS, this.accountsService);
    const loggerHealthPromise = askHealth(SERVICES.LOGGER, this.loggerService);

    const raterHealthPromise = withTimeout(
      firstValueFrom(this.raterServiceClient.checkHealth({})),
      SERVICES.RATER
    );

    // Опитуємо ВСЕ паралельно. Promise.all тепер відпрацює миттєво, 
    // бо всередині кожного промісу вже вшитий свій Promise.race!
    const [authHealth, accountsHealth, loggerHealth, raterHealth] = await Promise.all([
      authHealthPromise,
      accountsHealthPromise,
      loggerHealthPromise,
      raterHealthPromise,
    ]);

    const allGood =
      gatewayMemory.memory.status === 'up' &&
      authHealth.status === 'ok' && // Terminus повертає 'ok'
      accountsHealth.status === 'ok' &&
      loggerHealth.status === 'ok' &&
      raterHealth.status === 'ok';

    return {
      status: allGood ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      services: {
        gateway: {
          status: gatewayMemory.memory.status === 'up' ? 'ok' : 'error',
          memory: gatewayMemory.memory
        },
        auth: formatServiceResponse (authHealth),
        accounts: formatServiceResponse (accountsHealth),
        logger: formatServiceResponse (loggerHealth),
        rater: raterHealth
      }
    };
  }

  @Get('ping')
  accountsPing() {
    return rpc.send(this.accountsService, PATTERNS.SYSTEM.PING, { hello: 'from gateway' });
  }

  @Get('pingRater')
  async pingRater() {
    try {
      // firstValueFrom забирає перший івент з потоку gRPC і перетворює на Promise
      const response = await firstValueFrom(this.raterServiceClient.pingRater({}));
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

  @Get('logout')
  @Redirect(process.env.FRONTEND_URL || 'http://localhost:3000/', 302)
  async logout(@Res({ passthrough: true }) response: any) {
    // Наказуємо браузеру стерти куку
    response.cookie(SESSION_COOKIE_NAME, '', {
      expires: new Date(0),
      httpOnly: false,
      path: '/',
    });

  // повертати об'єкт не треба, NestJS сам надішле статус 302 та перенаправить браузер
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
    return rpc.send(this.accountsService, PATTERNS.ACCOUNT.GET_ACCOUNTS, { userId: req.user.userId });
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

    return rpc.send(this.accountsService, PATTERNS.ACCOUNT.CREATE, createAccountDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('transfers')
  transfers(@Query('accountId', ParseIntPipe) accountId: number, @Req() req) {
    return rpc.send(this.accountsService, PATTERNS.ACCOUNT.GET_TRANSFERS, { userId: req.user.userId, accountId });
  }

  @Get('accountsRate')
  async accountsRate(
    @Query('base') base: string,
    @Query('quote') quote: string
  ) {
    try {
      // Відправляємо запит через RabbitMQ в мікросервіс accounts
      const rawResponse = await firstValueFrom(
        rpc.send(this.accountsService, PATTERNS.ACCOUNT.GET_RATE, { base, quote })
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
    return rpc.send(this.accountsService, PATTERNS.ACCOUNT.TRANSFER, fullData);
  }

}

function formatServiceResponse (serviceHealth: any) {
  // Якщо сервіс повністю ліг і повернув об'єкт з текстовою помилкою
  if (typeof serviceHealth.error === 'string') {
    return {
      status: 'down',
      message: serviceHealth.error
    };
  }

  // Якщо сервіс живий або повернув структуровану помилку від Terminus
  return {
    status: serviceHealth.status === 'ok' ? 'ok' : 'down',
    ...(serviceHealth.info || serviceHealth.details || {})
  };
}
