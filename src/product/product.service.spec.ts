import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationService } from '../pagination/pagination.service';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import {
  MOCK_PRODUCT,
  DELETED_PRODUCT,
  MOCK_ORDER,
} from '../test/mock/product.data.mock';
import {
  MOCK_UPDATED_STOCK_PRODUCT,
  MOCK_UPDATE_STOCK_DELETED_PRODUCT,
  MOCK_UPDATE_STOCK_PRODUCT,
} from '../test/mock/product-stock.data.mock';
import { CreateProductDto } from '../dto/create_product.dto';

describe('ProductService', () => {
  let service: ProductService;
  let prisma: any;
  let paginationService: any;

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
      $transaction: jest.fn((queries: Promise<unknown>[]) =>
        Promise.all(queries),
      ),
    };

    paginationService = {
      paginate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        PaginationService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaginationService, useValue: paginationService },
      ],
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

  it('should return all non-deleted products with pagination and search', async () => {
    const mockProducts = [
      { id: 'p1', title: 'iPhone', is_deleted: false },
      { id: 'p2', title: 'Samsung', is_deleted: false },
    ];

    const mockResult = {
      data: mockProducts,
      meta: {
        current_page_number: 1,
        page_size: 10,
        total_pages: 1,
        total_records: 2,
        has_next_page: false,
        has_previous_page: false,
      },
    };

    // mock paginate service instead of prisma directly
    paginationService.paginate.mockResolvedValue(mockResult);

    const query = {
      page: 1,
      limit: 10,
      search: 'phone',
    };

    const result = await service.allProduct(query);

    expect(paginationService.paginate).toHaveBeenCalledWith({
      model: prisma.product,
      where: {
        is_deleted: false,
        title: {
          contains: 'phone',
          mode: 'insensitive',
        },
      },
      skip: 0,
      take: 10,
      orderBy: {
        title: 'asc',
      },
    });

    expect(result).toEqual(mockResult);
  });

  it('should work without search', async () => {
    const mockResult = {
      data: [],
      meta: {
        current_page_number: 1,
        page_size: 10,
        total_pages: 0,
        total_records: 0,
        has_next_page: false,
        has_previous_page: false,
      },
    };

    paginationService.paginate.mockResolvedValue(mockResult);

    await service.allProduct({ page: 1, limit: 10 });

    expect(paginationService.paginate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          is_deleted: false,
        },
      }),
    );
  });

  it('should filter by category', async () => {
    const mockResult = {
      data: [],
      meta: {
        current_page_number: 1,
        page_size: 10,
        total_pages: 0,
        total_records: 0,
        has_next_page: false,
        has_previous_page: false,
      },
    };

    paginationService.paginate.mockResolvedValue(mockResult);

    await service.allProduct({
      page: 1,
      limit: 10,
      filterByCategory: 'electronics',
    });

    expect(paginationService.paginate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: {
            contains: 'electronics',
            mode: 'insensitive',
          },
        }),
      }),
    );
  });

  it('should soft delete a product', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(MOCK_PRODUCT as any);

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
    const updateSpy = jest.spyOn(service, 'update');

    jest.spyOn(service, 'findOne').mockResolvedValue(null);

    await expect(service.deleteAProduct('missing')).rejects.toThrow(
      new NotFoundException('product does not exists.'),
    );

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should throw if product is already deleted', async () => {
    const updateSpy = jest.spyOn(service, 'update');

    jest.spyOn(service, 'findOne').mockResolvedValue(DELETED_PRODUCT as any);

    await expect(service.deleteAProduct('product-1')).rejects.toThrow(
      new NotFoundException('product does not exists.'),
    );

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('should rethrow error from deleteAProduct', async () => {
    jest.spyOn(service, 'findOne').mockRejectedValue(new Error('DB error'));

    await expect(service.deleteAProduct('p1')).rejects.toThrow('DB error');
  });

  describe('updateStock', () => {
    it('should update product stock', async () => {
      prisma.product.findUnique.mockResolvedValue(MOCK_UPDATE_STOCK_PRODUCT);
      prisma.product.update.mockResolvedValue(MOCK_UPDATED_STOCK_PRODUCT);

      const result = await service.updateStock('product-1', 25);

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { quantity: 25 },
        select: {
          id: true,
          quantity: true,
        },
      });
      expect(result).toEqual({
        message: 'Stock updated successfully',
        data: MOCK_UPDATED_STOCK_PRODUCT,
      });
    });

    it('should throw internal server error when stock is less than 0', async () => {
      await expect(service.updateStock('product-1', -1)).rejects.toThrow(
        new InternalServerErrorException(
          'Something went wrong while updating stock',
        ),
      );

      expect(prisma.product.findUnique).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('should throw internal server error when product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.updateStock('missing-product', 10)).rejects.toThrow(
        new InternalServerErrorException(
          'Something went wrong while updating stock',
        ),
      );

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing-product' },
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('should throw internal server error when product is deleted', async () => {
      prisma.product.findUnique.mockResolvedValue(
        MOCK_UPDATE_STOCK_DELETED_PRODUCT,
      );

      await expect(service.updateStock('product-1', 10)).rejects.toThrow(
        new InternalServerErrorException(
          'Something went wrong while updating stock',
        ),
      );

      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });
});
