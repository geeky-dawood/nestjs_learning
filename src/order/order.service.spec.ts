import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { MailService } from '../mail/mail.service';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guard/role.auth.guard';
import { OrderStatusEnum } from '../generated/prisma/enums';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

import {
  MOCK_USER_ID,
  MOCK_USER,
  MOCK_ORDER_ID,
  MOCK_ORDER_NUMBER,
  MOCK_ORDER_PENDING,
  MOCK_ORDER_CONFIRMED,
  MOCK_ORDER_COMPLETED,
  MOCK_ORDER_CANCELLED,
  MOCK_ORDER_WITH_ITEMS,
  MOCK_ORDER_CONFIRMED_WITH_ITEMS,
  MOCK_ORDER_ITEMS,
  MOCK_ORDER_ITEMS_MULTI,
  MOCK_PRODUCT_P1,
  MOCK_PRODUCT_P2,
  MOCK_PRODUCT_ZERO_STOCK,
  MOCK_PRODUCT_LOW_STOCK,
  MOCK_PAGINATED_ORDERS,
  MOCK_SEARCH_DTO_DEFAULT,
  MOCK_SEARCH_DTO_WITH_FILTER,
  MOCK_SEARCH_DTO_WITH_SEARCH,
  MOCK_PAGINATION_META,
  PLACE_ORDER_SINGLE_ITEM,
  PLACE_ORDER_MULTI_ITEM,
  PLACE_ORDER_DUPLICATE_ITEMS,
  PLACE_ORDER_EMPTY,
  PLACE_ORDER_EXCESS_QUANTITY,
  createSuccessfulOrderTx,
  createStockExhaustedTx,
  createCancelOrderTx,
  createDeleteOrderTx,
} from '../test/mock/order.data.mock';
import { PrismaClient } from '@prisma/client/extension';

const mockTx = {
  order: {
    create: jest.fn(),
  },
  orderItem: {
    createMany: jest.fn(),
  },
  activityLogs: {
    create: jest.fn(),
  },
  product: {
    updateMany: jest.fn(),
  },
} as unknown as PrismaClient;

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;
  let productService: any;
  let mailService: any;

  // ─── Setup ──────────────────────────────────────────────────────────────────

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      user: { findUnique: jest.fn() },
      activityLogs: { create: jest.fn() },
      order: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      orderItem: {
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        createMany: jest.fn(),
      },
      product: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    // Default: execute callback with prisma itself as the tx object
    prisma.$transaction.mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(prisma);
      return Promise.all(arg);
    });

    productService = { findMany: jest.fn() };
    mailService = {
      sendOrderPlacedEmail: jest.fn(),
      sendOrderStatusEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductService, useValue: productService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  // ─── Basic Instantiation ─────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createOrder
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createOrder', () => {
    describe('validation guards', () => {
      it('throws NotFoundException when user does not exist', async () => {
        // Line 44-47: user lookup fails
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_EMPTY),
        ).rejects.toThrow(NotFoundException);

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: MOCK_USER_ID },
        });
      });

      it('throws BadRequestException when items array is empty', async () => {
        // Line 53-56: empty items check
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_EMPTY),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when items array is null/undefined', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);

        await expect(
          service.createOrder(MOCK_USER_ID, { items: null as any }),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException on duplicate product IDs in items', async () => {
        // Line 63-67: unique product ID check
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_DUPLICATE_ITEMS),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when one or more products are not found', async () => {
        // Line 77-80: products.length !== uniqueProductIds.length
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([]); // returns 0, but 1 ID requested

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_SINGLE_ITEM),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when only partial products are found', async () => {
        // multi-item order but only one product returned
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([MOCK_PRODUCT_P1]); // p2 missing

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_MULTI_ITEM),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when product quantity is zero (insufficient stock)', async () => {
        // Line 92-95: product.quantity < orderItem.quantity
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([MOCK_PRODUCT_ZERO_STOCK]);

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_SINGLE_ITEM),
        ).rejects.toThrow(/Insufficient stock/);
      });

      it('throws BadRequestException when requested quantity exceeds available stock', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([MOCK_PRODUCT_P1]); // quantity: 10

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_EXCESS_QUANTITY), // quantity: 999
        ).rejects.toThrow(/Insufficient stock/);
      });
    });

    describe('transaction logic', () => {
      it('successfully creates order, order items, decrements stock, and logs activity', async () => {
        // Lines 107-155: full happy path inside $transaction
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([MOCK_PRODUCT_P1]);

        const mockTx = createSuccessfulOrderTx(jest);
        prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

        const result = await service.createOrder(
          MOCK_USER_ID,
          PLACE_ORDER_SINGLE_ITEM,
        );

        expect(result.message).toBe('order Placed');
        expect(result.data).toMatchObject({ id: MOCK_ORDER_ID });

        // stock decremented
        expect(mockTx.product.updateMany).toHaveBeenCalledWith({
          where: { id: 'p1', quantity: { gte: 1 } },
          data: { quantity: { decrement: 1 } },
        });

        // order row created with correct total
        expect(mockTx.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              total_price: 100,
              user_id: MOCK_USER_ID,
            }),
          }),
        );

        // order items inserted
        expect(mockTx.orderItem.createMany).toHaveBeenCalledWith({
          data: [
            {
              order_id: MOCK_ORDER_ID,
              product_id: 'p1',
              quantity: 1,
              price: 100,
            },
          ],
        });

        // activity log written
        expect(prisma.activityLogs.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              action_type: 'ORDER_CREATED',
              current_status: OrderStatusEnum.PENDING,
              previous_status: null,
            }),
          }),
        );
      });

      it('correctly calculates total_price for multi-item order', async () => {
        // price: p1=100*2 + p2=200*1 = 400
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([
          MOCK_PRODUCT_P1,
          MOCK_PRODUCT_P2,
        ]);

        const mockTx = createSuccessfulOrderTx(jest);
        mockTx.order.create.mockResolvedValue({
          id: MOCK_ORDER_ID,
          order_number: MOCK_ORDER_NUMBER,
          total_price: 400,
        });
        prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

        const result = await service.createOrder(
          MOCK_USER_ID,
          PLACE_ORDER_MULTI_ITEM,
        );

        expect(result.message).toBe('order Placed');
        expect(mockTx.order.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ total_price: 400 }),
          }),
        );
      });

      it('throws BadRequestException when stock changes mid-transaction (race condition)', async () => {
        // Line 87: updateMany returns count 0 → insufficient stock
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([MOCK_PRODUCT_P1]);

        const mockTx = createStockExhaustedTx(jest);
        prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_SINGLE_ITEM),
        ).rejects.toThrow(/Insufficient stock/);

        // order must NOT be created when stock check fails
        expect(mockTx.order.create).not.toHaveBeenCalled();
        expect(mockTx.orderItem.createMany).not.toHaveBeenCalled();
      });

      it('prevents overselling under concurrent order requests', async () => {
        // Simulates two simultaneous requests for the last unit of stock
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([MOCK_PRODUCT_LOW_STOCK]); // qty: 1

        const mockTx = {
          order: {
            create: jest.fn<() => Promise<any>>().mockResolvedValueOnce({
              id: MOCK_ORDER_ID,
              order_number: MOCK_ORDER_NUMBER,
              total_price: 100,
            }),
          },
          orderItem: {
            createMany: jest.fn<() => Promise<any>>(),
          },
          activityLogs: {
            create: jest.fn<() => Promise<any>>(),
          },
          product: {
            updateMany: jest
              .fn<() => Promise<any>>()
              .mockResolvedValueOnce({ count: 1 })
              .mockResolvedValueOnce({ count: 0 }),
          },
        };

        prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

        const [first, second] = await Promise.allSettled([
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_SINGLE_ITEM),
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_SINGLE_ITEM),
        ]);

        const fulfilled = [first, second].filter(
          (r) => r.status === 'fulfilled',
        );
        const rejected = [first, second].filter((r) => r.status === 'rejected');

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(mockTx.product.updateMany).toHaveBeenCalledTimes(2);
        expect(mockTx.order.create).toHaveBeenCalledTimes(1);
        expect(mockTx.orderItem.createMany).toHaveBeenCalledTimes(1);
      });

      it('re-throws unexpected errors from the transaction (catch block line 87)', async () => {
        prisma.user.findUnique.mockResolvedValue(MOCK_USER);
        productService.findMany.mockResolvedValue([MOCK_PRODUCT_P1]);

        const dbError = new Error('Unexpected DB failure');
        prisma.$transaction.mockRejectedValue(dbError);

        await expect(
          service.createOrder(MOCK_USER_ID, PLACE_ORDER_SINGLE_ITEM),
        ).rejects.toThrow('Unexpected DB failure');
      });
    });

    it('should throw BadRequestException for duplicate items', async () => {
      jest
        .spyOn(service['prisma'].user, 'findUnique')
        .mockResolvedValue(MOCK_USER as any);

      await expect(
        service.createOrder(MOCK_USER_ID, PLACE_ORDER_DUPLICATE_ITEMS),
      ).rejects.toThrow(
        'Duplicate product found in order items. Each product must appear only once.',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getAllOrders
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAllOrders', () => {
    beforeEach(() => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);
    });

    it('returns paginated orders with default pagination', async () => {
      prisma.order.findMany.mockResolvedValue(
        MOCK_PAGINATED_ORDERS.slice(0, 2),
      );
      prisma.order.count.mockResolvedValue(3);

      const result = await service.getAllOrders({
        page: 1,
        limit: 2,
        search: '',
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual(MOCK_PAGINATION_META(1, 2, 2, 3));
    });

    it('filters orders by status when filter is provided', async () => {
      const pending = MOCK_PAGINATED_ORDERS.filter(
        (o) => o.order_status === OrderStatusEnum.PENDING,
      );

      prisma.order.findMany.mockResolvedValue(pending);
      prisma.order.count.mockResolvedValue(2);

      const result = await service.getAllOrders(MOCK_SEARCH_DTO_WITH_FILTER);

      expect(
        result.data.every((o) => o.order_status === OrderStatusEnum.PENDING),
      ).toBe(true);
      expect(result.meta.total_records).toBe(2);
    });

    it('passes search term that filters by order_number, email, product title/category', async () => {
      // The WHERE clause is built internally; validate that findMany is called (not throwing)
      prisma.order.findMany.mockResolvedValue([MOCK_PAGINATED_ORDERS[0]]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.getAllOrders(MOCK_SEARCH_DTO_WITH_SEARCH);

      expect(result.data).toHaveLength(1);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ order_number: expect.any(Object) }),
            ]),
          }),
        }),
      );
    });

    it('returns empty page when no orders exist', async () => {
      const result = await service.getAllOrders(MOCK_SEARCH_DTO_DEFAULT);

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual(MOCK_PAGINATION_META(1, 10, 0, 0));
    });

    it('calculates correct page metadata for page 2 of 3', async () => {
      prisma.order.findMany.mockResolvedValue(
        MOCK_PAGINATED_ORDERS.slice(0, 5),
      );
      prisma.order.count.mockResolvedValue(15);

      const result = await service.getAllOrders({
        page: 2,
        limit: 5,
        search: '',
      });

      expect(result.meta).toEqual(MOCK_PAGINATION_META(2, 5, 3, 15));
    });

    it('uses default page=1 and limit=10 when not provided', async () => {
      await service.getAllOrders({} as any);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('throws and propagates database errors', async () => {
      prisma.order.findMany.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getAllOrders(MOCK_SEARCH_DTO_DEFAULT),
      ).rejects.toThrow('Database error');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getOrderByOrderId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getOrderByOrderId', () => {
    it('throws NotFoundException when order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderByOrderId('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns order with nested items and products', async () => {
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_WITH_ITEMS);

      const result = await service.getOrderByOrderId(MOCK_ORDER_ID);

      expect(result.message).toBe('Success');
      expect(result.data.id).toBe(MOCK_ORDER_ID);
      expect(result.data.items).toHaveLength(2);
    });

    it('calls findUnique with correct include shape', async () => {
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_WITH_ITEMS);

      await service.getOrderByOrderId(MOCK_ORDER_ID);

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_ORDER_ID },
        include: { items: { include: { product: true } } },
      });
    });

    it('propagates unexpected database errors', async () => {
      prisma.order.findUnique.mockRejectedValue(new Error('DB timeout'));

      await expect(service.getOrderByOrderId(MOCK_ORDER_ID)).rejects.toThrow(
        'DB timeout',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // getOrderByUserId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getOrderByUserId', () => {
    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getOrderByUserId(MOCK_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns paginated orders for a valid user (line 226: paginateOrders called)', async () => {
      // This covers line 226 — the return from paginateOrders inside getOrderByUserId
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.order.findMany.mockResolvedValue([MOCK_ORDER_PENDING]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.getOrderByUserId(MOCK_USER_ID, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual(MOCK_PAGINATION_META(1, 10, 1, 1));
    });

    it('returns paginated orders with default pagination when none provided', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      const result = await service.getOrderByUserId(MOCK_USER_ID);

      expect(result.meta.page_size).toBe(10);
      expect(result.meta.current_page_number).toBe(1);
    });

    it('passes user_id as where filter to paginateOrders', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      await service.getOrderByUserId(MOCK_USER_ID, { page: 1, limit: 5 });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: MOCK_USER_ID },
          take: 5,
          skip: 0,
        }),
      );
    });

    it('propagates database errors', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.order.findMany.mockRejectedValue(new Error('Connection lost'));

      await expect(
        service.getOrderByUserId(MOCK_USER_ID, { page: 1, limit: 10 }),
      ).rejects.toThrow('Connection lost');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // deleteOrderByOrderId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('deleteOrderByOrderId', () => {
    it('throws NotFoundException when order is not found (line 270-275)', async () => {
      // Line 270-275: findUnique returns null → NotFoundException
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.deleteOrderByOrderId('invalid-id')).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'invalid-id' },
        include: { items: true },
      });
    });

    it('deletes order items and order, then logs activity (lines 297-325)', async () => {
      // Lines 297-325: happy path inside $transaction
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_WITH_ITEMS);

      const mockTx = createDeleteOrderTx(jest);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const result = await service.deleteOrderByOrderId(MOCK_ORDER_ID);

      expect(result.message).toBe('Deleted Successfully');
      expect(mockTx.orderItem.deleteMany).toHaveBeenCalledWith({
        where: { order_id: MOCK_ORDER_ID },
      });
      expect(mockTx.order.delete).toHaveBeenCalledWith({
        where: { id: MOCK_ORDER_ID },
      });
    });

    it('writes activity log with correct quantity sum and status on delete', async () => {
      // items: qty 2 + qty 1 = 3 total
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_WITH_ITEMS);

      const mockTx = createDeleteOrderTx(jest);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      await service.deleteOrderByOrderId(MOCK_ORDER_ID);
      expect(prisma.activityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action_type: 'ORDER_DELETED',
            current_status: OrderStatusEnum.CANCELLED,
            previous_status: OrderStatusEnum.PENDING,
            ordered_product_quantity: 3,
          }),
        }),
      );
    });

    it('handles order with no items (empty items array) on delete', async () => {
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_PENDING); // items: []

      const mockTx = createDeleteOrderTx(jest);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));

      const result = await service.deleteOrderByOrderId(MOCK_ORDER_ID);

      expect(result.message).toBe('Deleted Successfully');
      expect(prisma.activityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ordered_product_quantity: 0,
          }),
        }),
      );
    });

    it('throws NotFoundException on Prisma P2025 (record not found during transaction)', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.deleteOrderByOrderId('ghost-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('propagates unexpected transaction errors', async () => {
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_PENDING);
      prisma.$transaction.mockRejectedValue(new Error('Lock timeout'));

      await expect(service.deleteOrderByOrderId(MOCK_ORDER_ID)).rejects.toThrow(
        'Lock timeout',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // changeOrderStatus
  // ═══════════════════════════════════════════════════════════════════════════

  describe('changeOrderStatus', () => {
    it('throws NotFoundException when order does not exist (line 348)', async () => {
      // Line 348-393: findUnique returns null
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.changeOrderStatus({
          order_id: MOCK_ORDER_ID,
          status: OrderStatusEnum.CONFIRMED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotAcceptableException for invalid PENDING → PENDING transition', async () => {
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_PENDING);

      await expect(
        service.changeOrderStatus({
          order_id: MOCK_ORDER_ID,
          status: OrderStatusEnum.PENDING,
        }),
      ).rejects.toThrow(NotAcceptableException);
    });

    it('throws NotAcceptableException for invalid COMPLETED → PENDING transition', async () => {
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_COMPLETED);

      await expect(
        service.changeOrderStatus({
          order_id: MOCK_ORDER_ID,
          status: OrderStatusEnum.PENDING,
        }),
      ).rejects.toThrow(NotAcceptableException);
    });

    it('throws NotAcceptableException for invalid CANCELLED → any transition', async () => {
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_CANCELLED);

      for (const status of [
        OrderStatusEnum.CONFIRMED,
        OrderStatusEnum.COMPLETED,
        OrderStatusEnum.PENDING,
      ]) {
        await expect(
          service.changeOrderStatus({ order_id: MOCK_ORDER_ID, status }),
        ).rejects.toThrow(NotAcceptableException);
      }
    });

    it('does NOT write activity log when transition is rejected', async () => {
      prisma.order.findUnique.mockResolvedValue(MOCK_ORDER_COMPLETED);

      await expect(
        service.changeOrderStatus({
          order_id: MOCK_ORDER_ID,
          status: OrderStatusEnum.PENDING,
        }),
      ).rejects.toThrow(NotAcceptableException);

      expect(prisma.activityLogs.create).not.toHaveBeenCalled();
    });

    it('transitions PENDING → CONFIRMED and returns correct message (default branch)', async () => {
      // Lines 461-514: updateOrderStatus default branch (non-CANCELLED)
      prisma.order.findUnique.mockResolvedValue({
        ...MOCK_ORDER_PENDING,
        order_number: MOCK_ORDER_NUMBER,
      });
      prisma.order.update.mockResolvedValue({});
      prisma.orderItem.findMany.mockResolvedValue(MOCK_ORDER_ITEMS);
      prisma.activityLogs.create.mockResolvedValue({});

      const result = await service.changeOrderStatus({
        order_id: MOCK_ORDER_ID,
        status: OrderStatusEnum.CONFIRMED,
      });

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: MOCK_ORDER_ID },
        data: { order_status: OrderStatusEnum.CONFIRMED },
      });
      expect(result.message).toBe('This order has been Confirmed');
    });

    it('transitions CONFIRMED → COMPLETED and returns correct message', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...MOCK_ORDER_CONFIRMED,
        order_number: MOCK_ORDER_NUMBER,
      });
      prisma.order.update.mockResolvedValue({});
      prisma.orderItem.findMany.mockResolvedValue(MOCK_ORDER_ITEMS);
      prisma.activityLogs.create.mockResolvedValue({});

      const result = await service.changeOrderStatus({
        order_id: MOCK_ORDER_ID,
        status: OrderStatusEnum.COMPLETED,
      });

      expect(result.message).toBe(
        'This order has been Completed. Thank you for shopping with us!',
      );
    });

    it('transitions PENDING → CANCELLED, restores stock via transaction (lines 461-499)', async () => {
      // Lines 461-499: CANCELLED branch of updateOrderStatus
      prisma.order.findUnique.mockResolvedValue({
        ...MOCK_ORDER_PENDING,
        order_number: MOCK_ORDER_NUMBER,
      });

      const mockTx = createCancelOrderTx(jest);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
      prisma.orderItem.findMany.mockResolvedValue(MOCK_ORDER_ITEMS);
      prisma.activityLogs.create.mockResolvedValue({});

      const result = await service.changeOrderStatus({
        order_id: MOCK_ORDER_ID,
        status: OrderStatusEnum.CANCELLED,
      });

      // stock restored via increment
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { quantity: { increment: 2 } },
      });
      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: MOCK_ORDER_ID },
        data: { order_status: OrderStatusEnum.CANCELLED },
      });
      expect(result.message).toBe('This order has been Cancelled by our team');
    });

    it('restores stock for each item in a multi-item cancelled order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...MOCK_ORDER_CONFIRMED,
        order_number: MOCK_ORDER_NUMBER,
      });

      const mockTx = createCancelOrderTx(jest, MOCK_ORDER_ITEMS_MULTI);
      prisma.$transaction.mockImplementation(async (cb: any) => cb(mockTx));
      prisma.orderItem.findMany.mockResolvedValue(MOCK_ORDER_ITEMS_MULTI);
      prisma.activityLogs.create.mockResolvedValue({});

      await service.changeOrderStatus({
        order_id: MOCK_ORDER_ID,
        status: OrderStatusEnum.CANCELLED,
      });

      expect(mockTx.product.update).toHaveBeenCalledTimes(2);
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { quantity: { increment: 2 } },
      });
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 'p2' },
        data: { quantity: { increment: 3 } },
      });
    });

    it('writes activity log with correct totals on status change', async () => {
      // Lines 374-393: trackOrderActivity call after status update
      prisma.order.findUnique.mockResolvedValue({
        ...MOCK_ORDER_PENDING,
        order_number: MOCK_ORDER_NUMBER,
      });
      prisma.order.update.mockResolvedValue({});
      prisma.orderItem.findMany.mockResolvedValue(MOCK_ORDER_ITEMS); // qty: 2
      prisma.activityLogs.create.mockResolvedValue({});

      await service.changeOrderStatus({
        order_id: MOCK_ORDER_ID,
        status: OrderStatusEnum.CONFIRMED,
      });

      expect(prisma.activityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action_type: 'ORDER_STATUS_UPDATED',
            previous_status: OrderStatusEnum.PENDING,
            current_status: OrderStatusEnum.CONFIRMED,
            ordered_product_quantity: 2,
            description: `Order ${MOCK_ORDER_NUMBER} status changed from PENDING to CONFIRMED.`,
          }),
        }),
      );
    });

    it('fetches order items to calculate total quantity for activity log (line 367)', async () => {
      // Line 367: orderItem.findMany called inside changeOrderStatus
      prisma.order.findUnique.mockResolvedValue({
        ...MOCK_ORDER_PENDING,
        order_number: MOCK_ORDER_NUMBER,
      });
      prisma.order.update.mockResolvedValue({});
      prisma.orderItem.findMany.mockResolvedValue(MOCK_ORDER_ITEMS_MULTI); // qty: 2+3=5
      prisma.activityLogs.create.mockResolvedValue({});

      await service.changeOrderStatus({
        order_id: MOCK_ORDER_ID,
        status: OrderStatusEnum.CONFIRMED,
      });

      expect(prisma.orderItem.findMany).toHaveBeenCalledWith({
        where: { order_id: MOCK_ORDER_ID },
      });
      expect(prisma.activityLogs.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ ordered_product_quantity: 5 }),
        }),
      );
    });

    it('propagates errors thrown inside changeOrderStatus', async () => {
      prisma.order.findUnique.mockRejectedValue(new Error('DB unavailable'));

      await expect(
        service.changeOrderStatus({
          order_id: MOCK_ORDER_ID,
          status: OrderStatusEnum.CONFIRMED,
        }),
      ).rejects.toThrow('DB unavailable');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RolesGuard
  // ═══════════════════════════════════════════════════════════════════════════

  describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new RolesGuard(reflector);
    });

    const mockContext = (role: string) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ user: { role } }),
        }),
        getHandler: () => {},
        getClass: () => {},
      }) as unknown as ExecutionContext;

    it('allows access when user role matches required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      expect(guard.canActivate(mockContext('ADMIN'))).toBe(true);
    });

    it('throws ForbiddenException when user role does not match', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      expect(() => guard.canActivate(mockContext('USER'))).toThrow(
        ForbiddenException,
      );
    });

    it('throws ForbiddenException when no authenticated user is present', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
        getHandler: () => {},
        getClass: () => {},
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows access when no roles are required (public endpoint)', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      expect(guard.canActivate(mockContext('USER'))).toBe(true);
    });

    it('allows ADMIN to access USER-only endpoints', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER']);

      expect(guard.canActivate(mockContext('USER'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Private helpers – exercised indirectly
  // ═══════════════════════════════════════════════════════════════════════════

  describe('generateOrderNumber (exercised via createOrder)', () => {
    it('generates an order number matching format [A-Z]{3}[0-9]{6}', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      productService.findMany.mockResolvedValue([MOCK_PRODUCT_P1]);

      let capturedOrderNumber: string | undefined;

      prisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          product: {
            updateMany: jest.fn<never>().mockResolvedValue({ count: 1 }),
          },
          order: {
            create: jest.fn().mockImplementation(({ data }: any) => {
              capturedOrderNumber = data.order_number;
              return Promise.resolve({
                id: MOCK_ORDER_ID,
                order_number: data.order_number,
                total_price: 100,
              });
            }),
          },
          orderItem: { createMany: jest.fn() },
          activityLogs: { create: jest.fn() },
        };
        return cb(tx);
      });

      await service.createOrder(MOCK_USER_ID, PLACE_ORDER_SINGLE_ITEM);

      expect(capturedOrderNumber).toMatch(/^[A-Z]{3}\d{6}$/);
    });
  });

  describe('paginateOrders (exercised via getAllOrders / getOrderByUserId)', () => {
    it('includes user, items, and product in the result set', async () => {
      prisma.user.findUnique.mockResolvedValue(MOCK_USER);
      prisma.order.findMany.mockResolvedValue([MOCK_ORDER_WITH_ITEMS]);
      prisma.order.count.mockResolvedValue(1);

      const result = await service.getOrderByUserId(MOCK_USER_ID, {
        page: 1,
        limit: 10,
      });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            user: expect.any(Object),
            items: expect.objectContaining({ include: { product: true } }),
          }),
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.data[0].items).toBeDefined();
    });
  });
});
