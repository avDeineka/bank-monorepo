// libs/common/src/constants/services.ts
export const SERVICES = {
  AUTH: 'AUTH_SERVICE',
  ACCOUNTS: 'ACCOUNTS_SERVICE',
  LOGGER: 'LOGGER_SERVICE',
};

export const RABBIT_CONFIG = {
  URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  AUTH_QUEUE: 'auth_queue',
  ACCOUNTS_QUEUE: 'accounts_queue',
  LOGGER_QUEUE: 'logger_queue',
};