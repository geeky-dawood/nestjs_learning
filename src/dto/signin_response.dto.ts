import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../generated/prisma/client';

export class SigninDataDto {
  @ApiProperty({ example: 'cuid_abc123' })
  id: string;

  @ApiProperty({ example: 'user@gmail.com' })
  email: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5...' })
  access_token: string;
}

export class SigninResponseDto {
  @ApiProperty({ example: 'Login successful.' })
  message: string;

  @ApiProperty({ type: () => SigninDataDto })
  data: SigninDataDto;
}
