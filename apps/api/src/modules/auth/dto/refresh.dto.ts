import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Opaque refresh token (from httpOnly cookie on web clients)' })
  @IsString()
  refreshToken: string = '';
}
