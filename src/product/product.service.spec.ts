import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should soft delete a product', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      is_deleted: false,
    });
    prisma.product.update.mockResolvedValue({
      id: 'product-1',
      is_deleted: true,
    });

    const result = await service.deleteAProduct('product-1');

    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
      },
    });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
      },
      data: {
        is_deleted: true,
      },
    });
    expect(result).toEqual({ message: 'Deleted Successfully!' });
  });

  it('should throw if product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);

    await expect(service.deleteAProduct('missing-product')).rejects.toThrow(
      new NotFoundException('product does not exists.'),
    );

    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  it('should throw if product is already soft deleted', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      is_deleted: true,
    });

    await expect(service.deleteAProduct('product-1')).rejects.toThrow(
      new NotFoundException('product does not exists.'),
    );

    expect(prisma.product.update).not.toHaveBeenCalled();
  });
});
