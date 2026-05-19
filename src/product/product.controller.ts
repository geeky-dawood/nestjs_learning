import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { ProductService } from './product.service';
import { CreateProductDto } from '../dto/create_product.dto';
import { GetAllProductsPaginationDto } from '../dto/all_product.dto';
import { RolesGuard } from '../auth/guard/role.auth.guard';
import { Roles } from '../auth/decorator/role.decorator';
import { UpdateStockDto } from '../dto/update_stock.dto';
import { UpdateProductDto } from '../dto/update_product.dto';

@UseGuards(JwtAuthGuard)
@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post('/add-product')
  async createProduct(@Body() body: CreateProductDto) {
    return await this.productService.createProduct(body);
  }

  @Get('/all-products')
  async allProducts(@Query() query: GetAllProductsPaginationDto) {
    return await this.productService.allProduct(query);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch('/update/:product_id')
  async updateProduct(
    @Param('product_id') product_id: string,
    @Body() body: UpdateProductDto,
  ) {
    return await this.productService.updateProduct(product_id, body);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete('/delete/:product_id')
  async deleteAProduct(@Param('product_id') product_id: string) {
    return await this.productService.deleteAProduct(product_id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch('/update-stock')
  async updateStock(@Body() body: UpdateStockDto) {
    return await this.productService.updateStock(body.productId, body.stock);
  }
}
