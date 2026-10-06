# TradeMaster — Playwright AQA Brief

Dokument za Claude u novom Playwright projektu. Sadrži sve što treba da bi se napisali E2E/API testovi za TradeMaster bez ponovnog istraživanja koda aplikacije.

- Izvor: analiza repoa `C:\Dev\TradeMaster` (CLAUDE.md, docs/*, src/app, src/lib/validations.ts, UI komponente), 2026-10-05.
- UI je na srpskom (latinica), kod i komentari na engleskom. **Locatori i očekivani tekstovi u testovima su na srpskom.**
- Stvari koje nisam mogao da potvrdim iz koda označene su sa **[PROVERI]**. Pre pisanja testa otvori stranicu (Playwright MCP / `codegen`) i potvrdi tačan tekst ili locator.

---

## 1. Šta je aplikacija

B2B SaaS za srpske veletrgovce i male magacine. PWA (nema App Store / Play). Produkcija na Vercelu.

Glavni tok proizvoda: `sken → asortiman → magacin → katalog → faktura → finansije`.

Stack: Next.js 14 App Router, TypeScript, Tailwind + shadcn/ui (Radix), TanStack Query, **Clerk** (auth, lokalizacija `sr-RS`), Prisma + PostgreSQL (Supabase), Zod, Sonner (toast), `@react-pdf/renderer`, `html5-qrcode`.

Van opsega (ne testirati, ne postoji): SEF e-fakturisanje, fiskalna kasa, checkout/plaćanje, više korisnika po firmi, offline rad, javna prodavnica.

---

## 2. Okruženja i bezbednosna pravila za testove

| Okruženje | Svrha |
|---|---|
| `http://localhost:3000` (`npm run dev` ili `npm run build && npm start`) | Primarno za razvoj testova |
| Vercel Preview | Opciono, CI smoke |
| Produkcija | **Samo read-only smoke (landing, javni linkovi). Nikad ne kreirati podatke.** |

**Tvrda pravila:**
1. Nikad ne koristiti produkcijsku bazu ni produkcijske Clerk ključeve. Testovi ciljaju **Clerk Development instancu** i **zasebnu test bazu**. Za DB testove repo već ima `TEST_DATABASE_URL` zaštitu; koristiti isti princip.
2. Ne commitovati ključeve (`sk_`, service role), lozinke, stvarne PIB-ove ili lične podatke. Test kredencijali idu u `.env.e2e` (gitignore) i CI secrets.
3. Podaci su tenant-izolovani po Clerk korisniku (`Profile.clerkUserId` je unique, jedan korisnik = jedna firma). Svaki worker/suite mora imati **svog test korisnika** ili strogo serijski rad nad jednim, inače se testovi međusobno kvare (lager, brojevi faktura `YYYY-NNN`).
4. Test PIB-ovi: koristiti očigledno lažne 9-cifrene brojeve (npr. `123456789`). Žiro-račun mora imati validnu kontrolnu cifru da bi se pojavio IPS QR (vidi 8.4), generisati ga u helperu, ne hardkodovati stvaran.

Env promenljive potrebne aplikaciji pri pokretanju (vrednosti ne ulaze u repo): `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (upload slika), `NEXT_PUBLIC_APP_URL`. Opciono: `NEXT_PUBLIC_ANALYTICS`, `NEXT_PUBLIC_SENTRY_DSN`, `UPSTASH_*` (rate limit).

> Bez `CLERK_SECRET_KEY` middleware pušta samo javne rute, a sve ostalo redirektuje na `/`. To je korisno za "no-auth smoke" projekat, ali ne za testiranje dashboard-a.

---

## 3. Autentifikacija (najkritičnije za setup)

Clerk štiti sve HTML stranice osim javnih; API rute vraćaju JSON `401 {"error":"Unauthorized"}` (ne redirect).

**Preporučena strategija:**
- Paket `@clerk/testing` (`clerkSetup()` u global setup, `setupClerkTestingToken({ page })` u testu, `clerk.signIn(...)`) na Development instanci. Zaobilazi bot zaštitu bez lažnog UI logina.
- Jednom se prijaviti u `auth.setup.ts` projektu, sačuvati `storageState` u `playwright/.auth/user.json` (gitignore) i koristiti ga u svim ostalim projektima (`dependencies: ['setup']`).
- Poseban prazan "novi korisnik" za onboarding testove i poseban za "istekao pristup".
- Alternativa za API testove: uzeti Clerk session JWT iz browser konteksta i slati kao `Authorization: Bearer <token>` (aplikacija sama tako zove API preko `authorizedFetch`).

**Profil se kreira lenjo:** `GET /api/profile` pravi `Profile`. Dok se to ne desi, svaki drugi API vraća `404 {"error":"Profile not found"}`. Dashboard to poziva pri učitavanju, pa se u UI-ju ne vidi. U API testovima prvo pozovi `GET /api/profile`.

**Pristup (billing):** novi profil dobija 60 dana (`accessExpiresAt`). `NULL` = bez limita. Istekao nalog je **read-only**: svaki write API vraća `402 {"code":"ACCESS_EXPIRED"}`. Za test isteka treba direktan DB update na test bazi (`UPDATE profiles SET "accessExpiresAt" = now() - interval '1 day' WHERE ...`) kroz fixture, nikad na produkciji.

Rute auth stranica: `/sign-in`, `/sign-up` (Clerk komponente, srpska lokalizacija). Posle prijave redirect na `/dashboard`. Selektori Clerk forme **[PROVERI]** (preferirati `clerk.signIn` helper umesto UI logina).

---

## 4. Mapa ruta

### Javne (bez prijave)
| Ruta | Sadržaj |
|---|---|
| `/` | Landing (hero, FAQ, demo video, cenovnik "60 dana besplatno pa 20 EUR/mesec", dugme "Prijava", CTA "Otvori nalog i podesi firmu") |
| `/privatnost`, `/uslovi` (+ `/privacy`, `/terms`) | Pravni dokumenti |
| `/sign-in`, `/sign-up` | Clerk |
| `/shared/catalog/[id]` | Javni katalog (pretraga, filter kategorija, paginacija 12/24/48) |
| `/shared/invoice/[token]` | Javni prikaz fakture za kupca |
| `/api/public/catalogs/[id]`, `/api/shared/catalog/[token]`, `/api/shared/invoice/[token]` | JSON za gornje stranice |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/sw.js` | SEO/PWA |

Izvor istine za javne rute: `src/lib/route-access.ts`.

### Zaštićene (Clerk)
| Ruta | Navigacija | Naslov |
|---|---|---|
| `/dashboard` | Početna | Početna (kartice, "Prvi koraci", brzi sken, instalacija PWA) |
| `/inventory` | Asortiman | Asortiman (+ forma proizvoda, uvoz CSV/XLSX) |
| `/warehouse` | Magacin | Magacin (Ulaz robe, Izlaz robe, Trenutno stanje, Istorija kretanja) |
| `/catalogs`, `/catalogs/new`, `/catalogs/[id]`, `/catalogs/[id]/edit` | Katalozi | |
| `/invoices`, `/invoices/new`, `/invoices/[id]`, `/invoices/[id]/edit` | Fakture | |
| `/clients` | Kupci | |
| `/finance` | Finansije | |
| `/settings` | Podešavanja | Pristup + Podaci o firmi |

Desktop: sidebar sa `aria-label="Glavna navigacija"`. Mobilno: donji tab bar (`Početna`, `Asortiman`, `Magacin`) + dugme **"Više"** (`aria-label="Više"`) koje otvara Fakture, Kupci, Katalozi, Finansije, Podešavanja. **Isti test mora znati u kom viewportu je** (vidi 7).

Svaka stranica za novo/izmenu/detalj ima `BackLink` na eksplicitnog roditelja (ne `history.back()`) i forme imaju donje dugme **"Otkaži"**. Forme kataloga i faktura imaju upozorenje o nesačuvanim izmenama (`useUnsavedChangesGuard`): pitanje "Odbaciti nesačuvane izmene?" pri kliku na interni link, browser `beforeunload` pri refreshu.

---

## 5. Domen: pravila koja testovi proveravaju

### 5.1 Proizvod (Asortiman)
- Polja: `name` (obavezno, ≤255), `sku` (obavezno, ≤100), `quantity` (int ≥1 pri kreiranju), `price` (prodajna, **opciono**, prazno = 0, ≥0), `costPrice` (nabavna, **obavezna** u ProductForm), `costPriceZeroReason`, `description` (≤1000), `categoryId`, slika (≤5 MB; JPG/PNG/WEBP/GIF, HEIC odbijen).
- `costPrice = 0` je dozvoljen **samo** uz `costPriceZeroReason` (poruka: "Unesite razlog za nabavnu cenu 0").
- Novac: najviše 2 decimale, max `99999999.99`. `19.99` mora da prođe. Negativno se odbija ("Nabavna cena ne može biti negativna").
- **Quick Scan** (brzi sken) sme da sačuva proizvod **bez** `costPrice`. To nije bug, ne "popravljati" u testu. U listi se prikazuje oznaka "Nedostaje cena".
- Isti SKU: intake ažurira najnoviji red (kreiranje duplikata → API `409 "Product with this SKU already exists"` na ručnom putu). `(profileId, sku)` nije unique u šemi, postoje stari "daily batch" redovi; Magacin sabira količine po SKU. **Ne pisati test koji očekuje unique SKU na nivou baze.**
- Idempotencija: `POST /api/products` čita header `Idempotency-Key`. Isti ključ dva puta = jedan efekat. Nevažeći ključ → `400 "Invalid idempotency key"`.
- Kategorije su po tenantu: `/api/categories`, kreiranje preko dijaloga "Dodaj novu kategoriju" / "Kreiraj kategoriju".
- Uvoz: dijalog u Asortimanu i "Stanje" uvoz u Magacinu, `.csv/.xlsx/.xls`, šablon se preuzima kao `trademaster-asortiman.csv`. Količina `0` je dozvoljena u bulk-adjust, negativna ne.

### 5.2 Magacin
- **Ulaz robe**: povećava `quantity`, upisuje `IN` kretanje, razlog podrazumevano `Ulaz robe`.
- **Izlaz robe**: `OUT`; ne može više od stanja ("Ne može se skinuti više od stanja (N kom)."). API: `400 {"error":"Insufficient stock"}`.
- Validacije forme: "Izaberite proizvod", "Količina mora biti pozitivan broj", "Unesite razlog".
- Lager **nikad ne ide u minus**.
- Asortiman i Magacin prikazuju istu količinu (`products.quantity`); istorija čita `stock_movements` (filter po datumu, "Nema kretanja", "Nema kretanja za izabrane filtere").
- Granica dana je **`Europe/Belgrade`**, ne UTC. Testove sa "danas" raditi sa `timezoneId: 'Europe/Belgrade'` u Playwright kontekstu i izbegavati rad oko ponoći.
- Nizak lager: `/api/warehouse/low-stock`, kartica "Nizak lager" na Početnoj ("Nema proizvoda na minimumu.").

### 5.3 Faktura (interna, nije SEF/fiskalna)
- Status: `DRAFT | UNPAID | PAID` (UI: **Nacrt / Otvoreno / Plaćeno**).
- Broj fakture: `YYYY-NNN` po firmi, dodeljuje se automatski pri čuvanju (placeholder "Dodeljuje se automatski pri čuvanju"). Pod advisory lock-om, dva paralelna kreiranja ne smeju dobiti isti broj.
- Obavezno: ime kupca, rok (`dueDate`), najmanje 1 stavka. PIB kupca: prazan ili **tačno 9 cifara** ("PIB kupca mora imati tačno 9 cifara"). `quantity` ceo broj ≥1. `unitPrice` ≥0, max 2 decimale. `discount` 0–100 (%). `vatRate` ∈ {0, 10, 20}.
- Izdavanje zahteva PIB firme od 9 cifara: inače `400 "Unesite važeći PIB firme od 9 cifara pre izdavanja fakture."`
- **Snapshot**: stavka čuva `unitPrice`, `unitCost`, `quantity`, `productName`. Kasnija izmena proizvoda **ne sme** da promeni staru fakturu. (Važan regresioni test.)
- **PDV**: `Profile.inVatSystem` (Podešavanja, "u sistemu PDV-a"). Izdata faktura snapshot-uje `vatEnabled`, `vatAmount`, `vatRate` po stavci. `unitPrice`/`total` su **bez PDV**; `totalAmount` = za uplatu (osnovica + PDV); osnovica = `totalAmount − vatAmount`. UI: "Osnovica", "PDV 20%", "PDV 10%", "Ukupno za uplatu".
  - Primer: 2 kom × 1000,00 RSD, PDV 20% → osnovica 2.000,00, PDV 400,00, za uplatu 2.400,00. Mešano 10%/20% daje odvojene redove po stopi. Format brojeva u UI: srpski (`1.000,00`) **[PROVERI]**.
- **Lager**: skida se samo pri prelasku `DRAFT → UNPAID/PAID`. Nacrt ne dira lager. `PAID ↔ UNPAID` ne skida ponovo. Izmena stavki izdate fakture usklađuje razliku. Povratak u nacrt, otkazivanje ili brisanje vraća količinu. Nedovoljno stanje → `Nema dovoljno na stanju za „{naziv}“. Traženo: N kom, na stanju: M kom.` Idempotencija po `invoice:<invoiceId>:<productId>`.
- Brisanje: potvrda "Obrisati ovu fakturu?" / "Ova radnja se ne može opozvati." / toast "Faktura je obrisana".
- Plaćanje: toast "Faktura je plaćena" (ide u arhivu plaćenih). Vraćanje: dijalog "Vratiti plaćenu fakturu među otvorene?" → "Vrati" → toast "Faktura je ponovo otvorena".
- Deljenje: opozivi javni link (`shareToken`/`shareEnabled`), samo izdate fakture se serviraju, nacrt ne. WhatsApp/Viber/Mejl dugmad, "Kopiraj link", "Opozovi link". Opozvan link → stranica "Faktura nije dostupna" / "Link je nevažeći ili ga je izdavalac opozvao."
- PDF: `@react-pdf/renderer`, font Liberation Sans (č ć đ š ž ispravni). IPS QR samo za neplaćene fakture kada je žiro-račun firme validan.
- Izvoz za knjigovođu: `GET /api/invoices/export?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv|xlsx`, bez nacrta, nevažan opseg → `400`.

### 5.4 Katalog
- Pravi se od izabranih proizvoda (`productIds` ≥1, bez duplikata; redosled izbora = `sortOrder`). Polja: naziv, klijent, popust 0–100, napomena ≤1000.
- Podešavanja prikaza: `layout` GRID_4 | GRID_12 | LIST, `groupByCategory`, `sortMode` MANUAL | NAME | PRICE_ASC | PRICE_DESC, `showSku`, `showDescription`, `showOriginalPrice`. PDF, pregled vlasnika i javni link renderuju kroz isti `src/lib/catalog-layout.ts`, pa testirati **konzistentnost redosleda/grupisanja** između pregleda i javnog linka.
- Cena 0 prikazuje **"Cena na upit"**.
- **Javni DTO nikad ne sme da sadrži** `costPrice`, lager (`quantity`), ni owner id/`profileId`. SKU/opis se izostavljaju ako ih je vlasnik sakrio. (Najvažniji bezbednosni API test.)
- `/api/public/catalogs/[id]` (po CUID-u) vraća **410** ako `shareEnabled` nije uključen, **404** ako ne postoji. Token ruta `/api/shared/catalog/[token]` radi samo za aktivan token; opozvan token više ne radi.
- Ručni redosled: dugmad "Pomeri gore"/"Pomeri dole".
- Javni UI: pretraga ("Pretraži proizvode…" je u picker-u vlasnika; na javnoj strani postoji pretraga i filter "Sve"), paginacija "12/24/48 po strani", poruka "Nema proizvoda u ovom katalogu." / "Katalog nije pronađen".

### 5.5 Kupci
`/clients`: sačuvani kupci (naziv, PIB tačno 9 cifara, adresa). Biraju se u fakturi i katalogu preko "Sačuvani kupac"; izbor popunjava naziv, PIB i adresu. U katalogu postoji "Sačuvaj kupca u listu".

### 5.6 Finansije
Cash-basis: prihod se knjiži na `paidAt`, otvorene fakture su potraživanja (bruto). Prihod i profit se računaju na **osnovici** (bez PDV), profit iz snapshot-a `unitCost`. Kartice: "Potraživanja", "Prihod ovog meseca", "Profit ovog meseca", "Prihod ove godine", "Profit ove godine", "Prihod po mesecu". Prazno stanje: "Još nema prometa". Upozorenje "Nedostaje nabavna cena" kad plaćena faktura nema kompletne troškove.

### 5.7 Podešavanja
Naziv firme, PIB (9 cifara), Email, Telefon, Žiro-račun, Adresa, logo (upload), "u sistemu PDV-a". Kartica "Pristup" prikazuje stanje pristupa. `PUT /api/profile` radi i kad je nalog istekao.

### 5.8 Pristup / istek
Baner u poslednjih 14 dana: "Pristup ističe …". Posle isteka: "Pristup je istekao {datum}. Aplikacija je u režimu samo za pregled." Dozvoljeno i posle isteka: čitanje, izvoz, PUT profila, opoziv share linkova, javni linkovi već izdatih kataloga/faktura.

### 5.9 Onboarding
Kartica **"Prvi koraci"** na Početnoj (podaci firme, prvi proizvod, prva faktura), izvedena iz podataka. Prazna stanja: "Asortiman je prazan", "Još nema kataloga", "Još nema faktura" sa CTA ka sledećem koraku ("Novi katalog", "Nova faktura", "Dodaj proizvod", "Popuni podatke firme").

### 5.10 Skener
`html5-qrcode` u `BarcodeScanner.tsx` (ne dirati). Dugme `aria-label="Skeniraj proizvod"` (Quick Scan), opcija "Unesi barkod ručno". Pravila (docs/scanner-ux-rules.md): skener je tih, zvuk samo iz QuickScanButton; novi proizvod = oznaka "NOVI PROIZVOD"; ponovljeni sken = "+1"; ponovni isti kod ima cooldown 700 ms; zabranjeni toastovi "Obrada…/duplikat/držite mirno". Svaki sken ima svoj `Idempotency-Key`.
**Kamera se ne automatizuje preko stvarnog hardvera**: Chromium sa `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` (+ opciono `--use-file-for-fake-video-capture=<barcode.y4m>`), ili test preko "Unesi barkod ručno". Stvarni telefon = ručna provera (`docs/device-checklist.md`).

---

## 6. API ugovor (za `request` fixture testove)

Svi zaštićeni endpointi: bez sesije `401 {"error":"Unauthorized"}`; bez profila `404 {"error":"Profile not found"}`; istekao nalog na write-u `402 {"code":"ACCESS_EXPIRED"}`; greška validacije `400`; nepoznat resurs `404`; tuđi resurs `403/404`.

| Endpoint | Metode | Napomene |
|---|---|---|
| `/api/profile` | GET (lenjo kreira), PUT | Radi i kad je istekao |
| `/api/products` | GET, POST | POST: Zod `productIntakeSchema`, `Idempotency-Key`, 409 za duplikat |
| `/api/products/[id]` | GET, PUT, DELETE | PUT: `productSchema` (costPrice obavezan) |
| `/api/products/lookup` | GET | Traženje po SKU/barkodu, rate-limit 40/min |
| `/api/products/fetch-by-barcode` | GET | Spoljne baze, **mock-ovati** (SSRF zaštita, rate-limit 40/min) |
| `/api/products/bulk-adjust` | POST | `{sku, quantity}[]`, quantity ≥0 |
| `/api/categories` | GET, POST | Po tenantu |
| `/api/stock-movements` | GET (filteri), POST | POST: `400 Insufficient stock` |
| `/api/warehouse/low-stock` | GET | |
| `/api/clients`, `/api/clients/[id]` | CRUD | PIB 9 cifara |
| `/api/catalogs`, `/api/catalogs/[id]` | CRUD | `catalogSchema` |
| `/api/catalogs/[id]/share` | POST/DELETE | Uključi/opozovi |
| `/api/invoices`, `/api/invoices/[id]` | GET, POST / GET, PUT, PATCH, DELETE | PATCH `status` pokreće lager |
| `/api/invoices/[id]/share` | POST/DELETE | Samo izdate |
| `/api/invoices/export` | GET | `from,to,format` |
| `/api/uploads` | POST | Multipart, magic-byte provera tipa |
| `/api/public/catalogs/[id]` | GET | Javno, 404/410, rate-limit 60/min |
| `/api/shared/catalog/[token]`, `/api/shared/invoice/[token]` | GET | Javno, rate-limit 60/min |

Tačne oblike tela proveriti u `src/lib/validations.ts` i u route fajlovima pod `src/app/api/**/route.ts` u glavnom repou.

---

## 7. Locatori i UI konvencije

- U kodu **nema `data-testid`** atributa. Strategija: `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`. Ako locator postane krhak, predložiti dodavanje `data-testid` u aplikaciju kao zaseban PR (ne menjati aplikaciju iz test projekta).
- Dostupni `aria-label`: `Glavna navigacija`, `Glavna`, `Više`, `Nalog`, `Na vrh`, `Skeniraj proizvod`, `Traži proizvod`, `Filter po kategorijama`, `Kategorije`, `Proizvodi`, `Količina`, `Jedinična cena`, `Popust u procentima`, `Stopa PDV-a`, `Paginacija`, `Prethodna`, `Sledeća`, `Ukloni datum`, `Sakrij`, `Dismiss notification`.
- Labele sa `htmlFor`: `Broj fakture`, `Sačuvani kupac`, `PIB kupca`, `Adresa kupca`, `invoiceNumber`, `clientName`, `clientPib`, `clientAddress`, `price` (Cena (opciono)), `description`, `companyName`, `pib`, `contactEmail`, `contactPhone`, `giroAccount`, `address`, `catalog-layout`, `catalog-sort`, `notes`.
- Placeholderi: `Unesite naziv proizvoda`, `Unesite SKU ili skenirajte barkod`, `0,00`, `Unesite naziv kupca`, `9 cifara`, `Unesite naziv kataloga`, `Unesite naziv firme`, `Unesite PIB`, `kontakt@firma.rs`.
- Dugmad (tačan tekst): `Kreiraj proizvod`, `Sačuvaj izmene`, `Otkaži`, `Sačuvaj fakturu`, `Kreiraj katalog`, `Sačuvaj katalog`, `Izmeni`, `Obriši`, `Vrati`, `Preuzmi PDF`, `Izvoz za knjigovođu`, `Kopiraj link`, `Opozovi link`, `Podeli`, `WhatsApp`, `Viber`, `Mejl`, `Novi katalog`, `Nova faktura`, `Otvori asortiman`, `Idi na asortiman`, `Pokušaj ponovo`.
- Toast (Sonner, selektor `[data-sonner-toast]`): `Proizvod je ažuriran`, `Stanje je ažurirano`, `Faktura je obrisana`, `Faktura je plaćena`, `Faktura je ponovo otvorena`, `Katalog je kreiran`, `Katalog je obrisan`, `Kategorija je kreirana`. Tekstovi poruka grešaka: `Proizvod nije sačuvan`, `Kretanje nije sačuvano`, `Brisanje nije uspelo`, `Status nije sačuvan`, `Katalog nije kreiran`.
- Radix komponente: `Select` (nije native `<select>`; klik na trigger pa `getByRole('option')`), `Dialog`/`confirm-dialog` (`getByRole('dialog')`), `Popover`, `Command` (cmdk, picker proizvoda), `Sheet` (mobilni meni). Za potvrde brisanja koristi `getByRole('dialog')` pa dugme u njemu.
- **Mešavina jezika:** neke stranice još imaju engleske labele: detalj fakture (`Invoice Information`, `Invoice Items`, `Summary`, `Due Date`, `Created Date`, `Back to Invoices`, `Invoice not found`), `Delete Product`, `Loading movements...`, neki API error stringovi. Ne pretpostavljati srpski bez provere; ne pisati asert koji će puknuti kad se prevede, izdvojiti tekstove u `test-data/copy.ts`.
- Broj stavki, iznosi i datumi su lokalizovani; ne poredi sirove stringove sa `toString()` brojem.
- **Responsive**: oba prikaza su deo proizvoda. Definisati projekte: `desktop-chrome` (1280×800) i `mobile-chrome` (Pixel 5, bez cele navigacije; "Više" meni). Tabele u Asortimanu/Magacinu na mobilnom mogu biti kartice **[PROVERI]**. Tab-bar prikazuje samo 3 destinacije.
- PDF/izvoz: koristi `page.waitForEvent('download')`; `@react-pdf/renderer` se učitava dinamički (`ssr:false`), prvi klik na "Preuzmi PDF" prvo prikaže "Priprema PDF-a…" pa tek onda link. Za sadržaj PDF-a koristiti `pdf-parse`/`pdfjs-dist` u Node strani testa.
- Service worker `public/sw.js` je network-only (bez keša), ne utiče na testove; za deterministiku opciono `serviceWorkers: 'block'`.
- Rate limit: javni endpointi 60/min, lookup 40/min po IP-u (in-memory po instanci kad nema Upstash). Paralelni testovi sa istog IP-a mogu naići na `429`; testove rate-limita raditi izolovano i serijski.

---

## 8. Plan testova (prioriteti)

Oznake: **P0** = blokira lansiranje/poslovni rizik, **P1** = važno, **P2** = poželjno. Tip: `UI`, `API`, `A11y/Resp`.

### 8.1 Smoke (P0, svaki build, <2 min)
| ID | Test |
|---|---|
| SM-01 | `/` se učitava, naslov i CTA vidljivi, nema konzolnih grešaka |
| SM-02 | `/privatnost` i `/uslovi` se otvaraju |
| SM-03 | Neprijavljen `GET /dashboard` → redirect na `/sign-in` (ili `/` bez Clerk ključa) |
| SM-04 | Neprijavljen `GET /api/products` → `401` JSON |
| SM-05 | Prijavljen korisnik stiže na `/dashboard`, vidi "Početna" |
| SM-06 | Svih 8 navigacionih stavki otvara svoju stranicu (desktop sidebar i mobilni "Više") |
| SM-07 | `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` vraćaju 200 |

### 8.2 Autentifikacija i pristup (P0)
- AU-01 Sign-in sa validnim test korisnikom, sesija preživi reload.
- AU-02 Odjava (`Odjava`) vraća na javni deo, zaštićena ruta ponovo redirektuje.
- AU-03 Novi korisnik: lenjo kreiranje profila (GET /api/profile), "Prvi koraci" prikazan, prazna stanja.
- AU-04 Istekao nalog: baner "Pristup je istekao…", sve write akcije vraćaju 402 (UI toast greške, API `ACCESS_EXPIRED`), čitanje/izvoz/PUT profil rade, javni linkovi rade.
- AU-05 "Ističe uskoro" (≤14 dana) baner.
- AU-06 Izolacija tenanta: korisnik B ne vidi/ne menja proizvode, fakture, kataloge korisnika A (API po ID-u → 404/403).

### 8.3 Asortiman (P0/P1)
- PR-01 (P0) Kreiranje proizvoda sa svim poljima → pojavljuje se u listi i u Magacinu sa istom količinom.
- PR-02 (P0) Nabavna cena obavezna; prazno → poruka; `0` bez razloga → "Unesite razlog…"; `0` sa razlogom prolazi.
- PR-03 (P0) Cena opciona: prazno čuva 0; lista pokazuje "Nedostaje cena" samo kad nema nabavne.
- PR-04 Decimale: `19.99` prolazi, `19.999` ne, `-1` ne, `abc` ne.
- PR-05 Izmena i brisanje (potvrda dijaloga); izmena ne menja stare fakture (vidi IN-09).
- PR-06 Pretraga, filter po kategoriji, filter po datumu, paginacija, prazno "Nema rezultata za izabrane filtere".
- PR-07 Kategorija: kreiranje, dodela, "Bez kategorije", prazan naziv → "Naziv kategorije je obavezan".
- PR-08 Slika: upload PNG prolazi, HEIC odbijen ("HEIC nije podržan…"), >5 MB odbijen, preview, "Ukloni sliku".
- PR-09 Uvoz CSV/XLSX: validan fajl, fajl sa lošim redom (prijavi grešku, ispravne redove uveze), šablon se preuzima.
- PR-10 (API) `Idempotency-Key`: dvostruki POST = 1 proizvod / 1 kretanje.
- PR-11 (API) Duplikat SKU na ručnom putu → 409.
- PR-12 Quick Scan (fake kamera ili ručni unos barkoda): novi → "NOVI PROIZVOD"; isti ponovo → "+1"; nepoznat barkod → "Proizvod nije pronađen" i redirect na formu sa popunjenim SKU. `fetch-by-barcode` mock-ovati (`page.route`).

### 8.4 Magacin (P0)
- WH-01 Ulaz: količina raste, kretanje `IN` "Ulaz robe" u istoriji.
- WH-02 Izlaz: količina pada, `OUT` upisan.
- WH-03 Izlaz veći od stanja blokiran (UI poruka + API `400`), stanje nepromenjeno.
- WH-04 Validacije formi (bez proizvoda, količina 0/negativna, bez razloga).
- WH-05 Istorija: filter po datumu, prazna stanja.
- WH-06 "Stanje" uvoz (bulk-adjust), `0` dozvoljeno, negativna odbijena.
- WH-07 Konzistentnost: količina u `/inventory`, `/warehouse` i na Početnoj ("Ukupna količina", "Prodajna vrednost lagera") je ista.
- WH-08 Nizak lager kartica reaguje na promenu stanja.

### 8.5 Fakture (P0, najveći poslovni rizik)
- IN-01 Nova faktura sa jednom stavkom iz pickera, auto broj `YYYY-NNN` (tekuća godina), `Sačuvaj fakturu`.
- IN-02 **Nacrt ne dira lager**; izdavanje (UNPAID) skida; ponovo čuvanje ne skida dvaput; PAID↔UNPAID ne menja lager.
- IN-03 Nedovoljno stanja → poruka "Nema dovoljno na stanju za „…“", faktura se ne izdaje, lager nepromenjen.
- IN-04 Validacije: bez kupca, bez stavki, PIB kupca ≠ 9 cifara, količina 0/decimalna, popust >100, negativna cena.
- IN-05 PDV: firma bez PDV-a (nema PDV kolone/redova) vs firma u sistemu (stopa 0/10/20 po stavci). Brojčani primeri iz 5.3 + mešane stope + popust.
- IN-06 Izdavanje bez PIB-a firme → blokirano sa porukom.
- IN-07 Status tok: Nacrt → Otvoreno → Plaćeno → "Vrati" → Otvoreno; arhiva plaćenih "Arhiva po mesecima".
- IN-08 Brisanje izdate fakture vraća lager; potvrda "Obrisati ovu fakturu?".
- IN-09 **Snapshot regresija**: izdati fakturu, promeniti `price` i `costPrice` proizvoda, faktura i finansije ostaju isti.
- IN-10 Izmena stavki izdate fakture usklađuje lager za razliku (povećanje i smanjenje).
- IN-11 Deljenje: link otvoren u novom kontekstu **bez sesije** prikazuje fakturu, opozvan → "Faktura nije dostupna"; nacrt nema link.
- IN-12 PDF: preuzimanje radi, naziv fajla, tekst sadrži č/ć/đ, iznosi, PDV; IPS QR prisutan samo za UNPAID sa validnim žiro-računom.
- IN-13 Izvoz CSV/XLSX: raspon datuma, bez nacrta, PDV kolone, neispravan opseg → greška; fajl se parsira u testu.
- IN-14 Sačuvani kupac popunjava naziv/PIB/adresu.
- IN-15 (API, konkurentnost) 5 paralelnih POST /api/invoices → 5 jedinstvenih brojeva.
- IN-16 Unsaved-changes guard: izmena pa klik na link → potvrda; posle čuvanja bez pitanja.

### 8.6 Katalozi (P0/P1)
- CA-01 (P0) Kreiranje kataloga od ≥2 proizvoda, popust primenjen u "Pregled cena".
- CA-02 Validacije: bez naziva, bez proizvoda, popust >100.
- CA-03 Podešavanja prikaza: svaki layout, grupisanje, svaki sortMode; redosled u pregledu = redosled na javnom linku.
- CA-04 Ručni redosled (gore/dole) se čuva.
- CA-05 Prikaz polja: sakriven SKU/opis nije prisutan u javnom DOM-u ni u JSON-u.
- CA-06 **(P0) Privatnost javnog DTO-a**: JSON `/api/public/catalogs/[id]` i `/api/shared/catalog/[token]` ne sadrže `costPrice`, `quantity`, `profileId`/owner id.
- CA-07 **(P0)** CUID link bez `shareEnabled` → `410`; sa uključenim deljenjem 200; posle opoziva ponovo 410; nepostojeći → 404.
- CA-08 "Cena na upit" za cenu 0.
- CA-09 Javna stranica: pretraga, filter kategorije, paginacija 12/24/48, prazno stanje.
- CA-10 PDF: preuzimanje, č/ć/đ, grupisanje po kategorijama (nova strana po kategoriji).
- CA-11 Brisanje kataloga sa potvrdom; izmena (`/catalogs/[id]/edit`).
- CA-12 Deljenje WhatsApp/Viber/Mejl: proveriti `href` (ne otvarati spoljne aplikacije).

### 8.7 Kupci, Finansije, Podešavanja, Dashboard (P1)
- CL-01 CRUD kupca, PIB 9 cifara, korišćenje u fakturi i katalogu.
- FI-01 Posle plaćene fakture kartice "Prihod/Profit ovog meseca" jednaki očekivanom (osnovica, ne bruto). Primer: prodaja 2 × 1000 (nabavna 600) sa PDV 20% → prihod 2.000, profit 800, plaćeno 2.400.
- FI-02 Otvorena faktura ulazi u "Potraživanja" (bruto, 2.400), ne u prihod.
- FI-03 Prazno stanje "Još nema prometa".
- FI-04 Plaćena faktura bez troška → "Nedostaje nabavna cena".
- SE-01 Čuvanje podataka firme, persistira posle reload-a; PIB ≠ 9 cifara, nevažeći email → greška.
- SE-02 Logo upload persistira posle čuvanja.
- SE-03 Uključivanje "u sistemu PDV-a" menja formu nove fakture, **ne** menja stare.
- SE-04 Nevažeći žiro-račun (loša kontrolna cifra) → bez IPS QR.
- DB-01 Kartice na Početnoj ("Lager", "Otvorene fakture", "Kasni naplata", "Nizak lager", "Današnji ulazi") odgovaraju stvarnim podacima.
- DB-02 "Prvi koraci": stavke se štikliraju kako korisnik napreduje.
- DB-03 Faktura sa rokom u prošlosti i statusom Otvoreno pojavljuje se u "Kasni naplata" sa brojem dana kašnjenja.

### 8.8 Landing / pravni / SEO (P1/P2)
- LA-01 Hero, sekcije, FAQ (otvaranje/zatvaranje), dugmad vode na `/sign-up` / `/sign-in`.
- LA-02 Cenovnik iz `PRICING_OFFER` (60 dana besplatno, 20 EUR/mesec). **Ne sme obećavati checkout/otkazivanje** (copy mora ostati iskren).
- LA-03 Demo video ima titlove (`/landing-demo-captions.vtt` javno dostupan).
- LA-04 Mobilni hero (telefon se vidi), sticky CTA.
- LA-05 Meta tagovi, OG slika, `lang`, canonical.
- LA-06 Pravne stranice ne sadrže placeholder operatera (`src/lib/operator.ts` još ima placeholder vrednosti; test treba da padne kad se to ne popravi pre lansiranja, označiti kao `test.fixme` dok vlasnik ne unese podatke).

### 8.9 Bezbednosne API provere (P0)
- SEC-01 Svaki zaštićeni endpoint bez tokena → 401 (parametrizovano po tabeli u poglavlju 6).
- SEC-02 IDOR: ID resursa drugog tenanta → 404/403 za GET/PUT/PATCH/DELETE.
- SEC-03 `/api/uploads` odbija fajl sa lažnom ekstenzijom (magic-byte), odbija neautentifikovan zahtev.
- SEC-04 `fetch-by-barcode`/`lookup` odbija URL-ove ka privatnim IP-ovima (SSRF), i traži auth.
- SEC-05 Ne postoje debug/ingest rute (`/api/debug*`, `/api/ingest*` → 404).
- SEC-06 Security headeri iz `next.config.js` na javnim i privatnim stranicama (CSP, X-Frame-Options i dr. **[PROVERI]** tačan skup).
- SEC-07 Rate limit: 61. zahtev u minuti na javni endpoint → `429` (izolovano, serijski).

### 8.10 Pristupačnost i responsive (P2)
- AX-01 `@axe-core/playwright` na landing, sign-in, dashboard, forme (bez critical/serious).
- AX-02 Tastaturna navigacija kroz forme proizvoda i fakture, fokus u dijalozima.
- RS-01 Isti P0 tokovi na `mobile-chrome` (Pixel 5) i tabletu; "Više" meni; nema horizontalnog skrola.
- RS-02 PWA: manifest validan (`name`, ikone 192/512, `start_url`, `display`), dugme "Instaliraj aplikaciju" na mobilnom Chromium-u (`beforeinstallprompt` se teško emulira, to ostaje ručno, vidi 9).

---

## 9. Šta se NE automatizuje (ručno / uređaj)

Prema `docs/device-checklist.md`: stvarna kamera i zvuk (Android Chrome, iPhone Safari), PWA instalacija na telefonu, "Dodaj na početni ekran", sken IPS QR koda u m-banking aplikaciji, otvaranje javnog kataloga na pravom telefonu, vizuelni kvalitet PDF-a (samo sadržaj se automatizuje), WhatsApp/Viber deep-linkovi (proveriti `href`, ne aplikaciju).

---

## 10. Preporučena struktura Playwright projekta

```
trademaster-playwright/
├─ playwright.config.ts
├─ .env.e2e.example          # BASE_URL, E2E_USER_EMAIL, E2E_USER_PASSWORD, CLERK_*, TEST_DATABASE_URL
├─ global-setup.ts           # clerkSetup(), provera da BASE_URL nije produkcija
├─ tests/
│  ├─ setup/auth.setup.ts    # login → playwright/.auth/user.json
│  ├─ smoke/ auth/ inventory/ warehouse/ invoices/ catalogs/
│  ├─ clients/ finance/ settings/ dashboard/ landing/
│  ├─ api/                   # request-only: security, contracts, idempotency
│  └─ a11y/
├─ pages/                    # Page Objects: InventoryPage, WarehousePage, InvoiceFormPage, CatalogFormPage...
├─ fixtures/                 # test.extend: apiClient (Bearer), seeded product/invoice, cleanup
├─ test-data/                # copy.ts (srpski tekstovi), factories.ts (proizvod, kupac, žiro-račun sa validnom kontrolnom cifrom)
└─ utils/                    # money.ts (srpski format), pdf.ts, xlsx.ts, db.ts (samo test baza)
```

Konfiguracija:
- `baseURL` iz `BASE_URL`, `locale: 'sr-RS'`, `timezoneId: 'Europe/Belgrade'`, `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`.
- `webServer`: `npm run build && npm start` iz glavnog repoa (ili `reuseExistingServer`); u glavnom repou je `next dev` na `:3000`.
- Projekti: `setup`, `chromium-desktop`, `chromium-mobile` (Pixel 5) obavezni; `firefox`/`webkit` tek za smoke. Podrazumevani šablon iz `npx playwright init` ima 3 browsera, ali P0 ide na Chromium (PWA, Clerk, `html5-qrcode`).
- `fullyParallel` samo u okviru fajlova koji ne dele lager/proizvod. Tokovi faktura/magacin: `test.describe.configure({ mode: 'serial' })` ili poseban korisnik po workeru.
- Workers u CI: 1 dok se ne uvede korisnik po workeru.
- Test podaci: prefiks `E2E-` u nazivu/SKU (`E2E-<timestamp>-<n>`), brisanje u `afterEach/afterAll` preko API-ja (DELETE faktura prvo, jer vraća lager, pa proizvodi).
- Retry samo u CI (2). Nema `test.only` u CI (`forbidOnly`).
- Ne pisati `waitForTimeout`; čekati toast, response (`page.waitForResponse`) ili stanje elementa.

**Napomena o postojećem stanju glavnog repoa:** tamo već postoje netrackirani `playwright.config.ts`, `e2e/example.spec.ts`, `tests/e2e/example.spec.ts` (podrazumevani primeri koji gađaju playwright.dev) i `.github/workflows/playwright.yml`. To je neiskorišćen scaffold; novi test projekat treba da ih zameni, ne da ih proširuje. Unit testovi u glavnom repou su Vitest (`npm run test:run`, 71 fajl/413 testa, `vitest.config.ts` ima eksplicitan `include`), ne mešati ih sa Playwright-om.

---

## 11. Poznati rizici i zamke za testove

1. Clerk bot zaštita blokira klasičan UI login → koristiti `@clerk/testing`.
2. Lenjo kreiranje profila: prvi API poziv novog korisnika mora biti `GET /api/profile`.
3. Brojevi faktura `YYYY-NNN` zavise od godine i broja postojećih faktura; ne asertovati konkretan broj, već format `^\d{4}-\d{3}$` i inkrement.
4. Lager i brojevi su deljeno stanje po korisniku → paralelizam kvari testove.
5. `Europe/Belgrade` granica dana; "danas" kartice i filtri datuma.
6. Radix Select i cmdk picker traže klik + izbor opcije, ne `selectOption`.
7. Dinamičko učitavanje PDF-a; sačekati stanje dugmeta pre klika.
8. Sonner toast nestaje; asertovati odmah posle akcije (`expect(...).toBeVisible()`).
9. Rate limit (60/40 po minuti) i in-memory brojač po instanci.
10. `fetch-by-barcode` zove spoljne baze → uvek mock-ovati, inače testovi zavise od interneta.
11. Mešani jezici u UI-ju (srpski + ostaci engleskog) → tekstovi u jednom fajlu.
12. Aplikacija je "network-only", nema offline režima; ne testirati offline.
13. Stari "daily batch" redovi proizvoda sa istim SKU; ne pretpostavljati jedan red po SKU na nivou baze.
14. Landing i pravne stranice sadrže placeholder operatera dok vlasnik ne unese podatke (`src/lib/operator.ts`).
15. Nikad ne pokretati `prisma migrate deploy` ni menjati šemu iz test projekta.

---

## 12. Redosled implementacije (preporuka)

1. Scaffold: config, env, global setup (guard protiv produkcije), `auth.setup.ts`, API fixture sa Bearer tokenom.
2. Smoke (8.1) + SEC-01/02 → prvi zeleni CI.
3. Asortiman + Magacin (PR-01..04, WH-01..04): osnova za sve ostale tokove, daje `seedProduct` fixture.
4. Fakture (IN-01..09) uz lager i PDV: najveći rizik.
5. Katalozi (CA-01..09) + privatnost javnog DTO-a.
6. Finansije, Podešavanja, Kupci, Dashboard.
7. Istek pristupa (AU-04) uz DB fixture.
8. Mobilni projekat, a11y, landing/SEO, PDF/XLSX sadržaj.

Definicija gotovog za svaki test: deterministički (3 uzastopna zelena prolaza), bez `waitForTimeout`, sam čisti svoje podatke, koristi locatore iz poglavlja 7 i tekstove iz `test-data/copy.ts`.
