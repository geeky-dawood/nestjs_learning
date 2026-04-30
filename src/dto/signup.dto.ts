import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { UserRole } from '../generated/prisma/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'Role must be either ADMIN or USER',
  })
  @ApiPropertyOptional({
    description: 'User role ',
    enumName: 'USER or ADMIN',
    enum: UserRole,
    type: String,
  })
  role?: UserRole;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z]+(?: [A-Za-z]+)*$/, {
    message: 'Name must contain only letters and single spaces between words',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'User date of birth in DD-MM-YYYY format',
    example: '31-12-1990',
    format: 'date',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-2]\d|3[0-1])-(0\d|1[0-2])-(\d{4})$/, {
    message: 'DOB must be in DD-MM-YYYY format',
  })
  dob?: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
    format: 'email',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Invalid email format',
  })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must be at least 8 characters long and include uppercase letters, lowercase letters, numbers, and special characters, ' +
        'Allowed Special Characters are: @$!%*?&',
    },
  )
  password: string;

  @ApiPropertyOptional({
    description: 'User profile picture URL',
    example: 'https://example.com/profile.jpg',
    format: 'url',
    type: String,
  })
  @IsOptional()
  @IsString()
  profile_picture?: string;
}
