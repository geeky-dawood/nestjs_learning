import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductService } from 'src/product/product.service';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from 'src/auth/guard/role.auth.guard';
import { OrderStatusEnum } from 'src/generated/prisma/enums';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;
  let productService: any;

  const userId = 'user-123';

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),

      user: { findUnique: jest.fn() },

      activityLogs: {
        create: jest.fn(),
      },

      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },

      orderItem: {
        deleteMany: jest.fn(),
        findMany: jest.fn(),
      },

      product: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    prisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }

      return Promise.all(arg);
    });

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
      product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      activityLogs: { create: jest.fn() },
    };

    prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

    const result = await service.createOrder(userId, {
      items: [{ product_id: 'p1', quantity: 1 }],
    });

    expect(result.message).toBe('order Placed');
    expect(mockTx.order.create).toHaveBeenCalled();
    expect(mockTx.orderItem.createMany).toHaveBeenCalled();
    expect(mockTx.product.updateMany).toHaveBeenCalled();
    expect(mockTx.activityLogs.create).toHaveBeenCalledWith({
      data: {
        user_id: userId,
        order_id: 'o1',
        action_type: 'ORDER_CREATED',
        description: 'Order ABC123456 has been created.',
        previous_status: null,
        current_status: OrderStatusEnum.PENDING,
      },
    });
  });

  it('should throw if stock changes during transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    productService.findMany.mockResolvedValue([
      { id: 'p1', price: 100, quantity: 10 },
    ]);

    const mockTx = {
      order: {
        create: jest.fn(),
      },
      orderItem: { createMany: jest.fn() },
      product: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    };

    prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

    await expect(
      service.createOrder(userId, {
        items: [{ product_id: 'p1', quantity: 1 }],
      }),
    ).rejects.toThrow(/Insufficient stock/);

    expect(mockTx.order.create).not.toHaveBeenCalled();
  });

  it('should prevent overselling for concurrent order requests', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    productService.findMany.mockResolvedValue([
      { id: 'p1', price: 100, quantity: 1 },
    ]);

    const mockTx = {
      order: {
        create: jest.fn().mockResolvedValueOnce({
          id: 'o1',
          order_number: 'ABC123456',
          total_price: 100,
        }),
      },
      orderItem: { createMany: jest.fn() },
      activityLogs: { create: jest.fn() },
      product: {
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 0 }),
      },
    };

    prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

    const payload = { items: [{ product_id: 'p1', quantity: 1 }] };

    const [firstResult, secondResult] = await Promise.allSettled([
      service.createOrder(userId, payload),
      service.createOrder(userId, payload),
    ]);

    const fulfilled = [firstResult, secondResult].filter(
      (result) => result.status === 'fulfilled',
    );
    const rejected = [firstResult, secondResult].filter(
      (result) => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(mockTx.product.updateMany).toHaveBeenCalledTimes(2);
    expect(mockTx.order.create).toHaveBeenCalledTimes(1);
    expect(mockTx.orderItem.createMany).toHaveBeenCalledTimes(1);
    expect(mockTx.activityLogs.create).toHaveBeenCalledTimes(1);
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

      const result = await service.getAllOrders({
        page: 1,
        limit: 2,
        search: '',
      });

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

      const result = await service.getAllOrders({
        page: 1,
        limit: 10,
        filter,
        search: '',
      });

      expect(result.data.every((o) => o.order_status === filter)).toBe(true);
      expect(result.meta.total_records).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      prisma.order.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getAllOrders({ page: 1, limit: 10, search: '' }),
      ).rejects.toThrow('Database error');
    });

    it('should use default pagination if page or limit is missing', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      const result = await service.getAllOrders({
        page: 1,
        limit: 10,
        search: '',
      });

      expect(result.data).toEqual([]);
      expect(prisma.order.findMany).toHaveBeenCalled();
    });
  });

  it('should delete order successfully', async () => {
    prisma.$transaction.mockResolvedValue([]);

    const result = await service.deleteOrderByOrderId('o1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.message).toBe('Deleted Successfully');
  });

  it('should throw if order not found during delete', async () => {
    prisma.$transaction.mockRejectedValue({ code: 'P2025' });

    await expect(service.deleteOrderByOrderId('invalid')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new RolesGuard(reflector);
    });

    const mockExecutionContext = (role: string, requiredRoles: string[]) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({
            user: { role },
          }),
        }),
        getHandler: () => {},
        getClass: () => {},
      }) as unknown as ExecutionContext;

    it('should allow access if role matches', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = mockExecutionContext('ADMIN', ['ADMIN']);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access if role does not match', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = mockExecutionContext('USER', ['ADMIN']);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access if no roles required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = mockExecutionContext('USER', []);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('changeOrderStatus', () => {
    const orderId = 'o1';

    it('should throw if order not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(
        service.changeOrderStatus({
          order_id: orderId,
          status: OrderStatusEnum.CONFIRMED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if invalid transition', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: orderId,
        order_status: OrderStatusEnum.COMPLETED,
      } as any);

      await expect(
        service.changeOrderStatus({
          order_id: orderId,
          status: OrderStatusEnum.PENDING,
        }),
      ).rejects.toThrow(NotAcceptableException);
    });

    it('should update status normally', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: orderId,
        order_status: OrderStatusEnum.PENDING,
        user_id: userId,
        order_number: 'ABC123456',
      } as any);

      prisma.order.update.mockResolvedValue({});

      const res = await service.changeOrderStatus({
        order_id: orderId,
        status: OrderStatusEnum.CONFIRMED,
      });

      expect(prisma.order.update).toHaveBeenCalled();
      expect(prisma.activityLogs.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          order_id: orderId,
          action_type: 'ORDER_STATUS_UPDATED',
          description:
            'Order ABC123456 status changed from PENDING to CONFIRMED.',
          previous_status: OrderStatusEnum.PENDING,
          current_status: OrderStatusEnum.CONFIRMED,
        },
      });
      expect(res.message).toBe('This order has been Confirmed');
    });

    it('should cancel order and restore stock via transaction', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: orderId,
        order_status: OrderStatusEnum.CONFIRMED,
        user_id: userId,
        order_number: 'XYZ654321',
      } as any);

      const mockTx = {
        orderItem: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ product_id: 'p1', quantity: 2 }]),
        },
        product: {
          update: jest.fn(),
        },
        order: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

      const res = await service.changeOrderStatus({
        order_id: orderId,
        status: OrderStatusEnum.CANCELLED,
      });

      expect(mockTx.orderItem.findMany).toHaveBeenCalled();
      expect(mockTx.product.update).toHaveBeenCalled();
      expect(mockTx.order.update).toHaveBeenCalled();
      expect(prisma.activityLogs.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          order_id: orderId,
          action_type: 'ORDER_STATUS_UPDATED',
          description:
            'Order XYZ654321 status changed from CONFIRMED to CANCELLED.',
          previous_status: OrderStatusEnum.CONFIRMED,
          current_status: OrderStatusEnum.CANCELLED,
        },
      });
      expect(res.message).toBe('This order has been Cancelled by our team');
    });

    it('should not create an activity log when status transition is rejected', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: orderId,
        order_status: OrderStatusEnum.COMPLETED,
        user_id: userId,
        order_number: 'NOLOG123',
      } as any);

      await expect(
        service.changeOrderStatus({
          order_id: orderId,
          status: OrderStatusEnum.PENDING,
        }),
      ).rejects.toThrow(NotAcceptableException);

      expect(prisma.activityLogs.create).not.toHaveBeenCalled();
    });
  });
});
