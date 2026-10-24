import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// このテストは実際の DB (DATABASE_URL) を使用します。
// 事前に .env の DATABASE_URL を動作する Postgres に設定してください。
// SKIP_DB は false にする必要があります。

let app: any; // FastifyInstance だが動的 import 後に型付け
let buildFn: any;
let accessToken: string;
let pgContainer: any = null; // StartedPostgreSqlContainer | null (dynamic import)


describe.skipIf(!process.env.DATABASE_URL && process.env.RUN_DB_TESTS !== 'true')('Artists API (real DB)', () => {
  beforeAll(async () => {
    process.env.SKIP_DB = 'false';
    process.env.MOCK_GOOGLE = 'true';
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_secret';

    // 動的に Postgres コンテナを起動（DATABASE_URL 未指定の場合）
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

  // Prisma スキーマ適用（db push を利用して高速化）
  execSync('npx prisma db push --skip-generate', { stdio: 'ignore' });
  execSync('npx prisma generate', { stdio: 'ignore' });

  // 環境変数設定後に build を読み込む（PrismaClient 初期化前に DATABASE_URL が必要）
  const mod = await import('../../index.js');
  buildFn = mod.build;
  app = await buildFn();

    // ログイン (mock google + real DB upsert)
    const res = await app.inject({ method: 'POST', url: '/v1/auth/google', payload: { idToken: 'aaaaaaaaaaaaaaaaaaaa' } });
    const body = res.json();
    accessToken = body.accessToken;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (pgContainer) {
      await pgContainer.stop();
    }
  });

  it('creates, lists, updates and deletes an artist', async () => {
    // create
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/artists',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { name: 'RealDB Artist', website: 'https://example.org' }
    });
    expect(createRes.statusCode).toBe(200);
    const created = createRes.json();
    expect(created.id).toBeTruthy();

    // list
    const listRes = await app.inject({ method: 'GET', url: '/v1/artists', headers: { Authorization: `Bearer ${accessToken}` } });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    expect(Array.isArray(list.items)).toBe(true);
    expect(list.items.some((a: any) => a.id === created.id)).toBe(true);

    // update
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/v1/artists/${created.id}`,
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: { website: 'https://changed.example.org' }
    });
    expect(patchRes.statusCode).toBe(200);
    const patched = patchRes.json();
    expect(patched.website).toBe('https://changed.example.org');

    // delete
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/v1/artists/${created.id}`,
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    expect(delRes.statusCode).toBe(200);
    expect(delRes.json()).toEqual({ ok: true });

    // list again should not contain
    const listRes2 = await app.inject({ method: 'GET', url: '/v1/artists', headers: { Authorization: `Bearer ${accessToken}` } });
    const list2 = listRes2.json();
    expect(list2.items.some((a: any) => a.id === created.id)).toBe(false);
  });
});
