import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from 'src/dto/update_user.dto';
import { User } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async deleteProfile(user: User) {
    try {
      //hard delete
      // await this.prisma.user.delete({
      //   where: {
      //     id: userid,
      //   },
      // });

      //soft delete
      await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          email: Date.now() + user.email,
          is_Deleted: true,
        },
      });

      return { message: 'Deleted Successfully!' };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async getProfileById(userid: string) {
    try {
      const finduser = await this.prisma.user.findUnique({
        where: {
          id: userid,
        },
        omit: {
          password: true,
        },
        include: { address: true },
      });

      if (!finduser) {
        throw new NotFoundException('User not found!');
      }

      return {
        data: {
          ...finduser,
        },
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async updateprofile(user: User, payload: UpdateUserDto) {
    const finduser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: payload,
      omit: {
        password: true,
      },
    });
    return {
      message: 'Updated',
      data: {
        ...finduser,
      },
    };
  }
}
