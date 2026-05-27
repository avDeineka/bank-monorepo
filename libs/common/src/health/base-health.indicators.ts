// libs/common/src/health/base-health.indicators.ts
import { formatBytes } from '../utils/format-bytes';

// Явно типізуємо повертаєме значення як Record<string, any>
export const getMemoryHealthIndicator = (): Record<string, any> => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMb = Math.round(memoryUsage.heapUsed / 1024 / 1024);
  const maxLimitMb = 150;
  const isHealthy = heapUsedMb < maxLimitMb;

  return {
    memory: {
      status: isHealthy ? 'up' : 'down',
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      rss: formatBytes(memoryUsage.rss),
      limit: `${maxLimitMb} MB`
    }
  };
};
