import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  const mockOrderService = {
    createOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: mockOrderService }],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service createOrder', async () => {
    const dto = {
      items: [{ product_id: 1, quantity: 2 }],
    };

    mockOrderService.createOrder.mockResolvedValue({
      message: 'order Placed',
      data: {},
    });

    const result = await controller.createOrder(dto as any);

    expect(service.createOrder).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      message: 'order Placed',
      data: {},
    });
  });
});
