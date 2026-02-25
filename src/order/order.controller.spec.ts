import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { PlaceOrderDto } from 'src/dto/place_order.dto';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  const mockOrderService = {
    createOrder: jest.fn(),
    getOrderByUserId: jest.fn(),
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

  it('should call service.createOrder with correct params', async () => {
    const userId = 'user-123';
    const dto: PlaceOrderDto = {
      items: [{ product_id: '1', quantity: 2 }],
    };

    mockOrderService.createOrder.mockResolvedValue({
      message: 'order Placed',
      data: { id: 'o1' },
    });

    const result = await controller.createOrder(userId, dto);

    expect(service.createOrder).toHaveBeenCalledWith(userId, dto);
    expect(result).toEqual({
      message: 'order Placed',
      data: { id: 'o1' },
    });
  });

  it('should call service.getOrderByUserId with correct params', async () => {
    const userId = 'user-123';
    const pagination = { page: 1, limit: 10 };

    mockOrderService.getOrderByUserId.mockResolvedValue({
      data: [{ id: 'o1' }],
      meta: { page_number: 1, page_size: 10, total_pages: 1 },
    });

    const result = await controller.orderByUserId(userId, pagination);

    expect(service.getOrderByUserId).toHaveBeenCalledWith(userId, pagination);
    expect(result).toEqual({
      data: [{ id: 'o1' }],
      meta: { page_number: 1, page_size: 10, total_pages: 1 },
    });
  });
});
