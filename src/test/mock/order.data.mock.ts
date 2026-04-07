import {
  ActivityActionType,
  OrderStatusEnum,
  RequestMethod,
  UserRole,
} from '../../generated/prisma/client';

// ─── User Mocks ───────────────────────────────────────────────────────────────

export const MOCK_USER_ID = 'user-123';

export const MOCK_USER = {
  id: MOCK_USER_ID,
  name: 'John Doe',
  email: 'john@example.com',
};

// ─── Product Mocks ────────────────────────────────────────────────────────────

export const MOCK_PRODUCT_P1 = {
  id: 'p1',
  title: 'Widget A',
  category: 'Electronics',
  price: 100,
  quantity: 10,
  is_deleted: false,
};

export const MOCK_PRODUCT_P2 = {
  id: 'p2',
  title: 'Widget B',
  category: 'Clothing',
  price: 200,
  quantity: 5,
  is_deleted: false,
};

export const MOCK_PRODUCT_ZERO_STOCK = {
  id: 'p1',
  title: 'Widget A',
  category: 'Electronics',
  price: 100,
  quantity: 0,
  is_deleted: false,
};

export const MOCK_PRODUCT_LOW_STOCK = {
  id: 'p1',
  title: 'Widget A',
  category: 'Electronics',
  price: 100,
  quantity: 1,
  is_deleted: false,
};

// ─── Order Mocks ──────────────────────────────────────────────────────────────

export const MOCK_ORDER_ID = 'o1';
export const MOCK_ORDER_NUMBER = 'ABC123456';

export const MOCK_ORDER_PENDING = {
  id: MOCK_ORDER_ID,
  order_number: MOCK_ORDER_NUMBER,
  total_price: 100,
  user_id: MOCK_USER_ID,
  order_status: OrderStatusEnum.PENDING,
  items: [],
  createdAt: new Date(),
};

export const MOCK_ORDER_CONFIRMED = {
  ...MOCK_ORDER_PENDING,
  order_status: OrderStatusEnum.CONFIRMED,
};

export const MOCK_ORDER_COMPLETED = {
  ...MOCK_ORDER_PENDING,
  order_status: OrderStatusEnum.COMPLETED,
};

export const MOCK_ORDER_CANCELLED = {
  ...MOCK_ORDER_PENDING,
  order_status: OrderStatusEnum.CANCELLED,
};

export const MOCK_ORDER_WITH_ITEMS = {
  ...MOCK_ORDER_PENDING,
  items: [
    {
      id: 'oi1',
      product_id: 'p1',
      quantity: 2,
      price: 100,
      order_id: MOCK_ORDER_ID,
    },
    {
      id: 'oi2',
      product_id: 'p2',
      quantity: 1,
      price: 200,
      order_id: MOCK_ORDER_ID,
    },
  ],
};

export const MOCK_ORDER_CONFIRMED_WITH_ITEMS = {
  ...MOCK_ORDER_CONFIRMED,
  items: [
    {
      id: 'oi1',
      product_id: 'p1',
      quantity: 2,
      price: 100,
      order_id: MOCK_ORDER_ID,
    },
  ],
};

// ─── Order Item Mocks ─────────────────────────────────────────────────────────

export const MOCK_ORDER_ITEMS = [
  {
    id: 'oi1',
    order_id: MOCK_ORDER_ID,
    product_id: 'p1',
    quantity: 2,
    price: 100,
  },
];

export const MOCK_ORDER_ITEMS_MULTI = [
  {
    id: 'oi1',
    order_id: MOCK_ORDER_ID,
    product_id: 'p1',
    quantity: 2,
    price: 100,
  },
  {
    id: 'oi2',
    order_id: MOCK_ORDER_ID,
    product_id: 'p2',
    quantity: 3,
    price: 200,
  },
];

// ─── Place Order DTOs ─────────────────────────────────────────────────────────

export const PLACE_ORDER_SINGLE_ITEM = {
  items: [{ product_id: 'p1', quantity: 1 }],
};

export const PLACE_ORDER_MULTI_ITEM = {
  items: [
    { product_id: 'p1', quantity: 2 },
    { product_id: 'p2', quantity: 1 },
  ],
};

export const PLACE_ORDER_DUPLICATE_ITEMS = {
  items: [
    { product_id: 'p1', quantity: 1 },
    { product_id: 'p1', quantity: 2 },
  ],
};

export const PLACE_ORDER_EMPTY = {
  items: [],
};

export const PLACE_ORDER_EXCESS_QUANTITY = {
  items: [{ product_id: 'p1', quantity: 999 }],
};

// ─── Activity Log Mocks ───────────────────────────────────────────────────────

export const MOCK_ACTIVITY_LOG_ORDER_CREATED = {
  user_id: MOCK_USER_ID,
  order_id: MOCK_ORDER_ID,
  action_type: ActivityActionType.ORDER_CREATED,
  description: `Order ${MOCK_ORDER_NUMBER} has been created.`,
  previous_status: null,
  current_status: OrderStatusEnum.PENDING,
  ordered_product_quantity: 1,
  order_total_price: 100,
  action_performed_by: UserRole.USER,
  request_method: RequestMethod.POST,
};

export const MOCK_ACTIVITY_LOG_ORDER_DELETED = (orderNumber: string) => ({
  user_id: MOCK_USER_ID,
  order_id: MOCK_ORDER_ID,
  action_type: ActivityActionType.ORDER_DELETED,
  description: `Order ${orderNumber} deleted`,
  previous_status: OrderStatusEnum.PENDING,
  current_status: OrderStatusEnum.CANCELLED,
  ordered_product_quantity: 3,
  order_total_price: 100,
  action_performed_by: UserRole.USER,
  request_method: RequestMethod.DELETE,
});

export const MOCK_ACTIVITY_LOG_STATUS_UPDATED = (
  orderNumber: string,
  from: OrderStatusEnum,
  to: OrderStatusEnum,
) => ({
  user_id: MOCK_USER_ID,
  order_id: MOCK_ORDER_ID,
  action_type: ActivityActionType.ORDER_STATUS_UPDATED,
  description: `Order ${orderNumber} status changed from ${from} to ${to}.`,
  previous_status: from,
  current_status: to,
  order_total_price: 100,
  action_performed_by: UserRole.ADMIN,
  request_method: RequestMethod.PATCH,
  ordered_product_quantity: 2,
});

// ─── Pagination Mocks ─────────────────────────────────────────────────────────

export const MOCK_PAGINATED_ORDERS = [
  {
    id: 'o1',
    order_status: OrderStatusEnum.PENDING,
    items: [],
    user: { id: MOCK_USER_ID, name: 'John Doe', email: 'john@example.com' },
  },
  {
    id: 'o2',
    order_status: OrderStatusEnum.COMPLETED,
    items: [],
    user: { id: MOCK_USER_ID, name: 'John Doe', email: 'john@example.com' },
  },
  {
    id: 'o3',
    order_status: OrderStatusEnum.PENDING,
    items: [],
    user: { id: MOCK_USER_ID, name: 'John Doe', email: 'john@example.com' },
  },
];

export const MOCK_SEARCH_DTO_DEFAULT = {
  page: 1,
  limit: 10,
  search: '',
};

export const MOCK_SEARCH_DTO_WITH_FILTER = {
  page: 1,
  limit: 10,
  search: '',
  filter: OrderStatusEnum.PENDING,
};

export const MOCK_SEARCH_DTO_WITH_SEARCH = {
  page: 1,
  limit: 10,
  search: 'ABC123',
};

export const MOCK_PAGINATION_META = (
  currentPage: number,
  pageSize: number,
  totalPages: number,
  totalRecords: number,
) => ({
  current_page_number: currentPage,
  page_size: pageSize,
  total_pages: totalPages,
  total_records: totalRecords,
});

// ─── Transaction Mock Factories ───────────────────────────────────────────────

/**
 * Creates a mock transaction object for successful order creation.
 */
export const createSuccessfulOrderTx = (jest: any) => ({
  order: {
    create: jest.fn().mockResolvedValue({
      id: MOCK_ORDER_ID,
      order_number: MOCK_ORDER_NUMBER,
      total_price: 100,
    }),
  },
  orderItem: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
  product: {
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  activityLogs: { create: jest.fn().mockResolvedValue({}) },
});

/**
 * Creates a mock transaction object simulating stock exhausted mid-transaction.
 */
export const createStockExhaustedTx = (jest: any) => ({
  order: { create: jest.fn() },
  orderItem: { createMany: jest.fn() },
  product: {
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  activityLogs: { create: jest.fn() },
});

/**
 * Creates a mock transaction for cancel-order (restores stock).
 */
export const createCancelOrderTx = (
  jest: any,
  orderItems = MOCK_ORDER_ITEMS,
) => ({
  orderItem: {
    findMany: jest.fn().mockResolvedValue(orderItems),
  },
  product: {
    update: jest.fn().mockResolvedValue({}),
  },
  order: {
    update: jest.fn().mockResolvedValue({}),
  },
});

/**
 * Creates a mock transaction for delete order.
 */
export const createDeleteOrderTx = (jest: any) => ({
  orderItem: { deleteMany: jest.fn().mockResolvedValue({}) },
  order: { delete: jest.fn().mockResolvedValue({}) },
  activityLogs: { create: jest.fn().mockResolvedValue({}) },
});
