import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a route parameter is a well-formed UUID.
 * Use instead of NestJS's built-in ParseUUIDPipe to keep error messages
 * consistent with the application's error contract.
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !UUID_RE.test(value)) {
      throw new BadRequestException(`Parameter must be a valid UUID, got: ${String(value)}`);
    }
    return value;
  }
}
