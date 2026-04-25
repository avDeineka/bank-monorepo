// users.service.ts
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { lastValueFrom, firstValueFrom } from 'rxjs';
import { Injectable, Inject, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserDto } from './dto/create-user.dto';
import { SERVICES, PATTERNS, rpc } from '@app/common';

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
    let { email, password, role, ...userData } = dto;
    if (!role) {
      role = 'user';
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const [newUser] = await this.knex('users')
        .insert({
          email,
          password: hashedPassword,
          role
        })
        .returning(['id', 'email', 'role']) // Повертаємо все, КРІМ пароля
      try {
        const result = await firstValueFrom(
          rpc.send (this.accountsClient, PATTERNS.ACCOUNTS.CREATE_PROFILE, {
            userId: newUser.id,
            name: dto.name,
            role,
            email,
            phone: dto.phone,
            preferred_currency: dto.preferred_currency
          })
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
        this.loggerClient.emit(PATTERNS.LOGGER.LOG_EVENT, {
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
      this.loggerClient.emit(PATTERNS.LOGGER.LOG_EVENT, {
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