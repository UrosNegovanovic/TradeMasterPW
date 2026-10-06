/** Serbian number format used by the UI: 1.000,00 (dot for thousands, comma for decimals). */
export function formatMoney(value: number, currency: string | null = 'RSD'): string {
  const formatted = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regex source for an amount; the space before "RSD" is non-breaking in the app, so any whitespace matches. */
export const amountPattern = (amount: number) => escapeRegExp(formatMoney(amount)).replace(/ /g, '\\s');

/**
 * Matches a label followed by an amount. toContainText works on textContent, where neighbouring blocks have no
 * space between them ("Osnovica2.000,00 RSD"), so the gap is optional.
 */
export const labelledAmount = (label: string, amount: number) => new RegExp(`${escapeRegExp(label)}\\s*${escapeRegExp(formatMoney(amount)).replace(/ /g, '\\s')}`);
