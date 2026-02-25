import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

export class BaseService<T, CreateDto = any> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly model: any, // Prisma model delegate, e.g., prisma.product
  ) {}

  // Create a record using a DTO
  async create(data: CreateDto): Promise<T> {
    return this.model.create({ data });
  }

  // Find one record by unique key
  async findOne(
    where: Prisma.PrismaClientKnownRequestError | any,
  ): Promise<T | null> {
    return this.model.findUnique({ where });
  }

  // Find many records with optional filters
  async findMany(params?: {
    where?: any;
    skip?: number;
    take?: number;
    orderBy?: any;
  }): Promise<T[]> {
    return this.model.findMany(params);
  }

  // Update record by unique key
  async update(where: any, data: Partial<T>): Promise<T> {
    return this.model.update({ where, data });
  }

  // Delete record by unique key
  async delete(where: any): Promise<T> {
    return this.model.delete({ where });
  }

  // Count records matching a filter
  async count(where?: any): Promise<number> {
    return this.model.count({ where });
  }
}
