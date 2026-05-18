// users.service.ts
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { firstValueFrom } from 'rxjs';
import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES, PATTERNS, ROLES, CreateAccountDto, CreateUserDto, getErrorMessage, SetRoleDto, traceStorage, rpc } from '@app/common';

@Injectable()
export class UsersService {

  constructor(
    @Inject('KNEX_CONNECTION')
    private readonly knex: Knex,
    
    @Inject(SERVICES.ACCOUNTS) private accountsClient: ClientProxy,
    @Inject(SERVICES.LOGGER) private loggerClient: ClientProxy,
  ) { }

  private readonly logger = new Logger(UsersService.name);
  private readonly userSelection = ['id', 'name', 'email', 'phone', 'role'] as const;

  async findAll() {
    return await this.knex('users').select(...this.userSelection);
  }

  async getUserById(id: number) {
    const user = await this.knex('users')
      .first(...this.userSelection)
      .where({ id });

    if (!user) {
      return null;
    }

    const accounts = await firstValueFrom(
      rpc.send(this.accountsClient, PATTERNS.ACCOUNT.GET_ACCOUNTS, { userId: id })
    );

    return {
      ...user,
      accounts: Array.isArray(accounts) ? accounts : [],
    };
  }

  async findByEmail(email: string) {
    return await this.knex('users').where({ email }).first(); // including a password !
  }

  async create (dto: CreateUserDto) {
    const traceId = traceStorage.getStore()?.traceId || null;
    const { email, password, name, phone } = dto;
    const role = ROLES.USER;
    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser;
    try {
      [newUser] = await this.knex('users')
        .insert({
          email,
          password: hashedPassword,
          role,
          name,
          phone,
        })
        .returning(['id', 'email', 'role', 'name', 'phone']);

      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.AUTH,
        user_id: newUser.id,
        event: 'NEW_USER',
        payload: { name, email, phone, role },
        trace_id: traceId,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      this.logger.error(`❌ Failed to add new user ${message}`);
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.AUTH,
        user_id: null,
        event: 'NEW_USER_FAILED',
        payload: { email, role, message },
        trace_id: traceId,
      });
      throw error;
    }

    try {
      const createAccountDto: CreateAccountDto = {
        user_id: newUser.id,
        currency: dto.preferred_currency || 'USD',
        balance: 100,
      };
      const accountResult = await firstValueFrom(
        rpc.send(this.accountsClient, PATTERNS.ACCOUNT.CREATE, createAccountDto)
      );

      if (!accountResult || accountResult.status !== 'success') {
        const message =
          typeof accountResult?.message === 'string'
            ? accountResult.message
            : 'Account creation failed';
        throw new Error(message);
      }

      return accountResult;
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`❌ Failed to add new user ${errorMessage}`);
      this.logger.error(`🔴 Saga Compensation: Deleting user ${newUser.id}`);
      /*try {
        await this.deleteUser(newUser.id);
      } catch (rollbackError) {
        const stack = rollbackError instanceof Error ? rollbackError.stack : 'No stack trace';
        this.logger.error({
          message: `‼️ CRITICAL: Failed to delete user ${newUser.id} during rollback`,
          error: rollbackError,
          stack,
        });
        // Тут можна кинути окремий алярм у систему моніторингу
      }*/
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, { // unusual case, when user was created but account creation failed, so we have to log it with user_id but with failed event
        service: SERVICES.AUTH,
        event: 'SAGA_ROLLBACK',
        payload: { userId: newUser.id, reason: errorMessage },
        trace_id: traceId,
      });
      throw error;
    }
  }

  async setRole(dto: SetRoleDto) {
    const traceId = traceStorage.getStore()?.traceId || null;
    const [updatedUser] = await this.knex('users')
      .where({ email: dto.email })
      .update({ role: dto.role })
      .returning(['id', 'email', 'role', 'name', 'phone']);

    if (!updatedUser) {
      rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.AUTH,
        user_id: null,
        event: 'ROLE_CHANGE_FAILED',
        payload: { role: dto.role, email: dto.email, message: 'User email not found' },
        trace_id: traceId,
      });
      throw new NotFoundException(`User with email ${dto.email} not found`);
    }
    rpc.emit(this.loggerClient, PATTERNS.SYSTEM.LOGGER, {
      service: SERVICES.AUTH,
      user_id: updatedUser.id,
      event: 'ROLE_CHANGED',
      payload: { role: dto.role, name: updatedUser.name, email: dto.email },
      trace_id: traceId,
    });

    return updatedUser;
  }

  async deleteUser (userId: number) { // аварійний випадок, коли реєстріція пройшла неуспішно
    const result = await this.knex('users').where({ id: userId }).delete();
    return result;
  }
}
