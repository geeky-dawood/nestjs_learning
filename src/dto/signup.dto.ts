import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class SignupDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z]+(?: [A-Za-z]+)*$/, {
    message: 'Name must contain only letters and single spaces between words',
  })
  name: string;

  @IsOptional()
  @IsDateString()
  dob?: Date;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Invalid email format',
  })
  email: string;

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

  @IsOptional()
  @IsString()
  profile_picture?: string;
}
