// gateway/payments.controller.ts
import { Controller, Get, Post, Body, Inject, UseGuards, Req } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AuthGuard } from '@nestjs/passport';
import { TransferDto } from '@app/common';
import { SERVICES, PATTERNS } from '@app/common';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(SERVICES.ACCOUNTS) private client: ClientProxy,
  ) {}

  @Get('ping')
  testTcp() {
    return this.client.send({ cmd: PATTERNS.ACCOUNTS.PING }, { hello: 'from gateway' });
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  async getMyBalance(@Req() req) {
    return this.client.send({ cmd: PATTERNS.ACCOUNTS.GET_BALANCE }, { userId: req.user.userId });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('transfer')
  async transfer(
    @Req() req,
    @Body() body: Omit<TransferDto, 'fromUserId'> // Беремо DTO, але ігноруємо fromUserId
  ) {
    const fromUserId = req.user.userId;
    const fullData: TransferDto = { ...body, fromUserId };
    return this.client.send({ cmd: PATTERNS.ACCOUNTS.DO_TRANSFER }, fullData);
  }
}
