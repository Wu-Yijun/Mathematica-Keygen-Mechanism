# Pseudocode — key generation (server side)

**English** · [中文](generate.zh.md)

```
function generate_mathpass(mathID, activationKey, licenseCode, expiryDate, accepted_crc):
    msg = message(mathID, activationKey, licenseCode, expiryDate)

    # condition B: invert to land the condition-B CRC on the chosen table value
    n0 = crc_invert_prefix(poly = P_B, init = INIT, data = msg, target = accepted_crc)
    n1 = (n0 + 0x72FA) mod 2^16

    # condition A: invert to make the integrity CRC vanish
    n2 = crc_invert_prefix(poly = P_A, init = INIT,
                           data = msg + bytes(omega(n0)), target = 0)

    return decimal_encode(n1, n2) + "::" + licenseCode + ":" + expiryDate
```

`crc_invert_prefix` returns the 2-byte prefix `w` with
`CRC(poly, init, w ‖ data) == target`. Because a 2-byte prefix acts as an
**affine bijection** on the CRC state, this is a linear solve over GF(2):

```
function crc_invert_prefix(poly, init, data, target):
    # CRC_P(s, D) = S_|D|(s) XOR CRC_P(0, D),   S_k = "advance k zero bytes"
    # CRC_P(init, w ‖ data) = S_|data|( CRC_P(init, w) ) XOR CRC_P(0, data)
    # CRC_P(init, w)        = S_2(init) XOR L(w),   L linear & bijective
    y = S_|data|^{-1}( target XOR CRC_P(0, data) ) XOR S_2(init)
    return L^{-1}(y)                       # 16x16 GF(2) Gaussian elimination, O(16^2)
```

`S_1` (advance one zero byte) has a two-instruction inverse:

```
S_1 (s) = ((s << 1) & 0xFFFF) ^ ((s >> 15) ? P : 0)
S_1⁻¹(y): t = y & 1;  return ((y ^ (t ? P : 0)) >> 1) | (t << 15)
```

A 65536-iteration 2-byte brute force is equally valid and still constant-time; it is
*not* a search over keys or over the 2³² password space. See
[../06-key-generation.md](../06-key-generation.md).
