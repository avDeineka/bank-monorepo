// libs/common/src/utils/rpc.utils.ts
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { traceStorage } from '../trace-storage'; // ваш шлях у common

/**
 * Універсальний помічник для відправки повідомлень з автоматичним trace-id
 */
export const sendMessage = (client: ClientProxy, pattern: string, data: any) => {
  const store = traceStorage.getStore();
  
  const record = new RmqRecordBuilder(data)
    .setOptions({
      headers: {
        'x-trace-id': store?.traceId || 'no-traceId',
      },
    })
    .build();

  return client.send({ cmd: pattern }, record);
};