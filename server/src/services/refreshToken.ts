import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

interface StoredToken {
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null;
  lastUsedAt?: Date | null;
}
const inMemory = new Map<string, StoredToken>();

function parseDuration(input: string | undefined, fallbackMs: number): number {
  if (!input) return fallbackMs;
  const match = input.match(/^(\d+)([smhd])$/);
  if (!match) return fallbackMs;
  const units: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  const unit = units[match[2] ?? ''];
  return unit === undefined ? fallbackMs : Number(match[1]) * unit;
}

const skipDb = () => process.env.SKIP_DB === 'true';
export interface IssueResult { token: string; expiresAt: Date; }
interface RotationResult extends IssueResult { userId: string; }

function newToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + parseDuration(process.env.REFRESH_TOKEN_TTL, 14 * 86_400_000));
  return { token, tokenHash: hashToken(token), expiresAt };
}

export async function issueRefreshToken(userId: string): Promise<IssueResult> {
  const { token, tokenHash, expiresAt } = newToken();
  if (skipDb()) {
    inMemory.set(tokenHash, { userId, tokenHash, createdAt: new Date(), expiresAt });
  } else {
    await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  }
  return { token, expiresAt };
}

export async function rotateRefreshToken(oldRaw: string): Promise<RotationResult | null> {
  const tokenHash = hashToken(oldRaw);
  const now = new Date();
  if (skipDb()) {
    const stored = inMemory.get(tokenHash);
    if (!stored || stored.revokedAt || stored.expiresAt <= now) return null;
    // Claim synchronously before yielding, so concurrent requests cannot reuse it.
    stored.revokedAt = now;
    stored.lastUsedAt = now;
    return { ...await issueRefreshToken(stored.userId), userId: stored.userId };
  }

  return prisma.$transaction(async (tx) => {
    const stored = await tx.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt <= now) return null;
    // An atomic conditional update allows only one rotation, even across workers.
    const claimed = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now, lastUsedAt: now },
    });
    if (claimed.count !== 1) return null;
    const next = newToken();
    await tx.refreshToken.create({
      data: { userId: stored.userId, tokenHash: next.tokenHash, expiresAt: next.expiresAt },
    });
    return { token: next.token, expiresAt: next.expiresAt, userId: stored.userId };
  });
}

export async function revokeRefreshToken(raw: string): Promise<boolean> {
  const tokenHash = hashToken(raw);
  if (skipDb()) {
    const stored = inMemory.get(tokenHash);
    if (!stored) return false;
    stored.revokedAt = new Date();
    return true;
  }
  const result = await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });
  return result.count === 1;
}

export function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
