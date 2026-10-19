# Wolfram Mathematica `mathpass` — Full Reverse-Engineering Report

**English** · [中文](README.zh.md)

A complete, reproducible reverse-engineering of the offline licence-password scheme
("`mathpass`") used by **Wolfram 15.0.1** (the build analysed here), including the
server-side key-generation logic it implies, the **`LicenseCode`** (product/class/feature)
bitmask, and the on-disk **accepted-CRC whitelist**.

Every claim is backed by decompilation of the shipped binaries and validated with
read-only oracles; the reconstructed generator reproduces a **genuine licence password
byte-for-byte** (that licence is not published here - see [09](09-validation.md)).

> The public reference implementation `main@v14.1.0.js` is a **v14.1.0**
> artifact; the binary analysed here is the installed **15.0.1**. The scheme and the
> password format are the same; the *accepted-CRC whitelist* and *product shells* are
> build-specific.

---

## The scheme in one picture

```
mathpass entry (TAB separated):  name   mathID   activationKey   password
                                  │        │           │
                                  │        │           └──────────────┐
        password = signature "::" LicenseCode ":" expiryDate          │
                     │                │                               │
   MESSAGE = mathID "@" expiryDate "$" LicenseCode "&" activationKey ◄─┘

   ── verification (offline, in WolframEngine.dll) ─────────────────────────────
   signature ─► (n0, n2) ─┬─ A:  CRC16(poly 0x1064B, init 0xA5B6, n2 ‖ MESSAGE ‖ ω(n0)) == 0
                          └─ B:  CRC16(poly 0x105C3, init 0xA5B6, n0 ‖ MESSAGE) ∈ ACCEPTED_CRC_TABLE

   ── beyond verification (front end WolframNB.exe) ───────────────────────────
   LicenseCode (hex bitmask) ─► product bit  ─► ProductIDName ─► product shell paclet
                             ├─ class bit    ─► $LicenseType / licence UI bar
                             └─ feature bit  ─► capabilities

   ── generation (server side) ────────────────────────────────────────────────
   choose acceptedCrc ∈ ACCEPTED_CRC_TABLE ;  solve n0, n2 by CRC inversion (GF(2) linear solve) ;  format
```

## Component map (where everything lives)

| subsystem | binary | functions (VA) |
| --- | --- | --- |
| signature parser | `WolframEngine.dll` | `FUN_181cf3d50` |
| CRC checker + accepted-CRC lookup | `WolframEngine.dll` | `FUN_181cf3650` (+ `FUN_181cf3fa0` = `ω`) |
| expiry handler | `WolframEngine.dll` | `FUN_181cf30f0` |
| accepted-CRC whitelist | `WolframEngine.dll` | table `0x186d4dd40`, count `0x186d4dd94` |
| `LicenseCode` decode | `WolframNB.exe` (front end) | `FUN_140dac1f0`, `FUN_140a8abd0`, `FUN_140a8ad70`, `FUN_140a8b0e0`, `FUN_140da32d0`, `FUN_1403754d0` |
| activation client | `reqpwd.exe` | HTTPS client only |
| same code, small copy | `SessionManager.exe` | `FUN_1400f4690`, `FUN_1400f3f30`, `FUN_1400f3d00` |

Details and evidence: [02 §2.5](02-reverse-engineering.md#25-subsystem-c--the-licensecode-product--class--feature).

## Document index

| # | Document | Contents |
| --- | --- | --- |
| 01 | [01-target-and-tooling.md](01-target-and-tooling.md) | target identity, hashes, binaries, toolchain, reproduction checklist |
| 02 | [02-reverse-engineering.md](02-reverse-engineering.md) | **the reverse-engineering method and component map** (by subsystem, incl. `LicenseCode`) |
| 03 | [03-verification-flow.md](03-verification-flow.md) | end-to-end verification flow and the exact conditions |
| 04 | [04-license-code.md](04-license-code.md) | **`LicenseCode`**: product / class / feature bitmask and logic |
| 05 | [05-accepted-crc.md](05-accepted-crc.md) | the accepted-CRC whitelist: extraction principle and patterns |
| 06 | [06-key-generation.md](06-key-generation.md) | server-side key generation and its rationale |
| 07 | [07-mathematics.md](07-mathematics.md) | GF(2) CRC algebra, affine bijection, invertibility, encoding |
| 08 | [08-reconstructed-source.md](08-reconstructed-source.md) | reconstructed C source with meaningful variable names |
| 09 | [09-validation.md](09-validation.md) | every validation experiment and its result |

## Artifacts

| folder | contents |
| --- | --- |
| [`pseudocode/`](pseudocode/) | language-neutral pseudocode, one file per topic |
| [`decompiled/`](decompiled/) | raw Ghidra pseudocode bodies (`.c`), one per function, with headers |
| [`code/`](code/) | TypeScript: verification, generation, `LicenseCode` decode, accepted-CRC extraction |

## Reproduce it

```bash
# TypeScript (Node ≥ 22 runs .ts directly)
node report/code/selfcheck.ts        # validates the whole reconstruction
node report/code/cli.ts verify 0000-00000-00000 0000-0000-AAAAAA 9528-122-377::800001:20300101
node report/code/accepted-crc-table.ts "…\WolframEngine.dll"   # extract the whitelist
```

Static analysis used REA + Ghidra; see [02 §2.0](02-reverse-engineering.md#20-tooling)
