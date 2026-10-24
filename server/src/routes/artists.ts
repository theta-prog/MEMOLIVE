import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const createSchema = z.object({
  name: z.string().min(1),
  website: z.string().url().optional(),
  socialMedia: z.string().optional(),
  photoUrl: z.string().url().optional()
});

const updateSchema = createSchema.partial();

export async function artistRoutes(app: FastifyInstance) {
  const auth = (app as any).authenticate;
  const skipDb = process.env.SKIP_DB === 'true';

  app.get('/v1/artists', { preValidation: [auth] }, async (req: any) => {
    if (skipDb) return { items: [] };
    const userId = req.user.sub;
    const artists = await prisma.artist.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    return { items: artists };
  });

  app.post('/v1/artists', { preValidation: [auth] }, async (req: any, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.issues });
    if (skipDb) return { id: 'mock-id', userId: req.user.sub, ...parsed.data };
    const userId = req.user.sub;
    const artist = await prisma.artist.create({ data: { ...parsed.data, userId } });
    return artist;
  });

  app.patch('/v1/artists/:id', { preValidation: [auth] }, async (req: any, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ code: 'INVALID_ID' });
    const body = updateSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ code: 'VALIDATION_ERROR', errors: body.error.issues });
    if (skipDb) return { id: params.data.id, ...body.data };
    const userId = req.user.sub;
    const existing = await prisma.artist.findFirst({ where: { id: params.data.id, userId } });
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND' });
    const updated = await prisma.artist.update({ where: { id: existing.id }, data: body.data });
    return updated;
  });

  app.delete('/v1/artists/:id', { preValidation: [auth] }, async (req: any, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ code: 'INVALID_ID' });
    if (skipDb) return { ok: true };
    const userId = req.user.sub;

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.artist.findFirst({ where: { id: params.data.id, userId } });
        if (!existing) throw new Error('NOT_FOUND');

        // Cascade delete: Memories -> LiveEvents -> Artist
        const events = await tx.liveEvent.findMany({ where: { artistId: existing.id } });
        const eventIds = events.map(e => e.id);
        
        if (eventIds.length > 0) {
          await tx.memory.deleteMany({ where: { eventId: { in: eventIds } } });
          await tx.liveEvent.deleteMany({ where: { artistId: existing.id } });
        }

        await tx.artist.delete({ where: { id: existing.id } });
      });
      
      return { ok: true };
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return reply.code(404).send({ code: 'NOT_FOUND' });
      }
      console.error('Delete artist error:', error);
      return reply.code(500).send({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
}
