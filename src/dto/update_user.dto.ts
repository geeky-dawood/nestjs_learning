import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-2]\d|3[0-1])-(0\d|1[0-2])-(\d{4})$/, {
    message: 'DOB must be in DD-MM-YYYY format',
  })
  dob?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;
}
