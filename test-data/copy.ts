/** UI copy (Serbian, Latin script). Single place to update when the app text changes. */
export const copy = {
  landing: {
    title: /TradeMaster/i,
    heroHeading: /Od barkoda do fakture/i,
    signIn: 'Prijava',
    signUp: 'Registruj se',
  },
  signIn: {
    heading: 'Prijavi se na TradeMaster',
    email: 'E-mail adresa',
    password: 'Lozinka',
    submit: 'Nastavi',
  },
  signUp: {
    heading: 'Kreiraj svoj nalog',
    firstName: 'Ime',
    lastName: 'Prezime',
  },
  // Clerk renders this label in English even with the sr-RS app locale.
  otpLabel: /verification code/i,
  signOut: 'Odjava',
  sidebarLabel: 'Glavna navigacija',
  more: 'Više',
  inventory: {
    addButton: 'Dodaj proizvod',
    search: 'Pretraga po nazivu ili SKU...',
    uncategorized: 'Bez kategorije',
    // Shown when the SELLING price is empty/0 (not the cost price).
    missingPrice: /Nedostaje cena/,
  },
  productForm: {
    name: 'Naziv proizvoda *',
    sku: 'SKU *',
    quantity: 'Količina *',
    price: 'Cena (opciono)',
    costPrice: 'Nabavna cena *',
    description: 'Opis',
    zeroReason: /Razlog za nabavnu cenu 0/,
    submit: 'Kreiraj proizvod',
    errors: {
      zeroReasonRequired: 'Unesite razlog za nabavnu cenu 0',
      costNegative: 'Nabavna cena ne može biti negativna',
      costDecimals: 'Nabavna cena može imati najviše 2 decimale',
      // [PROVERI] still English in the app (zod default message); regex allows a future translation.
      quantityMin: /Quantity must be at least 1|najmanje 1/i,
    },
  },
  warehouse: {
    entryButton: 'Ulaz',
    exitButton: 'Izlaz / korekcija',
    pickProduct: 'Izaberite proizvod',
    quantity: 'Količina *',
    costPrice: 'Nabavna cena (opciono)',
    reason: /Razlog/,
    pickerSearch: 'Pretraži proizvode...',
    entrySubmit: 'Evidentiraj ulaz',
    exitSubmit: 'Evidentiraj izlaz',
    defaultEntryReason: 'Ulaz robe',
    search: 'Pretraga po nazivu ili SKU...',
    errors: {
      pickProduct: 'Izaberite proizvod',
      reason: 'Unesite razlog',
      quantity: 'Količina mora biti pozitivan broj',
    },
    toasts: {
      entry: /Ulaz je zabeležen/,
      exit: /Izlaz je zabeležen/,
    },
  },
  catalogs: {
    newCatalog: 'Novi katalog',
    form: {
      name: 'Naziv kataloga *',
      client: 'Naziv klijenta',
      discount: 'Popust (%) *',
      notes: 'Napomena',
      search: 'Pretraga po nazivu ili šifri...',
      layout: 'Raspored',
      sort: 'Redosled proizvoda',
      groupByCategory: 'Grupiši po kategorijama',
      showSku: 'SKU / šifra',
      showDescription: 'Opis',
      showOriginalPrice: /Stara cena/,
      create: 'Kreiraj katalog',
      save: 'Sačuvaj katalog',
    },
    priceOnRequest: 'Cena na upit',
    toasts: { created: /Katalog je kreiran/ },
    confirmDelete: 'Da li sigurno želite da obrišete ovaj katalog?',
    share: {
      on: 'Uključi deljenje',
      off: 'Opozovi link',
      newLink: 'Napravi novi link',
      copy: 'Kopiraj link',
      preview: 'Pregled za kupca',
      region: 'Deljenje kataloga',
      disabled: 'Deljenje je isključeno.',
      revoked: 'Link je opozvan.',
    },
    public: {
      search: 'Pretraži proizvode…',
      noMatch: 'Nijedan proizvod ne odgovara pretrazi.',
      pagination: 'Paginacija',
      next: 'Sledeća',
      previous: 'Prethodna',
      notFound: { title: 'Katalog nije pronađen', text: /Link je nevažeći ili je katalog uklonjen/ },
    },
    errors: {
      // [PROVERI] English text in a Serbian form (zod default); regex allows a later translation.
      nameRequired: /Name is required|Naziv.*obavezan/i,
    },
  },
  invoices: {
    newInvoice: 'Nova faktura',
    tabs: { open: /Otvorene/, paid: /Plaćene/, proforma: /Predračuni/ },
    save: 'Sačuvaj fakturu',
    cancel: 'Otkaži',
    pay: 'Obeleži kao plaćeno',
    revert: 'Vrati među otvorene',
    revertConfirm: 'Vrati',
    delete: 'Obriši',
    downloadPdf: 'Preuzmi PDF',
    shareOn: 'Uključi deljenje',
    shareOff: 'Opozovi link',
    form: {
      number: 'Broj fakture',
      dueDate: 'Rok plaćanja *',
      clientName: 'Naziv kupca *',
      clientPib: 'PIB kupca',
      clientAddress: 'Adresa kupca',
      addItem: 'Dodaj stavku',
      pickProduct: 'Izaberi proizvod',
      quantity: 'Količina',
      unitPrice: 'Jedinična cena',
      discount: 'Popust u procentima',
      vatRate: 'Stopa PDV-a',
      numberPlaceholder: 'Dodeljuje se automatski pri čuvanju',
    },
    status: { open: 'Otvoreno', paid: 'Plaćeno' },
    confirm: { delete: 'Obrisati ovu fakturu?', revert: 'Vratiti plaćenu fakturu među otvorene?' },
    toasts: {
      saved: /Faktura je sačuvana/,
      paid: /Faktura je plaćena/,
      reopened: /Faktura je ponovo otvorena/,
      // The app says "Dokument" because the same list also holds proforma invoices.
      deleted: /Dokument je obrisan/,
    },
    errors: {
      clientPib: 'PIB kupca mora imati tačno 9 cifara',
      insufficientStock: /Nema dovoljno na stanju/,
      // Shown in the form itself while the quantity exceeds the stock; saving is disabled meanwhile.
      shortage: (missing: number, stock: number) => `Manjak ${missing} kom (na stanju ${stock}).`,
      shortageBanner: /Nema dovoljno robe na stanju/,
    },
    totals: { base: 'Osnovica', payable: 'Ukupno za uplatu' },
    unavailable: { heading: 'Dokument nije dostupan', text: /Link je nevažeći ili ga je izdavalac opozvao/ },
  },
} as const;

export interface NavItem {
  label: string;
  path: string;
  /** Primary items sit in the mobile tab bar; the rest live behind "Više". */
  primary: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Početna', path: '/dashboard', primary: true },
  { label: 'Asortiman', path: '/inventory', primary: true },
  { label: 'Magacin', path: '/warehouse', primary: true },
  { label: 'Katalozi', path: '/catalogs', primary: false },
  { label: 'Fakture', path: '/invoices', primary: false },
  { label: 'Kupci', path: '/clients', primary: false },
  { label: 'Finansije', path: '/finance', primary: false },
  { label: 'Podešavanja', path: '/settings', primary: false },
];
