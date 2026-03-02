import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductService } from 'src/product/product.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;
  let productService: any;

  const userId = 'user-123';

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      user: { findUnique: jest.fn() },
      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      orderItem: {
        deleteMany: jest.fn(),
      },
    };

    productService = { findMany: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductService, useValue: productService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw if user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.createOrder(userId, { items: [] })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw if items empty', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await expect(service.createOrder(userId, { items: [] })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw if duplicate products exist', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await expect(
      service.createOrder(userId, {
        items: [
          { product_id: 'p1', quantity: 1 },
          { product_id: 'p1', quantity: 2 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw if product not found', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    productService.findMany.mockResolvedValue([]);

    await expect(
      service.createOrder(userId, {
        items: [{ product_id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw if stock insufficient', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    productService.findMany.mockResolvedValue([
      { id: 'p1', price: 100, quantity: 0 },
    ]);

    await expect(
      service.createOrder(userId, {
        items: [{ product_id: 'p1', quantity: 2 }],
      }),
    ).rejects.toThrow(/Insufficient stock/);
  });

  it('should create order successfully', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    productService.findMany.mockResolvedValue([
      { id: 'p1', price: 100, quantity: 10 },
    ]);

    const mockTx = {
      order: {
        create: jest.fn().mockResolvedValue({
          id: 'o1',
          order_number: 'ABC123456',
          total_price: 100,
        }),
      },
      orderItem: { createMany: jest.fn() },
      product: { update: jest.fn() },
    };

    prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

    const result = await service.createOrder(userId, {
      items: [{ product_id: 'p1', quantity: 1 }],
    });

    expect(result.message).toBe('order Placed');
    expect(mockTx.order.create).toHaveBeenCalled();
    expect(mockTx.orderItem.createMany).toHaveBeenCalled();
    expect(mockTx.product.update).toHaveBeenCalled();
  });

  it('should throw if order not found', async () => {
    prisma.order.findUnique.mockResolvedValue(null);

    await expect(service.getOrderByOrderId('invalid')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should return order by ID', async () => {
    prisma.order.findUnique.mockResolvedValue({
      id: 'o1',
      items: [],
    });

    const result = await service.getOrderByOrderId('o1');

    expect(result.message).toBe('Success');
    expect(result.data.id).toBe('o1');
  });

  it('should throw if user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.getOrderByUserId(userId)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('getAllOrders', () => {
    const mockOrders = [
      { id: 'o1', order_status: 'PENDING', items: [] },
      { id: 'o2', order_status: 'COMPLETED', items: [] },
      { id: 'o3', order_status: 'PENDING', items: [] },
    ];

    it('should return paginated orders without filter', async () => {
      prisma.order.findMany.mockResolvedValue(mockOrders.slice(0, 2));
      prisma.order.count.mockResolvedValue(3);

      const result = await service.getAllOrders({ page: 1, limit: 2 });

      expect(result.data).toEqual(mockOrders.slice(0, 2));
      expect(result.meta).toEqual({
        current_page_number: 1,
        page_size: 2,
        total_pages: 2,
        total_records: 3,
      });
    });

    it('should return paginated orders with filter', async () => {
      const filter = 'PENDING';
      const filteredOrders = mockOrders.filter(
        (o) => o.order_status === filter,
      );

      prisma.order.findMany.mockResolvedValue(filteredOrders);
      prisma.order.count.mockResolvedValue(2);

      const result = await service.getAllOrders({ page: 1, limit: 10, filter });

      expect(result.data.every((o) => o.order_status === filter)).toBe(true);
      expect(result.meta.total_records).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      prisma.order.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getAllOrders({ page: 1, limit: 10 }),
      ).rejects.toThrow('Database error');
    });

    it('should use default pagination if page or limit is missing', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      const result = await service.getAllOrders({});

      expect(result.data).toEqual([]);
      expect(prisma.order.findMany).toHaveBeenCalled();
    });
  });

  it('should delete order successfully', async () => {
    prisma.$transaction.mockResolvedValue([]);

    const result = await service.deleteOrderByOrderId('o1');

    expect(result.message).toBe('Deleted Successfully');
  });

  it('should throw if order not found during delete', async () => {
    prisma.$transaction.mockRejectedValue({ code: 'P2025' });

    await expect(service.deleteOrderByOrderId('invalid')).rejects.toThrow(
      NotFoundException,
    );
  });
});
