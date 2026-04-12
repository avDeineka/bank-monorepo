import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@app/common';
import { UsersModule } from './users.module';
import { AuthModule } from './auth.module';
import { PaymentsModule } from "./gateway/payments.module";
import { HttpLoggerMiddleware } from './middleware/logger.middleware';
import { TraceMiddleware } from './middleware/trace.middleware';
import { AppLogger } from './logger/app-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,             // Робить змінні доступними у всіх модулях без імпорту
      envFilePath: '.env',        // За замовчуванням шукає в корені CWD
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppLogger],
  exports: [AppLogger], // Робимо доступним для всього застосунку
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TraceMiddleware, HttpLoggerMiddleware)
      .forRoutes('*');
  }
}

