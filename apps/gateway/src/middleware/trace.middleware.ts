// common/middleware/trace.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { traceStorage } from '../trace-storage';

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Беремо ID з заголовків (якщо прийшов від іншого сервісу) або створюємо новий
    const traceId = req.headers['x-trace-id'] || uuidv4();
    
    // Встановлюємо ID в заголовок відповіді для дебагу
    res.setHeader('x-trace-id', traceId);

    // Запускаємо наступні функції всередині контексту
    traceStorage.run({ traceId }, () => next());
  }
}