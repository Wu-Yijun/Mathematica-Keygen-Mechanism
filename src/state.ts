/**
 * state.ts — application state, defaults, persistence and the version-specific rules.
 *
 * The algorithm itself lives in ../report/code/ (mathpass.ts, licenseCode.ts); this file
 * only decides *what* goes into it for the selected Mathematica version.
 */
import {
  ACCEPTED_CRC_TABLE_V15_0_1, ACCEPTED_CRC_V14_0,
} from "../report/code/mathpass.ts";
import type { Lang } from "./i18n.ts";

export type Mode = "basic" | "advanced";
export type VersionMode = "le14" | "ge141";
export type TableSource = "builtin" | "v14" | "file" | "manual";

export interface State {
  mode: Mode;
  version: VersionMode;
  mathID: string;
  activationKey: string;
  licenseCode: string;
  expiry: string;          // YYYYMMDD
  acceptedCrc: number;
  table: number[];
  tableSource: TableSource;
  password: string;
}

export const V15_TABLE: readonly number[] = ACCEPTED_CRC_TABLE_V15_0_1;
export const V14_TABLE: readonly number[] = [ACCEPTED_CRC_V14_0];
export const DEFAULT_ACCEPTED_CRC = 59222;

const STORAGE_KEY = "mathpass.state.v1";

/* ------------------------------------------------------------------ *
 * dates
 * ------------------------------------------------------------------ */

function two(n: number): string { return String(n).padStart(2, "0"); }

export function toYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}`;
}

export function fromYYYYMMDD(s: string): Date | null {
  if (!/^\d{8}$/.test(s)) return null;
  const y = Number(s.slice(0, 4)), m = Number(s.slice(4, 6)), d = Number(s.slice(6, 8));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function addToDate(date: Date, spec: string): Date {
  const out = new Date(date.getTime());
  const n = Number(spec.slice(0, -1));
  const unit = spec.slice(-1);
  if (unit === "m") out.setMonth(out.getMonth() + n);
  else if (unit === "y") out.setFullYear(out.getFullYear() + n);
  else out.setDate(out.getDate() + n);
  return out;
}

export function defaultExpiry(): string {
  return toYYYYMMDD(addToDate(new Date(), "1y"));
}

export function daysLeft(expiry: string): number | null {
  const d = fromYYYYMMDD(expiry);
  if (!d) return null;
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - midnight.getTime()) / 86400000);
}

/* ------------------------------------------------------------------ *
 * identities
 * ------------------------------------------------------------------ */

const digits = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const alnum = () => Math.random() < 0.722
  ? String(Math.floor(Math.random() * 10))
  : String.fromCharCode(65 + Math.floor(Math.random() * 26));

export function randomMathID(): string {
  return `${digits(4)}-${digits(5)}-${digits(5)}`;
}

/** ≥ 14.1 → xxxx-xxxx-aaaaaa (digits and letters); ≤ 14.0 → xxxx-xxxx-xxxxxx (digits). */
export function randomActivationKey(version: VersionMode): string {
  const tail = version === "ge141"
    ? Array.from({ length: 6 }, alnum).join("")
    : digits(6);
  return `${digits(4)}-${digits(4)}-${tail}`;
}

export function isValidMathID(s: string): boolean {
  return /^\d{4}-\d{5}-\d{5}$/.test(s);
}

export function isValidActivationKey(s: string, version: VersionMode): boolean {
  return version === "ge141" ? /^\d{4}-\d{4}-[0-9A-Z]{6}$/.test(s) : /^\d{4}-\d{4}-\d{6}$/.test(s);
}

export function isValidLicenseCode(s: string): boolean {
  return /^[0-9A-Fa-f]{1,8}$/.test(s);
}

/** Uppercase hexadecimal, at least 6 digits (e.g. 800001). */
export function formatLicenseCode(s: string): string {
  const v = parseInt(s || "0", 16);
  if (Number.isNaN(v)) return s.toUpperCase();
  return v.toString(16).toUpperCase().padStart(6, "0");
}

/* ------------------------------------------------------------------ *
 * state
 * ------------------------------------------------------------------ */

/** The two message/password shapes, per version mode. */
export const VERSION_FORMATS: Record<VersionMode, { password: string; message: string }> = {
  ge141: {
    password: "signature::LicenseCode:YYYYMMDD",
    message: "mathID@YYYYMMDD$LicenseCode&activationKey",
  },
  le14: {
    password: "signature::LicenseCode",
    message: "mathID$LicenseCode&activationKey",
  },
};

export function defaultTableFor(version: VersionMode): { table: number[]; source: TableSource } {
  return version === "ge141"
    ? { table: [...V15_TABLE], source: "builtin" }
    : { table: [...V14_TABLE], source: "v14" };
}

export function defaultAcceptedCrcFor(version: VersionMode, table: readonly number[]): number {
  if (version === "le14") return table.includes(ACCEPTED_CRC_V14_0) ? ACCEPTED_CRC_V14_0 : table[0];
  return table.includes(DEFAULT_ACCEPTED_CRC) ? DEFAULT_ACCEPTED_CRC : table[0];
}

export function createState(): State {
  const version: VersionMode = "ge141";
  const { table, source } = defaultTableFor(version);
  return {
    mode: "basic",
    version,
    mathID: "1234-56789-12345",
    activationKey: randomActivationKey(version),
    licenseCode: "800001",
    expiry: defaultExpiry(),
    acceptedCrc: defaultAcceptedCrcFor(version, table),
    table,
    tableSource: source,
    password: "",
  };
}

export function loadState(): State {
  const base = createState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<State>;
    const version: VersionMode = saved.version === "le14" ? "le14" : "ge141";
    const dflt = defaultTableFor(version);
    const table = Array.isArray(saved.table) && saved.table.every((v) => Number.isInteger(v) && v > 0 && v <= 0xffff)
      ? saved.table as number[]
      : dflt.table;
    const mode: Mode = saved.mode === "advanced" ? "advanced" : "basic";
    const next: State = {
      ...base,
      ...saved,
      version,
      table,
      tableSource: saved.tableSource ?? dflt.source,
      mode,
      acceptedCrc: Number.isInteger(saved.acceptedCrc) ? saved.acceptedCrc! : defaultAcceptedCrcFor(version, table),
    };
    // Basic mode keeps no activation key: draw a fresh random one on every load.
    if (mode === "basic") next.activationKey = randomActivationKey(version);
    return next;
  } catch {
    return base;
  }
}

export function saveState(state: State): void {
  try {
    // Basic mode does not persist the activation key (it is random every time).
    const payload = state.mode === "basic" ? { ...state, activationKey: "" } : state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode: ignore */
  }
}

export function loadLang(): Lang | null {
  const v = localStorage.getItem("mathpass.lang");
  return v === "zh" || v === "en" ? v : null;
}

export function saveLang(lang: Lang): void {
  try { localStorage.setItem("mathpass.lang", lang); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ *
 * license code bits (documented for ≥ 14.1 — see report/04)
 * ------------------------------------------------------------------ */

export interface BitOption { bit: number; label: string }

/** Product bits, in the resolver's own priority order (report/04 §4.4). */
export const PRODUCT_BITS: BitOption[] = [
  { bit: 20, label: "Wolfram|Alpha Notebook Edition" },
  { bit: 22, label: "Wolfram Finance Platform" },
  { bit: 21, label: "Wolfram|One" },
  { bit: 23, label: "Mathematica" },
  { bit: 24, label: "Wolfram Financial Framework" },
  { bit: 26, label: "Wolfram Raspberry Pi" },
  { bit: 6, label: "Wolfram Player PRO" },
  { bit: 5, label: "Wolfram Player" },
];

export const CLASS_BITS: BitOption[] = [
  { bit: 1, label: "Trial" },
  { bit: 2, label: "Student" },
  { bit: 3, label: "Site" },
  { bit: 11, label: "Home" },
];

export const CAPABILITY_BITS: BitOption[] = [
  { bit: 13, label: "EnterpriseSigning" },
  { bit: 19, label: "AltExpirationPolicy" },
  { bit: 29, label: "AutoRenewingSubscription" },
  { bit: 28, label: "NoLLMSupport" },
];

export const BASE_BITS: BitOption[] = [
  { bit: 0, label: "base" },
];

export const ALL_KNOWN_BITS: number[] = [
  ...PRODUCT_BITS, ...CLASS_BITS, ...CAPABILITY_BITS, ...BASE_BITS,
].map((b) => b.bit);

export function licenseCodeValue(code: string): number {
  return (parseInt(code || "0", 16) >>> 0) || 0;
}

export function withBit(code: string, bit: number, on: boolean): string {
  const v = licenseCodeValue(code);
  const next = on ? (v | (1 << bit)) : (v & ~(1 << bit));
  return formatLicenseCode((next >>> 0).toString(16));
}

/** Set one bit of a group and clear the group's other bits (for the radio groups). */
export function withExclusiveBit(code: string, group: BitOption[], bit: number | null): string {
  let v = licenseCodeValue(code);
  for (const b of group) v &= ~(1 << b.bit);
  if (bit !== null) v |= 1 << bit;
  return formatLicenseCode((v >>> 0).toString(16));
}

export function selectedBitOf(code: string, group: BitOption[]): number | null {
  const v = licenseCodeValue(code);
  for (const b of group) if ((v >>> b.bit) & 1) return b.bit;
  return null;
}

export function unknownBits(code: string): number[] {
  const v = licenseCodeValue(code);
  const out: number[] = [];
  for (let b = 0; b < 32; b++) if ((v >>> b) & 1 && !ALL_KNOWN_BITS.includes(b)) out.push(b);
  return out;
}
