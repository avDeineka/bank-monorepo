// users.service.ts
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { firstValueFrom } from 'rxjs';
import { Injectable, Inject, ConflictException, Logger } from '@nestjs/common';
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
    try {
      const [newUser] = await this.knex('users')
        .insert({
          email,
          password: hashedPassword,
          role,
          name,
          phone,
          created_at: this.knex.fn.now(),
        })
        .returning(['id', 'email', 'role', 'name', 'phone']);
      try {
        const createAccountDto: CreateAccountDto = {
          user_id: newUser.id,
          currency: dto.preferred_currency || 'USD',
          balance: 100,
        };
        const result = await firstValueFrom(
          rpc.send(this.accountsClient, PATTERNS.ACCOUNT.CREATE, createAccountDto)
        );
        return result;
      } catch (error) {
        const rpcError = error instanceof Error ? error?.message : error;
        this.logger.error(`🔴 Saga Compensation: Deleting user ${newUser.id} due to ${rpcError}`);
        // Робимо локальний відкат (Compensating action)
        await this.deleteUser(newUser.id);
        // Логуємо провал для аналітики
        const errorMessage = rpcError === 'no elements in sequence'
          ? 'Phone number already assigned (or service error)'
          : rpcError;
        this.loggerClient.emit(PATTERNS.SYSTEM.LOGGER, {
          service: SERVICES.AUTH,
          event: 'SAGA_ROLLBACK',
          payload: { userId: newUser.id, reason: errorMessage }
        });
        // Кидаємо чесну помилку на фронтенд
        throw new ConflictException (errorMessage || 'Registration failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('❌ Failed to add new user', errorMessage);
      this.loggerClient.emit(PATTERNS.SYSTEM.LOGGER, {
        service: SERVICES.AUTH,
        event: 'NEW_USER_FAILED',
        payload: { email, role, errorMessage },
      });
      return { success: false, message: errorMessage };
    }
  }

  async deleteUser (userId: number) { // аварійний випадок, коли реєстріція пройшла неуспішно
    const result = await this.knex('users').where({ id: userId }).delete();
    return result;
  }
}
