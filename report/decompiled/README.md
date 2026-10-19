**中文** · [English](README.zh.md)

# Decompiled output

These are the **raw Ghidra pseudocode** bodies of the functions that matter most, kept
verbatim (only the header's evidence-path line was dropped). They are the decompiler's
*interpretation*, not the original source.

The cleaned, renamed reconstruction is in [../08-reconstructed-source.md](../08-reconstructed-source.md);
language-neutral pseudocode is in [../pseudocode/](../pseudocode/).

| File | Function | Address | Binary | Why it is here |
| --- | --- | --- | --- | --- |
| [we_pwparse_fn__FUN_181cf3d50.c](we_pwparse_fn__FUN_181cf3d50.c) | `FUN_181cf3d50` | 0x181cf3d50 | WolframEngine.dll | password signature parser |
| [we_crc_fn__FUN_181cf3650.c](we_crc_fn__FUN_181cf3650.c) | `FUN_181cf3650` | 0x181cf3650 | WolframEngine.dll | the two CRC-16 conditions + accepted-CRC-table lookup |
| [we_expiry_fn__FUN_181cf30f0.c](we_expiry_fn__FUN_181cf30f0.c) | `FUN_181cf30f0` | 0x181cf30f0 | WolframEngine.dll | expiry-date handling |
| [fe_pw_parse__FUN_140dac1f0.c](fe_pw_parse__FUN_140dac1f0.c) | `FUN_140dac1f0` | 0x140dac1f0 | WolframNB.exe | splits the password; stores `LicenseCode` |
| [fe_fn_0x140da32d0__FUN_140da32d0.c](fe_fn_0x140da32d0__FUN_140da32d0.c) | `FUN_140da32d0` | 0x140da32d0 | WolframNB.exe | the `LicenseCode` bit test `(n >> bit) & 1` |
| [fe_fn_0x140a8abea__FUN_140a8abd0.c](fe_fn_0x140a8abea__FUN_140a8abd0.c) | `FUN_140a8abd0` | 0x140a8abd0 | WolframNB.exe | `LicenseCode` → `ProductIDName` |

The remaining analysed functions (the licence-file reader chain, the front-end
`LicenseCode` class/capability resolvers, and the `SessionManager.exe` copies used for
fast reconnaissance) are summarised in [02](../02-reverse-engineering.md) and
[04](../04-license-code.md) rather than dumped here.

## How these were produced

Static analysis only — REA (`rea-agents`) driving a headless **Ghidra 12.1.4**, one
`analyze_function` operation per address. No third-party disassembler was used and no
binary was modified. See [01](../01-target-and-tooling.md) for the toolchain.
