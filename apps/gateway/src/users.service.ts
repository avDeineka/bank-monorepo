// users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Knex } from 'knex';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {

  constructor(
    @Inject('KNEX_CONNECTION')
    private readonly knex: Knex
  ) { }

  async findAll() {
    return await this.knex("users").select('id','email');
  }

  async getUserById(id: number) {
    return await this.knex("users").first('id','email').where({ id });
  }

  async findByEmail(email: string) {
    return await this.knex('users').where({ email }).first(); // including a password !
  }

  async create(createUserDto: CreateUserDto) {
    const { password, ...userData } = createUserDto;

    // 1. Хешуємо пароль. 10 — це кількість раундів солі (salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Записуємо в базу через Knex
    // .returning('*') важливо для PostgreSQL, щоб отримати створеного юзера
    const [newUser] = await this.knex('users')
      .insert({
        ...userData,
        password: hashedPassword,
      })
      .returning(['id', 'name', 'email']); // Повертаємо все, КРІМ пароля

    return newUser;
  }
}