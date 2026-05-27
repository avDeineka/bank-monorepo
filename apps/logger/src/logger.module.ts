// logger/src/logger.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from '@app/common';
import { HealthController } from './health.controller';
import { LoggerController } from './logger.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    TerminusModule,
  ],
  controllers: [ LoggerController, HealthController, ],
  providers: [ /* LoggerService */ ],
})
export class LoggerModule { }
