import { BaseService } from './base.service';
import { PrismaService } from '../../prisma/prisma.service';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';

describe('BaseService', () => {
  let service: BaseService<any>;
  let prisma: PrismaService;
  let model: any;

  beforeEach(() => {
    model = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    prisma = {} as PrismaService;

    service = new BaseService(prisma, model);

    jest.clearAllMocks();
  });

  // ─── create ────────────────────────────────────────────────────────────────
  it('should create a record', async () => {
    const dto = { name: 'Test' };
    const result = { id: '1', ...dto };

    model.create.mockResolvedValue(result);

    const res = await service.create(dto);

    expect(model.create).toHaveBeenCalledWith({ data: dto });
    expect(res).toEqual(result);
  });

  it('should propagate error in create', async () => {
    model.create.mockRejectedValue(new Error('Create failed'));

    await expect(service.create({})).rejects.toThrow('Create failed');
  });

  // ─── findOne ───────────────────────────────────────────────────────────────
  it('should find one record', async () => {
    const args = { where: { id: '1' } };
    const result = { id: '1' };

    model.findUnique.mockResolvedValue(result);

    const res = await service.findOne(args);

    expect(model.findUnique).toHaveBeenCalledWith(args);
    expect(res).toEqual(result);
  });

  it('should return null if record not found in findOne', async () => {
    model.findUnique.mockResolvedValue(null);

    const res = await service.findOne({ where: { id: 'x' } });

    expect(res).toBeNull();
  });

  // ─── findMany ──────────────────────────────────────────────────────────────
  it('should find many records with params', async () => {
    const params = { where: { active: true }, skip: 0, take: 10 };
    const result = [{ id: '1' }];

    model.findMany.mockResolvedValue(result);

    const res = await service.findMany(params);

    expect(model.findMany).toHaveBeenCalledWith(params);
    expect(res).toEqual(result);
  });

  it('should find many records without params (branch)', async () => {
    const result = [{ id: '1' }];

    model.findMany.mockResolvedValue(result);

    const res = await service.findMany();

    expect(model.findMany).toHaveBeenCalledWith(undefined);
    expect(res).toEqual(result);
  });

  // ─── update ────────────────────────────────────────────────────────────────
  it('should update a record', async () => {
    const where = { id: '1' };
    const data = { name: 'Updated' };
    const result = { id: '1', ...data };

    model.update.mockResolvedValue(result);

    const res = await service.update(where, data);

    expect(model.update).toHaveBeenCalledWith({ where, data });
    expect(res).toEqual(result);
  });

  it('should propagate error in update', async () => {
    model.update.mockRejectedValue(new Error('Update failed'));

    await expect(service.update({}, {})).rejects.toThrow('Update failed');
  });

  // ─── delete ────────────────────────────────────────────────────────────────
  it('should delete a record', async () => {
    const where = { id: '1' };
    const result = { id: '1' };

    model.delete.mockResolvedValue(result);

    const res = await service.delete(where);

    expect(model.delete).toHaveBeenCalledWith({ where });
    expect(res).toEqual(result);
  });

  it('should propagate error in delete', async () => {
    model.delete.mockRejectedValue(new Error('Delete failed'));

    await expect(service.delete({})).rejects.toThrow('Delete failed');
  });

  // ─── count ─────────────────────────────────────────────────────────────────
  it('should count records with filter', async () => {
    model.count.mockResolvedValue(5);

    const res = await service.count({ active: true });

    expect(model.count).toHaveBeenCalledWith({ where: { active: true } });
    expect(res).toBe(5);
  });

  it('should count records without filter (branch)', async () => {
    model.count.mockResolvedValue(10);

    const res = await service.count();

    expect(model.count).toHaveBeenCalledWith({ where: undefined });
    expect(res).toBe(10);
  });

  it('should propagate error in count', async () => {
    model.count.mockRejectedValue(new Error('Count failed'));

    await expect(service.count()).rejects.toThrow('Count failed');
  });
});
