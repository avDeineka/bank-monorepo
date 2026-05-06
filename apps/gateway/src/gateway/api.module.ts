// gateway/api.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { RmqModule } from '@app/common';
import { SERVICES, RABBIT_CONFIG } from '@app/common';
import { ApiController } from './api.controller';
import { JwtStrategy } from '../jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        //signOptions: { expiresIn: '1h' },
      }),
    }),
    RmqModule.register(SERVICES.ACCOUNTS, RABBIT_CONFIG.ACCOUNTS_QUEUE),
    RmqModule.register(SERVICES.AUTH, RABBIT_CONFIG.AUTH_QUEUE),
  ],
  controllers: [ApiController],
  providers: [JwtStrategy],
})
export class ApiModule {}