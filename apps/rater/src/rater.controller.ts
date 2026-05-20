// apps/rater/src/rater.controller.ts
import { Controller, Inject } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { RaterService } from './rater.service';
import { Redis } from 'ioredis';

@Controller()
export class RaterController {
  constructor(
    private readonly raterService: RaterService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @GrpcMethod('RaterService', 'PingRater')
  async pingRater() {
    // Читаємо все, що є в хеші "rates" у Redis
    const cachedRates = await this.redis.hgetall('rates');

    return {
      status: 'ok',
      provider: 'ExchangeRate-API',
      current_rates_cached: JSON.stringify(cachedRates),
    };
  }
}