import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsOptional()
  @IsDateString()
  dob: Date;

  @IsOptional()
  @IsString()
  profile_picture: string;
}
