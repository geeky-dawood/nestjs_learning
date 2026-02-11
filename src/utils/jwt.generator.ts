import { JwtService } from '@nestjs/jwt';

const jwtService = new JwtService({
  secret: 'my_super_secret',
});

function generateToken(user: any): Promise<string> {
  const payload = { email: user.email, sub: user.id };
  return jwtService.signAsync(payload, { expiresIn: '14d' });
}

export { generateToken };
