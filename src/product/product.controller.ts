import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from '../dto/create_product.dto';
import { GetAllProductsPaginationDto } from '../dto/all_product.dto';

@UseGuards(JwtAuthGuard)
@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post('/add-product')
  async createProduct(@Body() body: CreateProductDto) {
    return await this.productService.createProduct(body);
  }

  @Get('/all-products')
  async allProducts(@Query() query: GetAllProductsPaginationDto) {
    return await this.productService.allProduct(query);
  }

  @Delete('/delete/:product_id')
  async deleteAProduct(@Param('product_id') product_id: string) {
    return await this.productService.deleteAProduct(product_id);
  }
}
