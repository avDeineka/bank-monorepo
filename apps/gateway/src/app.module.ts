// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiModule } from "./gateway/api.module";
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
    ApiModule,
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
