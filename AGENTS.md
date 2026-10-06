# AGENTS.md — TradeMasterPW

Playwright + TypeScript E2E/API/DB test projekat za **TradeMaster** (lična B2B SaaS aplikacija, Next.js 14 + Clerk + Prisma/Postgres na Supabase, deploy na Vercelu). Ovo je playground: cilj je najmoderniji, čist i pouzdan Playwright projekat (UI + API + SQL).

Izvor istine o aplikaciji: **`PLAYWRIGHT_AQA_BRIEF.md`** (domen, rute, API ugovor, plan testova sa ID-evima SM/AU/PR/WH/IN/CA/FI/SEC...). Pre pisanja testa pročitaj relevantno poglavlje. Stvari označene **[PROVERI]** potvrdi preko Playwright MCP pre asserta.

## Jezik i komunikacija
- Komunikacija sa korisnikom: srpski (latinica). Kod, identifikatori, commit poruke: engleski. Komentari u kodu: engleski.
- UI aplikacije je **na srpskom**. Landing je već prebačen (naslov: „TradeMaster — od barkoda do fakture", linkovi „Prijava", „Registruj se"). Neki delovi dashboarda mogu još biti engleski, proveri uživo.

## Komande
```bash
npm ci && npx playwright install chromium     # setup
npx playwright test                            # sve
npx playwright test tests/x.spec.ts --headed   # jedan fajl
npx playwright test --ui                       # UI mode
npx playwright test --project=<ime>            # jedan projekat
npx playwright show-report
npm run typecheck                              # tsc --noEmit
```
Percy: `npm run test:percy`. BrowserStack: `npm run test:browserstack` (zahteva BROWSERSTACK_* u `.env`).

## Struktura (trenutna)
```
fixtures/test.ts     custom fixtures (homePage, signInPage, signUpPage, dashboardPage)
pages/               POM: BasePage + Home/SignIn/SignUp/Dashboard
tests/               *.spec.ts (home, auth, registration, dashboard-nav, browserstack-galaxy-s24)
global.setup.ts      clerkSetup() (preskače se bez ključeva)
config/env.ts        env + guard protiv produkcije
tests/setup/         auth.setup.ts (clerk.signIn emailAddress, korisnik A i B -> playwright/.auth/*.json)
tests/{public,app,smoke,api}/  public = bez prijave, app = prijavljen (desktop; *.mobile.spec.ts i dashboard-nav idu i na mobilni), api = request-only
fixtures/index.ts    spojeni test: page objekti + api/apiB (Bearer) + seed (auto-cleanup); importuj odavde
utils/               api-client, api-helpers (invoiceBody, quantityOf...), seed (Seeder), validation (expectRejected), money (formatMoney, labelledAmount)
test-data/copy.ts    srpski UI tekstovi
api-verification/    ostatak drugog zadatka (Setvi/Postman), NIJE vezano za TradeMaster
```
Ciljna struktura je u sekciji „Ciljna arhitektura" ispod. Novi kod piši prema ciljnoj, ne proširuj loše obrasce.

## Test korisnici (Clerk Dev, tenant-izolovani)
- **A** (`E2E_USER_EMAIL`): firma sa PIB-om, bez PDV-a; default `storageState` za `app/` testove, fixture `api`/`seed`.
- **VAT** (`E2E_USER_VAT_EMAIL`): firma u sistemu PDV-a; `test.use({ storageState: STORAGE_STATE_VAT })`, fixture `apiVat`/`seedVat`.
- **B** (`E2E_USER_B_EMAIL`): bez PIB-a (testovi „bez PIB-a" i IDOR napadač); `apiB`/`seedB`.
- **fin** (PDV firma), **dash** (firma bez PDV-a), **settings** (bez firme): `config/tenants.ts`, `as('fin')` u testu daje `{ api, seed }`; `test.use({ storageState: tenantStorageState('fin') })`. Testovi koji tvrde egzaktne iznose ili menjaju profil firme idu ovde, `serial`, i počinju sa `purgeTenant(api)`.
Profili se postavljaju u `tests/setup/auth.setup.ts`. Test koji menja profil firme (npr. SE-03 uključivanje PDV-a) mora da koristi **poseban** tenant, ne ove tri.

## Tvrda pravila (ne krši)
1. **Nikad kredencijale u kodu ili gitu.** Email/lozinka/OTP idu iz env (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`). `.env` je gitignored; nikad ne ispisuj njegove vrednosti.
2. Testovi ciljaju **Clerk Development** instancu i **zasebnu test bazu**. Produkcija = samo read-only smoke, bez kreiranja podataka. Nikad `prisma migrate deploy` ni izmena šeme odavde. SQL fixture (npr. istek pristupa) samo preko `TEST_DATABASE_URL` uz guard.
3. Bez `waitForTimeout` / `setTimeout` sleep-ova. Čekaj response, toast ili stanje elementa (web-first asserti).
4. Bez `if (...) return` / `.catch(() => {})` koji guta greške u testovima. Test ili asertuje ili je `test.skip` sa razlogom.
5. Locatori: `getByRole` > `getByLabel` > `getByPlaceholder` > `getByText`. U aplikaciji nema `data-testid` (predloži u app repou, ne menjaj odavde). Bez CSS/XPath osim za Radix/Sonner (`[data-sonner-toast]`).
6. Tekstovi UI-ja i regexi žive na jednom mestu (`test-data/copy.ts`), ne razbacani po specovima.
7. Svaki test sam kreira i čisti svoje podatke. Identifikatori samo preko `uniqueId()` (ima slučajan deo): `POST /api/products` spaja isti SKU, pa sudar u dva workera tiho kvari testove. Fakture se brišu pre proizvoda (vraćaju lager).
8. Deljeno stanje po korisniku (lager, brojevi faktura) → paralelizam samo uz korisnika po workeru ili `serial`. CI `workers: 1` dok to ne postoji.
9. Mrežne zavisnosti (`/api/products/fetch-by-barcode`) uvek mock-uj sa `page.route`.
10. Asertuj format, ne konkretne vrednosti za dinamičke stvari (broj fakture `^\d{4}-\d{3}$`). Novac u srpskom formatu (`1.000,00`) kroz `utils/money.ts`.
11. Git: commit samo kad korisnik traži; identitet je korisnikov (`Uros035`), bez Cursor co-authora (vidi `.cursor/rules/git-identity.mdc`).
12. Definicija gotovog: deterministički (3 uzastopna zelena run-a), typecheck čist, bez sleep-ova, sam čisti podatke.

## Poznato stanje / dugovi (stanje na 2026-10-05)
- **Testovi su zastareli**: asertuju engleski UI („Simplify Your Wholesale Business", „Sign In", „Get Started", „Inventory", „Catalogs"…), a živa aplikacija je srpska. `home`, `registration`, `dashboard-nav` će padati dok se ne ažuriraju (potvrđeno MCP-om na landingu).
- **Kredencijali hardkodovani i commitovani** u `tests/auth.spec.ts` i `tests/registration.spec.ts` (lozinka + lični gmail), već su u git istoriji. Premesti u env, rotiraj lozinku test korisnika; razmotriti čišćenje istorije.
- `baseURL` hardkodovan na 3 mesta (`playwright.config.ts`, `fixture/test.ts`, `browserstack.yml`); BASE_URL treba iz env.
- Login kroz UI u svakom testu (sporo, krhko) umesto `storageState` iz setup projekta.
- `SignUpPage.navigate()` ide na `/Get Started` (pogrešna ruta, treba `/sign-up`); Turnstile logika sa mouse-move hack-ovima je suvišna uz `@clerk/testing`.
- `dashboard-nav.spec.ts`: `setTimeout(2000)`, `.catch(() => {})`, jedan test-petlja umesto parametrizovanih testova, screenshot u fajl sistem umesto `testInfo.attach`.
- Samo jedan projekat (`Google Chrome`, `channel: 'chrome'`) bez mobilnog; nema `trace/screenshot/video` politike osim trace on-first-retry; reporter samo `html`.
- Nema typecheck-a, lintera, API ni DB testova, nema `.env` validacije.
- CI: nema keširanja, nema `BASE_URL`/test-user secret-a, ne radi sharding, nema odvojenog smoke job-a.
- Repo smeće: `Setvi-Task.postman_collection*.json` (+ duplikat „(1)"), `api-verification/`, `posao.md`, `resenje.md`, `Plan.md`, `komande.md`, `fix-first-commit.ps1`, `log/`, `.playwright-mcp/`, `browserstack.yml` sa placeholder kredencijalima. Treba ih izmestiti/ignorisati.

## Ciljna arhitektura
```
playwright.config.ts          projekti: setup, chromium-desktop, chromium-mobile (Pixel 5), api, [smoke]
.env.example                  BASE_URL, E2E_USER_EMAIL/PASSWORD, CLERK_*, TEST_DATABASE_URL
config/env.ts                 env varijable + guard protiv produkcije (već postoji)
tests/
  setup/auth.setup.ts         clerk.signIn -> playwright/.auth/user.json
  smoke/ auth/ inventory/ warehouse/ invoices/ catalogs/ clients/ finance/ settings/ landing/
  api/                        request-only: contracts, security (401/IDOR/DTO leak), idempotency
  db/                         SQL provere nad TEST bazom (lager konzistentnost, snapshot fakture)
  a11y/                       @axe-core/playwright
pages/                        POM + components/ (Sidebar, MobileNav, Toast, ConfirmDialog, ProductPicker)
fixtures/                     test.extend: pages, apiClient (Bearer), seed (product/invoice) + auto cleanup, db
test-data/                    copy.ts (srpski tekstovi), factories.ts (proizvod, kupac, žiro-račun sa validnom kontrolnom cifrom)
utils/                        money.ts, pdf.ts, xlsx.ts, db.ts (samo test baza)
```
Redosled implementacije: brief sekcija 12 (scaffold → smoke + SEC → Asortiman/Magacin → Fakture → Katalozi → ostalo).

## Konvencije koda
- TypeScript strict; POM klase nasleđuju `BasePage`; locatori kao `readonly` getteri/propertiji, **bez asserta u POM-u osim `verify*` metoda**; POM ne zna za testove.
- Fixture-i vraćaju spremne objekte; `baseURL` dolazi iz Playwright config-a (`page.goto('/path')`), POM ne prima baseURL.
- Imenovanje: `kebab-case.spec.ts`, `PascalCase` POM klase, test naslovi sa ID-em iz briefa: `test('IN-02 draft does not touch stock', ...)`. Tagovi: `@smoke`, `@p0`, `@api`, `@mobile`.
- `test.step` za čitljiv trace; `expect.soft` samo za nezavisne provere.
- Komentari objašnjavaju *zašto* (Clerk, Radix, timezone), ne *šta*.
- Radix `Select` i cmdk: klik na trigger pa `getByRole('option')`. Potvrde: `getByRole('dialog')`.
- Timezone `Europe/Belgrade`, `locale: 'sr-RS'` u configu.

## Korišćenje MCP Playwright
Koristi ga za istraživanje UI-ja (snapshot, locatori, tekstovi) **pre** pisanja POM-a, i za potvrdu **[PROVERI]** stavki. Ne koristi ga kao zamenu za test; ništa što MCP kreira (`.playwright-mcp/`) ne ulazi u git. Na produkciji samo čitaj, ne kreiraj podatke.

## Kako radim sa korisnikom
- Kratko predloži, pa radi; za nepovratne akcije (brisanje istorije, force push, rotacija ključeva, promena CI secrets) prvo pitaj.
- Posle izmene pokreni relevantne testove i `tsc --noEmit`; prijavi stvarni ishod, uključujući padove.
- Bug u aplikaciji nađen testom: prijavi korisniku sa dokazom (korak, očekivano, stvarno), ne zaobilazi asertom.
