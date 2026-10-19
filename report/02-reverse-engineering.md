# 02 — Reverse Engineering: Method, Tooling, and Component Map

**English** · [中文](02-reverse-engineering.zh.md)

This chapter is the report's reverse-engineering core. It is organised **by subsystem**
(not by the order the work happened) and covers every part of the licensing scheme:
the password validator, the accepted-CRC whitelist, the **LicenseCode** (product/class/feature),
the activation client, and the oracles used to confirm each finding. Concrete function
addresses, evidence files, and the raw decompilation are cited throughout.

All addresses are **virtual addresses (VA)** as reported by REA/Ghidra. The analysis ran
on the shipped binaries with REA driving Ghidra; the extracted pseudocode bodies are in
[`decompiled/`](decompiled/) and the language-neutral pseudocode in
[`pseudocode/`](pseudocode/).

## 2.0 Tooling

| item | value |
| --- | --- |
| Target OS / host | Windows 11 x64 |
| RE harness | REA (`rea-agents` 6.5.0) driving **Ghidra 12.1.4** headless |
| JDK | the JDK 21 bundled with Wolfram (`SystemFiles\Java\Windows-x86-64`, Zulu 21.0.11) |
| Env | `GHIDRA_INSTALL_DIR`, `JAVA_HOME`, `GHIDRA_HEADLESS_MAXMEM`, `REA_GHIDRA_STARTUP_TIMEOUT_MS` |
| Driver | REA CLI: `rea function <binary> --procedure <VA> --provider ghidra` |

No disassembler other than Ghidra was used; no IDA/OllyDbg was required. Ghidra is used
strictly as a *reader* of shipped bytes — the original executables are never modified.

## 2.1 Reconnaissance — which binaries implement the licensing

Everything started from a single distinctive string, searched across the whole install:

```powershell
findstr /S /M /C:"Password not in format dddd-ddd-ddd." *.dll *.exe
```

Hits:

| module | role |
| --- | --- |
| `SystemFiles\Libraries\Windows-x86-64\WolframEngine.dll` (120 MB) | the kernel — authoritative for Mathematica |
| `SystemFiles\Components\WSMCore\bin\SessionManager.exe` (6.7 MB) | smallest copy of the same code (fast reconnaissance) |
| `SystemFiles\Components\WSMCore\bin\WSMKernelX.exe` (94 MB) | System Modeler kernel |
| `SystemFiles\FrontEnd\Binaries\Windows-x86-64\WolframNB.exe` (36 MB) | the **front end** — where product selection lives |

`SystemFiles\Activation\Windows-x86-64\reqpwd.exe` is the *online activation client*
(see §2.6), not the offline validator.

Analysis therefore uses three targets: the kernel (authoritative validator), the small
`SessionManager.exe` copy (same functions, 18× faster to analyse), and the front end
(product/class/feature selection).

## 2.2 PE mechanics the analysis relies on

Raw byte scans yield **file offsets**; Ghidra and cross-references speak **virtual
addresses**. Parsing the PE section table once bridges the two. For `WolframEngine.dll`
(image base `0x180000000`):

| section | VA | raw offset | size |
| --- | --- | --- | --- |
| `.text` | `0x180001000` | `0x400` | `0x5b8edf6` |
| `.rdata` | `0x185b90000` | `0x5b8f200` | `0x118caf8` |
| `.data` | `0x186d1d000` | `0x6d1be00` | `0x13eb5a8` |
| `.pdata` | `0x188109000` | `0x6e44800` | `0x46ba68` |

Two techniques are used repeatedly:

1. **Locating code that uses a string literal.** x86-64 reaches literals with
   RIP-relative operands. For every `lea r64,[rip+disp32]` (`48/4C 8D 05`) or
   `mov r64,[rip+disp32]` (`48/4C 8B 05`) with `modrm & 0xC7 == 0x05`, compute
   `target = VA(instrEnd) + disp32`; keep the instruction when `target` equals the
   literal VA. Implemented in [`code/accepted-crc-table.ts`](code/accepted-crc-table.ts)
   (`findCodeRefs`). Ghidra `xrefs` gives the same answer and additionally recovers
   operand kinds.
2. **Recovering exact function boundaries.** `.pdata` is an array of
   `RUNTIME_FUNCTION { BeginRVA, EndRVA, UnwindRVA }`. Any reference address maps to its
   unique enclosing function, which is essential because these functions have no
   symbols. For `WolframEngine.dll`:

   | RVA of a reference | enclosing function |
   | --- | --- |
   | `0x1cf3f89` | `0x1cf3d50 .. 0x1cf3dfd` (password parser) |
   | `0x1cf3697` | `0x1cf3650 .. 0x1cf3d50` (CRC checker) |
   | `0x1cf3193` | `0x1cf30f0 .. 0x1cf3420` (expiry handler) |

## 2.3 Subsystem A — the password validator (kernel)

**How it was found.** The literals `Password not in format dddd-ddd-ddd.` (VA
`0x185c58210`), `Bad password.` (`0x185c58200`) and
`Expiration date after mathid not in format yyyymmdd.` (`0x185c58270`) were located, and
their code references recovered by §2.2 technique 1. The references sit inside three
functions:

| function | VA range | role |
| --- | --- | --- |
| `FUN_181cf3d50` | `0x181cf3d50 .. 0x181cf3dfd` | 12-char signature parser + digit extraction |
| `FUN_181cf3650` | `0x181cf3650 .. 0x181cf3d50` | two CRC-16 evaluations + accepted-CRC-table lookup |
| `FUN_181cf30f0` | `0x181cf30f0 .. 0x181cf3420` | expiry-date parser (`yyyymmdd`), days-left, `Password has expired.` |

**How the algorithm was recovered.** Inside `FUN_181cf3650` the two CRC polynomials
appear as 32-bit immediates dozens of times (the compiler unrolled the bit loops):

```
0x0001064b  at VAs 0x181cf3697 .. 0x181cf3cea   (condition A)
0x000105c3  at VAs 0x181cf36c2 .. 0x181cf3ceb   (condition B)
```

The immediates give the polynomials directly; the surrounding unrolled loop
(`s = (s<<1)|bit; if (s & 0x8000) s ^= P;`) gives the CRC form; the first expression of
each loop, `((bit + 0x14b6c) ^ 0x1064b)`, reveals the initial value `0x14b6c = 0xA5B6<<1`
i.e. **init `0xA5B6`**. The same code was decompiled in the small `SessionManager.exe`
copy (`FUN_1400f4690`, `FUN_1400f3f30`, `FUN_1400f3d00`) to read the logic in full; the
kernel's copy matches constant-for-constant.

Evidence: obtained with REA/Ghidra (`--procedure <VA>`); the raw bodies are kept in
[`decompiled/`](decompiled/). Algorithm: [03](03-verification-flow.md),
[07](07-mathematics.md). Reconstruction: [08](08-reconstructed-source.md).

## 2.4 Subsystem B — the accepted-CRC whitelist

Condition B does not test against a single constant; it tests **membership in an array**.
The array is read from the checker by

```
mov  r8d, [rip+count]      ; length
lea  rcx, [rip+table]      ; base
...
cmp  [rcx], eax            ; == the condition-B result ?
je   accepted
```

**Extraction principle.** The whitelist is a contiguous array of little-endian `u32`,
each a value in `(0, 0x10000)`, immediately followed by its element count. That
signature is found by a plain scan; the table is confirmed because *code references it
with a RIP-relative load inside the checker*. For `WolframEngine.dll`: table VA
`0x186d4dd40`, count VA `0x186d4dd94` = **21**. Full treatment and the value list are in
[05](05-accepted-crc.md); the extractor is
[`code/accepted-crc-table.ts`](code/accepted-crc-table.ts).

## 2.5 Subsystem C — the LicenseCode (product / class / feature)

> The password field historically called "Math Num"; it is a **hexadecimal bitmask**.
> This report calls it **`LicenseCode`**. Full table in [04](04-license-code.md).

**Kernel side.** The kernel exposes `System`$LicenseType`, `$LicenseID`,
`$LicenseExpirationDate`, `$ProductInformation` (symbol names in `WolframEngine.dll`
`.rdata` @ `0x5b9eb48`…`0x5b9f318`). Its `$ProductInformation["ProductIDName"]` is generic
(`Wolfram`) — the *specific* product is decided by the **front end**.

**Front-end side (where `LicenseCode` is decoded).** The front end parses the `mathpass`
file itself and derives product/class/feature from `LicenseCode`. The parsing chain
(all in `WolframNB.exe`, decompiled):

| function | VA | role |
| --- | --- | --- |
| `FUN_140a82950` | `0x140a82950` | start-up; `-pwfile`/`-password`/`-provisioned`; iterates the known products for `Licensing\<Product>\mathpass` |
| `FUN_140a89380` | `0x140a89380` | process one licence (WSTP path, then parse) |
| `FUN_140daa0c0` | `0x140daa0c0` | read the `mathpass` file line by line (`%(*userregistered*)`, `%(*temporary*)`) |
| `FUN_140daa340` | `0x140daa340` | split entry by `,` |
| `FUN_140daab20` | `0x140daab20` | split entry by TAB into fields |
| `FUN_140dac1f0` | `0x140dac1f0` | split the password by `:` → signature, **`LicenseCode` (`obj+0x167E`)**, expiry |
| `FUN_140a8abd0` | `0x140a8abd0` | `LicenseCode` → **ProductIDName** (product) |
| `FUN_140a8ad70` | `0x140a8ad70` | `LicenseCode` → licence class (`Trial`/`Student`/`Site`/`Home`) |
| `FUN_140a8b0e0` | `0x140a8b0e0` | `LicenseCode` → capabilities (`EnterpriseSigning`, …) |
| **`FUN_140da32d0`** | `0x140da32d0` | the predicate: **bit test** `((n >> atoi(code)) & 1)` |
| `FUN_1403754d0` | `0x1403754d0` | fall-back ProductIDName (`ProductIDName` from env/registry, else `"Wolfram"`) |

The product name becomes the licence's **`ProductIDName`**, consumed by
`PacletManager`Package`getProductID[]` (`SystemFiles\Autoload\PacletManager\Kernel\Utils.m`),
which matches each shipped shell paclet's `"ProductID"` and loads the matching shell
(menus, branding, `FrontEnd\SystemResources\WelcomeScreen-<variant>.nb`). This is the
mechanism behind "starting a different sub-program".

Evidence: obtained with REA/Ghidra; see [`decompiled/`](decompiled/). Product/class/feature table and
logic: [04](04-license-code.md).

## 2.6 Subsystem D — activation (server side)

`reqpwd.exe` is a thin HTTPS client; its strings show

```
https://user.wolfram.com/services/1.0/password
actkey=… & pactkey=… & mathid=…
```

So the *generation* of passwords is server-side, while the *offline verification* is
embedded in the binaries above. The generation algorithm is the inverse of verification
and is derived in [06](06-key-generation.md).

## 2.7 Oracles and cross-checks

Static conclusions were confirmed by read-only oracles and by regenerating a genuine
license:

- **Kernel oracle** (`wolframscript`): prints `$LicenseType`, `$LicenseID`,
  `$LicenseExpirationDate`, `$ActivationKey`, `$MachineID`, `$ProductInformation`.
- **Front-end oracle** (`WolframNB.exe -pwfile <file>`): shows the product by its welcome
  window title, **without touching the system licence**. Used to map `LicenseCode` bits to
  products.
- **Byte-level cross-checks**: identical tables/constants in `SessionManager.exe` vs
  `WolframEngine.dll` (differing only in one table entry, proving the whitelist is
  build-specific).
- **Regeneration**: the reconstructed generator reproduces the genuine licence password
  byte-for-byte (its values are withheld here); see [09](09-validation.md).

The kernel oracle is a short `wolframscript` run that prints `$LicenseType`, `$ActivationKey`
and `$ProductInformation` for a licence file; the front-end oracle is a
`WolframNB.exe -pwfile <file>` launch that never touches the system licence.

---

**← Previous:** [01 — Target and Tooling](01-target-and-tooling.md) · **Next:** [03 — The Verification Flow](03-verification-flow.md)
