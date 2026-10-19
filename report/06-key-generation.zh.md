[English](06-key-generation.md) · **中文**

# 06 — 服务端密钥生成

## 6.1 生成发生在何处

`SystemFiles\Activation\Windows-x86-64\reqpwd.exe` 是唯一的激活组件。其
字符串表明它是一个轻量级的 HTTPS 客户端：

```
https://user.wolfram.com/services/1.0/password
actkey=… & pactkey=… & mathid=…
Key generation failed
```

因此服务端持有所需的任何私有材料；客户端只知道
最终得到的 `mathpass` 密码。以下所有内容都是服务端*必然*在做的事，作为
我们所逆向的验证过程的直接结果。

## 6.2 生成算法（闭式解——无需暴力破解）

输入：`mathID`、`activationKey`、`LicenseCode`、`expiryDate`，以及一个从
该构建的白名单中选出的 **Accepted CRC** `M`。

```
1. MESSAGE ← mathID "@" expiryDate "$" LicenseCode "&" activationKey

2. choose M ∈ ACCEPTED_CRC_TABLE                    # product/edition secret; e.g. 59222

3. solve n0  s.t.  CRC16(P_B, 0xA5B6, n0 ‖ MESSAGE) == M        # linear solve, O(1)
       n1 ← (n0 + 0x72FA) mod 2^16                              # == (n0 - 0x8D06)

4. solve n2  s.t.  CRC16(P_A, 0xA5B6, n2 ‖ MESSAGE ‖ ω(n0)) == 0

5. signature ← construct_password(n1, n2)     # decimal encoding + permutation
   password  ← signature "::" LicenseCode ":" expiryDate
```

步骤 3 和 4 是 **CRC 求逆**（[07](07-mathematics.md) §7.2）：由于 2 字节
前缀在状态上表现为仿射双射，所需的字节通过
对 16×16 的 GF(2) 线性映射求逆而获得。复杂度为 `O(|MESSAGE| + 16²)`。这里
**没有**对密钥、对 2³² 密码空间、或对 Accepted CRC 值的
搜索。

一个未优化的实现也可以改为暴力破解这 2 字节前缀（65536 次尝试，
亚毫秒级）——那仍然*不是*密钥空间搜索，只是一次 2 字节的求解。

## 6.3 验证

从仓库根目录运行 [`code/selfcheck.ts`](code/selfcheck.ts)（`node report/code/selfcheck.ts`）：

```
generatePassword("0000-00000-00000", "0000-0000-AAAAAA", "800001", "20300101", 59222)
  == "9528-122-377::800001:20300101"      // synthetic placeholder licence
```

该重建也针对来自所分析安装的一个**正版**许可证得到了确认：生成器
逐字节复现了正版密码（此处隐去这些值）。它使用了 Accepted CRC `59222`（表索引 1）以及上述
过程。

## 6.4 为什么是这种密钥？

- **确定且无状态。** 给定相同的 `(mathID, activationKey, LicenseCode,
  expiry)`，服务端总是产生相同的密码；没有任何随机内容被存储。
- **自包含。** 密码只携带 32 位的“证书”（`n0`,`n2`）；许可
  类型/版本由所用的白名单条目 `M` 隐含，而
  身份由消息隐含。
- **可离线验证。** 客户端二进制内嵌了多项式、初始值和
  白名单，因此激活后无需网络。
- **可通过表扩展。** 增加一个版本意味着向
  `ACCEPTED_CRC_TABLE` 增加一个 16 位值——算法无需改变。

## 6.5 服务端会选择哪个 Accepted CRC？

可观察到的事实：

- 所有源自某个公开概念验证的已检查示例都使用了 `24816`，它
  **不在** v15.0.1 表中，因此该值*不是*此构建的服务端所用的值。
- 来自此 15.0.1 安装的正版许可证使用了 `59222`（值已隐去）。

推断（无法从单个构建完全确定）：Accepted CRC 编码了
**产品/版本**，因此服务端为每个产品选择一个固定的 `M`。支持性证据：
该表很小（21 个条目），这些值不携带任何算术模式
（[05](05-accepted-crc.md)），且二进制接受其中*任意*一个——这正是
“每个版本/产品族一个密钥”列表的形态。确定完整映射需要若干个
不同版本的正版许可证。

## 6.6 伪代码

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
