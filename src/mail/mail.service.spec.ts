import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import {
  DB_CONNECTION_LOST_ERROR,
  DB_ERROR,
  COMPLETED_ORDER_STATUS_BODY,
  MAILER_ORDER_PLACED_RESPONSE,
  MAILER_ORDER_STATUS_RESPONSE,
  MOCK_MAIL_ORDER,
  MOCK_MAIL_PRODUCTS,
  MOCK_MAIL_USER,
  MOCK_UNKNOWN_MAIL_PRODUCT,
  ORDER_PLACED_ITEMS,
  ORDER_STATUS_BODY,
  SMTP_ERROR,
  SMTP_TIMEOUT_ERROR,
} from '../test/mock/mail.data.mock';

describe('MailService', () => {
  let service: MailService;

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
    sendMail: jest.fn<any>(),
  };

  const mockConfig = {
    get: jest.fn<any>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailerService, useValue: mockMailer },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<MailService>(MailService);

    jest.clearAllMocks();
    mockConfig.get.mockReturnValue('no-reply@example.com');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOrderPlacedEmail', () => {
    it('should send order placed email and return mailer response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.product.findMany.mockResolvedValue(MOCK_MAIL_PRODUCTS);
      mockMailer.sendMail.mockResolvedValue(MAILER_ORDER_PLACED_RESPONSE);

      const result = await service.sendOrderPlacedEmail(
        '1',
        ORDER_PLACED_ITEMS,
        'ORD-001',
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['p1', 'p2'] } },
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: MOCK_MAIL_USER.email,
          subject: 'Order Confirmation',
          template: 'order-placed-email',
          context: expect.objectContaining({
            name: MOCK_MAIL_USER.name,
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

      expect(result).toEqual({ success: true, reason: null });
    });

    it('should default quantity to 1 if item is not matched in products', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.product.findMany.mockResolvedValue([
        MOCK_UNKNOWN_MAIL_PRODUCT,
      ]);
      mockMailer.sendMail.mockResolvedValue(true);

      await service.sendOrderPlacedEmail('1', ORDER_PLACED_ITEMS, 'ORD-001');

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

    it('should throw when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendOrderPlacedEmail('1', ORDER_PLACED_ITEMS, 'ORD-001'),
      ).rejects.toThrow('User not found for id: 1');

      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('should throw when mailerService.sendMail fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.product.findMany.mockResolvedValue(MOCK_MAIL_PRODUCTS);
      mockMailer.sendMail.mockRejectedValue(SMTP_ERROR);

      await expect(
        service.sendOrderPlacedEmail('1', ORDER_PLACED_ITEMS, 'ORD-001'),
      ).rejects.toThrow(SMTP_ERROR);
    });

    it('should throw when SMTP rejects a recipient immediately', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.product.findMany.mockResolvedValue(MOCK_MAIL_PRODUCTS);
      mockMailer.sendMail.mockResolvedValue({
        accepted: [],
        rejected: [MOCK_MAIL_USER.email],
        response: '550 5.1.1 Address not found',
      });

      await expect(
        service.sendOrderPlacedEmail(
          '1',
          ORDER_PLACED_ITEMS,
          'ORD-001',
        ),
      ).rejects.toThrow(`SMTP rejected recipient(s): ${MOCK_MAIL_USER.email}`);
    });

    it('should throw when product.findMany rejects', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.product.findMany.mockRejectedValue(DB_ERROR);

      await expect(
        service.sendOrderPlacedEmail(
          '1',
          ORDER_PLACED_ITEMS,
          'ORD-001',
        ),
      ).rejects.toThrow(DB_ERROR);

      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('should handle empty items array and send email with empty products', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
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

    it('should allow pending SMTP responses without an SMTP response string', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.product.findMany.mockResolvedValue(MOCK_MAIL_PRODUCTS);
      mockMailer.sendMail.mockResolvedValue({
        accepted: [],
        rejected: [],
        pending: [MOCK_MAIL_USER.email],
      });

      const result = await service.sendOrderPlacedEmail(
        '1',
        ORDER_PLACED_ITEMS,
        'ORD-001',
      );

      expect(result).toEqual({ success: true, reason: null });
    });
  });

  describe('sendOrderStatusEmail', () => {
    it('should send order status email and return mailer response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.order.findUnique.mockResolvedValue(MOCK_MAIL_ORDER);
      mockMailer.sendMail.mockResolvedValue(MAILER_ORDER_STATUS_RESPONSE);

      const result = await service.sendOrderStatusEmail('1', ORDER_STATUS_BODY);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
        where: { id: 'o1' },
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: MOCK_MAIL_USER.email,
          subject: 'Order CONFIRMED',
          template: 'order-status-email',
          context: expect.objectContaining({
            name: MOCK_MAIL_USER.name,
            status: 'CONFIRMED',
            orderNumber: MOCK_MAIL_ORDER.order_number,
          }),
        }),
      );

      expect(result).toEqual({ success: true, reason: null });
    });

    it('should set subject dynamically based on status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.order.findUnique.mockResolvedValue(MOCK_MAIL_ORDER);
      mockMailer.sendMail.mockResolvedValue(true);

      await service.sendOrderStatusEmail('1', COMPLETED_ORDER_STATUS_BODY);

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Order COMPLETED' }),
      );
    });

    it('should throw when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendOrderStatusEmail('1', ORDER_STATUS_BODY),
      ).rejects.toThrow('User not found for id: 1');

      expect(mockPrisma.order.findUnique).not.toHaveBeenCalled();
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('should throw when order is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.sendOrderStatusEmail('1', ORDER_STATUS_BODY),
      ).rejects.toThrow('Order not found for id: o1');

      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('should throw when mailerService.sendMail fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(MOCK_MAIL_USER);
      mockPrisma.order.findUnique.mockResolvedValue(MOCK_MAIL_ORDER);
      mockMailer.sendMail.mockRejectedValue(SMTP_TIMEOUT_ERROR);

      await expect(
        service.sendOrderStatusEmail('1', ORDER_STATUS_BODY),
      ).rejects.toThrow(SMTP_TIMEOUT_ERROR);
    });

    it('should throw when user.findUnique rejects', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(DB_CONNECTION_LOST_ERROR);

      await expect(
        service.sendOrderStatusEmail('1', ORDER_STATUS_BODY),
      ).rejects.toThrow(DB_CONNECTION_LOST_ERROR);

      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });
  });
});
