# 04 — `LicenseCode`: product, class, and feature selection

**English** · [中文](04-license-code.zh.md)

`LicenseCode` is the field historically called **"Math Num"** / `mathNum` — the
`bbbbbb` part of a password `signature"::"LicenseCode":"expiry`. Reverse engineering
shows it is **not a plain number but a hexadecimal bitmask**: every set bit names a
*product nature*, a *licence class* or a *capability*.

This chapter is the semantics; the reverse-engineering method that located it is in
[02 §2.5](02-reverse-engineering.md), and its role in the message is in
[03 §3.9](03-verification-flow.md).

## 4.1 The predicate — it really is a bit test

`WolframNB.exe!FUN_140da32d0(codeString, LicenseCodeString)`:

```c
bool license_code_has_bit(const char *code, const char *licenseCode) {
    unsigned bit = atoi(code);                 /* "23" -> 23                         */
    if (/* hex digits required for `bit` */ > strlen(licenseCode)) return false;
    parse_number(licenseCode, /* format @0x1414ede78 */ &n);   /* LicenseCode as a number */
    return ((n >> (bit & 31)) & 1) != 0;       /* BIT TEST                            */
}
```

`code` is the **bit index**; `LicenseCode` is the number. Every resolver below is a
sequence of such bit tests.

## 4.2 Where it is parsed and decoded

| binary | function | role |
| --- | --- | --- |
| `WolframNB.exe` | `FUN_140dac1f0` | split password by `:` → signature, **`LicenseCode` at object `+0x167E`**, expiry |
| `WolframNB.exe` | `FUN_140a8abd0` | `LicenseCode` → **ProductIDName** (product) |
| `WolframNB.exe` | `FUN_140a8ad70` | `LicenseCode` → licence class (`Trial`/`Student`/`Site`/`Home`) |
| `WolframNB.exe` | `FUN_140a8b0e0` | `LicenseCode` → capabilities |
| `WolframNB.exe` | `FUN_1403754d0` | fall-back ProductIDName (`ProductIDName` from env/registry, else `"Wolfram"`) |

Evidence: obtained with REA/Ghidra; see [`decompiled/`](decompiled/).

## 4.3 The bit table

| bit | mask (hex) | meaning | defined in |
| --- | --- | --- | --- |
| 0 | `0x0000001` | base flag (set in the genuine `800001`) | observed |
| 1 | `0x0000002` | **Trial** | `FUN_140a8ad70` |
| 2 | `0x0000004` | **Student** | `FUN_140a8ad70` |
| 3 | `0x0000008` | **Site** | `FUN_140a8ad70` |
| 5 | `0x00000020` | **WolframPlayer** | `FUN_140a8abd0` |
| 6 | `0x00000040` | **WolframPlayerPro** | `FUN_140a8abd0` |
| 11 | `0x00000800` | **Home** (Home Edition) | `FUN_140a8ad70` |
| 13 | `0x00002000` | **EnterpriseSigning** | `FUN_140a8b0e0` |
| 19 | `0x00080000` | **AltExpirationPolicy** | `FUN_140a8b0e0` |
| 20 | `0x00100000` | **Wolfram\|Alpha Notebook Edition** | `FUN_140a8abd0` |
| 21 | `0x00200000` | **Wolfram\|One** | `FUN_140a8abd0` |
| 22 | `0x00400000` | **Wolfram Finance Platform** | `FUN_140a8abd0` |
| 23 | `0x00800000` | **Wolfram Mathematica** | `FUN_140a8abd0` |
| 24 | `0x01000000` | **Wolfram Financial Framework** | `FUN_140a8abd0` |
| 26 | `0x04000000` | **Wolfram Raspberry Pi** | `FUN_140a8abd0` |
| 28 | `0x10000000` | when **set**, disables `LLMSupport` | `FUN_140a8b0e0` |
| 29 | `0x20000000` | **AutoRenewingSubscription** | `FUN_140a8b0e0` |

Bits not listed have no observed effect. `license_code_has_bit` guards on string length,
so a longer `LicenseCode` (more hex digits) can carry higher bits.

## 4.4 The logic

```
product = first of the following whose bit is set (this order):
              bit20 -> "WolframAlphaNB"
              bit22 -> "WolframFinancePlatform"
              bit21 -> "WolframOne"
              bit23 -> "Mathematica"
              bit24 -> "WolframFinancialFramework"
              bit26 -> "WolframRaspberryPi"
              bit6  -> "WolframPlayerPro"
              bit5  -> "WolframPlayer"
          else  -> $ProductIDName (env/registry) or "Wolfram"      (FUN_1403754d0)

class   = bit1 -> "Trial" | bit2 -> "Student" | bit3 -> "Site" | bit11 -> "Home"
          (none)  -> Professional

caps    = bit13 -> EnterpriseSigning ; bit19 -> AltExpirationPolicy ;
          bit29 -> AutoRenewingSubscription ; bit28 clear -> LLMSupport
```

The **product** string becomes the licence's **`ProductIDName`**, consumed by
`PacletManager`Package`getProductID[]` (`SystemFiles\Autoload\PacletManager\Kernel\Utils.m`):

```wl
$currentProductID = Select[CurrentValue["ActivationInformation"], #["Status"]=="Active"&][[All,"ProductIDName"]]
```

which is matched against each shipped shell paclet's `"ProductID"` (`productIDMatches`).
The class string drives `System`$LicenseType` and the licence-type UI bar; the capability
strings become feature flags.

## 4.5 Why it "starts a different sub-program"

The product bit selects a **front-end shell paclet** under `SystemFiles\Components\` —
`Mathematica` (`ProductID "Mathematica"`), `WolframAlphaNotebookEdition` (`"WolframAlphaNB"`),
`WolframFinancePlatform`, `WolframFinancialFramework`, `WolframProgrammingLab` — which
brings that product's menus, branding and welcome screen
(`FrontEnd\SystemResources\WelcomeScreen-<variant>.nb`, variants `M`, `M-Home`,
`M-Student`, `M-Trial`, `ANB`, `WD`, `WFP`, `WPL`, `Player`, `PlayerPro`, `RPi`), while
the front end applies the per-product feature flags (`NoLocalFileAccess`, …) and the
class selects the licence-type bar (`TrialBar`, `HomeEditionBar`, `StudentBar`,
`PlayerBar`). This is presentation/feature selection inside one install, **not** a
separate installed application.

**v15.0.1 still ships these components.** They are shells and flags, not separate
installers; there are no separate `Player`/`Finance` product installations any more.

## 4.6 Empirical verification (read-only oracles)

Front end (`WolframNB.exe -pwfile <file>`; the system licence is not touched) — window title:

| `LicenseCode` | bits set | welcome title |
| --- | --- | --- |
| `800001` | 0, 23 | Welcome to Wolfram Mathematica |
| `800000` | 23 | Welcome to Wolfram Mathematica |
| `100000` | 20 | Welcome to Wolfram\|Alpha Notebook Edition |
| `200001` | 0, 21 | Welcome to Wolfram\|One |
| `400001` | 0, 22 | Welcome to Wolfram Finance Platform |
| `000020` | 5 | Welcome to Wolfram Player |
| `000040` | 6 | Welcome to Wolfram Player \| PRO |
| `000023` | 0, 1, 5 | Welcome to Wolfram Player |

Kernel (`wolframscript`) — `$LicenseType`:

| `LicenseCode` | bits | `$LicenseType` |
| --- | --- | --- |
| `800001` | 0, 23 | Professional |
| `800002` | 1, 23 | Trial |
| `800004` | 2, 23 | Student |
| `800021` | 0, 5, 23 | *rejected* (Player and Mathematica bits conflict) |

So the public JavaScript model's "first character ∈ {1,2,4,8}" is exactly the high nibble
being one of bits 20–23.

## 4.7 Unknowns

- Bits 4, 7–10, 12, 14–18, 25, 27, 30, 31 have no observed meaning in this build.
- Whether specific bit combinations are issued per purchasable SKU is a server-side
  decision and cannot be determined from one install.

---

**← Previous:** [03 — The Verification Flow](03-verification-flow.md) · **Next:** [05 — The Accepted CRCs](05-accepted-crc.md)
