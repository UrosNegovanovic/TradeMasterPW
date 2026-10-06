# BUGS — nalazi iz testiranja TradeMaster

Okruženje: `https://trade-master-seven.vercel.app` (Clerk Development), nađeno 2026-10-05.
Status: `Potvrđeno` = reprodukovano i pokriveno testom ili skriptom; `Pitanje` = ponašanje se razlikuje od `PLAYWRIGHT_AQA_BRIEF.md`, treba odluka vlasnika proizvoda; `Neproveren` = viđeno jednom, nije reprodukovano.

Ovaj fajl je izvor za prijavu bugova. Svaki unos ima korake koje je dovoljno prekucati.

---

## Fakture

### BUG-001 · Visoka · Potvrđeno — izmena proizvoda preko API-ja bez `quantity` tiho resetuje lager na 1
- **Gde:** `PUT /api/products/{id}` (utiče na lager koji koriste fakture).
- **Koraci:**
  1. Napravi proizvod sa `quantity: 20` (`POST /api/products`).
  2. `PUT /api/products/{id}` sa telom `{ "name": "...", "sku": "...", "price": 100, "costPrice": 60 }` (bez `quantity`).
  3. Pročitaj `GET /api/products`.
- **Očekivano:** količina ostaje 20, ili zahtev vraća 400 jer polje nedostaje.
- **Stvarno:** odgovor 200, a `quantity` je 1. Nema upozorenja ni zapisa o kretanju robe.
- **Posledica:** svaki klijent koji ne šalje `quantity` (integracija, buduća mobilna aplikacija) gubi stanje. UI forma uvek šalje količinu, pa se u UI-ju ne vidi. Nađeno jer je kasnije brisanje fakture vratilo lager na 2 umesto na 20.
- **Test:** `tests/api/invoices.spec.ts` (IN-09 namerno šalje `quantity`, komentar upućuje na ovaj bug).

### BUG-002 · Srednja · Pitanje — izdate fakture mogu da se obrišu, a broj se posle ponovo dodeljuje
- **Gde:** `DELETE /api/invoices/{id}` i dugme „Obriši" u listi faktura.
- **Koraci:**
  1. Izdaj fakturu (status Otvoreno), zabeleži broj, npr. `01/2026`.
  2. Obriši je (potvrda „Obrisati ovu fakturu?").
  3. Izdaj novu fakturu.
- **Očekivano (pretpostavka):** izdata faktura se ne briše nego storno/otkaže, a broj se ne koristi ponovo.
- **Stvarno:** brisanje prolazi (lager se vraća), a kad se obrišu sve fakture, nova dobija opet `01/2026`. Niz je „najveći broj + 1", pa se broj poslednje obrisane fakture ponovo koristi.
- **Zašto je važno:** računovodstveno i zakonski brojevi izdatih faktura treba da su neprekidni i jedinstveni. Treba odluka da li je ovo namerno za fazu pre lansiranja.
- **Napomena:** brief to ne pominje. Ako je namerno, upiši u dokumentaciju.

### BUG-003 · Niska · Pitanje — format broja fakture je `NN/YYYY`, ne `YYYY-NNN`
- **Stvarno:** `01/2026`, `02/2026`… (niz po firmi i godini). Brief navodi `YYYY-NNN`.
- **Test:** `tests/api/invoices.spec.ts` (`INVOICE_NUMBER = /^\d{2,}\/\d{4}$/`). Ako je format promenjen namerno, ažurirati brief; ako ne, bug.

### BUG-004 · Niska · Pitanje — nacrt fakture takođe traži PIB firme
- **Koraci:** korisnik bez PIB-a u Podešavanjima: `POST /api/invoices` sa `status: "DRAFT"`.
- **Očekivano (brief):** PIB se traži tek pri izdavanju.
- **Stvarno:** 400 `Unesite važeći PIB firme od 9 cifara pre izdavanja fakture.` i za nacrt.
- **Test:** `IN-06` u `tests/api/invoices.spec.ts`.

### BUG-005 · Niska · Pitanje — UI ne nudi nacrt fakture
- **Stvarno:** forma „Nova faktura" ima samo „Sačuvaj fakturu" koje odmah izdaje fakturu (status Otvoreno) i skida lager. Nacrt postoji u API-ju (`status: DRAFT`), ali ne i u UI-ju.
- **Zašto:** brief opisuje statuse Nacrt / Otvoreno / Plaćeno. Korisnik ne može da sačuva rad u toku bez izdavanja.

### BUG-006 · Niska · Potvrđeno — nedoslednost naziva: „Dokument" umesto „Faktura"
- Toast posle brisanja: „Dokument je obrisan / Uklonjen je iz evidencije." (potvrde su „Obrisati ovu fakturu?").
- Javna stranica opozvanog linka: naslov „Dokument nije dostupan" (brief: „Faktura nije dostupna").
- Verovatan razlog: ista lista sadrži i predračune (`documentType`), ali korisniku je poruka neprecizna.

### BUG-007 · Srednja · Pitanje — funkcije van opsega iz briefa
- Na detalju fakture postoje dugmad **„Otpremnica"** i **„XML za SEF"**, a lista ima tab **„Predračuni"**.
- Brief navodi SEF e-fakturisanje kao „ne postoji". Ako je dodato kasnije, treba ga pokriti testovima i ažurirati dokumentaciju; ako je ostatak, ukloniti ili sakriti pre lansiranja.
- **Test:** nije pokriveno (čeka odluku).

---

## Ostalo (pronađeno u istom prolazu, nisu fakture)

### BUG-008 · Srednja · Potvrđeno — izlaz robe iznad stanja se u UI-ju blokira bez poruke
- **Koraci:** Magacin → „Izlaz / korekcija" → izaberi proizvod sa stanjem 4, količina 5, razlog, „Evidentiraj izlaz".
- **Stvarno:** dijalog ostaje otvoren, nema toasta ni poruke. API vraća 400 `Insufficient stock`.
- **Poređenje:** forma fakture isti slučaj lepo rešava („Manjak 2 kom (na stanju 3)" + baner).
- **Test:** `WH-03` u `tests/app/warehouse.spec.ts` (proverava blokadu), `tests/api/stock-movements.spec.ts`.

### BUG-009 · Niska · Potvrđeno — engleski tekstovi u srpskom UI-ju
- Poruka validacije količine: „Quantity must be at least 1" (API i forma proizvoda).
- Toast posle kreiranja proizvoda: „CREATED".
- Dijalog brisanja proizvoda: „Delete Product / Are you sure you want to delete this product? / Cancel / Delete".
- Poruke API-ja za kretanja: „Quantity must be a positive integer", „Insufficient stock".

### BUG-010 · Niska · Pitanje — razlika odgovora za tuđe resurse otkriva da ID postoji
- Tuđi proizvod/katalog: `403 Forbidden`; tuđi klijent/nepostojeća faktura: `404`. Napadač po statusu zna da li ID postoji.
- Nije curenje podataka, ali je jednostavno uskladiti na 404.
- **Test:** `tests/api/security.spec.ts` (SEC-02 prihvata 403 i 404).

### BUG-011 · Niska · Potvrđeno — `GET /api/products/{id}` i `GET /api/clients/{id}` vraćaju 405
- Brief ih navodi kao postojeće. Ako ne treba da postoje, ažurirati dokumentaciju.

### BUG-012 · Niska · Potvrđeno — duplikat SKU na `POST /api/products` ne vraća 409
- Brief: 409 `Product with this SKU already exists`. Stvarno: 200 i količina se sabira (`action: updated`).
- Verovatno namerno (isti tok kao sken); upisati u dokumentaciju.
- **Test:** `PR-11` u `tests/api/products.spec.ts`.

---

## Neproverena opažanja (nije reprodukovano, ne prijavljivati bez dodatnog dokaza)
- **Faktura posle odgovora 400:** u jednom punom prolazu API test IN-03 je našao fakturu sa istim nazivom kupca posle 400 „Nema dovoljno na stanju". Nije se ponovilo (8 izolovanih + više punih prolaza). Ako se ponovi, proveriti da li greška pri izdavanju ostavlja nacrt.
- **Intermitentni pad UI prijave:** zapinjanje na `/sign-in/factor-two` posle unosa OTP-a, i pad AU-03 na očekivanom URL-u (Clerk Dev instanca). Verovatno test-okruženje, ne bug aplikacije.

---

## Katalozi (Faza 6)

### BUG-013 · Srednja · Potvrđeno — opozvan ili nepostojeći javni link kataloga je ~7 s prazan pre poruke
- **Koraci:** otvori `/shared/catalog/<neispravan-ili-opozvan-token>` bez prijave.
- **Stvarno:** stranica je prazna (nema teksta, naslova ni spinnera) oko 7 sekundi. Za to vreme klijent ponovi `GET /api/shared/catalog/<token>` 4 puta (sva 4 vraćaju 404, verovatno retry pri 404), pa tek tada prikaže „Katalog nije pronađen / Link je nevažeći ili je katalog uklonjen."
- **Očekivano:** poruka odmah, bez ponavljanja zahteva koji vraća 404. Poređenje: javna faktura (`/shared/invoice/<token>`) prikaže „Dokument nije dostupan" odmah.
- **Uticaj:** kupac koji dobije opozvan link vidi praznu stranu i misli da je aplikacija pokvarena.
- **Test:** `CA-07d` u `tests/app/catalog-public.spec.ts` (čeka do 20 s).

### BUG-014 · Niska · Potvrđeno — engleski tekstovi u katalozima
- Forma „Novi katalog": poruka validacije „Name is required" (prazan naziv).
- Detalj kataloga (`/catalogs/<id>`): naslovi „Discount", „Products", „Created", „2 product(s) in this catalog", „Items per page:", „12 per page". Javna strana i lista su na srpskom („Po strani", „12 po strani").

### BUG-015 · Niska · Potvrđeno — poruka posle opoziva linka kataloga
- Posle „Opozovi link" stanje piše „Link je opozvan.", a pre prvog uključivanja „Deljenje je isključeno." Dve različite poruke za isto stanje „nije podeljeno"; nije greška, samo nedoslednost.

---

## Podešavanja, Početna, Finansije (Faza 6)

### BUG-016 · Niska · Potvrđeno — žiro-račun se ne validira pri čuvanju
- **Koraci:** Podešavanja → Žiro-račun `123` → „Sačuvaj".
- **Stvarno:** toast „Podaci su sačuvani / Podaci o firmi su ažurirani." i vrednost se čuva.
- **Očekivano (brief SE-04):** račun sa pogrešnom kontrolnom cifrom ne treba da dobije IPS QR na fakturi; bar upozorenje korisniku pri čuvanju. Ovako korisnik ne zna zašto QR nedostaje.
- **Napomena:** QR na PDF-u nije proveren (nema pdf parsera u projektu).

### BUG-017 · Niska · Potvrđeno — nedoslednost formata procenata
- Iznosi koriste zarez („2.000,00 RSD"), procenti tačku: „Marža 40.00%" (Finansije), „10.00%" (lista kataloga). Srpski format je „40,00%".

### BUG-018 · Niska · Potvrđeno — gramatika brojeva na Početnoj, kartica „Današnja kretanja"
- „2 ulaz · +5", „0 izlaz · −0", „2 izlaz · −2" (treba „2 ulaza", „2 izlaza"). Kartica „Današnji ulazi" ispravno kaže „2 ulaza".
- Slično: „1 otvorenih faktura" / „1 otvorenih" (treba „1 otvorena faktura").

### BUG-019 · Informativno — „Dodato danas" i „Današnji ulazi" mogu da se razlikuju
- Posle prodaje: „Dodato danas: 8 komada" (trenutno stanje proizvoda dodatih danas), a „Današnji ulazi: 10 komada" (zbir ulaznih kretanja). Verovatno namerno ("Šta se računa?"), ali nazivi se lako pomešaju.

### Metodološka napomena o ranijim „fleki" padovima
- Pad „expected '8' got '0'", API IN-03 (faktura posle odgovora 400) i AU-03 u ranijim izveštajima: **uzrok dva od njih je bio u testovima**, ne u aplikaciji. `uniqueId()` se zasnivao na `Date.now()` i brojaču po workeru; dva workera u istoj milisekundi dobila su isti SKU/naziv kupca, pa je `POST /api/products` spojio proizvode (`action: "updated"`, 200). Ispravljeno (dodat je slučajan deo). Treba ostati oprezan: ovo ujedno potvrđuje ponašanje iz BUG-012 (isti SKU se spaja bez upozorenja).
