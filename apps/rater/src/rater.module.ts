// apps/rater/src/rater.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { RaterController } from './rater.controller';
import { RaterService } from './rater.service';
import Redis from 'ioredis';

@Module({
  imports: [
    ScheduleModule.forRoot(), // активуємо крони
    HttpModule,              // активуємо HTTP-клієнт
  ],
  controllers: [RaterController],
  providers: [
    RaterService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      },
    },
  ],
})
export class RaterModule {}
