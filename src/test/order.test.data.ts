import { OrderProductDto } from '../dto/place_order.dto';
import { Product } from '../generated/prisma/client';

export const emptyOrderItems: OrderProductDto[] = [];

export const duplicateOrderItems: OrderProductDto[] = [
  { product_id: '1', quantity: 1 },
  { product_id: '1', quantity: 2 },
];

export const singleItemOrder: OrderProductDto[] = [
  { product_id: '1', quantity: 2 },
];

export const multiItemOrder: OrderProductDto[] = [
  { product_id: '1', quantity: 2 },
  { product_id: '2', quantity: 3 },
];

export const productNotFound: Product[] = [];

export const productsInStock: Product[] = [
  { id: '1', price: 100, quantity: 10 } as Product,
];

export const productsInsufficientStock: Product[] = [
  { id: '1', price: 100, quantity: 1 } as Product,
];

export const multiProductsInStock: Product[] = [
  { id: '1', price: 100, quantity: 5 } as Product,
  { id: '2', price: 200, quantity: 3 } as Product,
];

export class OrderFilterDto {
  page?: number;
  limit?: number;
  filter?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}
