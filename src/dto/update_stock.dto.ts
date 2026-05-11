import { IsNumber, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateStockDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0, { message: 'Stock cannot be less than 0' })
  stock: number;
}
