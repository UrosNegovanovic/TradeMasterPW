# ROADMAP — TradeMasterPW

Evidencija koraka. Status: `[ ]` na čekanju, `[~]` u toku, `[x]` gotovo. Posle svakog koraka upiši datum i kratku belešku.
Izvori: `CLAUDE.md` (pravila), `PLAYWRIGHT_AQA_BRIEF.md` (domen i ID-evi testova).

## Faza 0 — Bezbednost i higijena
- [x] 0.1 Kredencijale (email, lozinka, OTP) premestiti iz specova u env (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_OTP`)
- [x] 0.2 Ažurirati `.env.example` i `.gitignore` (`.playwright-mcp/`, `log/`, `browserstack.yml`, `playwright/.auth/`, Postman fajlovi)
- [ ] 0.3 **(ručno, korisnik)** Rotirati lozinku test korisnika u Clerk Dev instanci
- [ ] 0.4 Odluka o čišćenju git istorije (lozinka je u commit-u `f1025cf`) — samo uz izričitu potvrdu
- [~] 0.5 (samo ignorisano u .gitignore; fajlovi još fizički u repou) Izmestiti ili ignorisati nepovezane fajlove (Setvi/Postman, `api-verification/`, `posao.md`, `resenje.md`, `Plan.md`, `komande.md`)

## Faza 1 — Scaffold
- [x] 1.1 `config/env.ts`: validacija env varijabli (bez zod-a) + guard protiv produkcije
- [x] 1.2 `playwright.config.ts`: `BASE_URL` iz env, `locale sr-RS`, `timezoneId Europe/Belgrade`, trace/screenshot/video politika, reporteri (html + list/json), projekti `setup` + `chromium-desktop` (+ `chromium-mobile`)
- [x] 1.3 `tests/setup/auth.setup.ts`: prijava preko `@clerk/testing` → `playwright/.auth/user.json`
- [x] 1.4 Fixtures bez `baseURL` u POM-u (`page.goto('/path')`)
- [x] 1.5 `test-data/copy.ts` (srpski tekstovi na jednom mestu)
- [x] 1.6 `npm` skripte: `typecheck`, `test:setup` (`test:smoke`/`test:api` stižu u Fazi 3); `tsc --noEmit` čist
- [x] 1.7 Provera: setup projekat zelen 3x zaredom

## Faza 2 — Popravka postojećih testova
- [x] 2.1 `HomePage` + `home.spec.ts` na srpski UI (potvrditi locatore MCP-om)
- [x] 2.2 `SignInPage`/`auth.spec.ts` (AU-01, AU-02) bez hardkodovanih podataka
- [x] 2.3 `SignUpPage`: ruta `/sign-up`, ukloniti Turnstile hack-ove, `registration.spec.ts`
- [x] 2.4 `dashboard-nav.spec.ts` → parametrizovani testovi (SM-06), bez sleep-ova, desktop sidebar + mobilni „Više"
- [x] 2.5 `browserstack-galaxy-s24.spec.ts` ažuriran (koristi `signInLink`)

## Faza 3 — Smoke + bezbednost API (P0)
- [x] 3.1 Smoke SM-01..SM-07
- [x] 3.2 `apiClient` fixture (Bearer token iz Clerk sesije, lazy `GET /api/profile`)
- [x] 3.3 SEC-01 (401 parametrizovano), SEC-02 (IDOR, drugi korisnik), SEC-05
- [x] 3.4 Prvi zeleni CI (smoke + SEC): smoke gate → regression zeleno na PR #1 (secrets/vars postavljeni preko `gh`)

## Faza 4 — Asortiman i Magacin
- [x] 4.1 `InventoryPage`, `WarehousePage`, komponente (Toast, ConfirmDialog, Select)
- [x] 4.2 `seedProduct` fixture sa auto-cleanup
- [x] 4.3 PR-01..PR-04, PR-10, PR-11 (+PR-12 API deo)
- [x] 4.4 WH-01..WH-04, WH-07

## Faza 5 — Fakture (najveći rizik)
- [x] 5.1 `InvoiceFormPage`, `InvoicePage`
- [x] 5.2 IN-01..IN-04 (kreiranje, lager, validacije)
- [x] 5.3 IN-05..IN-09 (PDV, status tok, brisanje, snapshot regresija)
- [~] 5.4 IN-15 ✓, IN-11 ✓ (API + UI javna stranica), IN-12 ~ (preuzimanje PDF-a i %PDF magic bytes; sadržaj č/ć/đ i IPS QR čekaju pdf parser), IN-13 ✓ (CSV/XLSX preko API-ja; UI izvoz nije), IN-14 → Faza 6 (Kupci)

## Faza 6 — Katalozi, Finansije, Podešavanja, Kupci, Dashboard
- [x] 6.1 CA-01..CA-12 (CA-06/07 privatnost i 410 logika: API; CA-03 redosled: javni link i pregled vlasnika; CA-09 pretraga i paginacija; kategorijski filter nije pokriven)
- [~] 6.2 FI-01..04 ✓, SE-01, 03, 05 ✓ (SE-02 logo upload i SE-04 IPS QR nisu: traže upload u storage i pdf parser), CL-01..03 ✓, DB-01..03 ✓

## Faza 7 — SQL / DB testovi
- [ ] 7.1 `utils/db.ts` sa `TEST_DATABASE_URL` guardom (nikad produkcija)
- [ ] 7.2 AU-04 istek pristupa (DB fixture)
- [ ] 7.3 Konzistentnost lagera i `stock_movements`, snapshot stavki fakture

## Faza 8 — Kvalitet i CI/CD
- [x] 8.1 Mobilni projekat (Pixel 5) postoji; RS-01: bez horizontalnog skrola na svih 8 stranica + kreiranje proizvoda na telefonu (`responsive.mobile.spec.ts`). Tablet nije pokriven
- [x] 8.2 A11y (`@axe-core/playwright`) AX-01 (javne + prijavljene stranice, dijalog proizvoda, forma fakture; 4 poznata pada kao `test.fail`, BUG-020..022). AX-02 (tastatura, fokus u dijalozima) nije urađen
- [x] 8.3 Landing/SEO LA-01..LA-05; LA-06 `test.fixme` (BUG-023); LA-04 mobilni u `landing.mobile.spec.ts`
- [~] 8.4 CI: npm keš već postojao; dodati keš Playwright browsera, ESLint (`eslint-plugin-playwright`, pravila iz CLAUDE.md) i lint gate u smoke jobu. Sharding namerno ne (deljeni tenanti, `workers: 1`)
- [ ] 8.5 Percy / BrowserStack: zadržati ili ukloniti (odluka)

## Dnevnik
| Datum | Korak | Beleška |
|---|---|---|
| 2026-10-05 | — | Analiza projekta, kreirani `CLAUDE.md` i `ROADMAP.md` |
| 2026-10-05 | 0.1, 0.2 | Kredencijali uklonjeni iz specova (`config/env.ts` + `.env`), `.env.example` i `.gitignore` ažurirani. Lozinka je i dalje u git istoriji (0.3/0.4 otvoreni) |
| 2026-10-05 | 1.1–1.7 | `config/env.ts`, novi `playwright.config.ts` (projekti setup/chromium-public/chromium-desktop), `tests/setup/auth.setup.ts` preko `clerk.signIn({emailAddress})` (password+OTP strategija nije davala sesiju), `fixture/` → `fixtures/`, POM bez baseURL, `test-data/copy.ts`, `tsconfig.json`, `npm run typecheck`. Setup zelen 3x, tsc čist |
| 2026-10-05 | — | Otvoreno: `home`/`registration`/`dashboard-nav`/`auth` još asertuju engleski UI (Faza 2) |
| 2026-10-05 | 2.1–2.5 | POM i specovi prebačeni na srpski UI, `NAV_ITEMS` u `copy.ts`, nav test parametrizovan (desktop sidebar + mobilni tab bar/„Više"), novi `chromium-mobile` projekat. 22/22 zeleno; 6 od 7 punih prolaza zeleno, 1 prolaz imao 2 pada na UI loginu (AU-01/02, `toHaveURL`), nije reprodukovan u 4+8 ponavljanja. **Otvoren rizik**: fleki pri paralelnom UI loginu istog korisnika (sumnja: Clerk Dev rate limit) |
| 2026-10-05 | — | Nalaz: nov korisnik posle registracije ide na `/settings` (ne `/dashboard`); AU-03 asertuje to ponašanje. Registracija pravi nove Clerk korisnike u Dev instanci bez čišćenja (TODO: brisanje preko Clerk Backend API) |
| 2026-10-05 | 3.1–3.3 | Folderi `tests/{public,app,smoke,api,setup}`, projekat `api`, drugi korisnik B (kreira se preko Clerk Backend API), `ApiClient` (Bearer iz Clerk sesije, TTL 40s), `Seeder` sa auto-cleanup, SM-01..07, SEC-01 (19 endpointa + loš token), SEC-05, SEC-02 (proizvodi/klijenti/katalozi). 61/61 zeleno u 3 uzastopna prolaza, `test:smoke` 52 testa ~17s, bez ostataka u bazi |
| 2026-10-05 | — | Nalazi API-ja: `GET /api/products/{id}` i `GET /api/clients/{id}` → 405 (brief ih navodi); cross-tenant daje 403 (proizvodi, katalozi) ili 404 (klijenti) – ID postojanje se otkriva razlikom; `POST /api/catalogs` traži `discount` (400 bez njega) i vraća 200, ne 201 |
| 2026-10-05 | — | `PRODUCTION_HOSTS` je sada env (prazan dok je aplikacija u testu); dodati kupljeni domen pri lansiranju |
| 2026-10-05 | 4.1–4.4 | `InventoryPage`, `WarehousePage`, `fixtures/index.ts` (mergeTests: pages + api + seed), `utils/validation.ts` (`expectRejected`), `Seeder.trackProductBySku`. UI: PR-01..PR-04 (10 testova), WH-01..WH-04, WH-07; API: `products.spec.ts` (PR-02/04/10/11/12) i `stock-movements.spec.ts` (WH-01..05). Ukupno 96/96 zeleno u 3 uzastopna prolaza, 0 ostataka u bazi |
| 2026-10-05 | — | Nalazi: (1) duplikat SKU na `POST /api/products` → 200 i **sabira količinu**, ne 409 kao u briefu; (2) "Nedostaje cena" znači prodajna cena = 0, ne nabavna; (3) pri prvom slanju forme browser (min/step/required) blokira polje pre zod poruke, poruke se vide tek na ponovnom slanju; (4) engleski ostaci: "Quantity must be at least 1", toast "CREATED", dijalog brisanja ("Delete Product", "Cancel", "Delete"); (5) Izlaz iznad stanja se blokira bez ikakve poruke korisniku (dijalog ostaje otvoren, nema toasta) – UX rupa, API vraća 400 "Insufficient stock" |
| 2026-10-05 | 5.1–5.4 | Treći tenant (**VAT** korisnik, `E2E_USER_VAT_EMAIL`) + deterministički profili firmi u setup-u (A: PIB, bez PDV-a; VAT: PIB + PDV; B: bez PIB-a). `Seeder.invoice/trackInvoicesByClient` (fakture se brišu pre proizvoda), `seedVat`/`seedB`. POM: `InvoicesPage` (kartica = najunutrašnji `div` sa naslovom i dugmetom „Obriši"), `InvoiceFormPage`, `InvoiceDetailPage`. API: `invoices.spec.ts` (IN-01..06, 08, 09, 10, 15), `invoice-sharing-export.spec.ts` (IN-11, 13, SEC-02 za fakture). UI: `invoices.spec.ts` (IN-01..04, 07, 08, 11, 12, 16), `invoices-vat.spec.ts` (IN-05). 149/149 zeleno u 6 uzastopnih prolaza na kraju, 0 ostataka u bazi za A/B/VAT |
| 2026-10-05 | — | Nalazi (Faza 5): (1) broj fakture je `NN/YYYY` (npr. `01/2026`), ne `YYYY-NNN` iz briefa; niz je max+1 po firmi i godini; (2) **`PUT /api/products/{id}` bez `quantity` tiho resetuje lager na 1** (UI forma uvek šalje količinu, ali bilo koji drugi klijent gubi stanje); (3) nacrt takođe traži PIB firme (brief: samo izdavanje); (4) forma „Sačuvaj fakturu" odmah izdaje fakturu (nema nacrta u UI), a manjak lagera je lepo rešen: „Manjak N kom (na stanju M)", baner i onemogućeno dugme; (5) aplikacija ima funkcije van briefa: **Predračuni** (`documentType`, tab), **Otpremnica** i **XML za SEF** dugmad na detalju fakture (brief navodi SEF kao van opsega) – treba odluka da li ih pokrivamo; (6) javni link za opozvanu fakturu kaže „Dokument nije dostupan" (ne „Faktura…"); (7) toast brisanja je „Dokument je obrisan" |
| 2026-10-05 | — | **Fleki (otvoreno):** u ~20 punih prolaza zabeležena 4 prolaza sa padovima: AU-01/AU-02 zaglavljeni na `/sign-in/factor-two`, AU-03 `toHaveURL`, jedan `expect(...).toBe('8')` sa `'0'` (test nije identifikovan), jednom API IN-03 (faktura sa istim kupcem postojala posle 400). Nijedan se nije reprodukovao u izolovanim ponavljanjima (PR-03 ×25, IN-03 ×8). Mitigacija: AU-01/02 serijski (hipoteza, nije dokazana). CI ima retries 2 |
| 2026-10-05 | — | Nalazi iz Faza 4 i 5 sakupljeni u `BUGS.md` (BUG-001..012) sa koracima za reprodukciju; deo je "Potvrđeno", deo "Pitanje" (odluka vlasnika proizvoda) |
| 2026-10-05 | 6.1–6.2 | Kataloge pokrivaju `tests/api/catalogs.spec.ts` (20: CA-01/02/04/05/06/07/08/11; allow-lista polja javnog DTO-a), `tests/app/catalogs.spec.ts` + `catalog-public.spec.ts` (CA-01/02/03/05/07/08/09/10/11/12). Novi tenanti `fin` (PDV firma), `dash`, `settings` (`config/tenants.ts`, fixture `as('<tenant>')`, `purgeTenant`) za testove sa egzaktnim iznosima i izmenom profila: `finance.spec.ts` (5), `dashboard.spec.ts` (6), `settings.spec.ts` (5), `clients.spec.ts` (6). POM: Catalogs*, PublicCatalogPage, FinancePage, ClientsPage, SettingsPage. 209/209 zeleno u 4 uzastopna prolaza, ~73 s, 0 ostataka u svih 6 tenanata |
| 2026-10-05 | — | **Uzrok ranijih fleki-padova pronađen: bio je u testovima.** `uniqueId()` (Date.now + brojač po workeru) davao je isti SKU u dva workera u istoj milisekundi, a `POST /api/products` spaja isti SKU. Dodat slučajan deo. Ostaje samo Clerk-UI rizik (AU-01/02/03) koji se u poslednjih 8 punih prolaza nije ponovio |
| 2026-10-05 | — | Novi nalazi u `BUGS.md`: BUG-013 (prazan javni link kataloga ~7 s zbog 4 retry-ja na 404), BUG-014 (engleski u katalozima), BUG-016 (žiro-račun se ne validira), BUG-017 (procenti sa tačkom), BUG-018 (gramatika na Početnoj) |
| 2026-10-06 | 3.4 | GitHub secrets (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`) i var `BASE_URL` postavljeni preko `gh` iz lokalnog `.env` (lozinka **nije** rotirana, 0.3 i dalje otvoren; repo je javan). Posao Faza 1–6 commitovan na granu `claude/project-thread-0ghwd8`, draft PR #1. Prvi run: smoke 60/60 zeleno, regression 4 pada: CA-02b, IN-16, WH-04a, WH-04c su lokalno prolazili samo zato što su paralelni workeri već napravili proizvode; uz `workers: 1` tenant je prazan i forma prikazuje prazno stanje. Dodat `seed.product()`. Drugi run: smoke 60/60, regression 206/206 (3 flaky, prošli na retry: CA-02c, WH-01, API IN-04, svi na proveri `/api/profile` / 401, sumnja na istek Clerk tokena u `ApiClient` TTL-u, otvoreno) |
| 2026-10-06 | — | Flaky `ApiClient` token: uzrok najverovatnije u tome što Clerk `getToken()` vraća keširan token koji je već blizu isteka, a mi smo ga držali još 40 s. Sada `getToken({ skipCache: true })` i ponovna upotreba samo dok do `exp` ostaje više od 20 s (`fixtures/api.ts`). API projekat 107/107 zeleno; potvrda na CI-ju čeka |
| 2026-10-06 | 8.2, 8.3 | `utils/a11y.ts` (axe, pad na critical/serious, prilog `axe-violations.json`), `tests/public/a11y.spec.ts` (5 stranica čisto), `tests/app/a11y.spec.ts` (8 stranica + dijalog proizvoda + forma fakture; Asortiman, Magacin, Katalozi i dijalog proizvoda imaju prave nalaze → `test.fail`, BUG-020..022). `landing.spec.ts` (LA-01 FAQ + CTA, LA-02 cenovnik bez obećanja naplate, LA-03 titlovi, LA-05 meta/OG/canonical, LA-06 `fixme`, BUG-023), `landing.mobile.spec.ts` (LA-04). 69 prošlo, 6 preskočeno u 3 uzastopna prolaza |
| 2026-10-06 | 8.1 | `tests/app/responsive.mobile.spec.ts`: 8 provera skrola + kreiranje proizvoda (na telefonu je lista kartica, ne tabela, pa se traži `listitem`). 33/33 u 3 prolaza. Tablet i ostali P0 tokovi (fakture) na mobilnom nisu pokriveni |
| 2026-10-06 | 8.4 | ESLint 10 + `typescript-eslint` + `eslint-plugin-playwright` (`eslint.config.mjs`, `npm run lint`): 0 grešaka, 25 upozorenja (networkidle, uslovi u testu, preskočeni testovi). **TypeScript vraćen sa 7 na 6** (`typescript@npm:@typescript/typescript6`) jer `typescript-eslint` ne podržava TS 7; vratiti na 7 kad podrška stigne. CI: keš `~/.cache/ms-playwright` i `lint` korak; čeka zeleni run |
