import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product title',
    example: 'Apple iPhone 14',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\S.*$/, {
    message: 'Title must not start with a space',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Product description',
    example: 'The latest iPhone with advanced features.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Product price',
    example: 999.99,
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    description: 'Product category',
    example: 'Electronics',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  category?: string;

  @ApiProperty({
    description: 'Product quantity in stock',
    example: 100,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'quantity is required' })
  quantity: number;
}
