# Mathematica-Keygen-Mechanism

**English** · [中文](Readme.zh.md)

A reverse-engineering based tool for Wolfram's `mathpass` licence passwords:
**generate**, **verify** and **extract the Accepted CRC**, plus **read the Accepted-CRC
table straight out of your own `WolframEngine.dll`**. The full reverse-engineering
process, the algorithm derivation and the server-side key-generation analysis live in
[`report/`](report/README.md).

## What it does

| Feature | Notes |
| --- | --- |
| Generate | Builds `signature::LicenseCode:YYYYMMDD` (≥ 14.1) or `signature::LicenseCode` (≤ 14.0) from Math ID, activation key, LicenseCode, expiry and the Accepted CRC |
| Verify | Checks condition A (integrity: CRC == 0) and condition B (CRC ∈ Accepted-CRC table), decodes the LicenseCode and reports the days left |
| Extract Accepted CRC | Computed straight from the password — O(1), no search |
| Read the table | Pick a local `WolframEngine.dll`: the page parses the PE in your browser, scans for the whitelist and cross-checks it against the validator's code reference. **The file is parsed locally and never uploaded.** |

## Usage

Online: <https://wu-yijun.github.io/Mathematica-Keygen-Mechanism/>

Local:

```bash
pnpm install
pnpm build      # src/index.ts -> dist/index.js, and copies index.html / index.css / logo.svg / favicon.ico into dist/
pnpm preview    # http://localhost:8137/
```

### Scripts (Node)

The algorithm and the command line live in [`report/code/`](report/code); Node ≥ 22 runs the
`.ts` files directly (type stripping).

Command line:

```bash
node report/code/cli.ts table                          # the built-in v15.0.1 Accepted-CRC table (21 entries)
node report/code/cli.ts verify      <mathID> <activationKey> <password>
node report/code/cli.ts acceptedcrc <mathID> <activationKey> <password>   # extract the Accepted CRC
node report/code/cli.ts generate    <mathID> <activationKey> <licenseCode> <YYYYMMDD> [acceptedCrc]
node report/code/cli.ts decode      <licenseCode|password>               # decode product / class / capabilities
node report/code/accepted-crc-table.ts <pe-file>                         # scan a local module for the table
```

As a module:

```ts
import {
  // verify: condition A (integrity, must be 0) + condition B (the Accepted CRC must be in the table)
  verify, verifyMessage, verifySignature,
  // generate (≥ 14.1 / ≤ 14.0)
  generatePassword, generatePasswordLegacy,
  // the condition-B result, from a password or from MESSAGE + signature
  acceptedCrcOf, acceptedCrcOfSignature,
  messageOf, messageOfLegacy, parsePassword, extract,
  ACCEPTED_CRC_TABLE_V15_0_1,                       // the built-in table
} from "./report/code/mathpass.ts";
import { decodeLicenseCode, LICENSE_BITS } from "./report/code/licenseCode.ts";
import { parsePe, findCodeRefs, scanAcceptedCrcTables } from "./report/code/accepted-crc-table.ts";

const pw = generatePassword("1234-56789-12345", "1234-5678-ABCDEF", "800001", "20300101", 59222);
console.log(verify("1234-56789-12345", "1234-5678-ABCDEF", pw, ACCEPTED_CRC_TABLE_V15_0_1).valid); // true
console.log(decodeLicenseCode("800001"));        // Mathematica / Professional
```

The page in `src/` imports exactly these modules — they are inlined into `dist/index.js` at build
time, so the page and the scripts can never drift apart.

## Structure and maths

**Structure.** `src/` is the page source; `tsdown` bundles it into `dist/` (together with
`index.html`, `index.css`, `logo.svg` and `favicon.ico`). `report/` holds the reverse-engineering
output: chapters `01`–`09`, `code/` (the algorithm and the CLI above), `pseudocode/`
(language-neutral pseudocode) and `decompiled/` (raw Ghidra output). `scripts/serve.mjs` serves a
local preview, and `.github/workflows/deploy.yaml` runs install → type check → algorithm
self-check → build → deploy `dist/`.

**Maths.** The 12-character signature of `signature::LicenseCode[:YYYYMMDD]` encodes two 16-bit
values, where `v1` and `v2` are two 5-digit decimal groups read out of the signature by a fixed
permutation (obfuscation only):

```
n1 = ceil(v1 · 65535 / 99999)      n2 = ceil(v2 · 65535 / 99999)
n0 = (n1 + 0x8D06) mod 2^16
```

Verification uses two **MSB-first CRC-16** that share the initial value `0xA5B6` (polynomials
`P_A = 0x1064B` and `P_B = 0x105C3`):

- **condition A (integrity)** — `CRC_{P_A}(n2 ‖ MESSAGE ‖ ω(n0)) == 0`
- **condition B (authenticity)** — `CRC_{P_B}(n0 ‖ MESSAGE) ∈ Accepted-CRC table`
  (one whitelist per build; 21 entries for 15.0.1)

with `MESSAGE = mathID@YYYYMMDD$LicenseCode&activationKey` (≥ 14.1) or
`mathID$LicenseCode&activationKey` (≤ 14.0).

**Generating needs no search.** Once `MESSAGE` is fixed, `n0` and `n2` are just the 2-byte prefixes
in front of `MESSAGE` and `ω(n0)`. A 2-byte prefix acts as an **affine bijection over GF(2)** on the
CRC state, so a 16×16 linear solve produces them in `O(|MESSAGE|)` — no search over keys or
parameters.

## Notes

- Every default value on the page is a **synthetic placeholder**; this repository ships **no vendor binaries**, **no real licence** and **no working key**.
- The top of the UI switches between **Basic mode** (just a version and a Math ID) and **Advanced mode** (all fields + bit editor + table import); it supports Chinese/English switching.
- See [`DISCLAIMER.md`](DISCLAIMER.md) for the disclaimer.
