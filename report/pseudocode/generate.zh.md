[English](generate.md) · **中文**

# 伪代码 — 密钥生成（服务端）

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

`crc_invert_prefix` 返回 2 字节前缀 `w`，使得
`CRC(poly, init, w ‖ data) == target`。由于 2 字节前缀在 CRC 状态上表现为
**仿射双射**，这等价于 GF(2) 上的一次线性求解：

```
function crc_invert_prefix(poly, init, data, target):
    # CRC_P(s, D) = S_|D|(s) XOR CRC_P(0, D),   S_k = "advance k zero bytes"
    # CRC_P(init, w ‖ data) = S_|data|( CRC_P(init, w) ) XOR CRC_P(0, data)
    # CRC_P(init, w)        = S_2(init) XOR L(w),   L linear & bijective
    y = S_|data|^{-1}( target XOR CRC_P(0, data) ) XOR S_2(init)
    return L^{-1}(y)                       # 16x16 GF(2) Gaussian elimination, O(16^2)
```

`S_1`（前进一个零字节）有一个两指令的逆：

```
S_1 (s) = ((s << 1) & 0xFFFF) ^ ((s >> 15) ? P : 0)
S_1⁻¹(y): t = y & 1;  return ((y ^ (t ? P : 0)) >> 1) | (t << 15)
```

65536 次迭代的 2 字节暴力枚举同样有效，且仍是常数时间的；它*并非*
对密钥或 2³² 密码空间的搜索。参见
[../06-key-generation.md](../06-key-generation.md)。
