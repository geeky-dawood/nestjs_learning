/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import {
  OrderStatusEnum,
  PaymentEventType,
  PaymentStatus,
  User,
} from '../generated/prisma/client';
import {
  MOCK_PAYMENT as payment,
  MOCK_PAYMENT_ORDER as order,
  MOCK_PAYMENT_USER as mockUser,
  MOCK_STRIPE_CHECKOUT_SESSION as session,
} from '../test/mock/payment.data.mock';

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let stripeService: any;
  let config: any;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    prisma = {
      user: { update: jest.fn() },
      order: { findUnique: jest.fn() },
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentActivityLogs: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    stripeService = {
      createAndRetrieveCustomer: jest.fn(),
      createCheckoutSession: jest.fn(),
      constructWebhookEvent: jest.fn(),
      retrieveCheckoutSession: jest.fn(),
    };

    config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          CLIENT_URL: 'https://client.test',
          STRIPE_WEBHOOK_SECRET: 'whsec_test',
        };
        return values[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: stripeService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCustomer', () => {
    it('returns existing stripe customer id without creating a customer', async () => {
      const result = await service.createCustomer(mockUser);

      expect(result).toEqual({ stripe_customer_id: 'cus_existing' });
      expect(stripeService.createAndRetrieveCustomer).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('creates a stripe customer and stores it when user has no customer id', async () => {
      stripeService.createAndRetrieveCustomer.mockResolvedValue({
        id: 'cus_new',
      });

      const result = await service.createCustomer({
        ...mockUser,
        stripe_customer_id: null,
      } as User);

      expect(result).toEqual({ stripe_customer_id: 'cus_new' });
      expect(stripeService.createAndRetrieveCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockUser.id }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { stripe_customer_id: 'cus_new' },
      });
    });
  });

  describe('createCheckoutSession', () => {
    const dto = {
      order_id: order.id,
      currency: 'USD',
      description: 'Checkout test',
    };

    it('throws NotFoundException when order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession(mockUser, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when order belongs to another user', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...order,
        user_id: 'other-user',
      });

      await expect(
        service.createCheckoutSession(mockUser, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when order is cancelled', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...order,
        order_status: OrderStatusEnum.CANCELLED,
      });

      await expect(
        service.createCheckoutSession(mockUser, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when an active payment already exists', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.payment.findFirst.mockResolvedValue({
        id: 'active-payment',
      });

      await expect(
        service.createCheckoutSession(mockUser, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates payment, checkout session, and activity logs', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue(payment);
      stripeService.createCheckoutSession.mockResolvedValue(session);
      prisma.payment.update.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      const result = await service.createCheckoutSession(mockUser, dto);

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          order_id: order.id,
          amount: 1250,
          currency: 'usd',
          description: dto.description,
          status: PaymentStatus.PENDING,
          user_id: mockUser.id,
        },
      });
      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cus_existing',
          paymentId: payment.id,
          orderId: order.id,
          userId: mockUser.id,
          amount: 1250,
          currency: 'usd',
          successUrl:
            'https://client.test/payment/success?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: 'https://client.test/payment/cancel?order_id=order-1',
          lineItems: [
            expect.objectContaining({
              quantity: 2,
              price_data: expect.objectContaining({
                unit_amount: 500,
                product_data: expect.objectContaining({
                  name: 'Keyboard',
                  metadata: {
                    product_id: 'product-1',
                    category: 'electronics',
                  },
                }),
              }),
            }),
            expect.objectContaining({
              quantity: 1,
              price_data: expect.objectContaining({
                unit_amount: 250,
                product_data: expect.objectContaining({
                  name: 'Mouse',
                  description: undefined,
                  metadata: {
                    product_id: 'product-2',
                    category: '',
                  },
                }),
              }),
            }),
          ],
          productSummary: [
            {
              product_id: 'product-1',
              name: 'Keyboard',
              category: 'electronics',
              quantity: 2,
              unit_price: 500,
            },
            {
              product_id: 'product-2',
              name: 'Mouse',
              category: '',
              quantity: 1,
              unit_price: 250,
            },
          ],
        }),
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.PROCESSING },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          payment_id: payment.id,
          event_type: PaymentEventType.PAYMENT_INITIATED,
          current_status: PaymentStatus.PENDING,
        }),
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          payment_id: payment.id,
          event_type: PaymentEventType.CHECKOUT_SESSION_CREATED,
          previous_status: PaymentStatus.PENDING,
          current_status: PaymentStatus.PROCESSING,
        }),
      });
      expect(result).toEqual({
        session_id: session.id,
        checkout_url: session.url,
        payment_id: payment.id,
        expires_at: new Date(session.expires_at * 1000),
      });
    });

    it('marks payment failed and logs activity when stripe session creation fails', async () => {
      prisma.order.findUnique.mockResolvedValue(order);
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue(payment);
      stripeService.createCheckoutSession.mockRejectedValue(
        new Error('Stripe unavailable'),
      );
      prisma.payment.update.mockResolvedValue({
        ...payment,
        status: PaymentStatus.FAILED,
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      await expect(
        service.createCheckoutSession(mockUser, dto),
      ).rejects.toThrow(InternalServerErrorException);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenLastCalledWith({
        data: expect.objectContaining({
          payment_id: payment.id,
          event_type: PaymentEventType.PAYMENT_INTENT_FAILED,
          previous_status: PaymentStatus.PENDING,
          current_status: PaymentStatus.FAILED,
          description: 'Stripe session creation failed: Stripe unavailable',
        }),
      });
    });
  });

  describe('handleWebhook', () => {
    it('throws BadRequestException when stripe signature verification fails', async () => {
      stripeService.constructWebhookEvent.mockImplementation(() => {
        throw new Error('bad signature');
      });

      await expect(
        service.handleWebhook(Buffer.from('{}'), 'invalid-signature'),
      ).rejects.toThrow(BadRequestException);
    });

    it('transitions payment to succeeded on checkout.session.completed', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: session.id,
            metadata: { payment_id: payment.id },
          },
        },
      });
      prisma.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });
      prisma.payment.update.mockResolvedValue({
        ...payment,
        status: PaymentStatus.SUCCEEDED,
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event_type: PaymentEventType.PAYMENT_INTENT_SUCCEEDED,
          previous_status: PaymentStatus.PROCESSING,
          current_status: PaymentStatus.SUCCEEDED,
        }),
      });
    });

    it('skips duplicate succeeded checkout.session.completed webhook', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_1',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: session.id,
            metadata: { payment_id: payment.id },
          },
        },
      });
      prisma.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.SUCCEEDED,
      });

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.paymentActivityLogs.create).not.toHaveBeenCalled();
    });

    it('transitions processing payment to expired on checkout.session.expired', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_2',
        type: 'checkout.session.expired',
        data: {
          object: {
            id: session.id,
            metadata: { payment_id: payment.id },
          },
        },
      });
      prisma.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });
      prisma.payment.update.mockResolvedValue({
        ...payment,
        status: PaymentStatus.EXPIRED,
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.EXPIRED },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event_type: PaymentEventType.CHECKOUT_SESSION_EXPIRED,
          previous_status: PaymentStatus.PROCESSING,
          current_status: PaymentStatus.EXPIRED,
        }),
      });
    });

    it('transitions payment to failed on payment_intent.payment_failed', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_3',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_1',
            metadata: { payment_id: payment.id },
            last_payment_error: { message: 'card declined' },
          },
        },
      });
      prisma.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event_type: PaymentEventType.PAYMENT_INTENT_FAILED,
          description: 'Payment intent failed: card declined',
        }),
      });
    });

    it('transitions payment to succeeded on payment_intent.succeeded', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_5',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_success',
            metadata: { payment_id: payment.id },
          },
        },
      });
      prisma.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event_type: PaymentEventType.PAYMENT_INTENT_SUCCEEDED,
          description: 'Payment intent succeeded: pi_success',
        }),
      });
    });

    it('transitions payment to canceled on payment_intent.canceled', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_6',
        type: 'payment_intent.canceled',
        data: {
          object: {
            id: 'pi_canceled',
            metadata: { payment_id: payment.id },
          },
        },
      });
      prisma.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.CANCELED },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event_type: PaymentEventType.PAYMENT_INTENT_CANCELED,
          description: 'Payment intent canceled: pi_canceled',
        }),
      });
    });

    it('transitions async payment success and failure session webhooks', async () => {
      stripeService.constructWebhookEvent
        .mockReturnValueOnce({
          id: 'evt_7',
          type: 'checkout.session.async_payment_succeeded',
          data: {
            object: {
              id: session.id,
              metadata: { payment_id: payment.id },
            },
          },
        })
        .mockReturnValueOnce({
          id: 'evt_8',
          type: 'checkout.session.async_payment_failed',
          data: {
            object: {
              id: session.id,
              metadata: { payment_id: payment.id },
            },
          },
        });
      prisma.payment.findUnique
        .mockResolvedValueOnce({
          ...payment,
          status: PaymentStatus.PROCESSING,
        })
        .mockResolvedValueOnce({
          ...payment,
          status: PaymentStatus.PROCESSING,
        });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'signature');
      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.update).toHaveBeenNthCalledWith(1, {
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      expect(prisma.payment.update).toHaveBeenNthCalledWith(2, {
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          event_type: PaymentEventType.PAYMENT_INTENT_SUCCEEDED,
          description: `Async payment succeeded via session ${session.id}`,
        }),
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          event_type: PaymentEventType.PAYMENT_INTENT_FAILED,
          description: `Async payment failed via session ${session.id}`,
        }),
      });
    });

    it('skips webhook processing when payment metadata is missing', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_9',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: session.id,
            metadata: {},
          },
        },
      });

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('skips webhook processing when payment metadata does not match a record', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_10',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: session.id,
            metadata: { payment_id: 'missing-payment' },
          },
        },
      });
      prisma.payment.findUnique.mockResolvedValue(null);

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing-payment' },
      });
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });

    it('does not fail webhook when activity log write fails', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_11',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_success',
            metadata: { payment_id: payment.id },
          },
        },
      });
      prisma.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });
      prisma.paymentActivityLogs.create.mockRejectedValue(
        new Error('log write failed'),
      );

      await expect(
        service.handleWebhook(Buffer.from('{}'), 'signature'),
      ).resolves.toBeUndefined();
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED },
      });
    });

    it('ignores unhandled webhook event types', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_12',
        type: 'customer.created',
        data: { object: { id: 'cus_123' } },
      });

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.paymentActivityLogs.create).not.toHaveBeenCalled();
    });

    it('logs charge refunds without changing payment status', async () => {
      stripeService.constructWebhookEvent.mockReturnValue({
        id: 'evt_4',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_1',
            metadata: {
              payment_id: payment.id,
              order_id: order.id,
              user_id: mockUser.id,
            },
          },
        },
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      await service.handleWebhook(Buffer.from('{}'), 'signature');

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.paymentActivityLogs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          payment_id: payment.id,
          event_type: PaymentEventType.PAYMENT_INTENT_REFUNDED,
          description: 'Charge ch_1 was refunded',
        }),
      });
    });
  });

  describe('query endpoints', () => {
    it('returns selected payment status fields', async () => {
      prisma.payment.findFirst.mockResolvedValue(payment);

      const result = await service.getPaymentStatus(payment.id, mockUser.id);

      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { id: payment.id, user_id: mockUser.id },
        select: {
          id: true,
          order_id: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toBe(payment);
    });

    it('throws NotFoundException when payment status is not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.getPaymentStatus(payment.id, mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns payment logs after ownership check', async () => {
      const logs = [{ id: 'log-1', payment_id: payment.id }];
      prisma.payment.findFirst.mockResolvedValue(payment);
      prisma.paymentActivityLogs.findMany.mockResolvedValue(logs);

      const result = await service.getPaymentLogs(payment.id, mockUser.id);

      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { id: payment.id, user_id: mockUser.id },
      });
      expect(prisma.paymentActivityLogs.findMany).toHaveBeenCalledWith({
        where: { payment_id: payment.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toBe(logs);
    });
  });

  describe('syncSessionStatus', () => {
    it('throws BadRequestException when stripe session has no payment metadata', async () => {
      stripeService.retrieveCheckoutSession.mockResolvedValue({
        ...session,
        metadata: {},
      });

      await expect(
        service.syncSessionStatus(session.id, mockUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when payment does not belong to user', async () => {
      stripeService.retrieveCheckoutSession.mockResolvedValue(session);
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.syncSessionStatus(session.id, mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('syncs paid stripe session to succeeded payment status', async () => {
      stripeService.retrieveCheckoutSession.mockResolvedValue({
        ...session,
        payment_status: 'paid',
      });
      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });
      prisma.paymentActivityLogs.create.mockResolvedValue({});

      const result = await service.syncSessionStatus(session.id, mockUser.id);

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      expect(prisma.paymentActivityLogs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          event_type: PaymentEventType.CHECKOUT_SESSION_SYNCED,
          previous_status: PaymentStatus.PROCESSING,
          current_status: PaymentStatus.SUCCEEDED,
        }),
      });
      expect(result).toEqual({
        payment_id: payment.id,
        status: PaymentStatus.SUCCEEDED,
      });
    });

    it('returns current status without update when stripe session is still open', async () => {
      stripeService.retrieveCheckoutSession.mockResolvedValue(session);
      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        status: PaymentStatus.PROCESSING,
      });

      const result = await service.syncSessionStatus(session.id, mockUser.id);

      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        payment_id: payment.id,
        status: PaymentStatus.PROCESSING,
      });
    });
  });
});
