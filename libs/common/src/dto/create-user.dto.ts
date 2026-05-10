// оновлений create-user.dto.ts
import { IsString, MinLength, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail({}, { message: "Invalid email format" })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsNotEmpty({ message: "Email is required" })
  readonly email !: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  readonly password !: string;

  // Поля зберігаються в auth_db.users, а preferred_currency використовується для стартового рахунку.
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(3, { message: "Too short name" })
  readonly name !: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  preferred_currency?: string = 'USD';
}
