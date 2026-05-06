import { IsNumber, IsNotEmpty, Min } from 'class-validator';

export class UpdateStockDto {
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(0, { message: 'Stock cannot be less than 0' })
  stock: number;
}
