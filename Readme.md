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

The algorithm and the command line live in [`report/code/`](report/code/README.md); Node ≥ 22 runs
the `.ts` files directly (type stripping).

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

## Verification logic and the maths

### The logic

There is no licence database to compare against: a password is accepted **iff two CRC conditions
hold**, and everything after that only interprets what the signature already proved.

```
password  ── split on ':' ─► signature | LicenseCode | expiry   (expiry only for ≥ 14.1)
signature ── fixed digit permutation, then ceil(v · 65535 / 99999) ─► n1, n2
                                n0 = (n1 + 0x8D06) mod 2^16
MESSAGE   =  mathID@YYYYMMDD$LicenseCode&activationKey            (≥ 14.1)
             mathID$LicenseCode&activationKey                     (≤ 14.0)

condition A   CRC_{P_A}(n2 ‖ MESSAGE ‖ ω(n0)) == 0                integrity
condition B   CRC_{P_B}(n0 ‖ MESSAGE) ∈ Accepted-CRC table        authenticity

accept  ⇔  A and B
then:  expiry date checked · LicenseCode decoded into product / class / capabilities
```

Order and coverage are the point:

- the signature is checked **before** anything else is trusted, and both CRC conditions run on
  `MESSAGE`, so `LicenseCode` and the expiry date cannot be edited without breaking them;
- the **expiry date** is a separate, later check (`Password has expired.`) — see
  [03-verification-flow.md](report/03-verification-flow.md);
- the **product / edition is not decided by the CRC** — that is the `LicenseCode` bitmask
  ([04-license-code.md](report/04-license-code.md));
- the authenticity condition only asks whether the CRC lands on one of a small set of values, one
  whitelist per build ([05-accepted-crc.md](report/05-accepted-crc.md));
- chapters in full: [01](report/01-target-and-tooling.md)–[02](report/02-reverse-engineering.md)
  (method), [03](report/03-verification-flow.md) (the flow), [04](report/04-license-code.md),
  [05](report/05-accepted-crc.md), [06](report/06-key-generation.md) (server-side generation),
  [07](report/07-mathematics.md) (the algebra), [08](report/08-reconstructed-source.md)
  (reconstructed source), [09](report/09-validation.md) (all validation experiments).

### The maths

The 12-character signature encodes two 16-bit values; `v1` and `v2` are two 5-digit decimal groups
read out of the signature by a fixed permutation (obfuscation only, see
[07-mathematics.md](report/07-mathematics.md)):

```
n1 = ceil(v1 · 65535 / 99999)      n2 = ceil(v2 · 65535 / 99999)
n0 = (n1 + 0x8D06) mod 2^16
```

Both conditions are **MSB-first CRC-16** sharing the initial value `0xA5B6`, i.e. arithmetic in
`GF(2)[x] / (x^16)` with polynomials `P_A = 0x1064B` and `P_B = 0x105C3`:

- **condition A (integrity)** — `CRC_{P_A}(n2 ‖ MESSAGE ‖ ω(n0)) == 0`
- **condition B (authenticity)** — `CRC_{P_B}(n0 ‖ MESSAGE) ∈ Accepted-CRC table`
  (21 entries for 15.0.1)

**Generating needs no search.** Once `MESSAGE` is fixed, `n0` and `n2` are just the 2-byte prefixes
in front of `MESSAGE` and `ω(n0)`. A 2-byte prefix acts as an **affine bijection over GF(2)** on the
CRC state, so a 16×16 linear solve produces them in `O(|MESSAGE|)` — not a search over keys or
parameters ([06-key-generation.md](report/06-key-generation.md),
[code/selfcheck.ts](report/code/selfcheck.ts) re-derives a real licence from scratch).

## Notes

- Every default value on the page is a **synthetic placeholder**; this repository ships **no vendor binaries**, **no real licence** and **no working key**.
- The top of the UI switches between **Basic mode** (just a version and a Math ID) and **Advanced mode** (all fields + bit editor + table import); it supports Chinese/English switching.
- See [`DISCLAIMER.md`](DISCLAIMER.md) for the disclaimer.
