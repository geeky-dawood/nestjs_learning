import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SigninDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: 'Invalid email format',
  })
  email: string;

  @IsNotEmpty()
  password: string;
}
