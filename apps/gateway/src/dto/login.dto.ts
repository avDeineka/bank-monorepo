// auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Будь ласка, вкажіть коректний email' })
  @IsNotEmpty({ message: 'Email не може бути порожнім' })
  readonly email: string;

  @IsString()
  @IsNotEmpty({ message: 'Пароль обов’язковий' })
  // Ми не ставимо тут @MinLength, як при реєстрації. 
  // Чому? Бо якщо ми змінимо вимоги до довжини пароля в майбутньому, 
  // старі користувачі все одно мають мати змогу ввести свій короткий пароль.
  readonly password: string;
}