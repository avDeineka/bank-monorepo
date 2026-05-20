import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { CURRENCIES } from '../constants/currencies';

export class OpenAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Currency is required' })
  @IsIn(CURRENCIES)
  currency!: string;
}
