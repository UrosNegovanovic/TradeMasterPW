# TradeMasterPW

End-to-end (E2E) test suite for **TradeMaster** – a B2B inventory app – using [Playwright](https://playwright.dev/) and a **Page Object Model (POM)** with custom fixtures.

- **Target app:** [TradeMaster](https://trade-master-seven.vercel.app/) (Next.js 14, Clerk auth)
- **Language:** TypeScript
- **Framework:** Playwright (Chrome)
- **Auth in tests:** Clerk Test Mode + optional [Clerk Testing Token](https://clerk.com/docs/testing/playwright/overview) for registration (Turnstile bypass)

---

## Project structure

```
TradeMasterPW/
├── fixture/          # Custom Playwright fixtures (homePage, signInPage, signUpPage)
├── pages/            # Page Object Model (BasePage, HomePage, SignInPage, SignUpPage)
├── tests/            # Specs: home, auth (login), registration
├── global.setup.ts   # Clerk testing token setup (optional; skips if keys missing)
├── playwright.config.ts
└── package.json
```

---

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/UrosNegovanovic/TradeMasterPW.git
   cd TradeMasterPW
   npm install
   ```

2. **Install browsers** (once)

   ```bash
   npx playwright install
   ```

3. **Optional – for registration tests**

   Registration uses Clerk’s Testing Token (Turnstile bypass). Create a `.env` in the project root (see `.env.example`) and set:

   - `CLERK_PUBLISHABLE_KEY` – from [Clerk Dashboard](https://dashboard.clerk.com) → your app → API Keys (dev)
   - `CLERK_SECRET_KEY` – same place (secret key, dev)

   Without these, **home** and **auth** tests still run; **registration** will fail when it needs the token.

---

## Running tests

```bash
# All tests (Chrome)
npx playwright test

# Headed (see browser)
npx playwright test --headed

# Single file
npx playwright test tests/home.spec.ts
npx playwright test tests/auth.spec.ts
npx playwright test tests/registration.spec.ts

# Report
npx playwright show-report
```

---

## CI (GitHub Actions)

Tests run on **push** and **pull_request** to `main` / `master`.

- **Without secrets:** Global setup skips Clerk; `home` and `auth` tests run; `registration` fails (missing token).
- **With secrets:** In the repo **Settings → Secrets and variables → Actions**, add:
  - `CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`  
  Then all tests, including registration, can use the Clerk Testing Token.

---

## Tests overview

| Spec               | What it does                                      |
|--------------------|---------------------------------------------------|
| `home.spec.ts`     | Landing page: hero text, Sign In, Get Started    |
| `auth.spec.ts`     | Login with Clerk test user + OTP `424242`         |
| `registration.spec.ts` | Sign up (random email), Turnstile bypass, OTP, redirect to dashboard |

---

## License

ISC
