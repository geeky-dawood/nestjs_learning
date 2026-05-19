import {
  OrderStatusEnum,
  PaymentStatus,
  User,
} from '../../generated/prisma/client';

export const MOCK_PAYMENT_USER = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  stripe_customer_id: 'cus_existing',
} as User;

export const MOCK_PAYMENT_ORDER = {
  id: 'order-1',
  user_id: MOCK_PAYMENT_USER.id,
  order_status: OrderStatusEnum.PENDING,
  items: [
    {
      product_id: 'product-1',
      quantity: 2,
      price: 500,
      product: {
        title: 'Keyboard',
        description: 'Mechanical keyboard',
        category: 'electronics',
      },
    },
    {
      product_id: 'product-2',
      quantity: 1,
      price: 250,
      product: {
        title: 'Mouse',
        description: null,
        category: null,
      },
    },
  ],
};

export const MOCK_PAYMENT = {
  id: 'payment-1',
  order_id: MOCK_PAYMENT_ORDER.id,
  user_id: MOCK_PAYMENT_USER.id,
  amount: 1250,
  currency: 'usd',
  description: 'Payment for order order-1',
  status: PaymentStatus.PENDING,
  createdAt: new Date('2026-05-19T08:00:00.000Z'),
  updatedAt: new Date('2026-05-19T08:05:00.000Z'),
};

export const MOCK_STRIPE_CHECKOUT_SESSION = {
  id: 'cs_test_123',
  url: 'https://checkout.stripe.test/session',
  expires_at: 1779177600,
  metadata: { payment_id: MOCK_PAYMENT.id },
  payment_status: 'unpaid',
  status: 'open',
};
