import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategy/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'my_super_secret',
      signOptions: { expiresIn: '12d' },
    }),
  ],
})
export class AuthModule {}
