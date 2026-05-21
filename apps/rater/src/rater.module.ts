// apps/rater/src/rater.module.ts
import Redis from 'ioredis';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { RaterController } from './rater.controller';
import { RaterService } from './rater.service';
import { ExchangeRateApiStrategy } from './strategies/exchange-rate-api.strategy';
import { FrankfurterApiStrategy } from './strategies/frankfurter.strategy';

@Module({
  imports: [
    ScheduleModule.forRoot(), // активуємо крони
    HttpModule,              // активуємо HTTP-клієнт
  ],
  controllers: [RaterController],
  providers: [
    RaterService,
    ExchangeRateApiStrategy,
    FrankfurterApiStrategy,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      },
    },
  ],
})
export class RaterModule {}
