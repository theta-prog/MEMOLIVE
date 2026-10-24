import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const createSchema = z.object({
  title: z.string().min(1),
  artistId: z.string().uuid().optional().nullable(),
  date: z.string().datetime(),
  venue: z.string().optional().nullable(),
  venueAddress: z.string().optional().nullable(),
  doorsOpen: z.string().optional().nullable(),
  showStart: z.string().optional().nullable(),
  ticketStatus: z.enum(['won', 'lost', 'pending', 'purchased']).optional().nullable(),
  ticketPrice: z.number().int().optional().nullable(),
  seatNumber: z.string().optional().nullable(),
  memo: z.string().optional().nullable()
});

const updateSchema = createSchema.partial();

export async function liveEventRoutes(app: FastifyInstance) {
  const auth = (app as any).authenticate;
  const skipDb = process.env.SKIP_DB === 'true';

  app.get('/v1/live-events', { preValidation: [auth] }, async (req: any) => {
    if (skipDb) return { items: [] };
    const userId = req.user.sub;
    const events = await prisma.liveEvent.findMany({
      where: { userId },
      include: { artist: true },
      orderBy: { date: 'desc' }
    });
    return { items: events };
  });

  app.get('/v1/live-events/:id', { preValidation: [auth] }, async (req: any, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ code: 'INVALID_ID' });
    if (skipDb) return { id: params.data.id, title: 'Mock Event', date: new Date().toISOString() };
    const userId = req.user.sub;
    const event = await prisma.liveEvent.findFirst({
      where: { id: params.data.id, userId },
      include: { artist: true, memories: true }
    });
    if (!event) return reply.code(404).send({ code: 'NOT_FOUND' });
    return event;
  });

  app.post('/v1/live-events', { preValidation: [auth] }, async (req: any, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.issues });
    if (skipDb) return { id: 'mock-id', userId: req.user.sub, ...parsed.data };
    const userId = req.user.sub;
    const event = await prisma.liveEvent.create({
      data: { ...parsed.data, date: new Date(parsed.data.date), userId }
    });
    return event;
  });

  app.patch('/v1/live-events/:id', { preValidation: [auth] }, async (req: any, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ code: 'INVALID_ID' });
    const body = updateSchema.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ code: 'VALIDATION_ERROR', errors: body.error.issues });
    if (skipDb) return { id: params.data.id, ...body.data };
    const userId = req.user.sub;
    const existing = await prisma.liveEvent.findFirst({ where: { id: params.data.id, userId } });
    if (!existing) return reply.code(404).send({ code: 'NOT_FOUND' });
    const updated = await prisma.liveEvent.update({
      where: { id: existing.id },
      data: body.data.date ? { ...body.data, date: new Date(body.data.date) } : body.data
    });
    return updated;
  });

  app.delete('/v1/live-events/:id', { preValidation: [auth] }, async (req: any, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ code: 'INVALID_ID' });
    if (skipDb) return { ok: true };
    const userId = req.user.sub;

    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.liveEvent.findFirst({ where: { id: params.data.id, userId } });
        if (!existing) throw new Error('NOT_FOUND');

        // Cascade delete: Memories -> LiveEvent
        await tx.memory.deleteMany({ where: { eventId: existing.id } });
        await tx.liveEvent.delete({ where: { id: existing.id } });
      });

      return { ok: true };
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return reply.code(404).send({ code: 'NOT_FOUND' });
      }
      console.error('Delete live event error:', error);
      return reply.code(500).send({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
  });
}
