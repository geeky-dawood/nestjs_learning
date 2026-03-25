import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
  async createProduct(@Body() body: CreateProductDto) {
    return await this.productService.createProduct(body);
  }

  @Get('/all-products')
  async allProducts() {
    return await this.productService.allProduct();
  }

  @Delete('/delete/:product_id')
  async deleteAProduct(@Param('product_id') product_id: string) {
    return await this.productService.deleteAProduct(product_id);
  }
}
