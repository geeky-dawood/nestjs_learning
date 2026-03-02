import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignupDto } from 'src/dto/signup.dto';
import { hashpassword, verifyHashPassword } from 'src/helpers/hash.helper';
import { SigninDto } from 'src/dto/signin.dto';
import { generateToken } from 'src/utils/jwt.generator';
import { SigninResponseEnum } from 'src/generated/prisma/enums';
import { User } from 'src/generated/prisma/client';
import { BaseService } from 'src/common/database/base.service';

@Injectable()
export class AuthService extends BaseService<User> {
  constructor(protected prisma: PrismaService) {
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

      const user = await this.create({
        data: {
          name: payload.name,
          email: desiredEmailFormate,
          password: hash,
          dob: payload.dob,
          profile_picture: payload.profile_picture,
        },
        omit: { password: true },
      });

      return {
        message: 'Registration Successful',
        data: {
          ...user,
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

      let accountLockoutDuration = new Date(Date.now() + 1 * 60 * 1000); //lock for a minute just for testing purpose, can be increased as per requirement
      let wrongAttemptTrackingTimeWindow = new Date(Date.now() - 1 * 60 * 1000); // track wrong attempts in last 1 minute just for testing purpose, can be increased as per requirement

      const user = await this.findOne({
        where: {
          email: desiredEmailFormate,
        },
      });

      if (!user || user.is_deleted) {
        throw new NotFoundException('User not found.');
      }

      if (user.lock_until && user.lock_until > new Date()) {
        const remaining = Math.ceil(
          (user.lock_until.getTime() - Date.now()) / 1000,
        );
        throw new ForbiddenException(
          `Account locked due to multiple wrong attempts. Try after ${remaining} seconds.`,
        );
      }

      const isPasswordValid = await verifyHashPassword(
        user.password,
        payload.password,
      );

      if (!isPasswordValid) {
        await this.UpdateLoginAttempt(user, isPasswordValid);

        const totalWrongAttempts = await this.prisma.loginAttempts.findMany({
          where: {
            user_id: user.id,
            attempt_success: false,
            createAt: {
              gte: wrongAttemptTrackingTimeWindow,
            },
          },
          take: 5,
          orderBy: {
            createAt: 'desc',
          },
        });

        if (totalWrongAttempts.length >= 5) {
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
            'Account locked due to multiple wrong attempts.',
          );
        }

        throw new UnauthorizedException('Invalid Credentials');
      } else {
        const accessToken = await generateToken(user);
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
}
