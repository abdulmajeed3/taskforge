import { defineConfig } from 'prisma/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Prisma 7's env() reads from process.env only — it does NOT auto-load .env.
// Load it explicitly so `prisma migrate deploy` and other CLI commands find DATABASE_URL.
// process.loadEnvFile() is built into Node 20.12+ and does not overwrite existing vars.
const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: './schema.prisma',
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
