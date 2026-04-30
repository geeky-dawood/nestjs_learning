import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'User date of birth',
    example: '01-01-1990',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-2]\d|3[0-1])-(0\d|1[0-2])-(\d{4})$/, {
    message: 'DOB must be in DD-MM-YYYY format',
  })
  dob?: string;

  @ApiPropertyOptional({
    description: 'User profile picture URL',
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsString()
  profile_picture?: string;
}
