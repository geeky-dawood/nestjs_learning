import { Injectable } from '@nestjs/common';
import { CreateProductDto } from 'src/dto/create_product.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async createProduct(payload: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: { ...payload },
    });

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
