import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from './pagination.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((queries) => Promise.all(queries)),
          },
        },
      ],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
