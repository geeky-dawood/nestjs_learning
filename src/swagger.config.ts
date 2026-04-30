import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfigs = new DocumentBuilder()
  .setTitle('Complete API`s Documentation')
  .setDescription(
    `
Full-featured Auth, User, Product & Order Management API.

## Features
- Authentication (JWT)
- User management
- Product CRUD operations
- Pagination, filtering & Searching
- Place orders and manage them


## Authentication
Use Bearer Token (JWT) to access protected routes.

## Roles & Permissions
- Admin: Access to some admin only endpoints.
- User: Can manage their own profile, view products, and place orders.

## Errors
Standard HTTP status codes are used.
- 400 for validation errors, 
- 401 for unauthorized access, 
- 403 for forbidden access, 
- 404 for not found resources, 
- 500 for server errors.

`,
  )
  .setVersion('1.0.0')
  .setContact(
    'Muhammad Dawood',
    'https://dawood-flutter-portfolio.vercel.app/',
    'dawood448@gmail.com',
  )
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')

  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter JWT token',
    },
    'access-token',
  )

  .addServer('http://localhost:3333', 'Local')
  .addServer('http://192.168.10.123:3333', 'Production')

  .addTag('Auth', 'Authentication endpoints')
  .addTag('User', 'User management APIs')
  .addTag('Product', 'Product management APIs')
  .addTag('Order', 'Order management APIs')

  .build();
