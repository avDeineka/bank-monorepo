// libs/common/src/constants/patterns.ts
export const PATTERNS = {
  USER: {
    LOGIN: 'user.login',
    REGISTER: 'user.register',
    SET_ROLE: 'user.set_role',
    CREATED: 'user.created',
    GET_ALL: 'user.get_all',
    GET_ONE: 'user.get_one',
  },
  ACCOUNT: {
    CREATE: 'account.create',
    CREATED: 'account.created',
    CREATE_FAILED: 'account.failed',
    GET_ACCOUNTS: 'account.get_accounts',
    GET_RATE: 'account.get_rate',
    TRANSFER: 'account.transfer',
    GET_TRANSFERS: 'account.get_transfers',
  },
  SYSTEM: {
    HEALTH: 'system.health',
    LOGGER: 'system.log_event',
    PING: 'system.ping',
  }
};
