// logger/src/logger.module.ts
import { Module } from '@nestjs/common';
import { LoggerController } from './logger.controller';
//import { LoggerService } from './logger.service';
import { DatabaseModule } from '@app/common';

@Module({
  imports: [
    DatabaseModule,
  ],
  controllers: [LoggerController],
  providers: [ /* LoggerService */ ],
})
export class LoggerModule { }
