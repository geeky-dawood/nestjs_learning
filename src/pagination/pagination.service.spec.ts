import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from './pagination.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaginationService', () => {
  let service: PaginationService;
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should paginate with default page, limit, and order', async () => {
    const data = [{ id: '1' }, { id: '2' }];
    const model = {
      findMany: jest.fn().mockResolvedValue(data),
      count: jest.fn().mockResolvedValue(12),
    };

    const result = await service.paginate({ model });

    expect(model.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    expect(model.count).toHaveBeenCalledWith({ where: {} });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      data,
      meta: {
        current_page_number: 1,
        page_size: 10,
        total_pages: 2,
        total_records: 12,
        has_next_page: true,
        has_previous_page: false,
      },
    });
  });

  it('should accept string pagination values and optional query args', async () => {
    const data = [{ id: '3' }];
    const model = {
      findMany: jest.fn().mockResolvedValue(data),
      count: jest.fn().mockResolvedValue(21),
    };
    const where = { isActive: true };
    const select = { id: true };
    const cursor = { id: '2' };
    const distinct = ['id'];

    const result = await service.paginate({
      model,
      where,
      page: '2',
      limit: '5',
      select,
      cursor,
      distinct,
      orderBy: { id: 'asc' },
    });

    expect(model.findMany).toHaveBeenCalledWith({
      where,
      skip: 5,
      take: 5,
      select,
      orderBy: { id: 'asc' },
      cursor,
      distinct,
    });
    expect(result.meta).toEqual({
      current_page_number: 2,
      page_size: 5,
      total_pages: 5,
      total_records: 21,
      has_next_page: true,
      has_previous_page: true,
    });
  });

  it('should prefer skip and take over page and limit', async () => {
    const model = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(30),
    };

    const result = await service.paginate({
      model,
      page: 1,
      limit: 10,
      skip: '20',
      take: '5',
      include: { user: true },
    });

    expect(model.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 20,
      take: 5,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result.meta).toMatchObject({
      current_page_number: 5,
      has_next_page: true,
      has_previous_page: true,
    });
  });

  it('should fall back when pagination values are invalid', async () => {
    const model = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    };

    const result = await service.paginate({
      model,
      page: 'bad',
      limit: 0,
      skip: -1,
      take: Number.NaN,
    });

    expect(model.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    expect(result.meta).toEqual({
      current_page_number: 1,
      page_size: 10,
      total_pages: 0,
      total_records: 0,
      has_next_page: false,
      has_previous_page: false,
    });
  });

  it('should floor decimal pagination values', async () => {
    const model = {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(8),
    };

    const result = await service.paginate({
      model,
      page: 2.9,
      limit: 3.8,
    });

    expect(model.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 3,
      take: 3,
      orderBy: { createdAt: 'desc' },
    });
    expect(result.meta).toMatchObject({
      current_page_number: 2,
      page_size: 3,
      total_pages: 3,
    });
  });
});
