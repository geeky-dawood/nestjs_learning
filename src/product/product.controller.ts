import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt.auth.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from 'src/dto/create_product.dto';

@UseGuards(JwtAuthGuard)
@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post('/add-product')
  createProduct(@Body() body: CreateProductDto) {
    return this.productService.createProduct(body);
  }

  @HttpCode(200)
  @Get('/all-products')
  allProducts() {
    return this.productService.allProduct();
  }
}
