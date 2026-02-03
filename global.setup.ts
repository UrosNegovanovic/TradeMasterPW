/**
 * Clerk Testing – global setup.
 * Obavlja clerkSetup() da dobije Testing Token (CLERK_TESTING_TOKEN).
 * Token omogućava bypass Turnstile / bot zaštite u testovima.
 *
 * Ako CLERK_PUBLISHABLE_KEY i CLERK_SECRET_KEY nisu setovani (npr. u CI bez secrets),
 * setup se preskače – CI ne pada, ali registration test neće proći bez ključeva.
 */
import { clerkSetup } from '@clerk/testing/playwright';

export default async function globalSetup() {
  const hasKeys =
    process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY;
  if (!hasKeys) {
    console.log(
      '[Clerk] CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY not set – skipping clerkSetup (registration test will fail without them).'
    );
    return;
  }
  await clerkSetup();
}
