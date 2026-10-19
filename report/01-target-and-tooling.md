# 01 — Target and Tooling

**English** · [中文](01-target-and-tooling.zh.md)

## 1. Target identity

| Field | Value |
| --- | --- |
| Installed product | **Wolfram 15.0.1** (product code `W-WIN-Standard`) |
| Primary target | `<WOLFRAM_INSTALL>\SystemFiles\Libraries\Windows-x86-64\WolframEngine.dll` |
| Format / arch | PE, x86-64, 120,477,928 bytes, image base `0x180000000` |
| SHA-256 | `9a9a7d88d1a9285bc792e885cf589374285b1a247116eb3bfaefb2f71d2bad6f` |
| Licence password file | `%ProgramData%\Wolfram\Licensing\mathpass` (Windows) |
| Toolchain | REA (`rea-agents` 6.5.0) driving **Ghidra 12.1.4** (headless) |

> The public reference implementation `main@v14.1.0.js` (in this repository) is a
> **v14.1.0** artifact; the binary analysed here is the **installed 15.0.1**. The scheme
> and the password format are the same, but the **accepted-CRC whitelist is build-specific**
> (see [05](05-accepted-crc.md)); everything extracted here is the 15.0.1 table.

The same licensing code (identical error strings) is statically linked into several
shipped binaries. Any of them is a valid analysis target:

| Binary (relative to `<WOLFRAM_INSTALL>`) | Size | Note |
| --- | --- | --- |
| `SystemFiles\Libraries\Windows-x86-64\WolframEngine.dll` | 120 MB | the kernel — authoritative for Mathematica |
| `SystemFiles\Components\WSMCore\bin\SessionManager.exe` | 6.7 MB | smallest copy; used for fast reconnaissance |
| `SystemFiles\FrontEnd\Binaries\Windows-x86-64\WolframNB.exe` | 36 MB | front end |
| `SystemFiles\Components\WSMCore\bin\WSMKernelX.exe` | 94 MB | System Modeler kernel |

`SystemFiles\Activation\Windows-x86-64\reqpwd.exe` is **only** the online activation
client — it POSTs to `https://user.wolfram.com/services/1.0/password` with
`actkey=…&pactkey=…&mathid=…`. This proves the *generation* is server-side, while the
*offline verification* is embedded in the binaries above.

## 2. Why a disassembler is required

The verification is native x86-64 with global tables and no symbols. Static text
scans only reveal *strings*; mapping a string to the code that uses it, and recovering
the CRC logic, requires disassembly/decompilation. REA supplies that by wrapping a
bring-your-own **Ghidra** (REA does not install it).

## 3. Toolchain setup (Windows)

1. Extract an official **Ghidra 12.1.4** release somewhere, e.g.
   `<GHIDRA_INSTALL_DIR>`.
2. Provide a 64-bit **JDK 21** (any distribution; Wolfram itself ships one under
   `SystemFiles\Java\`). It must satisfy Ghidra's declared `application.java.min=21`.
3. Point REA at them (read by the REA server at start-up):

```powershell
$env:GHIDRA_INSTALL_DIR = "<GHIDRA_INSTALL_DIR>"
$env:JAVA_HOME          = "<JAVA_HOME>"
$env:GHIDRA_HEADLESS_MAXMEM = "12G"                 # headless default is only 2G
$env:REA_GHIDRA_STARTUP_TIMEOUT_MS = "10800000"     # 120 MB analysis needs hours
```

`rea doctor --client opencode --json` must report `ghidra: available, version 12.1.4`.

## 4. Analysis cost / practical note

Full default auto-analysis of the 120 MB `WolframEngine.dll` takes **~60–90 minutes**.
Convert it into a one-off job and reuse the result:

- Run it in your own terminal, e.g.
  `rea function <binary> --procedure <VA> --provider ghidra`, which prints the
  decompilation as JSON.
- Or use the REA MCP session (`open_binary` … `analyze_function`) if your host keeps it
  alive long enough.

For quick reconnaissance, run against the 6.7 MB `SessionManager.exe`, whose
**statically-linked copy of the same functions** decompiles in ~85 s. Addresses inside
`SessionManager.exe` (e.g. `0x1400f3f30`) do **not** equal the addresses inside
`WolframEngine.dll` (e.g. `0x181cf3650`); map by *behaviour and constants*, not by
address.

## 5. Reproduction checklist

1. `findstr /s /m /c:"Password not in format dddd-ddd-ddd." *.dll *.exe` under the
   Wolfram install → find which modules embed the licensing code.
2. Decompile the validator (see [02](02-reverse-engineering.md)); the extracted bodies
   kept for this report are in [`decompiled/`](decompiled/).
3. Verify the model and re-generate a password with
   [`code/selfcheck.ts`](code/selfcheck.ts) (see [07](07-mathematics.md)).
4. Extract the build's accepted-CRC table ([05](05-accepted-crc.md),
   [`code/accepted-crc-table.ts`](code/accepted-crc-table.ts)).

---

**Next:** [02 — Reverse Engineering: Method, Tooling, and Component Map](02-reverse-engineering.md)
