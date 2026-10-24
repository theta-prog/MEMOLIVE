import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers/testApp.js';

let app: any;
let accessToken: string;
let refreshToken: string;

describe('Auth Refresh / Logout (skipDb)', () => {
  beforeAll(async () => {
    app = await createTestApp({ mockGoogle: true, skipDb: true });
    const authRes = await app.inject({ method: 'POST', url: '/v1/auth/google', payload: { idToken: 'aaaaaaaaaaaaaaaaaaaa' } });
    const body = authRes.json();
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;
  });
  afterAll(async () => { await app.close(); });

  it('refreshes tokens without an access token', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.refreshToken).not.toBe(refreshToken);
    refreshToken = body.refreshToken; // rotate
  });

  it('revokes refresh token', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/logout', payload: { refreshToken }, headers: { Authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ revoked: true });
  });

  it('fails to rotate revoked token', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken }, headers: { Authorization: `Bearer ${accessToken}` } });
    expect(res.statusCode).toBe(401);
  });
});
