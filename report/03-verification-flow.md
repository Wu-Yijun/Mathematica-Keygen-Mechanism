**中文** · [English](03-verification-flow.zh.md)

# 03 — The Verification Flow

## 3.1 Inputs

A `mathpass` entry (TAB separated):

```
desktop-xxxx   0000-00000-00000   0000-0000-AAAAAA   9528-122-377::800001:20300101
    user name        mathID          activation key    password (signature :: LicenseCode : expiry)
```

The verifier works on the **password** plus the **mathID** and the **activation key**
(both known to the product). The password has the shape

```
password    = signature "::" LicenseCode ":" expiryDate
signature   = "xxxx-xxx-xxx"        (12 chars: 9 digits + two '-')
LicenseCode = "bbbbbb"              (hexadecimal bitmask — see 04-license-code.md)
expiryDate  = "yyyymmdd"            (or, in some builds, "yyyy-mm-dd")
```

> The field historically called **"Math Num"** is referred to here as **`LicenseCode`**;
> it is a hex bitmask encoding product / licence class / feature, *not* a plain number.
> See [04](04-license-code.md).

## 3.2 The message

The string that is actually signed is

```
MESSAGE = "${mathID}@${expiryDate}$${LicenseCode}&${activationKey}"
```

Example (synthetic placeholder values, used throughout this report):

```
MESSAGE = "0000-00000-00000@20300101$800001&0000-0000-AAAAAA"
```

Note that `LicenseCode` participates in `MESSAGE`, so it is covered by both CRC
conditions — a tampered `LicenseCode` invalidates the password.

## 3.3 Function roles (WolframEngine.dll v15.0.1)

| VA | Name | Job |
| --- | --- | --- |
| `0x181cf30f0` | expiry handler | validates/parses `yyyymmdd`; sets days-remaining (default 10000); emits `Password has expired.` |
| `0x181cf3d50` | password parser | validates the 12-char signature; extracts the two 16-bit residues |
| `0x181cf3650` | CRC checker | the two CRC-16 evaluations + accepted-CRC-table membership test |
| `0x181cf3fa0` | `ω(·)` helper | inverse of the digit encoding, `n0 → 2 bytes` |

## 3.4 Step 1 — Parse the signature

`FUN_181cf3d50(signature, &n0, &n2)`:

1. Reject unless `len == 12`, `signature[4] == '-'`, `signature[8] == '-'`, and every
   other character is a digit (otherwise returns `Password not in format dddd-ddd-ddd.`).
2. Build two 5-decimal-digit numbers by a fixed digit permutation:
   `v1 = signature[3] signature[2] signature[6] signature[1] signature[10]`
   `v2 = signature[7] signature[11] signature[9] signature[0] signature[5]`
3. Convert the 5-digit space to the 16-bit space, then emit the residues:
   ```
   n0 = ( ceil(v1 · 65535 / 99999) - 0x72FA ) & 0xFFFF      //  == (n1 + 0x8D06) mod 2^16
   n2 =   ceil(v2 · 65535 / 99999)
   ```

## 3.5 Step 2 — Two CRC-16 conditions

Both CRCs are **MSB-first, 16-bit, init `0xA5B6`**, differing only in the polynomial:

| Condition | Polynomial | Bytes fed, in order | Required result |
| --- | --- | --- | --- |
| **A (integrity)** | `P_A = 0x1064B` | `n2` (2 bytes, big-endian) → `MESSAGE` → `ω(n0)` (2 bytes) | **`== 0`** |
| **B (accepted CRC)** | `P_B = 0x105C3` | `n0` (2 bytes, big-endian) → `MESSAGE` | **∈ `ACCEPTED_CRC_TABLE`** |

`ω(n0)` (helper `FUN_181cf3fa0`) recovers the 5-digit group from `n0` and re-reads it as
a 16-bit value; it is the inverse of the encoding in step 1 and is only used as extra
input bytes for condition A.

A password is accepted iff **A == 0 and B ∈ table**; otherwise the checker returns
`Bad password.`.

## 3.6 Step 3 — Expiry

The expiry handler parses the date, computes days remaining relative to the current
date, and rejects when it is in the past (`Password has expired.`). The condition-B CRC does
**not** protect the date directly; the date is part of `MESSAGE`, so any change breaks
condition A/B.

## 3.7 Worked example (synthetic placeholders)

```
mathID        = 0000-00000-00000
activationKey = 0000-0000-AAAAAA
LicenseCode   = 800001                (= 0x800001: bit23 = Mathematica, bit0 = base)
expiryDate    = 20300101
password      = 9528-122-377::800001:20300101
```

| quantity | value |
| --- | --- |
| `v1 = sig[3,2,6,1,10]` | `82257` → `n1 = ceil(82257·65535/99999) = 53908` |
| `n0 = (53908 + 0x8D06) mod 2^16` | `24474` |
| `v2 = sig[7,11,9,0,5]` | `27391` → `n2 = 17951` |
| condition B result (the **accepted CRC**) | **`59222` = `0xE756`, table index 1 ✔** |
| condition A result | `0` ✔ |

Brute-forcing all 65536 possible initial values for condition B, **only `59222`**
passes — and `59222` is a member of the build's table. See
[code/selfcheck.ts](code/selfcheck.ts).

## 3.8 What each mechanism is for

- **Condition A** uses a **fixed** target (`0`): a classic *integrity* check — `MESSAGE`
  plus residues must be a "codeword" of the CRC-16 code defined by `P_A`.
- **Condition B** constrains the CRC to a **small set** rather than one value. It is an
  *origin/authenticity* check: a random forgery hits the set only with probability
  `21 / 65536 ≈ 0.03 %`. It does **not** identify the product — that is done by
  `LicenseCode` (§3.9). Why the designers chose a 21-element set instead of a single
  constant is not determined from one build.

## 3.9 Where `LicenseCode` is applied

`LicenseCode` is verified as part of the message (§3.2) *and* decoded afterwards to
select what the licence is for. The decoder lives in the **front end**, not the kernel:

```
LicenseCode (hex bitmask)
   ├─ product bit (20/21/22/23/24/26/6/5)  →  ProductIDName  →  product shell paclet
   ├─ class bit   (1/2/3/11)               →  $LicenseType / licence-type UI bar
   └─ feature bit (13/19/28/29)            →  capabilities
```

Full bit table, predicate and logic: [04](04-license-code.md).
