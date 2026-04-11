"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RABBIT_CONFIG = exports.SERVICES = void 0;
exports.SERVICES = {
    AUTH: 'AUTH_SERVICE',
    ACCOUNTS: 'ACCOUNTS_SERVICE',
    LOGGER: 'LOGGER_SERVICE',
};
exports.RABBIT_CONFIG = {
    URL: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    AUTH_QUEUE: 'auth_queue',
    ACCOUNTS_QUEUE: 'accounts_queue',
    LOGGER_QUEUE: 'logger_queue',
};
//# sourceMappingURL=services.js.map