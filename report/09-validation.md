**中文** · [English](09-validation.zh.md)

# 09 — Validation

Every claim in this report is backed either by decompiled code (see
[02](02-reverse-engineering.md) and [`decompiled/`](decompiled/)) or by a read-only
oracle. This chapter collects the *validations* — the experiments that confirm the
reconstruction is correct rather than merely plausible.

> **About the values used here.** Every licence value below is a **synthetic
> placeholder** (`0000-00000-00000` / `0000-0000-AAAAAA` / `800001` / `20300101`). The
> reconstruction was originally checked against a **genuine** licence of the analysed
> install and reproduced its password byte-for-byte; that licence's values are
> deliberately not published. Everything shown here is reproducible with the
> placeholders.

## 9.1 The generator reproduces a licence password byte-for-byte

[`code/selfcheck.ts`](code/selfcheck.ts) generates a password with an accepted CRC taken from the
extracted whitelist, then verifies it:

```
mathID = 0000-00000-00000   activationKey = 0000-0000-AAAAAA
LicenseCode = 800001        expiryDate = 20300101        acceptedCrc = 59222

generate(...)     ==  "9528-122-377::800001:20300101"
verify(...).valid ==  true
```

The same procedure run on the genuine licence of this install reproduced that licence's
password exactly — the strongest single confirmation of the extraction formula, the accepted CRC
formula, the whitelist and the generation algorithm.

Run it: `node report/code/selfcheck.ts` (from the repository root).

## 9.2 Verification of the sample licence

`verify("0000-00000-00000", "0000-0000-AAAAAA", "9528-122-377::800001:20300101")`:

| quantity | value |
| --- | --- |
| `n0`, `n1`, `n2` | `24474`, `53908`, `17951` |
| condition A (integrity) | `0` ✔ |
| condition B result (accepted CRC) | `59222` ∈ whitelist ✔ |
| verdict | valid |

## 9.3 The accepted CRC is unique and is a whitelist member

The 2-byte prefix that drives condition B onto a chosen accepted CRC is **unique** (a 2-byte
prefix acts as an affine bijection on the CRC state). An exhaustive 65536-iteration
search on the sample message finds exactly one prefix, and it equals the closed-form
solution. Any accepted CRC outside the 21-entry whitelist — e.g. the public proof-of-concept's
`24816` — is rejected.

## 9.4 The whitelist is build-specific

| table | where | count | differs from the other by |
| --- | --- | --- | --- |
| `SessionManager.exe` `DAT_140659e20` | System Modeler module | 21 | entry #15 = `16897` |
| `WolframEngine.dll` `0x186d4dd40` | kernel | 21 | entry #15 = `16905` |

Only `59222` and `35944` of the public JavaScript PoC's list coincide with the kernel's
21 entries — consistent with the list having come from a *different* build.

## 9.5 `LicenseCode` mapping — read-only oracles

**Front end** (`WolframNB.exe -pwfile <file>`; the system licence is not modified) —
product is read from the welcome window title:

| `LicenseCode` | bits | welcome title |
| --- | --- | --- |
| `800001` | 0, 23 | Welcome to Wolfram Mathematica |
| `800000` | 23 | Welcome to Wolfram Mathematica |
| `100000` | 20 | Welcome to Wolfram\|Alpha Notebook Edition |
| `200001` | 0, 21 | Welcome to Wolfram\|One |
| `400001` | 0, 22 | Welcome to Wolfram Finance Platform |
| `000020` | 5 | Welcome to Wolfram Player |
| `000040` | 6 | Welcome to Wolfram Player \| PRO |
| `000023` | 0, 1, 5 | Welcome to Wolfram Player |

**Kernel** (`wolframscript`) — licence class:

| `LicenseCode` | bits | `$LicenseType` |
| --- | --- | --- |
| `800001` | 0, 23 | Professional |
| `800002` | 1, 23 | Trial |
| `800004` | 2, 23 | Student |
| `200002` | 1, 21 | Trial |
| `400004` | 2, 22 | Student |
| `800021` | 0, 5, 23 | *rejected* (Player and Mathematica bits conflict) |

These confirm the `LicenseCode` bit table in [04](04-license-code.md).

## 9.6 The closed-form 2-byte solve equals exhaustive search

`code/selfcheck.ts` checks the O(1) GF(2) solver against a 65536-iteration brute force:

```
solveAppend2(0x82e1, 0x1234, 0xa5b6) == brute_force(...)     # identical
```

## 9.7 All whitelist entries produce valid passwords

Generating a password for the sample message with **each** of the 21 whitelist entries,
then verifying it, succeeds for all 21 — the whitelist is exactly the set of acceptable
accepted-CRC values for this build.

## 9.8 Reproducing the checks

```bash
node report/code/selfcheck.ts        # all of the above
```

The `LicenseCode` oracle experiments in §9.5 were run against a **copy** of a licence
file (`WolframNB.exe -pwfile` for the front end, a temporary `mathpass` for
`wolframscript`), so the system licence at
`%ProgramData%\Wolfram\Licensing\mathpass` was never modified.

> The REA/Ghidra Evidence JSON that backs the decompilation is **not bundled** in this
> repository; the extracted pseudocode bodies are kept in [`decompiled/`](decompiled/).
