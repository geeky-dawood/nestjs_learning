import { Test, TestingModule } from '@nestjs/testing';
import { ImageUploadController } from './image-upload.controller';
import { ImageUploadService } from './image-upload.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('ImageUploadController', () => {
  let controller: ImageUploadController;
  const mockImageUploadService = {
    uploadImage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImageUploadController],
      providers: [
        { provide: ImageUploadService, useValue: mockImageUploadService },
      ],
    }).compile();

    controller = module.get<ImageUploadController>(ImageUploadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate uploads to ImageUploadService', async () => {
    const file = {
      originalname: 'test.png',
      mimetype: 'image/png',
      size: 1000,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;
    const response = {
      success: true,
      data: { url: 'http://image-url.com/test.png' },
    };
    mockImageUploadService.uploadImage.mockResolvedValue(response);

    await expect(controller.uploadImage('prod1', file)).resolves.toBe(
      response,
    );
    expect(mockImageUploadService.uploadImage).toHaveBeenCalledWith(
      file,
      'prod1',
    );
  });
});
