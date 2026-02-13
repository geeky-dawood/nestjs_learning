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
import { LoginDto } from 'src/dto/login.dto';
import { generateToken } from 'src/utils/jwt.generator';
import { SigninResponseEnum } from 'src/generated/prisma/enums';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  //----Signin
  async signin(payload: LoginDto) {
    try {
      const desiredEmailFormate = payload.email.toLowerCase();
      const wrongAttemptTrackingTimeWindow = new Date(
        Date.now() - 1 * 60 * 1000,
      );
      const accountLockoutDuration = new Date(Date.now() + 1 * 60 * 1000);

      const validUser = await this.prisma.user.findUnique({
        where: {
          email: desiredEmailFormate,
        },
      });

      if (!validUser || validUser.is_Deleted) {
        throw new NotFoundException('User not found.');
      }

      if (validUser.lock_until && validUser.lock_until > new Date()) {
        const remaining = Math.ceil(
          (validUser.lock_until.getTime() - Date.now()) / 1000,
        );
        throw new ForbiddenException(
          `Account locked due to multiple wrong attempts. Try after ${remaining} seconds.`,
        );
      }

      const isPasswordValid = await verifyHashPassword(
        validUser.password,
        payload.password,
      );

      //currently with 1 minute for testing purpose, can be changed to 15 minutes or as per requirement

      if (!isPasswordValid) {
        await this.prisma.loginAttempts.create({
          data: {
            reason: SigninResponseEnum.INVALID_PASSWORD,
            user_id: validUser.id,
            attempt_success: false,
          },
        });

        const totalWrongAttempts = await this.prisma.loginAttempts.findMany({
          where: {
            user_id: validUser.id,
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

        console.log('Wrong attempts:', totalWrongAttempts.length);

        if (
          totalWrongAttempts.length >= Number(process.env.MAX_WRONG_ATTEMPTS)
        ) {
          await this.prisma.user.update({
            where: {
              id: validUser.id,
            },
            data: {
              is_Locked: true,
              lock_until: accountLockoutDuration,
            },
          });
          throw new ForbiddenException(
            'Account locked due to multiple wrong attempts.',
          );
        }

        throw new UnauthorizedException('Invalid Credentials');
      }

      const accessToken = await generateToken(validUser);

      const { password, ...result } = validUser;

      await this.prisma.loginAttempts.create({
        data: {
          reason: SigninResponseEnum.PASSWORD_MATCHES,
          user_id: validUser.id,
          attempt_success: true,
        },
      });

      await this.prisma.user.update({
        where: {
          id: validUser.id,
        },
        data: {
          is_Locked: false,
          lock_until: null,
        },
      });

      return {
        message: 'Login Successful',
        data: {
          access_token: accessToken,
          ...result,
        },
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  //----Signup

  async signup(payload: SignupDto) {
    try {
      const desiredEmailFormate = payload.email.toLowerCase();

      const alreadyUser = await this.prisma.user.findUnique({
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
}
