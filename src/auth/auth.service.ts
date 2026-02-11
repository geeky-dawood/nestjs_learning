import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignupDto } from 'src/dto/signup.dto';
import { hashpassword, verifyHashPassword } from 'src/helpers/hash.helper';
import { LoginDto } from 'src/dto/login.dto';
import { generateToken } from 'src/utils/jwt.generator';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(payload: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });

      if (!user || user.isDeleted) {
        throw new ConflictException('User not found.');
      }
      //This is from CHATGPT
      //
      if (user.lock_until && user.lock_until > new Date()) {
        const remaining = Math.ceil(
          (user.lock_until.getTime() - Date.now()) / 1000,
        );
        throw new ForbiddenException(
          `Account locked due to multiple wrong attempts. Try after ${remaining} seconds.`,
        );
      }
      //

      const isPasswordValid = await verifyHashPassword(
        user.password,
        payload.password,
      );

      if (isPasswordValid) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            wrong_attempts: 0,
            is_Locked: false,
            lock_until: null,
          },
        });

        const { password, ...result } = user;
        const access_token = await generateToken(user);

        return {
          message: 'Login Successful',
          data: { access_token, ...result },
        };
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          wrong_attempts: { increment: 1 },
        },
      });

      if (
        updatedUser.wrong_attempts >= Number(process.env.MAX_WRONG_ATTEMPTS)
      ) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            is_Locked: true,
            lock_until: new Date(
              Date.now() +
                Number(process.env.MAX_WRONG_ATTEMPTS_TIME_FRAME) * 1000,
            ),
          },
        });
        throw new ForbiddenException(
          'Account locked due to multiple wrong attempts. Try after 1 minute.',
        );
      }

      throw new UnauthorizedException('Email or Password is incorrect.');
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async signup(payload: SignupDto) {
    try {
      const alreadyUser = await this.prisma.user.findUnique({
        where: {
          email: payload.email,
        },
      });

      console.log('------------', alreadyUser);

      if (alreadyUser) {
        throw new ConflictException('User with this email already exist.');
      }

      const originalPassword = payload.password;
      const hash = await hashpassword(originalPassword);

      const user = await this.prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
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
