import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsNumber()
  user_id!: number;

  @IsString()
  @IsNotEmpty({ message: 'Currency is required' })
  currency!: string;

  @IsNumber()
  balance!: number;
}
