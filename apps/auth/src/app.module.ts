// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { SERVICES, RABBIT_CONFIG, DatabaseModule, LoggerModule, RmqModule } from '@app/common';
import { UsersModule } from './users.module';
import { AuthModule } from './auth.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    DatabaseModule,
    TerminusModule,
    UsersModule,
    AuthModule,
    RmqModule.register(SERVICES.GATEWAY, RABBIT_CONFIG.GATEWAY_QUEUE),
  ],
  controllers: [ HealthController ],
  providers: [],
})
export class AppModule {}
