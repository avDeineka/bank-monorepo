// libs/common/src/modules/rmq.module.ts
import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RABBIT_CONFIG } from '@app/common';

@Module({})
export class RmqModule {
  static register(serviceName: string, queueName: string): DynamicModule {
    return {
      module: RmqModule,
      imports: [
        ClientsModule.register([
          {
            name: serviceName,
            transport: Transport.RMQ,
            options: {
              urls: [RABBIT_CONFIG.URL],
              queue: queueName,
              queueOptions: { durable: false },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}