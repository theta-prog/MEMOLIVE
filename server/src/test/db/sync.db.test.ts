import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let app: any;
let buildFn: any;
let accessToken: string;
let pgContainer: any = null;

describe.skipIf(!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== 'true')('Sync API (real DB)', () => {
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
  });

  afterAll(async () => {
    if (app) await app.close();
    if (pgContainer) await pgContainer.stop();
  });

  it('applies client changes and returns server changes', async () => {

    const artistId = '11111111-1111-1111-1111-111111111111';
    const clientChanges = {
      artists: [
        {
          id: artistId,
          name: 'Synced Artist',
          website: 'https://sync.example.com'
        }
      ]
    };

    // Sync with client changes
    const syncRes = await app.inject({
      method: 'POST',
      url: '/v1/sync',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: {
        lastSyncAt: new Date(0).toISOString(),
        clientChanges
      }
    });

    expect(syncRes.statusCode).toBe(200);
    const body = syncRes.json();
    expect(body.serverChanges.artists).toBeDefined();
    
    // Verify the artist was created in DB
    const listRes = await app.inject({
      method: 'GET',
      url: '/v1/artists',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const artists = listRes.json().items;
    const syncedArtist = artists.find((a: any) => a.id === artistId);
    expect(syncedArtist).toBeDefined();
    expect(syncedArtist.name).toBe('Synced Artist');
  });
});
