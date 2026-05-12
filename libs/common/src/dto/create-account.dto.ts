import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../constants/currencies';

export class CreateAccountDto {
  @IsNumber()
  user_id!: number;

  @IsString()
  @IsNotEmpty({ message: 'Currency is required' })
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: string;

  @IsNumber()
  balance!: number;
}
