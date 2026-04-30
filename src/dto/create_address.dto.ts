import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Longitude of the address',
    example: -122.4194,
  })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({
    description: 'Latitude of the address',
    example: 37.7749,
  })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({
    description: 'Country of the address',
    example: 'United States',
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    description: 'State of the address',
    example: 'California',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'City of the address',
    example: 'San Francisco',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'ZIP code of the address',
    example: '94105',
  })
  @IsString()
  @IsNotEmpty()
  zip_code: string;

  @ApiProperty({
    description: 'Full address',
    example: '123 Main St, San Francisco, CA 94105',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({
    description: 'Additional address line 1',
    example: 'Apartment 4B',
  })
  @IsString()
  @IsOptional()
  address_line_1?: string;

  @ApiPropertyOptional({
    description: 'Additional address line 2',
    example: 'Near the park',
  })
  @IsString()
  @IsOptional()
  address_line_2?: string;

  @ApiProperty({
    description: 'Tag for the address',
    example: 'Home, Work, etc.',
  })
  @IsString()
  @IsNotEmpty()
  tag: string;
}
