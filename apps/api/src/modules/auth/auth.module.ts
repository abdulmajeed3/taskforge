import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    // JwtModule is registered without a default secret here because each sign/verify
    // call explicitly passes its secret via options (access vs refresh use different
    // secrets). This prevents accidentally using the wrong secret.
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
