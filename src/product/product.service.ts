import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/database/base.service';
import { CreateProductDto } from 'src/dto/create_product.dto';
import { Product } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      message: 'Success',
      data: products,
    };
  }
}
