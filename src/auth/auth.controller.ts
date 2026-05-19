import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from '../dto/signup.dto';
import { SigninDto } from '../dto/signin.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(201)
  @Post('/signup')
  async signup(@Body() body: SignupDto) {
    const user = await this.authService.signup(body);
    return user;
  }

  @HttpCode(200)
  @Post('/signin')
  async signin(@Body() body: SigninDto) {
    return await this.authService.signin(body);
  }
}
