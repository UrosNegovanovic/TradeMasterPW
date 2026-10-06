import { test as base, expect, Browser, request as pwRequest } from '@playwright/test';
import { env } from '../config/env';
import { STORAGE_STATE, STORAGE_STATE_B, STORAGE_STATE_VAT } from '../playwright.config';
import { ApiClient } from '../utils/api-client';
import { Seeder } from '../utils/seed';
import { TenantName, tenantStorageState } from '../config/tenants';

/** Clerk session JWTs live ~60s, so tokens are re-read from the browser session shortly before that. */
const TOKEN_TTL_MS = 40_000;

type TokenSource = { getToken: () => Promise<string>; dispose: () => Promise<void> };

async function createTokenSource(browser: Browser, storageState: string): Promise<TokenSource> {
  const context = await browser.newContext({ storageState, baseURL: env.baseURL });
  const page = await context.newPage();
  await page.goto('/');
  let cached: { token: string; at: number } | undefined;

  return {
    async getToken() {
      if (cached && Date.now() - cached.at < TOKEN_TTL_MS) return cached.token;
      await page.waitForFunction(() => (window as any).Clerk?.session, undefined, { timeout: 15_000 });
      const token = await page.evaluate(() => (window as any).Clerk.session.getToken() as Promise<string>);
      cached = { token, at: Date.now() };
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
