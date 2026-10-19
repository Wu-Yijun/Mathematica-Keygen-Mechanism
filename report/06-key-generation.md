# 06 — Server-Side Key Generation

## 6.1 Where generation happens

`SystemFiles\Activation\Windows-x86-64\reqpwd.exe` is the only activation component. Its
strings show it is a thin HTTPS client:

```
https://user.wolfram.com/services/1.0/password
actkey=… & pactkey=… & mathid=…
Key generation failed
```

So the server holds whatever private material is needed; the client only learns the
resulting `mathpass` password. Everything below is what the server *must* be doing, as a
direct consequence of the verification we reversed.

## 6.2 The generation algorithm (closed form — no brute force)

Inputs: `mathID`, `activationKey`, `LicenseCode`, `expiryDate`, and an **accepted CRC** `M` chosen
from the build's whitelist.

```
1. MESSAGE ← mathID "@" expiryDate "$" LicenseCode "&" activationKey

2. choose M ∈ ACCEPTED_CRC_TABLE                    # product/edition secret; e.g. 59222

3. solve n0  s.t.  CRC16(P_B, 0xA5B6, n0 ‖ MESSAGE) == M        # linear solve, O(1)
       n1 ← (n0 + 0x72FA) mod 2^16                              # == (n0 - 0x8D06)

4. solve n2  s.t.  CRC16(P_A, 0xA5B6, n2 ‖ MESSAGE ‖ ω(n0)) == 0

5. signature ← construct_password(n1, n2)     # decimal encoding + permutation
   password  ← signature "::" LicenseCode ":" expiryDate
```

Steps 3 and 4 are **CRC inversions** ([07](07-mathematics.md) §7.2): because a 2-byte
prefix acts as an affine bijection on the state, the required bytes are obtained by
inverting a 16×16 GF(2) linear map. Complexity is `O(|MESSAGE| + 16²)`. There is **no
search** over keys, over the 2³² password space, or over the accepted-CRC values.

A non-optimised implementation may instead brute-force the 2-byte prefix (65536 tries,
sub-millisecond) — that is still *not* a key-space search, just a 2-byte solve.

## 6.3 Validation

Run [`code/selfcheck.ts`](code/selfcheck.ts) from the repository root (`node report/code/selfcheck.ts`):

```
generatePassword("0000-00000-00000", "0000-0000-AAAAAA", "800001", "20300101", 59222)
  == "9528-122-377::800001:20300101"      // synthetic placeholder licence
```

The reconstruction was also confirmed against a **genuine** licence from the analysed
install: the generator reproduced the genuine password byte-for-byte (those values are
withheld here). It used accepted CRC `59222` (table index 1) and the procedure above.

## 6.4 Why this kind of key?

- **Deterministic and stateless.** Given the same `(mathID, activationKey, LicenseCode,
  expiry)` the server always produces the same password; nothing random is stored.
- **Self-contained.** The password carries only 32 bits of "certificate" (`n0`,`n2`); the
  license type/edition is implied by which whitelist entry `M` was used, and the
  identity is implied by the message.
- **Offline-verifiable.** The client binary embeds the polynomials, the initial value and
  the whitelist, so no network is needed after activation.
- **Extensible by table.** Adding an edition means adding one 16-bit value to
  `ACCEPTED_CRC_TABLE` — no algorithm change.

## 6.5 Which accepted CRC does the server pick?

Observable facts:

- All checked examples deriving from one public proof-of-concept used `24816`, which is
  **not** in the v15.0.1 table, so that value is *not* what this build's server used.
- The genuine licence from this 15.0.1 install used `59222` (values withheld).

Inference (not fully determined from a single build): the accepted CRC encodes
**product/edition**, so the server selects a fixed `M` per product. Supporting evidence:
the table is small (21 entries), the values carry no arithmetic pattern
([05](05-accepted-crc.md)), and the binary accepts *any* member — exactly the shape of a
"one key per edition/product family" list. Determining the full mapping needs several
genuine licenses of different editions.

## 6.6 Pseudocode

```
function generate(passwordLenUnused, mathID, activationKey, LicenseCode, expiryDate, accepted_crc):
    message ← mathID + "@" + expiryDate + "$" + LicenseCode + "&" + activationKey
    # condition B: pick the prefix that drives the condition-B CRC onto `accepted_crc`
    n0 ← crc_invert_prefix(poly = 0x105c3, init = 0xa5b6, data = message, target = accepted_crc)
    n1 ← (n0 + 0x72FA) & 0xFFFF
    # condition A: pick the prefix that makes the integrity CRC vanish
    n2 ← crc_invert_prefix(poly = 0x1064b, init = 0xa5b6,
                           data = message ‖ omega(n0), target = 0)
    return decimal_encode(n1, n2) + "::" + LicenseCode + ":" + expiryDate

# crc_invert_prefix: the 2-byte prefix w such that CRC(poly, init, w ‖ data) == target.
# Implemented by solving L(w) = S_n⁻¹(target ⊕ CRC(poly,0,data)) ⊕ S_2(init)  (GF(2) solve)
```
