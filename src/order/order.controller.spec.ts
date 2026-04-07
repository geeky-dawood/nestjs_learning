import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PlaceOrderDto } from '../dto/place_order.dto';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { PaginationDto } from '../utils/pagination';
import { OrderStatusDto } from '../dto/order_status.dto';
import { SearchDto } from '../dto/serach.dto';
import { OrderStatusEnum } from '../generated/prisma/enums';
import { MOCK_USER_ID } from '../test/mock/order.data.mock';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  const mockOrderService = {
    createOrder: jest.fn<(...args: any[]) => Promise<any>>(),
    getOrderByUserId: jest.fn<(...args: any[]) => Promise<any>>(),
    getAllOrders: jest.fn<(...args: any[]) => Promise<any>>(),
    changeOrderStatus: jest.fn<(...args: any[]) => Promise<any>>(),
    getOrderByOrderId: jest.fn<(...args: any[]) => Promise<any>>(),
    deleteOrderByOrderId: jest.fn<(...args: any[]) => Promise<any>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockOrderService }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── createOrder ─────────────────────────────────────────────────────────────
  it('should call service.createOrder with correct params', async () => {
    const dto: PlaceOrderDto = { items: [{ product_id: '1', quantity: 2 }] };
    mockOrderService.createOrder.mockResolvedValue({
      message: 'order Placed',
      data: { id: 'o1' },
    });

    const result = await controller.createOrder(MOCK_USER_ID, dto);

    expect(service.createOrder).toHaveBeenCalledWith(MOCK_USER_ID, dto);
    expect(result).toEqual({
      message: 'order Placed',
      data: { id: 'o1' },
    });
  });

  it('should throw ForbiddenException if user_id is missing', () => {
    const dto: PlaceOrderDto = { items: [{ product_id: '1', quantity: 2 }] };

    expect(() => controller.createOrder('', dto)).toThrow(ForbiddenException);
  });

  // ─── orderByUserId ───────────────────────────────────────────────────────────
  it('should call service.getOrderByUserId with correct params', async () => {
    const pagination: PaginationDto = { page: 1, limit: 10 };
    mockOrderService.getOrderByUserId.mockResolvedValue({
      data: [{ id: 'o1' }],
      meta: { page_number: 1, page_size: 10, total_pages: 1 },
    });

    const result = await controller.orderByUserId(MOCK_USER_ID, pagination);

    expect(service.getOrderByUserId).toHaveBeenCalledWith(
      MOCK_USER_ID,
      pagination,
    );
    expect(result).toEqual({
      data: [{ id: 'o1' }],
      meta: { page_number: 1, page_size: 10, total_pages: 1 },
    });
  });

  // ─── getAllOrders ─────────────────────────────────────────────────────────────
  it('should call service.getAllOrders with correct query', async () => {
    const query: SearchDto = { search: 'test' };
    mockOrderService.getAllOrders.mockResolvedValue([{ id: 'o1' }]);

    const result = await controller.getAllOrders(query);

    expect(service.getAllOrders).toHaveBeenCalledWith(query);
    expect(result).toEqual([{ id: 'o1' }]);
  });

  // ─── changeOrderStatus ───────────────────────────────────────────────────────
  it('should call service.changeOrderStatus with correct query', async () => {
    const query: OrderStatusDto = {
      order_id: 'o1',
      status: OrderStatusEnum.COMPLETED,
    };
    mockOrderService.changeOrderStatus.mockResolvedValue({ success: true });

    const result = await controller.changeOrderStatus(query);

    expect(service.changeOrderStatus).toHaveBeenCalledWith(query);
    expect(result).toEqual({ success: true });
  });

  // ─── getOrderByOrderId ───────────────────────────────────────────────────────
  it('should call service.getOrderByOrderId with correct param', async () => {
    const orderId = 'o1';
    mockOrderService.getOrderByOrderId.mockResolvedValue({ id: orderId });

    const result = await controller.getOrderByOrderId(orderId);

    expect(service.getOrderByOrderId).toHaveBeenCalledWith(orderId);
    expect(result).toEqual({ id: orderId });
  });

  // ─── deleteOrderByOrderId ────────────────────────────────────────────────────
  it('should call service.deleteOrderByOrderId with correct param', async () => {
    const orderId = 'o1';
    mockOrderService.deleteOrderByOrderId.mockResolvedValue({ success: true });

    const result = await controller.deleteOrderByOrderId(orderId);

    expect(service.deleteOrderByOrderId).toHaveBeenCalledWith(orderId);
    expect(result).toEqual({ success: true });
  });

  it('should throw ForbiddenException if user_id is undefined', () => {
    const dto: PlaceOrderDto = { items: [{ product_id: '1', quantity: 1 }] };

    expect(() => controller.createOrder(undefined as any, dto)).toThrow(
      ForbiddenException,
    );
  });

  it('should propagate exception from service.createOrder', async () => {
    const dto: PlaceOrderDto = { items: [{ product_id: '1', quantity: 1 }] };
    const error = new Error('Service error');
    mockOrderService.createOrder.mockRejectedValue(error);

    await expect(controller.createOrder(MOCK_USER_ID, dto)).rejects.toThrow(
      'Service error',
    );
  });

  it('should propagate exception from getOrderByUserId', async () => {
    const pagination: PaginationDto = { page: 1, limit: 10 };
    const error = new Error('Service failure');
    mockOrderService.getOrderByUserId.mockRejectedValue(error);

    await expect(
      controller.orderByUserId(MOCK_USER_ID, pagination),
    ).rejects.toThrow('Service failure');
  });

  it('should propagate exception from getAllOrders', async () => {
    const query: SearchDto = { search: 'test' };
    const error = new Error('DB failure');
    mockOrderService.getAllOrders.mockRejectedValue(error);

    await expect(controller.getAllOrders(query)).rejects.toThrow('DB failure');
  });

  it('should propagate exception from changeOrderStatus', async () => {
    const query: OrderStatusDto = {
      order_id: 'o1',
      status: OrderStatusEnum.COMPLETED,
    };
    const error = new Error('Invalid transition');
    mockOrderService.changeOrderStatus.mockRejectedValue(error);

    await expect(controller.changeOrderStatus(query)).rejects.toThrow(
      'Invalid transition',
    );
  });

  it('should propagate exception from getOrderByOrderId', async () => {
    const error = new Error('Order not found');
    mockOrderService.getOrderByOrderId.mockRejectedValue(error);

    await expect(controller.getOrderByOrderId('o1')).rejects.toThrow(
      'Order not found',
    );
  });

  it('should propagate exception from deleteOrderByOrderId', async () => {
    const error = new Error('Delete failed');
    mockOrderService.deleteOrderByOrderId.mockRejectedValue(error);

    await expect(controller.deleteOrderByOrderId('o1')).rejects.toThrow(
      'Delete failed',
    );
  });

  it('should throw ForbiddenException if user_id is undefined', () => {
    const dto: PlaceOrderDto = { items: [{ product_id: '1', quantity: 1 }] };

    expect(() => controller.createOrder(undefined as any, dto)).toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException if user_id is null', () => {
    const dto: PlaceOrderDto = { items: [{ product_id: '1', quantity: 1 }] };

    expect(() => controller.createOrder(null as any, dto)).toThrow(
      ForbiddenException,
    );
  });

  it('should call createOrder even with empty items array', async () => {
    const dto: PlaceOrderDto = { items: [] };

    mockOrderService.createOrder.mockResolvedValue({ success: true });

    const result = await controller.createOrder(MOCK_USER_ID, dto);

    expect(service.createOrder).toHaveBeenCalledWith(MOCK_USER_ID, dto);
    expect(result).toEqual({ success: true });
  });
});
