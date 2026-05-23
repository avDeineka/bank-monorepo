import { IsIn, IsInt, IsNumber, IsPositive, IsString, Min, IsOptional } from 'class-validator';
import { CURRENCIES } from '../constants/currencies';

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

  @IsOptional() 
  @IsString()
  purpose?: string;
}
