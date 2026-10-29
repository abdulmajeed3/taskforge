import {
  type INestApplication,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps the generated PrismaClient and integrates it with Nest's
 * lifecycle hooks so the connection pool is closed gracefully on shutdown.
 *
 * Prisma 7 requires a driver adapter — no native binary connector.
 * We use PrismaPg (backed by the `pg` package).  By the time this constructor
 * runs, @nestjs/config has already loaded the .env file into process.env.
 *
 * Inject PrismaService directly into feature services — do not expose raw
 * PrismaClient outside this service.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    const adapter = new PrismaPg({ connectionString });
    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }

  /**
   * Enable graceful shutdown hooks so Fastify's `app.close()` also runs Prisma cleanup.
   * Call this once in `main.ts` after `app.listen()`.
   */
  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
