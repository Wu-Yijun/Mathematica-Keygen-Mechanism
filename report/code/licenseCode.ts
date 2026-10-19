/**
 * licenseCode.ts — decode `LicenseCode`, the field historically called "Math Num".
 *
 * `LicenseCode` (the `bbbbbb` part of a password) is a **hexadecimal bitmask**: every
 * set bit names a product nature, a licence class or a capability.  The front end reads
 * it with `FUN_140da32d0(code, licenseCode)` = `(parse(licenseCode) >> atoi(code)) & 1`.
 *
 * See report/04-license-code.md.
 */

/** bit index -> meaning (from WolframNB.exe: FUN_140a8abd0 / FUN_140a8ad70 / FUN_140a8b0e0). */
export const LICENSE_BITS: Readonly<Record<number, { kind: "product" | "class" | "feature"; name: string }>> = {
  0: { kind: "feature", name: "base" },
  1: { kind: "class", name: "Trial" },
  2: { kind: "class", name: "Student" },
  3: { kind: "class", name: "Site" },
  5: { kind: "product", name: "WolframPlayer" },
  6: { kind: "product", name: "WolframPlayerPro" },
  11: { kind: "class", name: "Home" },
  13: { kind: "feature", name: "EnterpriseSigning" },
  19: { kind: "feature", name: "AltExpirationPolicy" },
  20: { kind: "product", name: "WolframAlphaNB" },
  21: { kind: "product", name: "WolframOne" },
  22: { kind: "product", name: "WolframFinancePlatform" },
  23: { kind: "product", name: "Mathematica" },
  24: { kind: "product", name: "WolframFinancialFramework" },
  26: { kind: "product", name: "WolframRaspberryPi" },
  28: { kind: "feature", name: "NoLLMSupport" },
  29: { kind: "feature", name: "AutoRenewingSubscription" },
};

/** Product priority order, exactly as FUN_140a8abd0 tests it (first match wins). */
const PRODUCT_PRIORITY = [20, 22, 21, 23, 24, 26, 6, 5];

/** `licenseCode` string -> number. Hex (the binary parses it as a number, not decimal). */
export function licenseCodeValue(licenseCode: string): number {
  return parseInt(licenseCode, 16) >>> 0;
}

/** The predicate FUN_140da32d0: is bit `bit` set? */
export function hasBit(licenseCode: string, bit: number): boolean {
  return ((licenseCodeValue(licenseCode) >>> (bit & 31)) & 1) !== 0;
}

export interface DecodedLicenseCode {
  value: number;
  bits: number[];
  product: string;
  licenseClass: string;
  capabilities: string[];
}

/** Full decode, following the front end's resolvers. */
export function decodeLicenseCode(licenseCode: string): DecodedLicenseCode {
  const n = licenseCodeValue(licenseCode);
  const bits: number[] = [];
  for (let b = 0; b < 32; b++) if ((n >>> b) & 1) bits.push(b);

  let product = "Wolfram"; // FUN_1403754d0 fall-back (env/registry or "Wolfram")
  for (const b of PRODUCT_PRIORITY) if (hasBit(licenseCode, b)) { product = LICENSE_BITS[b].name; break; }

  let licenseClass = "Professional";
  for (const b of [1, 2, 3, 11]) if (hasBit(licenseCode, b)) { licenseClass = LICENSE_BITS[b].name; break; }

  const capabilities: string[] = [];
  if (hasBit(licenseCode, 13)) capabilities.push("EnterpriseSigning");
  if (hasBit(licenseCode, 19)) capabilities.push("AltExpirationPolicy");
  if (hasBit(licenseCode, 29)) capabilities.push("AutoRenewingSubscription");
  if (!hasBit(licenseCode, 28)) capabilities.push("LLMSupport");

  return { value: n, bits, product, licenseClass, capabilities };
}
