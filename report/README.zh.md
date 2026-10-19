# Wolfram Mathematica `mathpass` — 完整逆向工程报告

**中文** · [English](README.md)

对 **Wolfram 15.0.1**（此处分析的构建）所使用的离线许可密码方案（“`mathpass`”）的完整、可复现的逆向工程，包括其所隐含的服务端密钥生成逻辑、**`LicenseCode`**（产品 / 类别 / 特性）位掩码，以及磁盘上的 **Accepted CRC 白名单**。

每一项论断均由对所发布二进制的反编译作为支撑，并用只读预言机进行了验证；重建出的生成器能够逐字节复现一个**真实许可密码**（该许可未在本文中公开——见 [09](09-validation.zh.md)）。

> 公开的参考实现 `main@v14.1.0.js` 是一份 **v14.1.0** 产物；此处分析的二进制是已安装的 **15.0.1**。方案与密码格式相同；*Accepted CRC 白名单*与*产品 shell*因构建而异。

---

## 一图看懂该方案

```
mathpass entry (TAB separated):  name   mathID   activationKey   password
                                  │        │           │
                                  │        │           └──────────────┐
        password = signature "::" LicenseCode ":" expiryDate          │
                     │                │                               │
   MESSAGE = mathID "@" expiryDate "$" LicenseCode "&" activationKey ◄─┘

   ── verification (offline, in WolframEngine.dll) ─────────────────────────────
   signature ─► (n0, n2) ─┬─ A:  CRC16(poly 0x1064B, init 0xA5B6, n2 ‖ MESSAGE ‖ ω(n0)) == 0
                          └─ B:  CRC16(poly 0x105C3, init 0xA5B6, n0 ‖ MESSAGE) ∈ ACCEPTED_CRC_TABLE

   ── beyond verification (front end WolframNB.exe) ───────────────────────────
   LicenseCode (hex bitmask) ─► product bit  ─► ProductIDName ─► product shell paclet
                             ├─ class bit    ─► $LicenseType / licence UI bar
                             └─ feature bit  ─► capabilities

   ── generation (server side) ────────────────────────────────────────────────
   choose acceptedCrc ∈ ACCEPTED_CRC_TABLE ;  solve n0, n2 by CRC inversion (GF(2) linear solve) ;  format
```

## 组件地图（一切所在之处）

| 子系统 | 二进制 | 函数（VA） |
| --- | --- | --- |
| 签名解析器 | `WolframEngine.dll` | `FUN_181cf3d50` |
| CRC 校验器 + Accepted CRC 查找 | `WolframEngine.dll` | `FUN_181cf3650` (+ `FUN_181cf3fa0` = `ω`) |
| 到期处理器 | `WolframEngine.dll` | `FUN_181cf30f0` |
| Accepted CRC 白名单 | `WolframEngine.dll` | 表 `0x186d4dd40`，计数 `0x186d4dd94` |
| `LicenseCode` 解码 | `WolframNB.exe`（前端） | `FUN_140dac1f0`, `FUN_140a8abd0`, `FUN_140a8ad70`, `FUN_140a8b0e0`, `FUN_140da32d0`, `FUN_1403754d0` |
| 激活客户端 | `reqpwd.exe` | 仅 HTTPS 客户端 |
| 相同代码，小型副本 | `SessionManager.exe` | `FUN_1400f4690`, `FUN_1400f3f30`, `FUN_1400f3d00` |

细节与证据：[02 §2.5](02-reverse-engineering.zh.md#25-子系统-c--licensecode产品--类别--特性)。

## 文档索引

| # | 文档 | 内容 |
| --- | --- | --- |
| 01 | [01-target-and-tooling.zh.md](01-target-and-tooling.zh.md) | 目标标识、哈希、二进制、工具链、复现清单 |
| 02 | [02-reverse-engineering.zh.md](02-reverse-engineering.zh.md) | **逆向工程方法与组件地图**（按子系统，含 `LicenseCode`） |
| 03 | [03-verification-flow.zh.md](03-verification-flow.zh.md) | 端到端验证流程与确切条件 |
| 04 | [04-license-code.zh.md](04-license-code.zh.md) | **`LicenseCode`**：产品 / 类别 / 特性位掩码与逻辑 |
| 05 | [05-accepted-crc.zh.md](05-accepted-crc.zh.md) | Accepted CRC 白名单：提取原理与模式 |
| 06 | [06-key-generation.zh.md](06-key-generation.zh.md) | 服务端密钥生成及其原理 |
| 07 | [07-mathematics.zh.md](07-mathematics.zh.md) | GF(2) CRC 代数、仿射双射、可逆性、编码 |
| 08 | [08-reconstructed-source.zh.md](08-reconstructed-source.zh.md) | 重建的 C 源码，含语义化变量名 |
| 09 | [09-validation.zh.md](09-validation.zh.md) | 每一项验证实验及其结果 |

## 产物

| 文件夹 | 内容 |
| --- | --- |
| [`pseudocode/`](pseudocode/) | 语言无关的伪代码，每主题一个文件 |
| [`decompiled/`](decompiled/) | 原始 Ghidra 伪代码主体（`.c`），每函数一个文件，含头部 |
| [`code/`](code/) | TypeScript：验证、生成、`LicenseCode` 解码、Accepted CRC 提取 |

## 复现它

```bash
# TypeScript (Node ≥ 22 runs .ts directly)
node report/code/selfcheck.ts        # validates the whole reconstruction
node report/code/cli.ts verify 0000-00000-00000 0000-0000-AAAAAA 9528-122-377::800001:20300101
node report/code/accepted-crc-table.ts "…\WolframEngine.dll"   # extract the whitelist
```

静态分析使用了 REA + Ghidra；见 [02 §2.0](02-reverse-engineering.zh.md#20-工具链)
