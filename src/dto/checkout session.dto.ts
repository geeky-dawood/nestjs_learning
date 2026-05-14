import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  IsNotEmpty,
  IsIn,
  Length,
} from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsInt()
  @Min(50)
  amount: number;

  @IsString()
  @IsIn(['usd', 'eur', 'gbp', 'pkr', 'aed', 'sar'])
  currency: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  description?: string;
}
