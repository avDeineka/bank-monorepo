// users.service.ts
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { firstValueFrom } from 'rxjs';
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES, PATTERNS, CreateAccountDto, CreateUserDto, rpc } from '@app/common';

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
    return await this.knex("users").select('id','email','role');
  }

  async getUserById(id: number) {
    return await this.knex("users").first('id','email').where({ id });
  }

  async findByEmail(email: string) {
    return await this.knex('users').where({ email }).first(); // including a password !
  }

  async create (dto: CreateUserDto) {
    let { email, password, role, name, phone } = dto;
    if (!role) {
      role = 'user';
    }
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
      this.logger.error('❌ Failed to add new user', errorMessage);
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
      return await firstValueFrom(
        rpc.send(this.accountsClient, PATTERNS.ACCOUNT.CREATE, createAccountDto)
      );
    } catch (error) {
      const rawErrorMessage = this.getErrorMessage(error);
      const errorMessage = rawErrorMessage === 'no elements in sequence'
        ? 'Phone number already assigned (or service error)'
        : rawErrorMessage;

      this.logger.error(`🔴 Saga Compensation: Deleting user ${newUser.id} due to ${errorMessage}`);
      await this.deleteUser(newUser.id);
      this.loggerClient.emit(PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.AUTH,
        event: 'SAGA_ROLLBACK',
        payload: { userId: newUser.id, reason: errorMessage }
      });
      throw new Error(errorMessage || 'Registration failed');
    }
  }

  async deleteUser (userId: number) { // аварійний випадок, коли реєстріція пройшла неуспішно
    const result = await this.knex('users').where({ id: userId }).delete();
    return result;
  }

  private getErrorMessage(error: unknown) {
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
}
