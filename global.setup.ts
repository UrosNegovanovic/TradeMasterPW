/**
 * Clerk Testing – global setup.
 * clerkSetup() fetches a Testing Token (bypasses bot protection) using the Clerk Development keys.
 * Skipped when keys are missing, so public tests can still run.
 */
import { clerkSetup } from '@clerk/testing/playwright';
import { env, hasClerkKeys } from './config/env';

export default async function globalSetup() {
  if (!hasClerkKeys()) {
    console.log('[Clerk] publishable/secret key not set – skipping clerkSetup (auth-dependent tests will skip).');
    return;
  }
  // clerkSetup reads CLERK_PUBLISHABLE_KEY; map the Next.js name if that is what .env has.
  process.env.CLERK_PUBLISHABLE_KEY ??= env.clerkPublishableKey;
  await clerkSetup();
}
