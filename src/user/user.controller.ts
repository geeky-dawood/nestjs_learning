import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { UserService } from './user.service';
import { GetUser } from '../auth/decorator/user.decorator';
import { UpdateUserDto } from '../dto/update_user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/profile')
  @ApiOperation({
    summary: 'Get user profile',
  })
  getProfile(@GetUser() user: any) {
    return { data: { ...user } };
  }

  @Get('/profile-by')
  @ApiOperation({
    summary: 'Get user profile by ID',
  })
  getProfileById(@Query('userId') id: string) {
    return this.userService.getProfileById(id);
  }

  @Delete('/delete-profile')
  @ApiOperation({
    summary: 'Delete user profile',
  })
  deleteProfile(@GetUser() user: any) {
    return this.userService.deleteProfile(user.id);
  }

  @Patch('/update-profile')
  @ApiOperation({
    summary: 'Update user profile',
  })
  updateProfile(@GetUser() user: any, @Body() body: UpdateUserDto) {
    return this.userService.updateprofile(user, body);
  }
}
