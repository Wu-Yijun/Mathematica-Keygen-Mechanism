# 伪代码 — 验证

**中文** · [English](verify.md)

## CRC-16（MSB 优先，多项式含 x¹⁶）

```
function crc16(poly, state, bytes):     # state: 16-bit, poly: 17-bit (e.g. 0x105c3)
    s = state & 0xFFFF
    for b in bytes:
        for i from 7 down to 0:
            n = (s << 1) | ((b >> i) & 1)
            if s & 0x8000: n = n XOR poly
            s = n & 0xFFFF
    return s

function crc16_uint16(poly, state, value):        # same, but a 16-bit value MSB-first
    s = state
    for i from 15 down to 0:
        n = (s << 1) | ((value >> i) & 1)
        if s & 0x8000: n = n XOR poly
        s = n & 0xFFFF
    return s
```

常量：`P_A = 0x1064B`、`P_B = 0x105C3`、`INIT = 0xA5B6`。

## 消息

```
function message(mathID, activationKey, licenseCode, expiryDate):     # current format
    return mathID + "@" + expiryDate + "$" + licenseCode + "&" + activationKey

# older format (no expiry, as in main@v14.1.0.js):
#   return mathID + "$" + licenseCode + "&" + activationKey
```

## 解析 12 字符签名   （对应 FUN_181cf3d50）

```
function parse_signature(signature):                 # -> (n0, n2)
    assert length(signature) == 12
    assert signature[4] == '-' and signature[8] == '-'
    assert every other char is a digit

    v1 = int(signature[3] + signature[2] + signature[6] + signature[1] + signature[10])
    v2 = int(signature[7] + signature[11] + signature[9] + signature[0] + signature[5])

    n1 = ceil(v1 * 65535 / 99999)
    n2 = ceil(v2 * 65535 / 99999)
    n0 = (n1 + 0x8D06) mod 2^16          # == (n1 - 0x72FA)
    return (n0, n2)
```

## ω(n0)   （对应 FUN_181cf3fa0）

```
function omega(n0):
    n1  = (uint16)((int16)n0 + 0x72FA)               # signed add, wrapped
    v1  = floor((n1 * 99999) / 65535)                # back to the 5-digit group
    txt = printf("%05u", v1)
    txt = inverse_digit_permutation(txt)             # d0 d1 d2 d3 d4 -> d0 d1 d3 d4 d2
    return ceil(int(txt) * 65535 / 99999) & 0xFFFF   # back to the 16-bit space
```

## 验证   （对应 FUN_181cf3650）

```
function verify_mathpass(message, signature, accepted_crc_table):
    (n0, n2) = parse_signature(signature)

    # condition A: integrity -> must be exactly 0
    a = crc16_uint16(P_A, INIT, n2)
    a = crc16       (P_A, a, bytes(message))
    a = crc16_uint16(P_A, a, omega(n0))
    integrity_ok = (a == 0)

    # condition B: accepted CRC -> must be a member of the build's whitelist
    b = crc16_uint16(P_B, INIT, n0)
    b = crc16       (P_B, b, bytes(message))
    accepted_crc_ok = (b in accepted_crc_table)

    return (integrity_ok and accepted_crc_ok), b        # b is the "accepted CRC"
```

## 到期（辅助）   （对应 FUN_181cf30f0）

```
function days_until_expiry(expiry_string):          # "yyyymmdd" (or "yyyy-mm-dd")
    y, m, d = split(expiry_string)
    validate  1 <= m <= 12  and  1 <= d <= days_in_month(y, m)
    return ( (y - now.year) * 12 - now.month + m ) * 31 - now.day + d
    # negative / past  =>  "Password has expired."
```
