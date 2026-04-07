import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseService } from '../common/database/base.service';
import { CreateProductDto } from '../dto/create_product.dto';
import { Product } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService extends BaseService<Product> {
  constructor(protected prisma: PrismaService) {
    super(prisma, prisma.product);
  }

  async createProduct(payload: CreateProductDto) {
    const product = await this.create(payload);

    return {
      message: 'Created',
      data: {
        ...product,
      },
    };
  }

  async allProduct() {
    const products = await this.prisma.product.findMany({
      where: {
        is_deleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Success',
      data: products,
    };
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
      console.log(error);
      throw error;
    }
  }
}
