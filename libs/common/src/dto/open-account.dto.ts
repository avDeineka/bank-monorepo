import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../constants/currencies';

export class OpenAccountDto {
  @IsString()
  @IsNotEmpty({ message: 'Currency is required' })
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: string;
}
