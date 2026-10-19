/**
 * selfcheck.ts — validates the reconstruction against a synthetic placeholder licence.
 *
 * Run from the repository root:  node report/code/selfcheck.ts
 */
import {
  ACCEPTED_CRC_TABLE_V15_0_1, acceptedCrcOf, generatePassword, solveAppend2, verify,
} from "./mathpass.ts";
import { decodeLicenseCode } from "./licenseCode.ts";

let ok = true;
const check = (cond: boolean, msg: string) => { ok &&= cond; console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); };

// A synthetic placeholder licence. These are NOT real activation values.
const sample = {
  id: "0000-00000-00000",
  key: "0000-0000-AAAAAA",
  licenseCode: "800001",
  expiry: "20300101",
  pw: "9528-122-377::800001:20300101",
};

// 1) the generator produces the expected password, and it verifies
const gen = generatePassword(sample.id, sample.key, sample.licenseCode, sample.expiry, 59222);
check(gen === sample.pw, `generate(acceptedCrc=59222) = ${gen}`);

const rv = verify(sample.id, sample.key, gen);
check(rv.acceptedCrc === 59222 && rv.inTable && rv.valid,
  `verify sample licence -> acceptedCrc=${rv.acceptedCrc} inTable=${rv.inTable} valid=${rv.valid}`);

// 2) an accepted CRC outside the table is rejected (e.g. the public PoC's 24816)
const offTable = generatePassword(sample.id, sample.key, sample.licenseCode, sample.expiry, 24816);
const vo = verify(sample.id, sample.key, offTable);
check(vo.acceptedCrc === 24816 && !vo.inTable && !vo.valid,
  `off-table accepted CRC 24816 -> acceptedCrc=${vo.acceptedCrc} inTable=${vo.inTable} valid=${vo.valid}`);

// 3) the O(1) 2-byte solve matches an exhaustive 65536-iteration search
const w = solveAppend2(0x82e1, 0x1234, 0xa5b6);
let brute = -1;
for (let i = 0; i < 65536 && brute < 0; i++) {
  let h = hasherInline(0x82e1, 0x1234, i & 0xff);
  h = hasherInline(0x82e1, h, (i >> 8) & 0xff);
  if (h === 0xa5b6) brute = i;
}
check(w === brute, `solveAppend2=${w} == brute-force=${brute}`);
function hasherInline(code: number, hash: number, byte: number): number {
  hash &= 0xffff;
  for (let i = 0; i < 8; i++, byte >>= 1) {
    const bit = byte & 1;
    if ((hash & 1) === bit) hash >>>= 1; else { hash >>>= 1; hash ^= code; }
  }
  return hash & 0xffff;
}

// 4) every table entry generates a password that verifies
check(
  ACCEPTED_CRC_TABLE_V15_0_1.every((m) =>
    verify(sample.id, sample.key, generatePassword(sample.id, sample.key, sample.licenseCode, sample.expiry, m)).valid),
  `all ${ACCEPTED_CRC_TABLE_V15_0_1.length} accepted-CRC values generate valid passwords`,
);

// 5) LicenseCode decode matches the front-end / kernel oracle results
const LC: [string, string, string][] = [
  ["800001", "Mathematica", "Professional"],
  ["800000", "Mathematica", "Professional"],
  ["100000", "WolframAlphaNB", "Professional"],
  ["200001", "WolframOne", "Professional"],
  ["400001", "WolframFinancePlatform", "Professional"],
  ["000020", "WolframPlayer", "Professional"],
  ["000040", "WolframPlayerPro", "Professional"],
  ["800002", "", "Trial"],
  ["800004", "", "Student"],
];
for (const [lc, prod, cls] of LC) {
  const d = decodeLicenseCode(lc);
  check((prod === "" || d.product === prod) && d.licenseClass === cls,
    `LicenseCode ${lc} -> product=${d.product} class=${d.licenseClass}`);
}

console.log("\naccepted-CRC table:", ACCEPTED_CRC_TABLE_V15_0_1.join(", "));
console.log(`acceptedCrcOf(sample) = ${acceptedCrcOf(sample.id, sample.key, sample.pw)}`);
console.log(ok ? "\nALL PASS" : "\nFAILURES");
process.exit(ok ? 0 : 1);
