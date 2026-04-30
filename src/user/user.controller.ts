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
    description:
      'This endpoint allows you to retrieve your user profile information. You need to be authenticated with a valid JWT token to access this endpoint. Upon successful authentication, you will receive your user details, such as email and other relevant information (excluding the password). If you are not authenticated or if the token is invalid, you will receive an appropriate error message.',
  })
  getProfile(@GetUser() user: any) {
    return { data: { ...user } };
  }

  @Get('/profile-by')
  @ApiOperation({
    summary: 'Get user profile by ID',
    description:
      'This endpoint allows you to retrieve a user profile information by their ID. You need to be authenticated with a valid JWT token to access this endpoint. Upon successful authentication, you will receive the user details, such as email and other relevant information (excluding the password). If you are not authenticated or if the token is invalid, you will receive an appropriate error message.',
  })
  getProfileById(@Query('userId') id: string) {
    return this.userService.getProfileById(id);
  }

  @Delete('/delete-profile')
  @ApiOperation({
    summary: 'Delete user profile',
    description:
      'This endpoint allows you to delete your user profile. You need to be authenticated with a valid JWT token to access this endpoint. Upon successful authentication, your profile will be deleted. If you are not authenticated or if the token is invalid, you will receive an appropriate error message.',
  })
  deleteProfile(@GetUser() user: any) {
    return this.userService.deleteProfile(user.id);
  }

  @Patch('/update-profile')
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'This endpoint allows you to update your user profile information. You need to be authenticated with a valid JWT token to access this endpoint. You can update fields such as name, date of birth, and profile picture URL. Upon successful authentication and validation of the input data, your profile will be updated with the new information. If you are not authenticated or if the token is invalid, you will receive an appropriate error message.',
  })
  updateProfile(@GetUser() user: any, @Body() body: UpdateUserDto) {
    return this.userService.updateprofile(user, body);
  }
}
