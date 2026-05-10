// users.service.ts
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { firstValueFrom } from 'rxjs';
import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES, PATTERNS, CreateAccountDto, CreateUserDto, PostgresError, ROLES, SetRoleDto, rpc } from '@app/common';

@Injectable()
export class UsersService {

  constructor(
    @Inject('KNEX_CONNECTION')
    private readonly knex: Knex,
    
    @Inject(SERVICES.ACCOUNTS) private accountsClient: ClientProxy,
    @Inject(SERVICES.LOGGER) private loggerClient: ClientProxy,
  ) { }

  private readonly logger = new Logger(UsersService.name);

  async findAll() {
    return await this.knex("users").select('id','name','email','phone','role');
  }

  async getUserById(id: number) {
    return await this.knex("users").first('id','name','email','phone','role').where({ id });
  }

  async findByEmail(email: string) {
    return await this.knex('users').where({ email }).first(); // including a password !
  }

  async create (dto: CreateUserDto) {
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
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`❌ Failed to add new user ${errorMessage}`);
      this.loggerClient.emit(PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.AUTH,
        event: 'NEW_USER_FAILED',
        payload: { email, role, errorMessage },
      });
      throw new Error(errorMessage || 'Registration failed');
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
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`❌ Failed to add new user ${errorMessage}`);
      this.logger.error(`🔴 Saga Compensation: Deleting user ${newUser.id}`);
      try {
        await this.deleteUser(newUser.id);
      } catch (rollbackError) {
        const stack = rollbackError instanceof Error ? rollbackError.stack : 'No stack trace';
        this.logger.error({
          message: `‼️ CRITICAL: Failed to delete user ${newUser.id} during rollback`,
          error: rollbackError,
          stack,
        });
        // Тут можна кинути окремий алярм у систему моніторингу
      }
      this.loggerClient.emit(PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.AUTH,
        event: 'SAGA_ROLLBACK',
        payload: { userId: newUser.id, reason: errorMessage }
      });
      throw new Error(errorMessage || 'Registration failed');
    }
  }

  async setRole(dto: SetRoleDto) {
    const [updatedUser] = await this.knex('users')
      .where({ email: dto.email })
      .update({ role: dto.role })
      .returning(['id', 'email', 'role', 'name', 'phone']);

    if (!updatedUser) {
      throw new NotFoundException(`User with email ${dto.email} not found`);
    }

    return updatedUser;
  }

  async deleteUser (userId: number) { // аварійний випадок, коли реєстріція пройшла неуспішно
    const result = await this.knex('users').where({ id: userId }).delete();
    return result;
  }

  private getErrorMessage(error: unknown) {
    const postgresError = this.asPostgresError(error);

    if (postgresError?.code === '23505') {
      const duplicateField = this.getConstraintField(postgresError.constraint);
      if (duplicateField) {
        return `duplicate ${duplicateField} violates unique constraint`;
      }
      return 'duplicate value violates unique constraint';
    }

    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') {
        return message;
      }
      if (typeof message === 'object' && message !== null && 'message' in message) {
        const nestedMessage = (message as { message?: unknown }).message;
        if (typeof nestedMessage === 'string') {
          return nestedMessage;
        }
      }
    }
    return String(error);
  }

  private asPostgresError(error: unknown): PostgresError | null {
    if (typeof error !== 'object' || error === null) {
      return null;
    }

    return error as PostgresError;
  }

  private getConstraintField(constraint?: string) {
    if (!constraint) {
      return null;
    }

    const match = constraint.match(/_(.+?)_key$/);
    return match?.[1] ?? null;
  }
}
