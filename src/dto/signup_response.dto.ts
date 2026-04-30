import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../generated/prisma/client';

export class SignupDataDto {
  @ApiProperty({ example: 'cuid_abc123' })
  id: string;

  @ApiProperty({ example: 'user@gmail.com' })
  email: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;
}

export class SignupResponseDto {
  @ApiProperty({ example: 'Account created successfully.' })
  message: string;

  @ApiProperty({ type: () => SignupDataDto })
  data: SignupDataDto;
}
