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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

jest.mock('src/helpers/hash.helper');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  const user = {
    id: 'user-1',
    email: 'test@gmail.com',
    password: 'hashedPassword',
    is_deleted: false,
    is_locked: false,
    lock_until: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
      loginAttempts: { create: jest.fn(), findMany: jest.fn() },
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'MAX_WRONG_ATTEMPTS') return 5;
        if (key === 'MAX_WRONG_ATTEMPTS_TIME_FRAME') return 60;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
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
    (hashpassword as jest.Mock).mockResolvedValue('hashedPassword');
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@gmail.com',
    });

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
      is_locked: true,
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
    prisma.loginAttempts.findMany.mockResolvedValue([{ id: '1' }]);

    await expect(
      service.signin({ email: 'test@gmail.com', password: 'Wrong123!' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should lock account on 5th wrong attempt', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(user as any);
    (verifyHashPassword as jest.Mock).mockResolvedValue(false);
    prisma.loginAttempts.findMany.mockResolvedValue([
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' },
    ]);

    await expect(
      service.signin({ email: 'test@gmail.com', password: 'Wrong123!' } as any),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('should login successfully with correct password', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue(user as any);
    (verifyHashPassword as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('token123');

    const result = await service.signin({
      email: 'test@gmail.com',
      password: 'Password123!',
    } as any);

    expect(result.message).toBe('Login Successful');
    expect(result.data.access_token).toBe('token123');
  });
});
