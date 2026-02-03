/**
 * Clerk Testing – global setup.
 * Obavlja clerkSetup() da dobije Testing Token (CLERK_TESTING_TOKEN).
 * Token omogućava bypass Turnstile / bot zaštite u testovima.
 *
 * Potrebno: CLERK_PUBLISHABLE_KEY i CLERK_SECRET_KEY u okruženju (ili .env).
 */
import { clerkSetup } from '@clerk/testing/playwright';

export default async function globalSetup() {
  await clerkSetup();
}
