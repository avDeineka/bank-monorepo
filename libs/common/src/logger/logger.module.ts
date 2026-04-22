// libs/common/src/logger/logger.module.ts
import { Global, Module } from '@nestjs/common';
import { AppLogger } from './app-logger.service';

@Global() // Робимо логер доступним всюди без повторних імпортів
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggerModule {}