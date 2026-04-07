// users.service.ts
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserDto } from './dto/create-user.dto';
import { SERVICES, PATTERNS } from '@app/common';
import { error } from 'console';

@Injectable()
export class UsersService {

  constructor(
    @Inject('KNEX_CONNECTION')
    private readonly knex: Knex,
    
    @Inject(SERVICES.ACCOUNTS) private accountsClient: ClientProxy,
    @Inject(SERVICES.LOGGER) private loggerClient: ClientProxy,
  ) { }

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

      this.accountsClient.emit(PATTERNS.ACCOUNTS.CREATE_PROFILE, {
        userId: newUser.id,
        name: dto.name,
        role,
        email,
        phone: dto.phone,
        preferred_currency: dto.preferred_currency
      });
      return newUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String (error);
      console.error('Failed to add new user', errorMessage);
      this.loggerClient.emit({ cmd: PATTERNS.LOGGER.LOG_EVENT }, {
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