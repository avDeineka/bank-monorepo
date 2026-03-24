// gateway/payments.controller.ts
import { Controller, Get, Post, Body, Inject, UseGuards, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject('ACCOUNTS_SERVICE') private client: ClientProxy,
  ) {}

  @Get('test-tcp')
  testTcp() {
    return this.client.send({ cmd: 'ping' }, { hello: 'from gateway' });
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Get('my-balance')
  async getMyBalance(@Req() req) {
    return this.client.send({ cmd: 'get_balance' }, { userId: req.user.userId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('transfer')
  async transfer(@Req() req, @Body() body: { toUserId: number; amount: number }) {
    // 0.  
    if (body.amount <= 0) {
      throw new Error('Сума переказу має бути більшою за нуль');
    }
    // 1. Дістаємо ID відправника з JWT (пам'ятаєте, ми клали його в sub або userId?)
    const fromUserId = req.user.userId;

    // 2. Відправляємо повний пакет даних у мікросервіс Accounts
    return this.client.send(
      { cmd: 'do_transfer' },
      {
        fromUserId,
        toUserId: body.toUserId,
        amount: body.amount
      }
    );
  }
}