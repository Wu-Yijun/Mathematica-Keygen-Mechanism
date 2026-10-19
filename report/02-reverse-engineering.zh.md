[English](02-reverse-engineering.md) · **中文**

# 02 — 逆向工程：方法、工具链与组件图

本章是报告的逆向工程核心。它**按子系统**组织
（而非按工作发生的顺序），并覆盖许可方案的每一部分：
密码校验器、Accepted CRC 白名单、**LicenseCode**（产品 / 类别 / 特性）、
激活客户端，以及用于确认每项发现的 oracle。文中随处引用具体的函数
地址、证据文件与原始反编译结果。

所有地址均为 REA/Ghidra 报告的**虚拟地址（VA）**。分析在随附二进制上运行，由 REA 驱动 Ghidra；提取的伪代码主体位于
[`decompiled/`](decompiled/)，语言无关的伪代码位于
[`pseudocode/`](pseudocode/)。

## 2.0 工具链

| 项目 | 值 |
| --- | --- |
| 目标操作系统 / 宿主 | Windows 11 x64 |
| 逆向工程框架 | REA（`rea-agents` 6.5.0）驱动 **Ghidra 12.1.4** headless |
| JDK | Wolfram 随附的 JDK 21（`SystemFiles\Java\Windows-x86-64`，Zulu 21.0.11） |
| 环境变量 | `GHIDRA_INSTALL_DIR`、`JAVA_HOME`、`GHIDRA_HEADLESS_MAXMEM`、`REA_GHIDRA_STARTUP_TIMEOUT_MS` |
| 驱动 | REA CLI：`rea function <binary> --procedure <VA> --provider ghidra` |

除 Ghidra 外未使用任何反汇编器；不需要 IDA/OllyDbg。Ghidra 严格用作随附字节的*读取器* — 原始可执行文件从不被修改。

## 2.1 侦察 — 哪些二进制实现了许可

一切始于一个独特的字符串，在整个安装目录中搜索：

```powershell
findstr /S /M /C:"Password not in format dddd-ddd-ddd." *.dll *.exe
```

命中：

| 模块 | 角色 |
| --- | --- |
| `SystemFiles\Libraries\Windows-x86-64\WolframEngine.dll`（120 MB） | 内核 — 对 Mathematica 具有权威性 |
| `SystemFiles\Components\WSMCore\bin\SessionManager.exe`（6.7 MB） | 相同代码的最小副本（快速侦察） |
| `SystemFiles\Components\WSMCore\bin\WSMKernelX.exe`（94 MB） | System Modeler 内核 |
| `SystemFiles\FrontEnd\Binaries\Windows-x86-64\WolframNB.exe`（36 MB） | **前端** — 产品选择所在之处 |

`SystemFiles\Activation\Windows-x86-64\reqpwd.exe` 是*在线激活客户端*
（见 §2.6），而非离线校验器。

因此分析使用三个目标：内核（权威校验器）、小型
`SessionManager.exe` 副本（相同函数，分析速度快 18×），以及前端
（产品 / 类别 / 特性选择）。

## 2.2 分析所依赖的 PE 机制

原始字节扫描产生**文件偏移**；Ghidra 与交叉引用讲的是**虚拟
地址**。解析一次 PE 节表即可桥接二者。对于 `WolframEngine.dll`
（映像基址 `0x180000000`）：

| 节 | VA | 原始偏移 | 大小 |
| --- | --- | --- | --- |
| `.text` | `0x180001000` | `0x400` | `0x5b8edf6` |
| `.rdata` | `0x185b90000` | `0x5b8f200` | `0x118caf8` |
| `.data` | `0x186d1d000` | `0x6d1be00` | `0x13eb5a8` |
| `.pdata` | `0x188109000` | `0x6e44800` | `0x46ba68` |

反复使用两种技术：

1. **定位使用字符串字面量的代码。** x86-64 通过
   RIP 相对操作数访问字面量。对于每个 `lea r64,[rip+disp32]`（`48/4C 8D 05`）或
   `mov r64,[rip+disp32]`（`48/4C 8B 05`），若 `modrm & 0xC7 == 0x05`，则计算
   `target = VA(instrEnd) + disp32`；当 `target` 等于
   字面量的 VA 时保留该指令。实现在 [`code/accepted-crc-table.ts`](code/accepted-crc-table.ts)
   （`findCodeRefs`）中。Ghidra `xrefs` 给出相同答案，并额外还原
   操作数类型。
2. **还原精确的函数边界。** `.pdata` 是
   `RUNTIME_FUNCTION { BeginRVA, EndRVA, UnwindRVA }` 的数组。任何引用地址都映射到其
   唯一的外层函数，这一点至关重要，因为这些函数没有
   符号。对于 `WolframEngine.dll`：

   | 某引用的 RVA | 外层函数 |
   | --- | --- |
   | `0x1cf3f89` | `0x1cf3d50 .. 0x1cf3dfd`（密码解析器） |
   | `0x1cf3697` | `0x1cf3650 .. 0x1cf3d50`（CRC 校验器） |
   | `0x1cf3193` | `0x1cf30f0 .. 0x1cf3420`（到期日处理程序） |

## 2.3 子系统 A — 密码校验器（内核）

**如何找到的。** 定位了字面量 `Password not in format dddd-ddd-ddd.`（VA
`0x185c58210`）、`Bad password.`（`0x185c58200`）和
`Expiration date after mathid not in format yyyymmdd.`（`0x185c58270`），并通过 §2.2 技术 1 还原了
它们的代码引用。这些引用位于三个函数内：

| 函数 | VA 范围 | 角色 |
| --- | --- | --- |
| `FUN_181cf3d50` | `0x181cf3d50 .. 0x181cf3dfd` | 12 字符签名解析器 + 数字提取 |
| `FUN_181cf3650` | `0x181cf3650 .. 0x181cf3d50` | 两次 CRC-16 求值 + Accepted CRC 表查找 |
| `FUN_181cf30f0` | `0x181cf30f0 .. 0x181cf3420` | 到期日解析器（`yyyymmdd`）、剩余天数、`Password has expired.` |

**算法如何还原的。** 在 `FUN_181cf3650` 内，两个 CRC 多项式
以 32 位立即数形式出现数十次（编译器展开了位循环）：

```
0x0001064b  at VAs 0x181cf3697 .. 0x181cf3cea   (condition A)
0x000105c3  at VAs 0x181cf36c2 .. 0x181cf3ceb   (condition B)
```

这些立即数直接给出多项式；周围展开的循环
（`s = (s<<1)|bit; if (s & 0x8000) s ^= P;`）给出 CRC 形式；每个循环的第一个表达式
`((bit + 0x14b6c) ^ 0x1064b)` 揭示了初始值 `0x14b6c = 0xA5B6<<1`，
即 **init `0xA5B6`**。相同的代码在小型 `SessionManager.exe`
副本（`FUN_1400f4690`、`FUN_1400f3f30`、`FUN_1400f3d00`）中被反编译以完整阅读逻辑；内核的
副本逐常量匹配。

证据：用 REA/Ghidra 获得（`--procedure <VA>`）；原始主体保存在
[`decompiled/`](decompiled/)。算法：[03](03-verification-flow.md)，
[07](07-mathematics.md)。重构：[08](08-reconstructed-source.md)。

## 2.4 子系统 B — Accepted CRC 白名单

条件 B 并不针对单一常量进行测试；它测试**是否属于某个数组**。
该数组由校验器读取如下：

```
mov  r8d, [rip+count]      ; length
lea  rcx, [rip+table]      ; base
...
cmp  [rcx], eax            ; == the condition-B result ?
je   accepted
```

**提取原理。** 白名单是一段连续的小端序 `u32` 数组，
每个值都在 `(0, 0x10000)` 内，紧跟其后的是其元素计数。这一
特征通过一次普通扫描即可找到；该表得到确认，是因为*代码在校验器内部
通过 RIP 相对加载引用它*。对于 `WolframEngine.dll`：表 VA
`0x186d4dd40`，计数 VA `0x186d4dd94` = **21**。完整处理与值列表见
[05](05-accepted-crc.md)；提取器为
[`code/accepted-crc-table.ts`](code/accepted-crc-table.ts)。

## 2.5 子系统 C — LicenseCode（产品 / 类别 / 特性）

> 历史上称为 "Math Num" 的那个密码字段；它是一个**十六进制位掩码**。
> 本报告称其为 **`LicenseCode`**。完整表见 [04](04-license-code.md)。

**内核侧。** 内核公开 `System`$LicenseType`、`$LicenseID`、
`$LicenseExpirationDate`、`$ProductInformation`（符号名位于 `WolframEngine.dll`
`.rdata` @ `0x5b9eb48`…`0x5b9f318`）。其 `$ProductInformation["ProductIDName"]` 是通用的
（`Wolfram`）— *具体*产品由**前端**决定。

**前端侧（`LicenseCode` 在此解码）。** 前端自行解析 `mathpass`
文件，并从 `LicenseCode` 推导产品 / 类别 / 特性。解析链
（全部在 `WolframNB.exe` 中，已反编译）：

| 函数 | VA | 角色 |
| --- | --- | --- |
| `FUN_140a82950` | `0x140a82950` | 启动；`-pwfile`/`-password`/`-provisioned`；为 `Licensing\<Product>\mathpass` 遍历已知产品 |
| `FUN_140a89380` | `0x140a89380` | 处理单个许可证（WSTP 路径，然后解析） |
| `FUN_140daa0c0` | `0x140daa0c0` | 逐行读取 `mathpass` 文件（`%(*userregistered*)`、`%(*temporary*)`） |
| `FUN_140daa340` | `0x140daa340` | 按 `,` 分割条目 |
| `FUN_140daab20` | `0x140daab20` | 按 TAB 将条目拆分为字段 |
| `FUN_140dac1f0` | `0x140dac1f0` | 按 `:` 拆分密码 → 签名、**`LicenseCode`（`obj+0x167E`）**、到期日 |
| `FUN_140a8abd0` | `0x140a8abd0` | `LicenseCode` → **ProductIDName**（产品） |
| `FUN_140a8ad70` | `0x140a8ad70` | `LicenseCode` → 许可证类别（`Trial`/`Student`/`Site`/`Home`） |
| `FUN_140a8b0e0` | `0x140a8b0e0` | `LicenseCode` → 能力（`EnterpriseSigning`，…） |
| **`FUN_140da32d0`** | `0x140da32d0` | 谓词：**位测试** `((n >> atoi(code)) & 1)` |
| `FUN_1403754d0` | `0x1403754d0` | 回退 ProductIDName（来自环境变量/注册表的 `ProductIDName`，否则为 `"Wolfram"`） |

产品名成为许可证的 **`ProductIDName`**，由
`PacletManager`Package`getProductID[]`（`SystemFiles\Autoload\PacletManager\Kernel\Utils.m`）使用，
后者匹配每个随附 shell paclet 的 `"ProductID"` 并加载匹配的 shell
（菜单、品牌、`FrontEnd\SystemResources\WelcomeScreen-<variant>.nb`）。这就是
"启动不同的子程序"背后的机制。

证据：用 REA/Ghidra 获得；见 [`decompiled/`](decompiled/)。产品 / 类别 / 特性表及
逻辑：[04](04-license-code.md)。

## 2.6 子系统 D — 激活（服务端）

`reqpwd.exe` 是一个轻量 HTTPS 客户端；其字符串显示

```
https://user.wolfram.com/services/1.0/password
actkey=… & pactkey=… & mathid=…
```

因此密码的*生成*在服务端，而*离线验证*嵌入在上述二进制中。生成算法是验证的逆过程，推导见 [06](06-key-generation.md)。

## 2.7 Oracle 与交叉校验

静态结论通过只读 oracle 以及重新生成一个真实
许可证得到确认：

- **内核 oracle**（`wolframscript`）：打印 `$LicenseType`、`$LicenseID`、
  `$LicenseExpirationDate`、`$ActivationKey`、`$MachineID`、`$ProductInformation`。
- **前端 oracle**（`WolframNB.exe -pwfile <file>`）：通过欢迎
  窗口标题显示产品，**不触碰系统许可证**。用于将 `LicenseCode` 位映射到
  产品。
- **字节级交叉校验**：`SessionManager.exe` 与
  `WolframEngine.dll` 中相同的表 / 常量（仅在一个表项上不同，证明白名单
  因构建而异）。
- **重新生成**：重构的生成器逐字节重现真实许可证密码
  （此处隐去其值）；见 [09](09-validation.md)。

内核 oracle 是一段简短的 `wolframscript` 运行，为某个许可证文件打印 `$LicenseType`、`$ActivationKey`
和 `$ProductInformation`；前端 oracle 是一次
`WolframNB.exe -pwfile <file>` 启动，从不触碰系统许可证。
