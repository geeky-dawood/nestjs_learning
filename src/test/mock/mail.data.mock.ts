import { OrderStatusEnum } from '../../generated/prisma/enums';

export const MOCK_MAIL_USER = {
  id: '1',
  email: 'test@test.com',
  name: 'Dawood',
};

export const MOCK_MAIL_PRODUCTS = [
  { id: 'p1', title: 'Product 1', price: 100 },
  { id: 'p2', title: 'Product 2', price: 200 },
];

export const MOCK_UNKNOWN_MAIL_PRODUCT = {
  id: 'p-unknown',
  title: 'Ghost Product',
  price: 50,
};

export const MOCK_MAIL_ORDER = {
  id: 'o1',
  order_number: 'ORD-001',
};

export const ORDER_PLACED_ITEMS = [
  { product_id: 'p1', quantity: 2 },
  { product_id: 'p2', quantity: 1 },
];

export const ORDER_STATUS_BODY = {
  order_id: 'o1',
  status: OrderStatusEnum.CONFIRMED,
};

export const COMPLETED_ORDER_STATUS_BODY = {
  order_id: 'o1',
  status: OrderStatusEnum.COMPLETED,
};

export const MAILER_ORDER_PLACED_RESPONSE = {
  messageId: 'msg-001',
};

export const MAILER_ORDER_STATUS_RESPONSE = {
  messageId: 'msg-002',
};

export const SMTP_ERROR = new Error('SMTP error');

export const SMTP_TIMEOUT_ERROR = new Error('SMTP timeout');

export const DB_ERROR = new Error('DB error');

export const DB_CONNECTION_LOST_ERROR = new Error('DB connection lost');
