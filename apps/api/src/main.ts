import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { PrismaService } from './database/prisma.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, logger: false }),
  );

  const config = app.get(AppConfigService);

  // -------------------------------------------------------------------------
  // Fastify plugins
  // -------------------------------------------------------------------------
  await app.register(fastifyCookie);
  await app.register(fastifyHelmet, {
    // Content-Security-Policy is relaxed here for the Swagger UI; tighten for production.
    contentSecurityPolicy: config.isProduction
      ? undefined
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
          },
        },
  });

  // -------------------------------------------------------------------------
  // CORS
  // -------------------------------------------------------------------------
  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // -------------------------------------------------------------------------
  // Global prefix and validation
  // -------------------------------------------------------------------------
  app.setGlobalPrefix(config.apiGlobalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Strip unknown fields (prevents mass-assignment).
      forbidNonWhitelisted: false, // Don't reject requests for extra fields — just strip them.
      transform: true,       // Auto-transform payload types (e.g. string → number via @Type).
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // -------------------------------------------------------------------------
  // Swagger / OpenAPI
  // -------------------------------------------------------------------------
  if (!config.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('TaskForge API')
      .setDescription(
        'REST API for TaskForge — multi-tenant project management SaaS. ' +
        'Authenticate via POST /api/v1/auth/login and add the returned accessToken ' +
        'as a Bearer token to the Authorize dialog.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addServer(`http://localhost:${config.apiPort}`, 'Local development')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Swagger UI available at http://localhost:${config.apiPort}/api/docs`);
  }

  // -------------------------------------------------------------------------
  // Shutdown hooks
  // -------------------------------------------------------------------------
  const prisma = app.get(PrismaService);
  prisma.enableShutdownHooks(app);
  app.enableShutdownHooks();

  // -------------------------------------------------------------------------
  // Start
  // -------------------------------------------------------------------------
  await app.listen(config.apiPort, config.apiHost);
  logger.log(
    `TaskForge API running at http://${config.apiHost}:${config.apiPort}/${config.apiGlobalPrefix}`,
  );
}

void bootstrap();
