// libs/common/src/constants/patterns.ts
export const PATTERNS = {
  USER: {
    LOGIN: 'user.login',
    REGISTER: 'user.register',
    CREATED: 'user.created',
    GET_ALL: 'user.get_all',
    GET_ONE: 'user.get_one',
  },
  ACCOUNT: {
    CREATE: 'account.create',
    CREATED: 'account.created',
    CREATE_FAILED: 'account.failed',
    GET_BALANCE: 'account.get_balance',
    TRANSFER: 'account.transfer',
  },
  SYSTEM: {
    LOGGER: 'system.log_event',
    PING: 'system.ping',
  }
};
