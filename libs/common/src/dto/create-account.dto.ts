import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CURRENCIES } from '../constants/currencies';

export class CreateAccountDto {
  @IsNumber()
  user_id!: number;

  @IsString()
  @IsNotEmpty({ message: 'Currency is required' })
  @IsIn(CURRENCIES)
  currency!: string;

  @IsOptional()
  @IsNumber()
  balance?: number;
}
