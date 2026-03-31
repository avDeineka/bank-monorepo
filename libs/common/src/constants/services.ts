// libs/common/src/constants/services.ts
export const SERVICES = {
  ACCOUNTS: 'ACCOUNTS_SERVICE',
  PAYMENTS: 'PAYMENTS_SERVICE', // якщо виділите платежі в окремий
  AUTH: 'AUTH_SERVICE',
  LOGGER: 'LOGGER_SERVICE',
};

export const RABBIT_CONFIG = {
  URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  ACCOUNTS_QUEUE: 'accounts_queue',
  LOGGER_QUEUE: 'logger_queue',
};