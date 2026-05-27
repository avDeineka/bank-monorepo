import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { SERVICES, RABBIT_CONFIG, RmqModule, getRaterProtoPath  } from '@app/common';
import { JwtStrategy } from '../jwt.strategy';
import { RolesGuard } from '../roles.guard';
import { ApiController } from './api.controller';

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
    RmqModule.register(SERVICES.LOGGER, RABBIT_CONFIG.LOGGER_QUEUE),
    ClientsModule.register([
      {
        name: SERVICES.RATER,
        transport: Transport.GRPC,
        options: {
          package: 'rater',
          protoPath: getRaterProtoPath(),
          url: process.env.RATER_HOST ? `${process.env.RATER_HOST}:3004` : 'localhost:3004',
        },
      },
    ]),
  ],
  controllers: [ApiController],
  providers: [JwtStrategy, RolesGuard],
})
export class ApiModule {}
