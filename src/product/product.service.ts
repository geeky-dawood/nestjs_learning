import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { BaseService } from '../common/database/base.service';
import { CreateProductDto } from '../dto/create_product.dto';
import { Product } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationService } from '../pagination/pagination.service';
import { GetAllProductsPaginationDto } from '../dto/all_product.dto';
import { UpdateProductDto } from '../dto/update_product.dto';

@Injectable()
export class ProductService extends BaseService<Product> {
  constructor(
    protected prisma: PrismaService,
    protected paginationService: PaginationService,
  ) {
    super(prisma, prisma.product);
  }

  async createProduct(payload: CreateProductDto) {
    try {
      const product = await this.create(payload);

      return {
        message: 'Created',
        data: {
          ...product,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Something went wrong while creating product',
      );
    }
  }

  async updateProduct(product_id: string, payload: UpdateProductDto) {
    try {
      const product = await this.findOne({
        where: {
          id: product_id,
        },
      });

      if (!product || product.is_deleted === true) {
        throw new NotFoundException('product does not exists.');
      }

      const updatedProduct = await this.update(
        {
          id: product_id,
        },
        payload,
      );

      return {
        message: 'Updated Successfully!',
        data: updatedProduct,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Something went wrong while creating product',
      );
    }
  }

  async allProduct(query?: GetAllProductsPaginationDto) {
    try {
      const page = Number(query?.page);
      const limit = Number(query?.limit);

      const skip = (page - 1) * limit;

      const where: any = {
        is_deleted: false,
      };

      if (query?.search) {
        where.title = {
          contains: query.search,
          mode: 'insensitive',
        };
      }

      if (query?.filterByCategory) {
        where.category = {
          contains: query.filterByCategory,
          mode: 'insensitive',
        };
      }

      return await this.paginationService.paginate({
        model: this.prisma.product,
        where,
        skip,
        take: limit,
        orderBy: {
          title: 'asc',
        },
      });
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Something went wrong while creating product',
      );
    }
  }

  async deleteAProduct(product_id: string) {
    try {
      const product = await this.findOne({
        where: {
          id: product_id,
        },
      });

      if (!product || product.is_deleted === true) {
        throw new NotFoundException('product does not exists.');
      }

      await this.update(
        {
          id: product_id,
        },
        {
          is_deleted: true,
        },
      );

      return { message: 'Deleted Successfully!' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Something went wrong while creating product',
      );
    }
  }

  async updateStock(productId: string, stock: number) {
    try {
      if (stock < 0) {
        throw new BadRequestException('Stock cannot be less than 0');
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.is_deleted) {
        throw new NotFoundException('Product does not exist');
      }

      const updatedProduct = await this.prisma.product.update({
        where: { id: productId },
        data: { quantity: stock },
        select: {
          id: true,
          quantity: true,
        },
      });

      return {
        message: 'Stock updated successfully',
        data: updatedProduct,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Something went wrong while creating product',
      );
    }
  }
}
