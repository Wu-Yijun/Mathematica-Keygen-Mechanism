/**
 * mathpass.ts — Wolfram Mathematica "mathpass" algorithm (reversed via REA/Ghidra).
 *
 * Password format, current (≥ 14.1):
 *     "xxxx-xxx-xxx::bbbbbb:yyyymmdd"     signature :: LicenseCode : expiry
 * Password format, older (≤ 14.0):
 *     "xxxx-xxx-xxx::bbbbbb"              signature :: LicenseCode
 *
 * Two MSB-first CRC-16 polynomials share the initial value 0xA5B6:
 *   P_B = 0x105C3  (condition B: the CRC over n0 ‖ MESSAGE must be an ACCEPTED CRC,
 *                   i.e. a member of the build's accepted-CRC table/whitelist)
 *   P_A = 0x1064B  (condition A: the CRC over n2 ‖ MESSAGE ‖ ω(n0) must be exactly 0)
 *
 *   MESSAGE = `${mathID}@${expiryDate}$${licenseCode}&${activationKey}`   (≥ 14.1)
 *   MESSAGE = `${mathID}$${licenseCode}&${activationKey}`                 (≤ 14.0)
 *   n1      = ceil(v1 * 65535 / 99999)      v1 = signature digits [3,2,6,1,10]
 *   n0      = (n1 + 0x8D06) mod 2^16
 *   n2      = ceil(v2 * 65535 / 99999)      v2 = signature digits [7,11,9,0,5]
 *
 *   condition B: CRC16(P_B, 0xA5B6, n0 ‖ MESSAGE)             ∈ ACCEPTED_CRC_TABLE
 *   condition A: CRC16(P_A, 0xA5B6, n2 ‖ MESSAGE ‖ ω(n0))    == 0
 *
 * The value demanded by condition B was called the "magic number" in earlier write-ups
 * (and the "initial hash" in the public reference implementation); the reversed code
 * only ever compares it for membership in a table, so it is named the **accepted CRC**
 * here, and the table the **accepted-CRC table**.
 *
 * Generation is closed-form: given MESSAGE and a chosen table entry, n0/n2 are obtained
 * by inverting an affine map over GF(2) (a 16x16 linear solve, O(1)).
 */

export const POLY_ACCEPTED_CRC = 0x105c3; // P_B — condition B (accepted CRC)
export const POLY_CHECK = 0x1064b;        // P_A — condition A (integrity)
export const CRC_INIT = 0xa5b6;           // shared initial value / JS target value
export const N0_OFFSET = 0x8d06;          // n0 = (n1 + N0_OFFSET) mod 2^16
export const N1_OFFSET = 0x72fa;          // n1 = (n0 + N1_OFFSET) mod 2^16

// JS-side LSB-first polynomial codes (used for cross-checking); P = 2*code + 1
const HASHPOLY_1 = 0x82e1;
const HASHPOLY_2 = 0x8325;

/**
 * Accepted-CRC table (whitelist) of WolframEngine.dll v15.0.1 (VA 0x186d4dd40, count 21).
 * A password is accepted only if its condition-B CRC is a member of this exact set.
 */
export const ACCEPTED_CRC_TABLE_V15_0_1: readonly number[] = [
  35944, 59222, 46288, 52525, 8925, 26304, 54607, 45075, 21527, 31889, 22384,
  31827, 25836, 29678, 16905, 35954, 53711, 24735, 28536, 11836, 61068,
];

/** Accepted-CRC value used by the public v14 reference implementation (unverified set). */
export const ACCEPTED_CRC_V14_0 = 24816;

/* ------------------------------------------------------------------ *
 * CRC-16 (MSB-first, polynomial includes the x^16 term)
 * ------------------------------------------------------------------ */

export function crc16(poly: number, state: number, bytes: Iterable<number>): number {
  let s = state & 0xffff;
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) {
      let n = ((s << 1) | ((b >> i) & 1)) >>> 0;
      if (s & 0x8000) n = (n ^ poly) >>> 0;
      s = n & 0xffff;
    }
  }
  return s;
}

export function crc16Uint16(poly: number, state: number, value: number): number {
  let s = state & 0xffff;
  for (let i = 15; i >= 0; i--) {
    let n = ((s << 1) | ((value >> i) & 1)) >>> 0;
    if (s & 0x8000) n = (n ^ poly) >>> 0;
    s = n & 0xffff;
  }
  return s;
}

/** LSB-first hasher used by the public JS model (kept for cross-checks). */
export function hasher(code: number, hash: number, byte: number): number {
  hash &= 0xffff;
  for (let i = 0; i < 8; i++, byte >>= 1) {
    const bit = byte & 1;
    if ((hash & 1) === bit) hash >>>= 1;
    else { hash >>>= 1; hash ^= code; }
  }
  return hash & 0xffff;
}

/* ------------------------------------------------------------------ *
 * GF(2) linear algebra (closed-form 2-byte inversion)
 * ------------------------------------------------------------------ */

/** Solve `XOR_{j : bit j of x set} cols[j] === y` (cols assumed full-rank). */
export function solveLinear16(cols: number[], y: number): number {
  const mat: { coef: number; rhs: number }[] = [];
  for (let i = 0; i < 16; i++) {
    let coef = 0;
    for (let j = 0; j < 16; j++) if ((cols[j] >> i) & 1) coef |= 1 << j;
    mat.push({ coef, rhs: (y >> i) & 1 });
  }
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < 16 && row < 16; col++) {
    let sel = -1;
    for (let r = row; r < 16; r++) if ((mat[r].coef >> col) & 1) { sel = r; break; }
    if (sel < 0) continue;
    [mat[row], mat[sel]] = [mat[sel], mat[row]];
    for (let r = 0; r < 16; r++)
      if (r !== row && ((mat[r].coef >> col) & 1))
        mat[r] = { coef: mat[r].coef ^ mat[row].coef, rhs: mat[r].rhs ^ mat[row].rhs };
    pivots.push(col);
    row++;
  }
  let x = 0;
  for (let k = 0; k < pivots.length; k++) if (mat[k].rhs) x |= 1 << pivots[k];
  let chk = 0;
  for (let j = 0; j < 16; j++) if ((x >> j) & 1) chk ^= cols[j];
  if (chk !== (y & 0xffff)) throw new Error("solveLinear16: no solution");
  return x & 0xffff;
}

/**
 * Return the two bytes `c1 | c2<<8` such that
 * `hasher(code, hasher(code, h, c1), c2) === target`, in O(16^2).
 */
export function solveAppend2(code: number, h: number, target: number): number {
  const f = (w: number): number => hasher(code, hasher(code, h, w & 0xff), (w >> 8) & 0xff);
  const c0 = f(0);
  const cols: number[] = [];
  for (let j = 0; j < 16; j++) cols.push(f(1 << j) ^ c0);
  return solveLinear16(cols, c0 ^ target);
}

/* ------------------------------------------------------------------ *
 * message / signature
 * ------------------------------------------------------------------ */

export interface ParsedPassword { signature: string; licenseCode: string; expiryDate: string }

export function parsePassword(password: string): ParsedPassword {
  const [signature = "", , licenseCode = "", expiryDate = ""] = password.split(":");
  return { signature, licenseCode, expiryDate };
}

export function extract(signature: string): { v1: number; v2: number; n1: number; n2: number } {
  const v1 = Number(signature[3] + signature[2] + signature[6] + signature[1] + signature[10]);
  const v2 = Number(signature[7] + signature[11] + signature[9] + signature[0] + signature[5]);
  return { v1, v2, n1: Math.ceil((v1 * 65535) / 99999), n2: Math.ceil((v2 * 65535) / 99999) };
}

/** MESSAGE of the current (≥ 14.1) format. */
export function messageOf(mathID: string, activationKey: string, licenseCode: string, expiryDate: string): string {
  return `${mathID}@${expiryDate}$${licenseCode}&${activationKey}`;
}

/** MESSAGE of the older (≤ 14.0) format: no expiry date. */
export function messageOfLegacy(mathID: string, activationKey: string, licenseCode: string): string {
  return `${mathID}$${licenseCode}&${activationKey}`;
}

/** The condition-B CRC (the accepted CRC) of an arbitrary MESSAGE + signature. */
export function acceptedCrcOfSignature(message: string, signature: string): number {
  const { n1 } = extract(signature);
  const n0 = (n1 + N0_OFFSET) % 65536;
  return crc16(POLY_ACCEPTED_CRC, CRC_INIT, [n0 >> 8, n0 & 0xff, ...[...message].map((c) => c.charCodeAt(0))]);
}

/** The condition-B CRC (the accepted CRC) of a password in the current format. */
export function acceptedCrcOf(mathID: string, activationKey: string, password: string): number {
  const { signature, licenseCode, expiryDate } = parsePassword(password);
  return acceptedCrcOfSignature(messageOf(mathID, activationKey, licenseCode, expiryDate), signature);
}

/* ------------------------------------------------------------------ *
 * verification
 * ------------------------------------------------------------------ */

export interface VerifyResult {
  valid: boolean;        // integrity && accepted-CRC is in the table
  integrityOk: boolean;  // condition A == 0
  inTable: boolean;      // condition B result ∈ table
  acceptedCrc: number;   // condition B result
  n0: number; n1: number; n2: number;
  message: string;
}

/** Verify a signature against an arbitrary MESSAGE (format-agnostic core). */
export function verifySignature(
  message: string, signature: string, table: readonly number[] = ACCEPTED_CRC_TABLE_V15_0_1,
): VerifyResult {
  const { n1, n2 } = extract(signature);
  const n0 = (n1 + N0_OFFSET) % 65536;

  // condition A (integrity): CRC(P_A, init, n2 ‖ message ‖ ω(n0)) == 0
  let a = crc16Uint16(POLY_CHECK, CRC_INIT, n2);
  a = crc16(POLY_CHECK, a, [...message].map((c) => c.charCodeAt(0)));
  a = crc16Uint16(POLY_CHECK, a, omega(n0));

  const acceptedCrc = acceptedCrcOfSignature(message, signature);
  const inTable = table.includes(acceptedCrc);

  return { valid: a === 0 && inTable, integrityOk: a === 0, inTable, acceptedCrc, n0, n1, n2, message };
}

/** Verify a password against an arbitrary MESSAGE (format-agnostic). */
export function verifyMessage(
  message: string, password: string, table: readonly number[] = ACCEPTED_CRC_TABLE_V15_0_1,
): VerifyResult {
  return verifySignature(message, parsePassword(password).signature, table);
}

export function verify(
  mathID: string, activationKey: string, password: string,
  table: readonly number[] = ACCEPTED_CRC_TABLE_V15_0_1,
): VerifyResult {
  const { licenseCode, expiryDate } = parsePassword(password);
  return verifyMessage(messageOf(mathID, activationKey, licenseCode, expiryDate), password, table);
}

/* ------------------------------------------------------------------ *
 * generation (closed form)
 * ------------------------------------------------------------------ */

/**
 * ω — the inverse digit transform used as the extra 2-byte suffix of condition A
 * (mirrors FUN_181cf3fa0 / FUN_1400f48e0).
 *
 *   1. n1      = (n0 + 0x72FA) mod 2^16                 -> back to the 16-bit space
 *   2. group   = floor(n1 * 99999 / 65535)              -> the 5-digit decimal group
 *   3. permute the 5 digits: d0 d1 d2 d3 d4 -> d0 d1 d3 d4 d2
 *   4. return ceil(permuted * 65535 / 99999)            -> back to the 16-bit space
 */
function omega(n0: number): number {
  const n1 = (n0 + N1_OFFSET) & 0xffff;
  const group = Math.floor((n1 * 99999) / 65535);
  const text = String(group).padStart(5, "0").split("");
  const permuted = Number([text[0], text[1], text[3], text[4], text[2]].join(""));
  return Math.ceil((permuted * 65535) / 99999) & 0xffff;
}

function encodingHash(n1: number): number {
  let x = Math.floor((n1 * 99999) / 65535);
  const a = x % 100; x -= a;
  const b = x % 1000; x -= b;
  x += a * 10 + b / 100;
  const t = Math.ceil((x * 65535) / 99999);
  return hasher(HASHPOLY_2, hasher(HASHPOLY_2, 0, t & 0xff), t >> 8);
}

function splitHex(x: number): number[] {
  let n = Math.floor((x * 99999) / 0xffff);
  const out: number[] = [];
  for (let i = 0; i < 5; i++) { out.push(n % 10); n = Math.floor(n / 10); }
  return out;
}

function constructSignature(n1: number, n2: number): string {
  const a = splitHex(n1).reverse();
  const b = splitHex(n2).reverse();
  return `${b[3]}${a[3]}${a[1]}${a[0]}-${b[4]}${a[2]}${b[0]}-${b[2]}${a[4]}${b[1]}`;
}

/**
 * Generate the 12-character signature for an arbitrary MESSAGE so that its condition-B
 * CRC equals `acceptedCrc`. `acceptedCrc` MUST be an entry of the target build's table.
 * Complexity O(|message| + 16^2).
 */
export function generateSignature(message: string, acceptedCrc: number): string {
  const chars = [...message].reverse().map((c) => c.charCodeAt(0));

  // condition B -> n0
  let h1 = acceptedCrc;
  for (const c of chars) h1 = hasher(HASHPOLY_1, h1, c);
  const n0 = solveAppend2(HASHPOLY_1, h1, CRC_INIT);
  const n1 = (n0 + N1_OFFSET) % 65536;

  // condition A -> n2
  let h2 = encodingHash(n1);
  for (const c of chars) h2 = hasher(HASHPOLY_2, h2, c);
  const n2 = solveAppend2(HASHPOLY_2, h2, CRC_INIT);

  return constructSignature(n1, n2);
}

/** Generate a password in the current (≥ 14.1) format. */
export function generatePassword(
  mathID: string, activationKey: string, licenseCode: string, expiryDate: string, acceptedCrc: number,
): string {
  const message = messageOf(mathID, activationKey, licenseCode, expiryDate);
  return `${generateSignature(message, acceptedCrc)}::${licenseCode}:${expiryDate}`;
}

/** Generate a password in the older (≤ 14.0) format. */
export function generatePasswordLegacy(
  mathID: string, activationKey: string, licenseCode: string, acceptedCrc: number,
): string {
  const message = messageOfLegacy(mathID, activationKey, licenseCode);
  return `${generateSignature(message, acceptedCrc)}::${licenseCode}`;
}
