// Перевіряємо, чи ми зараз на сервері (в Docker), чи в браузері клієнта
const isServer = typeof window === 'undefined';

export const GATEWAY_URL = isServer
  ? (process.env.INTERNAL_GATEWAY_URL || 'http://localhost:2999') // Для серверного SSR (Docker бачить сервіс `gateway`)
  : (process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:2999'); // Для клієнтського браузера (бачить `localhost`)