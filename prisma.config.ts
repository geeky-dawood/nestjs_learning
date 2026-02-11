import 'dotenv/config'; // loads .env variables
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL, // Database connection string
  },
});
