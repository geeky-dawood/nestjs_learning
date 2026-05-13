import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from '../dto/signup.dto';
import { hashpassword, verifyHashPassword } from '../helpers/hash.helper';
import { SigninDto } from '../dto/signin.dto';
import { SigninResponseEnum } from '../generated/prisma/enums';
import { User } from '../generated/prisma/client';
import { BaseService } from '../common/database/base.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class AuthService extends BaseService<User> {
  constructor(
    protected prisma: PrismaService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly stripeService: StripeService,
  ) {
    super(prisma, prisma.user);
  }

  async signup(payload: SignupDto) {
    try {
      const desiredEmailFormate = this.desiredEmailReturn(payload.email);

      const alreadyUser = await this.findOne({
        where: {
          email: desiredEmailFormate,
        },
      });

      if (alreadyUser) {
        throw new ConflictException('User with this email already exist.');
      }

      const originalPassword = payload.password;
      const hash = await hashpassword(originalPassword);

      const user = await this.prisma.user.create({
        data: {
          name: payload.name,
          email: desiredEmailFormate,
          password: hash,
          dob: payload.dob,
          profile_picture: payload.profile_picture,
          role: payload.role,
          preferred_language: payload.preferred_language,
        },
      });

      const customer = await this.stripeService.createCustomer(user);

      const { password, ...userWithoutPassword } = user;

      return {
        message: 'Registration Successful',
        data: {
          ...userWithoutPassword,
          stripe_customer_id: customer.id,
        },
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async signin(payload: SigninDto) {
    try {
      const desiredEmailFormate = this.desiredEmailReturn(payload.email);
      const maxWrongAttempts = this.configService.get<number>(
        'MAX_WRONG_ATTEMPTS',
      )! as number;

      const maxWrongAttemptsTimeFrame = this.configService.get<number>(
        'MAX_WRONG_ATTEMPTS_TIME_FRAME',
      )! as number;

      let accountLockoutDuration = new Date(
        Date.now() + Number(maxWrongAttemptsTimeFrame) * 1000,
      );
      let wrongAttemptTrackingTimeWindow = new Date(
        Date.now() - Number(maxWrongAttemptsTimeFrame) * 1000,
      );

      let remainingTimeToUnlockAccount = Math.ceil(
        (accountLockoutDuration.getTime() - Date.now()) / 1000,
      );

      const user = await this.findOne({
        where: {
          email: desiredEmailFormate,
        },
      });

      if (!user || user.is_deleted) {
        throw new NotFoundException('User not found.');
      }

      if (user.is_locked && user.lock_until && user.lock_until > new Date()) {
        throw new ForbiddenException(
          `Account locked due to multiple wrong attempts. Try after ${remainingTimeToUnlockAccount} seconds.`,
        );
      }

      const isPasswordValid = await verifyHashPassword(
        user.password,
        payload.password,
      );

      if (!isPasswordValid) {
        await this.UpdateLoginAttempt(user, isPasswordValid);
        console.log(maxWrongAttempts);

        const totalWrongAttempts = await this.prisma.loginAttempts.findMany({
          where: {
            user_id: user.id,
            attempt_success: false,
            createAt: {
              gte: wrongAttemptTrackingTimeWindow,
            },
          },
          take: Number(maxWrongAttempts),
          orderBy: {
            createAt: 'desc',
          },
        });

        if (totalWrongAttempts.length >= maxWrongAttempts) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              is_locked: true,
              lock_until: accountLockoutDuration,
            },
          });
          throw new ForbiddenException(
            `Account locked due to multiple wrong attempts. Try after ${remainingTimeToUnlockAccount} seconds.`,
          );
        }

        throw new UnauthorizedException('Invalid Credentials');
      } else {
        const accessToken = await this.generateToken(user);
        const { password, ...result } = user;

        await this.UpdateLoginAttempt(user, isPasswordValid);

        return {
          message: 'Login Successful',
          data: {
            access_token: accessToken,
            ...result,
          },
        };
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  private async UpdateLoginAttempt(user: User, isAttemptSuccess: boolean) {
    await this.prisma.loginAttempts.create({
      data: {
        reason: isAttemptSuccess
          ? SigninResponseEnum.PASSWORD_MATCHES
          : SigninResponseEnum.INVALID_PASSWORD,
        user_id: user.id,
        attempt_success: isAttemptSuccess,
      },
    });

    if (isAttemptSuccess) {
      await this.update(
        {
          id: user.id,
        },
        {
          is_locked: false,
          lock_until: null,
        },
      );
    }
  }

  private desiredEmailReturn(email: string) {
    return email.toLocaleLowerCase();
  }

  private generateToken(user: any): Promise<string> {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return this.jwtService.signAsync(payload);
  }
}
