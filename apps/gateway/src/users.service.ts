// users.service.ts
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CreateUserDto } from './dto/create-user.dto';
import { SERVICES, PATTERNS } from '@app/common';

@Injectable()
export class UsersService {

  constructor(
    @Inject('KNEX_CONNECTION')
    private readonly knex: Knex,
    
    @Inject(SERVICES.ACCOUNTS) private accountsClient: ClientProxy,
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
    const { email, password, ...userData } = dto;

    // 1. Хешуємо пароль. 10 — це кількість раундів солі (salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Записуємо в базу через Knex
    // .returning('*') важливо для PostgreSQL, щоб отримати створеного юзера
    const [newUser] = await this.knex('users')
      .insert({
        email,
        password: hashedPassword,
      })
      .returning(['id', 'email', 'role']); // Повертаємо все, КРІМ пароля

    this.accountsClient.emit(PATTERNS.ACCOUNTS.CREATE_PROFILE, {
      userId: newUser.id,
      name: dto.name,
      phone: dto.phone,
      preferred_currency: dto.preferred_currency
    });
    return newUser;
  }

  async deleteUser (userId: number) { // аварійний випадок, коли реєстріція пройшла неуспішно
    const result = await this.knex('users').where({ id: userId }).delete();
    return result;
  }
}