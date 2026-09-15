import crypto from 'crypto';

/**
 * Generates a cryptographically strong random token for invitations.
 */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes the deterministic SHA-256 hash of a raw token.
 * Only the hash is persisted in the database.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
