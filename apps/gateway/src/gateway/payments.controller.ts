// gateway/payments.controller.ts
import { Controller, Get, Post, Body, Inject, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransferDto } from '@app/common';
import { SERVICES, PATTERNS, rpc } from '@app/common';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject(SERVICES.ACCOUNTS) private accountsClient: any,
  ) {}

  @Get('ping')
  accountsPing() {
    return rpc.send (this.accountsClient, PATTERNS.ACCOUNTS.PING, { hello: 'from gateway' });
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
