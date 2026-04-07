import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import {
  MOCK_PRODUCT,
  DELETED_PRODUCT,
  MOCK_ORDER,
  MOCK_CREATE_PAYLOAD,
} from '../product/product.data.mock'; // import mock data
import { CreateProductDto } from '../dto/create_product.dto';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      product: {
        create: jest.fn<never>().mockResolvedValue(MOCK_ORDER),
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

  it('should create a product', async () => {
    // Updated payload to match CreateProductDto
    const payload: CreateProductDto = {
      title: 'Test Product',
      description: 'A great product for testing.',
      quantity: 10,
      price: 100,
    };

    jest.spyOn(service, 'create').mockResolvedValue({
      id: 'p1',
      title: 'Test Product',
      description: 'A great product for testing.',
      quantity: 10,
      price: 100,
    } as any);

    const result = await service.createProduct(payload);

    expect(service.create).toHaveBeenCalledWith(payload);
    expect(result).toEqual({
      message: 'Created',
      data: {
        id: 'p1',
        title: 'Test Product',
        description: 'A great product for testing.',
        quantity: 10,
        price: 100,
      },
    });
  });

  it('should return all non-deleted products', async () => {
    const mockProducts = [
      { id: 'p1', is_deleted: false },
      { id: 'p2', is_deleted: false },
    ];

    prisma.product.findMany.mockResolvedValue(mockProducts);

    const result = await service.allProduct();

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { is_deleted: false },
      orderBy: { createdAt: 'desc' },
    });

    expect(result).toEqual({
      message: 'Success',
      data: mockProducts,
    });
  });

  it('should soft delete a product', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(MOCK_PRODUCT);

    jest.spyOn(service, 'update').mockResolvedValue({} as any);

    const result = await service.deleteAProduct('product-1');

    expect(service.findOne).toHaveBeenCalledWith({
      where: { id: 'product-1' },
    });

    expect(service.update).toHaveBeenCalledWith(
      { id: 'product-1' },
      { is_deleted: true },
    );

    expect(result).toEqual({ message: 'Deleted Successfully!' });
  });

  it('should throw if product does not exist', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(null);

    await expect(service.deleteAProduct('missing')).rejects.toThrow(
      new NotFoundException('product does not exists.'),
    );

    expect(service.update).not.toHaveBeenCalled();
  });

  it('should throw if product is already deleted', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(DELETED_PRODUCT);

    await expect(service.deleteAProduct('product-1')).rejects.toThrow(
      new NotFoundException('product does not exists.'),
    );

    expect(service.update).not.toHaveBeenCalled();
  });

  it('should rethrow error from deleteAProduct', async () => {
    jest.spyOn(service, 'findOne').mockRejectedValue(new Error('DB error'));

    await expect(service.deleteAProduct('p1')).rejects.toThrow('DB error');
  });
});
