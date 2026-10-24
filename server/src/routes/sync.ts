import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const syncRequestSchema = z.object({
  lastSyncAt: z.string().datetime().optional(),
  clientChanges: z.object({
    artists: z.array(z.any()).optional(),
    liveEvents: z.array(z.any()).optional(),
    memories: z.array(z.any()).optional()
  }).optional()
});

export async function syncRoutes(app: FastifyInstance) {
  const auth = (app as any).authenticate;
  const skipDb = process.env.SKIP_DB === 'true';

  app.post('/v1/sync', { preValidation: [auth] }, async (req: any, reply) => {
    const parsed = syncRequestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ code: 'VALIDATION_ERROR', errors: parsed.error.issues });

    if (skipDb) {
      return {
        serverChanges: { artists: [], liveEvents: [], memories: [] },
        syncedAt: new Date().toISOString(),
        conflicts: []
      };
    }

    const userId = req.user.sub;
    const lastSyncAt = parsed.data.lastSyncAt ? new Date(parsed.data.lastSyncAt) : new Date(0);
    const clientChanges = parsed.data.clientChanges;

    try {
      // Apply client changes if any
      if (clientChanges) {
        await prisma.$transaction(async (tx) => {
          if (clientChanges.artists?.length) {
            for (const artist of clientChanges.artists) {
              // Basic validation/sanitization needed here in real app
              await tx.artist.upsert({
                where: { id: artist.id },
                update: { ...artist, userId, updatedAt: new Date() },
                create: { ...artist, userId, updatedAt: new Date() }
              });
            }
          }
          if (clientChanges.liveEvents?.length) {
            for (const event of clientChanges.liveEvents) {
              await tx.liveEvent.upsert({
                where: { id: event.id },
                update: { ...event, userId, updatedAt: new Date() },
                create: { ...event, userId, updatedAt: new Date() }
              });
            }
          }
          if (clientChanges.memories?.length) {
            for (const memory of clientChanges.memories) {
              await tx.memory.upsert({
                where: { id: memory.id },
                update: { ...memory, userId, updatedAt: new Date() },
                create: { ...memory, userId, updatedAt: new Date() }
              });
            }
          }
        });
      }

      const [artists, liveEvents, memories] = await Promise.all([
        prisma.artist.findMany({
          where: { userId, updatedAt: { gt: lastSyncAt } }
        }),
        prisma.liveEvent.findMany({
          where: { userId, updatedAt: { gt: lastSyncAt } },
          include: { artist: true }
        }),
        prisma.memory.findMany({
          where: { userId, updatedAt: { gt: lastSyncAt } },
          include: { event: true }
        })
      ]);

      return {
        serverChanges: {
          artists,
          liveEvents,
          memories
        },
        syncedAt: new Date().toISOString(),
        conflicts: []
      };
    } catch (err: any) {
      req.log.error({ err }, 'sync:error');
      return reply.code(500).send({ code: 'SYNC_ERROR', message: err.message });
    }
  });

  app.get('/v1/sync/status', { preValidation: [auth] }, async (req: any) => {
    if (skipDb) {
      return {
        lastSyncAt: new Date().toISOString(),
        pendingChanges: 0
      };
    }

    const userId = req.user.sub;
    const [artistCount, eventCount, memoryCount] = await Promise.all([
      prisma.artist.count({ where: { userId } }),
      prisma.liveEvent.count({ where: { userId } }),
      prisma.memory.count({ where: { userId } })
    ]);

    return {
      lastSyncAt: new Date().toISOString(),
      counts: {
        artists: artistCount,
        liveEvents: eventCount,
        memories: memoryCount
      }
    };
  });
}
