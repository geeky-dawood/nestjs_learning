import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\S.*$/, {
    message: 'Title must not start with a space',
  })
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  category?: string;

  @IsOptional()
  @IsString({ each: true })
  images?: Array<string>;
}
