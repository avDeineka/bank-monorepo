import { IsIn, IsInt, IsNumber, IsPositive, IsString, Min, IsOptional } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../constants/currencies';

export class TransferDto {

  @IsInt()
  @Min(1) // ID рахунку відправника має бути валідним
  fromAccountId!: number;

  @IsInt()
  @Min(1)
  toAccountId!: number;

  @IsInt()
  @IsPositive({ message: 'The amount must be greater than zero' })
  amount!: number;

  @IsString()
  @IsIn(SUPPORTED_CURRENCIES)
  currency!: string;

  @IsOptional() 
  @IsString()
  purpose?: string;
}
