// logger/src/logger.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerController } from './logger.controller';
//import { LoggerService } from './logger.service';
import { DatabaseModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
  ],
  controllers: [LoggerController],
  providers: [ /* LoggerService */ ],
})
export class LoggerModule { }
