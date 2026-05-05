import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { Test, TestingModule } from '@nestjs/testing';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

describe('MailService', () => {
  let service: MailService;

  const mockUser = {
    id: '1',
    email: 'test@test.com',
    name: 'Dawood',
  };

  const mockProducts = [
    { id: 'p1', title: 'Product 1', price: 100 },
    { id: 'p2', title: 'Product 2', price: 200 },
  ];

  const mockOrder = {
    id: 'o1',
    order_number: 'ORD-001',
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn<any>(),
    },
    product: {
      findMany: jest.fn<any>(),
    },
    order: {
      findUnique: jest.fn<any>(),
    },
  };

  const mockMailer = {
    sendMail: jest.fn<any, any>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailerService, useValue: mockMailer },
      ],
    }).compile();

    service = module.get<MailService>(MailService);

    jest.clearAllMocks();
  });

  // ===============================
  // ✅ BASIC
  // ===============================
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===============================
  // sendOrderPlacedEmail
  // ===============================
  describe('sendOrderPlacedEmail', () => {
    const items = [
      { product_id: 'p1', quantity: 2 },
      { product_id: 'p2', quantity: 1 },
    ];

    it('should send order placed email and return mailer response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockMailer.sendMail.mockResolvedValue({ messageId: 'msg-001' });

      const result = await service.sendOrderPlacedEmail('1', items, 'ORD-001');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['p1', 'p2'] } },
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: 'Order Confirmation',
          template: 'order-placed-email',
          context: expect.objectContaining({
            name: mockUser.name,
            orderNumber: 'ORD-001',
            status: 'Placed',
            products: expect.arrayContaining([
              expect.objectContaining({
                id: 'p1',
                name: 'Product 1',
                price: 100,
                quantity: 2,
              }),
              expect.objectContaining({
                id: 'p2',
                name: 'Product 2',
                price: 200,
                quantity: 1,
              }),
            ]),
          }),
        }),
      );

      expect(result).toEqual({ messageId: 'msg-001' });
    });

    it('should default quantity to 1 if item is not matched in products', async () => {
      // product findMany returns a product NOT in items list
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p-unknown', title: 'Ghost Product', price: 50 },
      ]);
      mockMailer.sendMail.mockResolvedValue(true);

      await service.sendOrderPlacedEmail('1', items, 'ORD-001');

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            products: expect.arrayContaining([
              expect.objectContaining({ id: 'p-unknown', quantity: 1 }),
            ]),
          }),
        }),
      );
    });

    // NOTE: The service catches errors internally and logs them (does NOT re-throw),
    // so these cases resolve to undefined instead of rejecting.
    it('should return undefined (not throw) when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.sendOrderPlacedEmail('1', items, 'ORD-001');

      expect(result).toBeUndefined();
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('should return undefined (not throw) when mailerService.sendMail fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockMailer.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendOrderPlacedEmail('1', items, 'ORD-001');

      expect(result).toBeUndefined();
    });

    it('should return undefined when product.findMany rejects', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.product.findMany.mockRejectedValue(new Error('DB error'));

      const result = await service.sendOrderPlacedEmail('1', items, 'ORD-001');

      expect(result).toBeUndefined();
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('should handle empty items array and send email with empty products', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockMailer.sendMail.mockResolvedValue(true);

      const result = await service.sendOrderPlacedEmail('1', [], 'ORD-EMPTY');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: [] } },
      });
      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({ products: [] }),
        }),
      );
      expect(result).toBeTruthy();
    });
  });

  // ===============================
  // sendOrderStatusEmail
  // ===============================
  describe('sendOrderStatusEmail', () => {
    const body = { order_id: 'o1', status: 'Shipped' };

    it('should send order status email and return mailer response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockMailer.sendMail.mockResolvedValue({ messageId: 'msg-002' });

      const result = await service.sendOrderStatusEmail('1', body);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'o1' },
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          subject: 'Order Shipped',
          template: 'order-status-email',
          context: expect.objectContaining({
            name: mockUser.name,
            status: 'Shipped',
            orderNumber: mockOrder.order_number,
          }),
        }),
      );

      expect(result).toEqual({ messageId: 'msg-002' });
    });

    it('should set subject dynamically based on status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockMailer.sendMail.mockResolvedValue(true);

      await service.sendOrderStatusEmail('1', {
        order_id: 'o1',
        status: 'Delivered',
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Order Delivered' }),
      );
    });

    // NOTE: Same as above — the service catches and swallows errors (does NOT re-throw).
    it('should return undefined (not throw) when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.sendOrderStatusEmail('1', body);

      expect(result).toBeUndefined();
      expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('should return undefined (not throw) when order is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const result = await service.sendOrderStatusEmail('1', body);

      expect(result).toBeUndefined();
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('should return undefined when mailerService.sendMail fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockMailer.sendMail.mockRejectedValue(new Error('SMTP timeout'));

      const result = await service.sendOrderStatusEmail('1', body);

      expect(result).toBeUndefined();
    });

    it('should return undefined when user.findUnique rejects', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error('DB connection lost'),
      );

      const result = await service.sendOrderStatusEmail('1', body);

      expect(result).toBeUndefined();
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });
  });
});
