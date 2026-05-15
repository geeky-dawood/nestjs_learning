import { Test, TestingModule } from '@nestjs/testing';
import { ImageUploadService } from './image-upload.service';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabass/supabass.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('ImageUploadService', () => {
  let service: ImageUploadService;

  const mockSupabase = {
    client: {
      storage: {
        from: jest.fn().mockReturnThis(),
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
      },
    },
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'MAX_FILE_SIZE') return String(10 * 1024 * 1024);
      if (key === 'SUPABASE_BUCKET') return 'product-images';
      return null;
    }),
  };

  const mockPrisma = {
    product: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabase.client.storage.from.mockReturnValue(
      mockSupabase.client.storage,
    );
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'MAX_FILE_SIZE') return String(10 * 1024 * 1024);
      if (key === 'SUPABASE_BUCKET') return 'product-images';
      return null;
    });
    mockPrisma.product.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageUploadService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ImageUploadService>(ImageUploadService);
  });

  // -------------------------
  // SUCCESS CASE
  // -------------------------
  it('should upload image successfully', async () => {
    mockSupabase.client.storage.upload.mockResolvedValue({
      error: null,
    });

    mockSupabase.client.storage.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'http://image-url.com/test.png',
      },
    });

    const file = {
      originalname: 'test.png',
      mimetype: 'image/png',
      size: 1000,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const result = await service.uploadImage(file, 'prod1');

    expect(result.success).toBe(true);
    expect(result.message).toBe('Image uploaded successfully.');
    expect(result.data.file_name).toMatch(/^products\/\d+-test\.png$/);
    expect(result.data.url).toBeDefined();
    expect(mockSupabase.client.storage.from).toHaveBeenCalledWith(
      'product-images',
    );
    expect(mockSupabase.client.storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^products\/\d+-test\.png$/),
      file.buffer,
      {
        contentType: 'image/png',
        upsert: false,
      },
    );
    expect(mockPrisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod1' },
      data: {
        images: {
          push: 'http://image-url.com/test.png',
        },
      },
    });
  });

  // -------------------------
  // NO FILE
  // -------------------------
  it('should throw error if file is missing', async () => {
    await expect(service.uploadImage(null as any, 'prod1')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockSupabase.client.storage.upload).not.toHaveBeenCalled();
  });

  // -------------------------
  // INVALID MIME TYPE
  // -------------------------
  it('should throw error for invalid mime type', async () => {
    const file = {
      originalname: 'test.txt',
      mimetype: 'text/plain',
      size: 1000,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(service.uploadImage(file, 'prod1')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockSupabase.client.storage.upload).not.toHaveBeenCalled();
  });

  // -------------------------
  // FILE TOO LARGE
  // -------------------------
  it('should throw error if file exceeds size limit', async () => {
    const file = {
      originalname: 'test.png',
      mimetype: 'image/png',
      size: 999999999,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(service.uploadImage(file, 'prod1')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockSupabase.client.storage.upload).not.toHaveBeenCalled();
  });

  // -------------------------
  // SUPABASE UPLOAD ERROR
  // -------------------------
  it('should throw error if supabase upload fails', async () => {
    mockSupabase.client.storage.upload.mockResolvedValue({
      error: { message: 'Upload failed' },
    });

    const file = {
      originalname: 'test.png',
      mimetype: 'image/png',
      size: 1000,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(service.uploadImage(file, 'prod1')).rejects.toThrow(
      BadRequestException,
    );
  });

  // -------------------------
  // MISSING BUCKET
  // -------------------------
  it('should throw internal error if bucket is missing', async () => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'MAX_FILE_SIZE') return String(10 * 1024 * 1024);
      if (key === 'SUPABASE_BUCKET') return null;
      return null;
    });

    const file = {
      originalname: 'test.png',
      mimetype: 'image/png',
      size: 1000,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(service.uploadImage(file, 'prod1')).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('should sanitize filenames and default missing extension to png', async () => {
    mockSupabase.client.storage.upload.mockResolvedValue({
      error: null,
    });
    mockSupabase.client.storage.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'http://image-url.com/sanitized.png',
      },
    });

    const file = {
      originalname: 'my test image',
      mimetype: 'image/jpeg',
      size: 1000,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const result = await service.uploadImage(file, 'prod1');

    expect(result.data.file_name).toMatch(
      /^products\/\d+-my-test-image\.png$/,
    );
    expect(mockSupabase.client.storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^products\/\d+-my-test-image\.png$/),
      file.buffer,
      {
        contentType: 'image/jpeg',
        upsert: false,
      },
    );
  });

  it('should wrap unexpected upload failures as internal server errors', async () => {
    mockSupabase.client.storage.upload.mockRejectedValue(
      new Error('network down'),
    );

    const file = {
      originalname: 'test.jpg',
      mimetype: 'image/jpg',
      size: 1000,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    await expect(service.uploadImage(file, 'prod1')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
