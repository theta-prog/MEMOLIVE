import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyGoogleIdToken } from '../../lib/googleVerify.js';
import { prisma } from '../../lib/prisma.js';
import { issueRefreshToken, revokeRefreshToken, rotateRefreshToken } from '../../services/refreshToken.js';

const bodySchema = z.object({ idToken: z.string().min(10) });

export async function authGoogleRoute(app: FastifyInstance) {
  app.post('/v1/auth/google', { schema: { body: { type: 'object', properties: { idToken: { type: 'string' } } } } }, async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.issues });

    // Progress logging (for development debugging)
    req.log.info({ mock: process.env.MOCK_GOOGLE, skipDb: process.env.SKIP_DB }, 'auth.google:start');
    try {
      const profile = await verifyGoogleIdToken(parsed.data.idToken);
      const skipDb = process.env.SKIP_DB === 'true';
      if (skipDb) {
        const userId = 'mock-user-id';
        const accessToken = app.jwt.sign({ sub: userId });
        const refresh = await issueRefreshToken(userId);
        req.log.info('auth.google:success_skipDb');
        return reply.send({
          accessToken,
          refreshToken: refresh.token,
          refreshExpiresAt: refresh.expiresAt,
          user: { id: userId, email: profile.email, name: profile.name }
        });
      }

      try {
        const user = await prisma.user.upsert({
          where: { providerSub: profile.sub },
          update: { email: profile.email, displayName: profile.name },
          create: { providerSub: profile.sub, email: profile.email, displayName: profile.name, provider: 'google' }
        });
        const accessToken = app.jwt.sign({ sub: user.id });
        const refresh = await issueRefreshToken(user.id);
        req.log.info('auth.google:success');
        return reply.send({
          accessToken,
          refreshToken: refresh.token,
          refreshExpiresAt: refresh.expiresAt,
          user: { id: user.id, email: user.email, name: user.displayName }
        });
      } catch (dbErr:any) {
        req.log.error({ dbErr }, 'auth.google:db_error');
        return reply.code(500).send({ code: 'DB_ERROR' });
      }
    } catch (e:any) {
      req.log.error({ e }, 'auth.google:failure');
      return reply.code(401).send({ code: 'AUTH_FAILED' });
    }
  });

  // The opaque refresh token identifies its owner; an expired access token is unnecessary.
  const refreshBody = z.object({ refreshToken: z.string().min(1).max(512) });

  app.post('/v1/auth/refresh', async (req, reply) => {
    const parsed = refreshBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 'VALIDATION_ERROR' });
    const rotated = await rotateRefreshToken(parsed.data.refreshToken);
    if (!rotated) return reply.code(401).send({ code: 'INVALID_REFRESH' });
    return reply.send({
      accessToken: app.jwt.sign({ sub: rotated.userId }),
      refreshToken: rotated.token,
      refreshExpiresAt: rotated.expiresAt,
    });
  });

  app.post('/v1/auth/logout', async (req, reply) => {
    const parsed = refreshBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 'VALIDATION_ERROR' });
    return reply.send({ revoked: await revokeRefreshToken(parsed.data.refreshToken) });
  });
}
