# 反编译输出

**中文** · [English](README.md)

这些是最重要函数的**原始 Ghidra 伪代码**主体，逐字保留（仅删去了头部中的证据路径行）。它们是反编译器的*解读*，而非原始源码。

清理并重命名后的重建版本位于 [../08-reconstructed-source.zh.md](../08-reconstructed-source.zh.md)；语言无关的伪代码位于 [../pseudocode/](../pseudocode/)。

| 文件 | 函数 | 地址 | 二进制 | 为何在此 |
| --- | --- | --- | --- | --- |
| [we_pwparse_fn__FUN_181cf3d50.c](we_pwparse_fn__FUN_181cf3d50.c) | `FUN_181cf3d50` | 0x181cf3d50 | WolframEngine.dll | 密码签名解析器 |
| [we_crc_fn__FUN_181cf3650.c](we_crc_fn__FUN_181cf3650.c) | `FUN_181cf3650` | 0x181cf3650 | WolframEngine.dll | 两个 CRC-16 条件 + Accepted CRC 表查找 |
| [we_expiry_fn__FUN_181cf30f0.c](we_expiry_fn__FUN_181cf30f0.c) | `FUN_181cf30f0` | 0x181cf30f0 | WolframEngine.dll | 到期日期处理 |
| [fe_pw_parse__FUN_140dac1f0.c](fe_pw_parse__FUN_140dac1f0.c) | `FUN_140dac1f0` | 0x140dac1f0 | WolframNB.exe | 拆分密码；存储 `LicenseCode` |
| [fe_fn_0x140da32d0__FUN_140da32d0.c](fe_fn_0x140da32d0__FUN_140da32d0.c) | `FUN_140da32d0` | 0x140da32d0 | WolframNB.exe | `LicenseCode` 位测试 `(n >> bit) & 1` |
| [fe_fn_0x140a8abea__FUN_140a8abd0.c](fe_fn_0x140a8abea__FUN_140a8abd0.c) | `FUN_140a8abd0` | 0x140a8abd0 | WolframNB.exe | `LicenseCode` → `ProductIDName` |

其余已分析的函数（许可文件读取器链、前端的 `LicenseCode` 类别 / 能力解析器，以及用于快速侦察的 `SessionManager.exe` 副本）在 [02](../02-reverse-engineering.zh.md) 与 [04](../04-license-code.zh.md) 中概述，而非在此处转储。

## 这些是如何产生的

仅做静态分析——由 REA（`rea-agents`）驱动无头 **Ghidra 12.1.4**，每个地址执行一次 `analyze_function` 操作。未使用任何第三方反汇编器，也未修改任何二进制。工具链见 [01](../01-target-and-tooling.zh.md)。
