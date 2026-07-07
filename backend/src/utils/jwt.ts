import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sellersense-super-secret-key-development-mode-2026';
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';

interface TokenPayload {
  userId: string;
}

/**
 * Generates a JWT access token for a given user ID.
 */
export function generateAccessToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRY as any,
  });
}

/**
 * Verifies a JWT token and returns the decoded payload if valid.
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
