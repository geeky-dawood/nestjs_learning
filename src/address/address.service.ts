import { Injectable, NotAcceptableException } from '@nestjs/common';
import { CreateAddressDto } from 'src/dto/create_address.dto';
import { User } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async addAddress(user: User, payload: CreateAddressDto) {
    try {
      const address = await this.prisma.address.create({
        data: {
          ...payload,
          user_id: user.id,
        },
      });

      return {
        message: 'Created',
        data: {
          ...address,
        },
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async deleteAnAddress(user: User, addressId: string) {
    try {
      const findAddress = await this.prisma.address.findUnique({
        where: {
          id: addressId,
        },
      });

      if (!findAddress || findAddress.user_id != user.id) {
        throw new NotAcceptableException(
          'Address not found or not owned by user',
        );
      }

      await this.prisma.address.delete({
        where: {
          id: addressId,
        },
      });

      return { message: 'Deleted Successfully!' };
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
