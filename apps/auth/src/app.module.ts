// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common';
import { DatabaseModule } from '@app/common';
import { RmqModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';
import { UsersModule } from './users.module';
import { AuthModule } from './auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    RmqModule.register(SERVICES.GATEWAY, RABBIT_CONFIG.GATEWAY_QUEUE),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
