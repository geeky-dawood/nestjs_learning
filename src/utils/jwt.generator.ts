import { JwtService } from '@nestjs/jwt';

const jwtService = new JwtService({
  secret: 'my_super_secret',
});

function generateToken(user: any): Promise<string> {
  const payload = { email: user.email, sub: user.id, role: user.role };
  return jwtService.signAsync(payload, { expiresIn: '60s' });
}

export { generateToken };
