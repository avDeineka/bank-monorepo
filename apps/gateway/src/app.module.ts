// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@app/common';
import { UsersModule } from './users.module';
import { AuthModule } from './auth.module';
import { PaymentsModule } from "./gateway/payments.module";
import { HttpLoggerMiddleware } from './middleware/logger.middleware';
import { TraceMiddleware } from './middleware/trace.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    //GlobalClientsModule, // Один раз тут — і все
    LoggerModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TraceMiddleware, HttpLoggerMiddleware)
      .forRoutes('*');
  }
}
