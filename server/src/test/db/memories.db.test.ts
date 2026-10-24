import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let app: any;
let buildFn: any;
let accessToken: string;
let pgContainer: any = null;
let eventId: string;

describe.skipIf(!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== 'true')('Memories API (real DB)', () => {
  beforeAll(async () => {
    process.env.SKIP_DB = 'false';
    process.env.MOCK_GOOGLE = 'true';
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret';

    if (!process.env.DATABASE_URL) {
      try {
        const mod = await import('@testcontainers/postgresql');
        const { PostgreSqlContainer } = mod as any;
        pgContainer = await new PostgreSqlContainer().start();
        const username = pgContainer.getUsername();
        const password = pgContainer.getPassword();
        const host = pgContainer.getHost();
        const port = pgContainer.getPort();
        const database = pgContainer.getDatabase();
        process.env.DATABASE_URL = `postgresql://${username}:${password}@${host}:${port}/${database}`;
      } catch (error) {
        throw new Error('Real DB tests require DATABASE_URL or a working PostgreSQL testcontainer', { cause: error });
      }
    }

    execSync('npx prisma db push --skip-generate', { stdio: 'ignore' });
    execSync('npx prisma generate', { stdio: 'ignore' });

    const mod = await import('../../index.js');
    buildFn = mod.build;
    app = await buildFn();

    const res = await app.inject({ method: 'POST', url: '/v1/auth/google', payload: { idToken: 'mock-token' } });
    accessToken = res.json().accessToken;

    // Create a prerequisite event
    {
      const eventRes = await app.inject({
        method: 'POST',
        url: '/v1/live-events',
        headers: { Authorization: `Bearer ${accessToken}` },
        payload: { title: 'Event for Memory', date: new Date().toISOString() }
      });
      eventId = eventRes.json().id;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
    if (pgContainer) await pgContainer.stop();
  });

  it('creates, lists, updates and deletes a memory', async () => {

    // Create
    const payload = {
      eventId,
      review: 'RealDB Review',
      setlist: 'Song A\nSong B'
    };
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/memories',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload
    });
    expect(createRes.statusCode).toBe(200);
    const created = createRes.json();
    expect(created.id).toBeTruthy();
    expect(created.review).toBe(payload.review);

    // List
    const listRes = await app.inject({
      method: 'GET',
      url: '/v1/memories',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    expect(list.items.some((m: any) => m.id === created.id)).toBe(true);

    // Update
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/v1/memories/${created.id}`,
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { review: 'Updated Review' }
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().review).toBe('Updated Review');

    // Delete
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/v1/memories/${created.id}`,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    expect(delRes.statusCode).toBe(200);

    // Verify deletion
    const listRes2 = await app.inject({
      method: 'GET',
      url: '/v1/memories',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    expect(listRes2.json().items.some((m: any) => m.id === created.id)).toBe(false);
  });
});
