import {
  Body,
  Controller,
  Delete,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { AddressService } from './address.service';
import { CreateAddressDto } from 'src/dto/create_address.dto';
import { GetUser } from 'src/auth/decorator/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Post('/create')
  addAddress(@GetUser() user: any, @Body() body: CreateAddressDto) {
    return this.addressService.addAddress(user, body);
  }

  @Delete('/delete-address')
  deleteAnAddress(@GetUser() user: any, @Query('address_id') id: string) {
    return this.addressService.deleteAnAddress(user, id);
  }
}
