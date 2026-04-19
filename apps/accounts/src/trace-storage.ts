// common/trace-storage.ts
import { AsyncLocalStorage } from 'async_hooks';

export const traceStorage = new AsyncLocalStorage<{ traceId: string }>();
