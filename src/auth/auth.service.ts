import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BaseService } from '../common/database/base.service';
import { SigninDto } from '../dto/signin.dto';
import { SignupDto } from '../dto/signup.dto';
import { User } from '../generated/prisma/client';
import { SigninResponseEnum } from '../generated/prisma/enums';
import { hashpassword, verifyHashPassword } from '../helpers/hash.helper';
import { PrismaService } from '../prisma/prisma.service';
import { SignupResponseDto } from '../dto/signup_response.dto';
import { SigninResponseDto } from '../dto/signin_response.dto';

@Injectable()
export class AuthService extends BaseService<User> {
  constructor(
    protected readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    super(prisma, prisma.user);
  }

  async signup(payload: SignupDto): Promise<SignupResponseDto> {
    const email = this.normalizeEmail(payload.email);

    const existing = await this.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists.');
    }

    const password = await hashpassword(payload.password);

    const { id, role } = await this.prisma.user.create({
      data: { ...payload, email, password },
    });

    return {
      message: 'Registration successful. You can now sign in.',
      data: { id, email, role },
    };
  }

  async signin(payload: SigninDto): Promise<SigninResponseDto> {
    const email = this.normalizeEmail(payload.email);

    const user = await this.findOne({ where: { email } });

    if (!user || user.is_deleted) {
      throw new NotFoundException('User not found.');
    }

    this.assertAccountNotLocked(user);

    const isPasswordValid = await verifyHashPassword(
      user.password,
      payload.password,
    );

    await this.recordLoginAttempt(user, isPasswordValid);

    if (!isPasswordValid) {
      await this.handleFailedAttempt(user);
    }

    // Unlock account on successful login
    await this.unlockAccount(user.id);

    const access_token = await this.generateToken(user);
    const { id, role } = user;

    return {
      message: 'Login successful.',
      data: { id, email, role, access_token },
    };
  }

  // ---------------------------------------------------------------------------

  private assertAccountNotLocked(user: User): void {
    if (user.is_locked && user.lock_until && user.lock_until > new Date()) {
      const secondsRemaining = this.secondsUntil(user.lock_until);
      throw new ForbiddenException(
        `Account is locked. Try again in ${secondsRemaining} second(s).`,
      );
    }
  }

  private async handleFailedAttempt(user: User): Promise<never> {
    const { maxAttempts, windowMs } = this.lockoutConfig();
    const windowStart = new Date(Date.now() - windowMs);

    const recentFailures = await this.prisma.loginAttempts.count({
      where: {
        user_id: user.id,
        attempt_success: false,
        createAt: { gte: windowStart },
      },
    });

    if (recentFailures >= maxAttempts) {
      const lockUntil = new Date(Date.now() + windowMs);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { is_locked: true, lock_until: lockUntil },
      });

      const secondsRemaining = this.secondsUntil(lockUntil);
      throw new ForbiddenException(
        `Account locked after ${maxAttempts} failed attempts. Try again in ${secondsRemaining} second(s).`,
      );
    }

    throw new UnauthorizedException('Invalid credentials.');
  }

  private async unlockAccount(userId: string): Promise<void> {
    await this.update({ id: userId }, { is_locked: false, lock_until: null });
  }

  private async recordLoginAttempt(
    user: User,
    success: boolean,
  ): Promise<void> {
    await this.prisma.loginAttempts.create({
      data: {
        user_id: user.id,
        attempt_success: success,
        reason: success
          ? SigninResponseEnum.PASSWORD_MATCHES
          : SigninResponseEnum.INVALID_PASSWORD,
      },
    });
  }

  private lockoutConfig(): { maxAttempts: number; windowMs: number } {
    const maxAttempts = Number(
      this.configService.get<number>('MAX_WRONG_ATTEMPTS'),
    );
    const windowSeconds = Number(
      this.configService.get<number>('MAX_WRONG_ATTEMPTS_TIME_FRAME'),
    );
    return { maxAttempts, windowMs: windowSeconds * 1000 };
  }

  private secondsUntil(date: Date): number {
    return Math.ceil((date.getTime() - Date.now()) / 1000);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateToken(user: User): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
