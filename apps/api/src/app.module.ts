import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// Config & infra
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

// Common
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { OrganizationContextGuard } from './common/guards/organization-context.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaService } from './database/prisma.service';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { LabelsModule } from './modules/labels/labels.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ActivityModule } from './modules/activity/activity.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,

    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          {
            ttl: config.authRateLimitWindowMs,
            limit: config.authRateLimitMax,
          },
        ],
      }),
    }),

    // JwtModule is registered here globally so JwtAuthGuard can inject JwtService.
    JwtModule.register({}),

    AuthModule,
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
    InvitationsModule,
    ProjectsModule,
    LabelsModule,
    TasksModule,
    CommentsModule,
    ActivityModule,
    NotificationsModule,
    DashboardModule,
  ],
  providers: [
    // Apply the global exception filter that maps all errors to the typed error contract.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },

    // Wrap all successful responses in { success, data, requestId }.
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },

    // Rate-limiting guard (applied globally).
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // JWT authentication guard (allows @Public() routes through).
    {
      provide: APP_GUARD,
      useFactory: (jwtService: JwtService, config: AppConfigService, reflector: Reflector) =>
        new JwtAuthGuard(jwtService, config, reflector),
      inject: [JwtService, AppConfigService, Reflector],
    },

    // Organization context resolution guard.
    {
      provide: APP_GUARD,
      useFactory: (prisma: PrismaService, reflector: Reflector) =>
        new OrganizationContextGuard(prisma, reflector),
      inject: [PrismaService, Reflector],
    },

    // Role-based authorization guard (checks @Roles() against resolved membership).
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new RolesGuard(reflector),
      inject: [Reflector],
    },
  ],
})
export class AppModule implements NestModule {
  configure(_consumer: MiddlewareConsumer): void {
    // Middleware configuration (e.g. correlation-ID) can be added here.
  }
}
