import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ROLES } from '../constants/roles';
import type { UserRole } from '../constants/roles';

export class SetRoleDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsNotEmpty({ message: 'Email is required' })
  readonly email!: string;

  @IsIn(Object.values(ROLES), { message: 'Role must be either admin or user' })
  readonly role!: UserRole;
}
