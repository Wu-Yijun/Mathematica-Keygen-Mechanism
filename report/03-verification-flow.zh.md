[English](03-verification-flow.md) · **中文**

# 03 — 验证流程

## 3.1 输入

一条 `mathpass` 条目（以 TAB 分隔）：

```
desktop-xxxx   0000-00000-00000   0000-0000-AAAAAA   9528-122-377::800001:20300101
    user name        mathID          activation key    password (signature :: LicenseCode : expiry)
```

校验器处理的是**密码**加上**mathID**与**激活密钥**
（二者对产品已知）。密码的形状为

```
password    = signature "::" LicenseCode ":" expiryDate
signature   = "xxxx-xxx-xxx"        (12 chars: 9 digits + two '-')
LicenseCode = "bbbbbb"              (hexadecimal bitmask — see 04-license-code.md)
expiryDate  = "yyyymmdd"            (or, in some builds, "yyyy-mm-dd")
```

> 历史上称为 **"Math Num"** 的字段在此称为 **`LicenseCode`**；
> 它是一个编码产品 / 许可证类别 / 特性的十六进制位掩码，*并非*一个普通数字。
> 见 [04](04-license-code.md)。

## 3.2 消息

实际被签名的字符串是

```
MESSAGE = "${mathID}@${expiryDate}$${LicenseCode}&${activationKey}"
```

示例（合成占位符值，本报告通篇使用）：

```
MESSAGE = "0000-00000-00000@20300101$800001&0000-0000-AAAAAA"
```

注意 `LicenseCode` 参与 `MESSAGE`，因此它同时被两个 CRC
条件覆盖 — 被篡改的 `LicenseCode` 会使密码失效。

## 3.3 函数角色（WolframEngine.dll v15.0.1）

| VA | 名称 | 职责 |
| --- | --- | --- |
| `0x181cf30f0` | 到期日处理程序 | 验证 / 解析 `yyyymmdd`；设置剩余天数（默认 10000）；发出 `Password has expired.` |
| `0x181cf3d50` | 密码解析器 | 验证 12 字符签名；提取两个 16 位残差 |
| `0x181cf3650` | CRC 校验器 | 两次 CRC-16 求值 + Accepted CRC 表成员测试 |
| `0x181cf3fa0` | `ω(·)` 辅助函数 | 数字编码的逆过程，`n0 → 2 bytes` |

## 3.4 第 1 步 — 解析签名

`FUN_181cf3d50(signature, &n0, &n2)`：

1. 除非 `len == 12`、`signature[4] == '-'`、`signature[8] == '-'`，且其余
   每个字符都是数字，否则拒绝（否则返回 `Password not in format dddd-ddd-ddd.`）。
2. 通过固定的数字排列构造两个 5 位十进制数：
   `v1 = signature[3] signature[2] signature[6] signature[1] signature[10]`
   `v2 = signature[7] signature[11] signature[9] signature[0] signature[5]`
3. 将 5 位数字空间转换到 16 位空间，然后输出残差：
   ```
   n0 = ( ceil(v1 · 65535 / 99999) - 0x72FA ) & 0xFFFF      //  == (n1 + 0x8D06) mod 2^16
   n2 =   ceil(v2 · 65535 / 99999)
   ```

## 3.5 第 2 步 — 两个 CRC-16 条件

两个 CRC 都是**最高有效位优先（MSB-first）、16 位、init `0xA5B6`**，仅多项式不同：

| 条件 | 多项式 | 按顺序喂入的字节 | 所需结果 |
| --- | --- | --- | --- |
| **A（完整性）** | `P_A = 0x1064B` | `n2`（2 字节，大端序）→ `MESSAGE` → `ω(n0)`（2 字节） | **`== 0`** |
| **B（Accepted CRC）** | `P_B = 0x105C3` | `n0`（2 字节，大端序）→ `MESSAGE` | **∈ `ACCEPTED_CRC_TABLE`** |

`ω(n0)`（辅助函数 `FUN_181cf3fa0`）从 `n0` 恢复 5 位数字组并
将其重新读取为 16 位值；它是第 1 步编码的逆过程，仅用作条件 A 的额外
输入字节。

密码被接受当且仅当 **A == 0 且 B ∈ table**；否则校验器返回
`Bad password.`。

## 3.6 第 3 步 — 到期日

到期日处理程序解析日期，计算相对于当前
日期的剩余天数，并在日期已过时拒绝（`Password has expired.`）。条件 B 的 CRC
**不**直接保护日期；日期是 `MESSAGE` 的一部分，因此任何改动都会破坏
条件 A/B。

## 3.7 演算示例（合成占位符）

```
mathID        = 0000-00000-00000
activationKey = 0000-0000-AAAAAA
LicenseCode   = 800001                (= 0x800001: bit23 = Mathematica, bit0 = base)
expiryDate    = 20300101
password      = 9528-122-377::800001:20300101
```

| 量 | 值 |
| --- | --- |
| `v1 = sig[3,2,6,1,10]` | `82257` → `n1 = ceil(82257·65535/99999) = 53908` |
| `n0 = (53908 + 0x8D06) mod 2^16` | `24474` |
| `v2 = sig[7,11,9,0,5]` | `27391` → `n2 = 17951` |
| 条件 B 结果（**Accepted CRC**） | **`59222` = `0xE756`，表索引 1 ✔** |
| 条件 A 结果 | `0` ✔ |

对条件 B 的所有 65536 个可能初始值进行暴力破解，**只有 `59222`**
通过 — 且 `59222` 是该构建表中的一个成员。见
[code/selfcheck.ts](code/selfcheck.ts)。

## 3.8 各机制的用途

- **条件 A** 使用一个**固定**目标（`0`）：一种经典的*完整性*检查 — `MESSAGE`
  加上残差必须是由 `P_A` 定义的 CRC-16 码的一个"码字"。
- **条件 B** 将 CRC 约束到一个**小集合**而非单个值。它是一个
  *来源 / 真实性*检查：随机伪造命中该集合的概率仅为
  `21 / 65536 ≈ 0.03 %`。它**不**识别产品 — 那是由
  `LicenseCode` 完成的（§3.9）。设计者为何选择 21 元素的集合而非单个
  常量，无法仅凭单个构建确定。

## 3.9 `LicenseCode` 在何处被应用

`LicenseCode` 作为消息的一部分被验证（§3.2），*并*在之后被解码以
选择该许可证的用途。解码器位于**前端**，而非内核：

```
LicenseCode (hex bitmask)
   ├─ product bit (20/21/22/23/24/26/6/5)  →  ProductIDName  →  product shell paclet
   ├─ class bit   (1/2/3/11)               →  $LicenseType / licence-type UI bar
   └─ feature bit (13/19/28/29)            →  capabilities
```

完整位表、谓词与逻辑：[04](04-license-code.md)。
