import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateAddressDto {
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  zip_code: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  address_line_1: string;

  @IsString()
  address_line_2: string;

  @IsString()
  @IsNotEmpty()
  tag: string;
}
