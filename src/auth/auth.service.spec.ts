import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { hashpassword, verifyHashPassword } from 'src/helpers/hash.helper';
import { generateToken } from 'src/utils/jwt.generator';

jest.mock('src/helpers/hash.helper');
jest.mock('src/utils/jwt.generator');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  const user = {
    id: 'user-1',
    email: 'test@gmail.com',
    password: 'hashedPassword',
    is_deleted: false,
    is_locked: false,
    lock_until: null,
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      loginAttempts: { create: jest.fn(), count: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================
  // SIGNUP
  // =========================

  it('should throw if email already exists', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(user as any);

    await expect(
      service.signup({
        name: 'Test',
        email: 'test@gmail.com',
        password: 'Password123!',
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('should register successfully', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(null);
    jest
      .spyOn(service, 'create')
      .mockResolvedValue({ id: 'user-1', email: 'test@gmail.com' } as any);
    (hashpassword as jest.Mock).mockResolvedValue('hashedPassword');

    const result = await service.signup({
      name: 'Test',
      email: 'test@gmail.com',
      password: 'Password123!',
    } as any);

    expect(result.message).toBe('Registration Successful');
  });

  // =========================
  // SIGNIN
  // =========================

  it('should throw if user not found', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(null);

    await expect(
      service.signin({
        email: 'test@gmail.com',
        password: 'Password123!',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw if account is locked', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      ...user,
      lock_until: new Date(Date.now() + 60000),
    } as any);

    await expect(
      service.signin({
        email: 'test@gmail.com',
        password: 'Password123!',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw unauthorized for wrong password', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(user as any);
    (verifyHashPassword as jest.Mock).mockResolvedValue(false);
    prisma.loginAttempts.count.mockResolvedValue(1);

    await expect(
      service.signin({ email: 'test@gmail.com', password: 'Wrong123!' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should lock account on 5th wrong attempt', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(user as any);
    (verifyHashPassword as jest.Mock).mockResolvedValue(false);
    prisma.loginAttempts.count.mockResolvedValue(5);

    await expect(
      service.signin({ email: 'test@gmail.com', password: 'Wrong123!' } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('should login successfully with correct password', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(user as any);
    (verifyHashPassword as jest.Mock).mockResolvedValue(true);
    (generateToken as jest.Mock).mockResolvedValue('token123');

    const result = await service.signin({
      email: 'test@gmail.com',
      password: 'Password123!',
    } as any);

    expect(result.message).toBe('Login Successful');
    expect(result.data.access_token).toBe('token123');
  });
});
