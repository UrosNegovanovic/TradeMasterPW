import { test as base, expect, Browser, request as pwRequest } from '@playwright/test';
import { env } from '../config/env';
import { STORAGE_STATE, STORAGE_STATE_B, STORAGE_STATE_VAT } from '../playwright.config';
import { ApiClient } from '../utils/api-client';
import { Seeder } from '../utils/seed';
import { TenantName, tenantStorageState } from '../config/tenants';

/** Clerk session JWTs live ~60s. A token is reused only while this much of its real lifetime (JWT `exp`) is left. */
const MIN_REMAINING_MS = 20_000;

function expiresAtMs(jwt: string): number {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8')) as { exp: number };
  return payload.exp * 1000;
}

type TokenSource = { getToken: () => Promise<string>; dispose: () => Promise<void> };

async function createTokenSource(browser: Browser, storageState: string): Promise<TokenSource> {
  const context = await browser.newContext({ storageState, baseURL: env.baseURL });
  const page = await context.newPage();
  await page.goto('/');
  let cached: { token: string; expiresAt: number } | undefined;

  return {
    async getToken() {
      if (cached && cached.expiresAt - Date.now() > MIN_REMAINING_MS) return cached.token;
      await page.waitForFunction(() => (window as any).Clerk?.session, undefined, { timeout: 15_000 });
      // skipCache: Clerk's own cache can hand back a token that is already close to expiry.
      const token = await page.evaluate(() => (window as any).Clerk.session.getToken({ skipCache: true }) as Promise<string>);
      cached = { token, expiresAt: expiresAtMs(token) };
      return token;
    },
    dispose: () => context.close(),
  };
}

type WorkerFixtures = { tokenA: TokenSource; tokenB: TokenSource; tokenVat: TokenSource };
export interface TenantHandle { api: ApiClient; seed: Seeder }
type TestFixtures = {
  /** Opens API access to a dedicated tenant (finance, dash, settings); data seeded through it is cleaned up after the test. */
  as: (tenant: TenantName) => Promise<TenantHandle>; api: ApiClient; apiB: ApiClient; apiVat: ApiClient; seed: Seeder; seedVat: Seeder; seedB: Seeder };

export const test = base.extend<TestFixtures, WorkerFixtures>({
  tokenA: [async ({ browser }, use) => {
    const source = await createTokenSource(browser, STORAGE_STATE);
    await use(source);
    await source.dispose();
  }, { scope: 'worker' }],

  tokenB: [async ({ browser }, use) => {
    const source = await createTokenSource(browser, STORAGE_STATE_B);
    await use(source);
    await source.dispose();
  }, { scope: 'worker' }],

  tokenVat: [async ({ browser }, use) => {
    const source = await createTokenSource(browser, STORAGE_STATE_VAT);
    await use(source);
    await source.dispose();
  }, { scope: 'worker' }],

  // Profiles are created lazily by GET /api/profile; every other endpoint 404s until that happened.
  api: async ({ tokenA }, use) => {
    const context = await pwRequest.newContext({ baseURL: env.baseURL });
    const client = new ApiClient(context, tokenA.getToken);
    expect((await client.get('/api/profile')).ok()).toBeTruthy();
    await use(client);
    await context.dispose();
  },

  // Creates data for user A and deletes it after the test (catalogs, clients, products in reverse order).
  seed: async ({ api }, use) => {
    const seeder = new Seeder(api);
    await use(seeder);
    await seeder.cleanup();
  },

  // Same for the VAT company (user "vat") and the company without PIB (user B).
  as: async ({ browser }, use) => {
    const sources: TokenSource[] = [];
    const contexts: Array<{ dispose: () => Promise<void> }> = [];
    const seeders: Seeder[] = [];

    await use(async (tenant) => {
      const source = await createTokenSource(browser, tenantStorageState(tenant));
      const context = await pwRequest.newContext({ baseURL: env.baseURL });
      sources.push(source);
      contexts.push(context);
      const api = new ApiClient(context, source.getToken);
      expect((await api.get('/api/profile')).ok()).toBeTruthy();
      const seed = new Seeder(api);
      seeders.push(seed);
      return { api, seed };
    });

    for (const seeder of seeders) await seeder.cleanup();
    for (const context of contexts) await context.dispose();
    for (const source of sources) await source.dispose();
  },

  seedVat: async ({ apiVat }, use) => {
    const seeder = new Seeder(apiVat);
    await use(seeder);
    await seeder.cleanup();
  },

  seedB: async ({ apiB }, use) => {
    const seeder = new Seeder(apiB);
    await use(seeder);
    await seeder.cleanup();
  },

  apiVat: async ({ tokenVat }, use) => {
    const context = await pwRequest.newContext({ baseURL: env.baseURL });
    const client = new ApiClient(context, tokenVat.getToken);
    expect((await client.get('/api/profile')).ok()).toBeTruthy();
    await use(client);
    await context.dispose();
  },

  apiB: async ({ tokenB }, use) => {
    const context = await pwRequest.newContext({ baseURL: env.baseURL });
    const client = new ApiClient(context, tokenB.getToken);
    expect((await client.get('/api/profile')).ok()).toBeTruthy();
    await use(client);
    await context.dispose();
  },
});

export { expect };
