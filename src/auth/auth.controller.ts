import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from '../dto/signup.dto';
import { SigninDto } from '../dto/signin.dto';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SignupResponseDto } from './interface';
import { SigninResponseDto } from '../dto/signin_response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({
    type: SignupResponseDto,
    description: 'User registered successfully',
  })
  @ApiConflictResponse({ description: 'Email already in use' })
  async signup(@Body() body: SignupDto): Promise<SignupResponseDto> {
    return this.authService.signup(body);
  }

  @Post('/signin')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in an existing user' })
  @ApiResponse({
    status: 200,
    type: SigninResponseDto,
    description: 'Login successful',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async signin(@Body() body: SigninDto): Promise<SigninResponseDto> {
    return this.authService.signin(body);
  }
}
