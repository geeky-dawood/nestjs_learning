import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserRole } from 'src/generated/prisma/enums';

export class SignupDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  dob?: Date;

  @IsNotEmpty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;
}
