import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { UserService } from './user.service';
import { GetUser } from '../auth/decorator/user.decorator';
import { UpdateUserDto } from 'src/dto/update_user.dto';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/profile')
  getProfile(@GetUser() user: any) {
    return { data: { ...user } };
  }

  @Get('/profile-by')
  getProfileById(@Query('userId') id: string) {
    return this.userService.getProfileById(id);
  }

  @Delete('/delete-profile')
  deleteProfile(@GetUser() user: any) {
    return this.userService.deleteProfile(user.id);
  }

  @Patch('/update-profile')
  updateProfile(@GetUser() user: any, @Body() body: UpdateUserDto) {
    return this.userService.updateprofile(user, body);
  }
}
