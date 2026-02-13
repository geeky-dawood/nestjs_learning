import { Body, Controller, Delete, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from 'src/dto/signup.dto';
import { LoginDto } from 'src/dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(200)
  @Post('/signin')
  signin(@Body() body: LoginDto) {
    return this.authService.signin(body);
  }

  @HttpCode(201)
  @Post('/signup')
  async signup(@Body() body: SignupDto) {
    const user = await this.authService.signup(body);
    return user;
  }
}
