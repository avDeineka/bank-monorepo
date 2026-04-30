import { IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class TransferDto {
  @IsNumber()
  @Min(1) // ID користувача має бути валідним
  fromUserId: number;

  @IsNumber()
  @Min(1)
  toUserId: number;

  @IsNumber()
  @IsPositive({ message: 'Сума має бути більшою за нуль' })
  amount: number;

  @IsString()
  currency: string;
}