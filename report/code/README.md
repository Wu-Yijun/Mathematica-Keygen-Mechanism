**中文** · [English](README.zh.md)

# Report code

TypeScript implementations of the reversed `mathpass` scheme. Run with a TypeScript-
capable Node (Node ≥ 22 runs `.ts` directly via type stripping; tested on Node 26).
The commands below assume this folder as the working directory; from the repository root,
prefix them with `report/code/`.

```bash
node selfcheck.ts                    # validates the reconstruction end-to-end
node cli.ts table                    # print the installed build's accepted-CRC table (v15.0.1)
node cli.ts verify      0000-00000-00000 0000-0000-AAAAAA 9528-122-377::800001:20300101
node cli.ts acceptedcrc 0000-00000-00000 0000-0000-AAAAAA 9528-122-377::800001:20300101
node cli.ts generate    0000-00000-00000 0000-0000-AAAAAA 800001 20300101 59222
node cli.ts decode      800001                       # LicenseCode -> product / class / caps
node accepted-crc-table.ts "…\WolframEngine.dll"     # extract the table from a PE
```

| File | Contents |
| --- | --- |
| `mathpass.ts` | `crc16`, `crc16Uint16`, `solveLinear16`, `solveAppend2`, `extract`, `messageOf`, `messageOfLegacy`, `acceptedCrcOf`, `acceptedCrcOfSignature`, `verify`, `verifyMessage`, `verifySignature`, `generateSignature`, `generatePassword`, `generatePasswordLegacy`, `ACCEPTED_CRC_TABLE_V15_0_1` |
| `licenseCode.ts` | `LICENSE_BITS`, `licenseCodeValue`, `hasBit`, `decodeLicenseCode` — the `LicenseCode` bitmask |
| `accepted-crc-table.ts` | `parsePe`, `findCodeRefs`, `scanAcceptedCrcTables` — extract the accepted-CRC table from a PE |
| `cli.ts` | command line: `verify` / `acceptedcrc` / `generate` / `decode` / `table` |
| `selfcheck.ts` | generates and verifies a synthetic placeholder licence; checks every table entry and every `LicenseCode` case |

All licence values used here are **synthetic placeholders**, not real activation data.

## `selfcheck.ts` (all PASS)

```
PASS  generate(acceptedCrc=59222) = 9528-122-377::800001:20300101
PASS  verify sample licence -> acceptedCrc=59222 inTable=true valid=true
PASS  off-table accepted CRC 24816 -> acceptedCrc=24816 inTable=false valid=false
PASS  solveAppend2=56555 == brute-force=56555
PASS  all 21 accepted-CRC values generate valid passwords
PASS  LicenseCode 800001 -> product=Mathematica class=Professional
PASS  LicenseCode 100000 -> product=WolframAlphaNB class=Professional
PASS  LicenseCode 000020 -> product=WolframPlayer class=Professional
PASS  LicenseCode 000040 -> product=WolframPlayerPro class=Professional
PASS  LicenseCode 800002 -> product=Mathematica class=Trial
PASS  LicenseCode 800004 -> product=Mathematica class=Student
…
```

## `accepted-crc-table.ts` (extract)

```
candidate table
  VA          : 0x186d4dd40  (file offset 0x6d4cb40)
  count       : 21
  code refs   : 0x181cf3d0e   <-- referenced by validator
  values      : 35944, 59222, 46288, ... 61068
```

The `code refs` line distinguishes the *real* table from unrelated integer arrays: it
is referenced by a RIP-relative load inside the CRC checker.
