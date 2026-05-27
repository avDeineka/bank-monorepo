// apps/rater/src/rater.controller.ts
import { Controller, Inject, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import Redis from 'ioredis';
import { getMemoryHealthIndicator } from '@app/common';
import { RaterService } from './rater.service';

// Опишемо інтерфейс вхідних даних для розробника
interface CrossRateData {
  base: string;  // якщо в proto залишив from/to — напиши тут from: string
  quote: string; // якщо в proto залишив from/to — напиши тут to: string
}

@Controller()
export class RaterController {
  private readonly logger = new Logger(RaterController.name);

  constructor(
    private readonly raterService: RaterService,
    @Inject('REDIS_CLIENT') private readonly redis: any,
  ) { }

  @GrpcMethod('RaterService', 'GetCrossRate') // 👈 Зв'язуємо з RPC методом у proto
  async getCrossRate(data: CrossRateData) {
    this.logger.log(`📥 gRPC Request received: Calculate cross-rate for ${data.base}/${data.quote}`);

    try {
      const rate = await this.raterService.calculateCrossRate(data.base, data.quote);

      return {
        rate: rate // 👈 Повертаємо double rate згідно специфікації CrossRateResponse
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to calculate cross-rate: ${error.message}`);
      // gRPC автоматично загорне цей Error у статус коду `UNKNOWN` (або можна кинути RpcException)
      throw error;
    }
  }

  @GrpcMethod('RaterService', 'PingRater')
  async pingRater() {
    const currentCache = await this.raterService.getLiveRates();
    return {
      status: 'ok',
      provider: this.raterService.getCurrentProvider(),
      rates: currentCache && Object.keys(currentCache).length > 0
        ? Object.entries(currentCache).map(([k, v]) => `${k}:${v}`).join(', ')
        : 'EMPTY_OR_UNAVAILABLE',
    };
  }

  @GrpcMethod('RaterService', 'CheckHealth')
  async checkHealth(data: any) {
    let redisStatus = 'up';
    try {
      // Перевіряємо Redis за допомогою команди PING
      const ping = await this.redis.ping();
      if (ping !== 'PONG') redisStatus = 'down';
    } catch (err) {
      redisStatus = 'down';
    }

    const memory = getMemoryHealthIndicator();

    return {
      status: redisStatus === 'up' && memory.memory.status === 'up' ? 'ok' : 'error',
      redis: redisStatus,
      memory: memory.memory.status, // або розгорни весь об'єкт за бажанням
    };
  }
}