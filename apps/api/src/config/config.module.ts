import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema, type Env } from './env.schema';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Look for .env in the workspace dir first (apps/api/.env), then fall back
      // to the monorepo root (../../.env).  When running via "npm run dev -w apps/api"
      // the process CWD is apps/api, so the root .env lives two levels up.
      envFilePath: ['.env', '../../.env'],
      // Validate on startup — the app throws and refuses to start on invalid config.
      validate: (config: Record<string, unknown>) => {
        const result = envSchema.safeParse(config);
        if (!result.success) {
          const formatted = result.error.issues
            .map((i) => `  ${i.path.join('.')}: ${i.message}`)
            .join('\n');
          throw new Error(`Invalid environment configuration:\n${formatted}`);
        }
        return result.data;
      },
    }),
  ],
  providers: [
    {
      provide: AppConfigService,
      useFactory: (inner: ConfigService<Env, true>) => new AppConfigService(inner),
      inject: [ConfigService],
    },
  ],
  exports: [AppConfigService],
})
export class AppConfigModule {}
