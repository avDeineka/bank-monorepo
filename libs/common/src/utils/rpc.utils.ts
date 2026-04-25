// libs/common/src/utils/rpc.utils.ts
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { traceStorage } from '../trace-storage'; // ваш шлях у common

export const rpc = {
  send: (client: ClientProxy, pattern: string, data: any) => {
    const record = createTraceableRecord(data);
    return client.send({ cmd: pattern }, record);
  },
  emit: (client: ClientProxy, pattern: string, data: any) => {
    const record = createTraceableRecord(data);
    return client.emit(pattern, record);
  }
};

function createTraceableRecord(data: any) {
  const store = traceStorage.getStore();
  return new RmqRecordBuilder(data)
    .setOptions({
      headers: { 'x-trace-id': store?.traceId || '-' },
    })
    .build();
}

/**
 * Універсальний помічник для відправки повідомлень з автоматичним trace-id
export const sendMessage = (client: ClientProxy, pattern: string, data: any) => {
  const store = traceStorage.getStore();
  
  const record = new RmqRecordBuilder(data)
    .setOptions({
      headers: {
        'x-trace-id': store?.traceId || '-',
      },
    })
    .build();

  return client.send({ cmd: pattern }, record);
};

 * Універсальний помічник для публікації подій (emit) з автоматичним trace-id
export const emitEvent = (client: ClientProxy, pattern: any, data: any) => {
  const store = traceStorage.getStore();
  
  const record = new RmqRecordBuilder(data)
    .setOptions({
      headers: {
        'x-trace-id': store?.traceId,
      },
    })
    .build();

  return client.emit(pattern, record); // Використовуємо emit замість send
};
*/