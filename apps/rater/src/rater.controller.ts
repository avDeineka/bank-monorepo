// apps/rater/src/rater.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RaterService } from './rater.service';

@Controller()
export class RaterController {
  constructor(private readonly raterService: RaterService) { }

  @GrpcMethod('RaterService', 'PingRater')
  async pingRater() {
    const currentCache = await this.raterService.getLiveRates();

    return {
      status: 'ok',
      provider: this.raterService.getCurrentProvider(),
      rates: currentCache && Object.keys(currentCache).length > 0
        ? Object.entries(currentCache).map(([k, v]) => `${k}:${v}`).join(', ')
        : 'EMPTY_OR_UNAVAILABLE', // 👈 Тепер ключ збігається з proto на 100%
    };
  }
}