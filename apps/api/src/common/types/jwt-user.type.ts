/**
 * Payload decoded from a verified JWT access token.
 * Only `sub` (the user id) is stored in the token; all other claims are
 * re-derived from the database on each request to stay current.
 */
export interface JwtUser {
  sub: string;
  iat: number;
  exp: number;
}
