// gateway/payments.controller.ts
import { Controller, Get, Post, Body, Inject, UseGuards, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import { TransferDto } from '@app/common';

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
  async transfer(
    @Req() req,
    @Body() body: Omit<TransferDto, 'fromUserId'> // Беремо DTO, але ігноруємо fromUserId
  ) {
    const fromUserId = req.user.userId;
    const fullData: TransferDto = { ...body, fromUserId };
    return this.client.send({ cmd: 'do_transfer' }, fullData);
  }
}
