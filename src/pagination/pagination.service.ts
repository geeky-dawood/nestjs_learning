import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PaginationModel<T> = {
  findMany: (args: any) => Prisma.PrismaPromise<T[]>;
  count: (args: any) => Prisma.PrismaPromise<number>;
};

export type PaginationMeta = {
  current_page_number: number;
  page_size: number;
  total_pages: number;
  total_records: number;
  has_next_page: boolean;
  has_previous_page: boolean;
};

export type PaginationResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type PaginateOptions<T, W = unknown> = {
  model: PaginationModel<T>;
  where?: W;
  page?: number | string;
  limit?: number | string;
  skip?: number | string;
  take?: number | string;
  select?: unknown;
  include?: unknown;
  orderBy?: unknown;
  cursor?: unknown;
  distinct?: unknown;
};

@Injectable()
export class PaginationService {
  constructor(private readonly prisma: PrismaService) {}

  async paginate<T, W = unknown>(
    options: PaginateOptions<T, W>,
  ): Promise<PaginationResult<T>> {
    const {
      model,
      where = {},
      select,
      include,
      orderBy = { createdAt: 'desc' },
      cursor,
      distinct,
    } = options;

    const { skip, take, currentPage } = this.getPaginationValues(options);

    const findManyArgs = this.removeUndefinedValues({
      where,
      skip,
      take,
      select,
      include,
      orderBy,
      cursor,
      distinct,
    });

    const [data, total] = await this.prisma.$transaction([
      model.findMany(findManyArgs),
      model.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    return {
      data,
      meta: {
        current_page_number: currentPage,
        page_size: take,
        total_pages: totalPages,
        total_records: total,
        has_next_page: currentPage < totalPages,
        has_previous_page: currentPage > 1,
      },
    };
  }

  private getPaginationValues(options: {
    page?: number | string;
    limit?: number | string;
    skip?: number | string;
    take?: number | string;
  }) {
    const take = this.toPositiveNumber(options.take ?? options.limit, 10);
    const page = this.toPositiveNumber(options.page, 1);
    const skip = this.toNonNegativeNumber(options.skip, (page - 1) * take);
    const currentPage = Math.floor(skip / take) + 1;

    return { skip, take, currentPage };
  }

  private toPositiveNumber(value: number | string | undefined, fallback: number) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 1) {
      return fallback;
    }

    return Math.floor(numberValue);
  }

  private toNonNegativeNumber(
    value: number | string | undefined,
    fallback: number,
  ) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
      return fallback;
    }

    return Math.floor(numberValue);
  }

  private removeUndefinedValues(args: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(args).filter(([, value]) => value !== undefined),
    );
  }
}
