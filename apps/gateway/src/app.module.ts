import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from '@app/common';
import { UsersModule } from './users.module';
import { AuthModule } from './auth.module';
import { PaymentsModule } from "./gateway/payments.module";

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    AuthModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
