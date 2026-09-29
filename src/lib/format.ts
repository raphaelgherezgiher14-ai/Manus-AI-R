export function money(
  amount: number | null | undefined,
  lang = "en",
  currency = "EUR",
): string {
  const locale = lang === "de" ? "de-DE" : "en-GB";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount ?? 0);
}

export function formatDate(
  value: string | null | undefined,
  lang = "en",
): string {
  if (!value) return "—";
  const locale = lang === "de" ? "de-DE" : "en-GB";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysFromToday(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const due = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatVatRate(rate: number | null | undefined): string {
  if (rate == null) return "";
  return `${Number(rate).toLocaleString("de-DE")} %`;
}

/**
 * Builds an EPC QR / GiroCode payload (ISO 20022) so banking apps can pre-fill
 * IBAN, amount and purpose when scanning.
 */
export function buildGiroCode(input: {
  name: string;
  iban: string;
  bic?: string | null;
  amount: number;
  reference: string;
}): string {
  const amount = `EUR${input.amount.toFixed(2).replace(".", ",")}`;
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    input.bic ?? "",
    input.name.slice(0, 70),
    input.iban.replace(/\s/g, "").toUpperCase(),
    amount,
    input.reference.slice(0, 35),
    "",
    "",
  ].join("\n");
}

export function magicLinkUrl(token: string): string {
  return `${window.location.origin}/i/${token}`;
}

/** Gross amount -> { net, vat } for a given VAT rate (null/0 = no VAT). */
export function netFromGross(gross: number, rate: number | null | undefined): {
  net: number;
  vat: number;
} {
  if (!rate || rate <= 0) return { net: gross, vat: 0 };
  const net = Math.round((gross / (1 + rate / 100)) * 100) / 100;
  return { net, vat: Math.round((gross - net) * 100) / 100 };
}

/** Net amount -> { vat, gross } for a given VAT rate (null/0 = no VAT). */
export function grossFromNet(net: number, rate: number | null | undefined): {
  vat: number;
  gross: number;
} {
  if (!rate || rate <= 0) return { vat: 0, gross: net };
  const vat = Math.round((net * (rate / 100)) * 100) / 100;
  return { vat, gross: Math.round((net + vat) * 100) / 100 };
}
