# 04 — `LicenseCode`：产品、类别与特性选择

**中文** · [English](04-license-code.md)

`LicenseCode` 是历史上被称为 **"Math Num"** / `mathNum` 的字段——即密码
`signature"::"LicenseCode":"expiry` 中的 `bbbbbb` 部分。逆向工程表明它
**并非一个普通数字，而是一个十六进制位掩码**：每一个置位的比特都命名了一个
*产品性质*、一个*许可类别*或一项*能力*。

本章讨论其语义；定位到它的逆向工程方法见
[02 §2.5](02-reverse-engineering.zh.md)，它在消息中的作用见
[03 §3.9](03-verification-flow.zh.md)。

## 4.1 谓词——它确实是一次位测试

`WolframNB.exe!FUN_140da32d0(codeString, LicenseCodeString)`：

```c
bool license_code_has_bit(const char *code, const char *licenseCode) {
    unsigned bit = atoi(code);                 /* "23" -> 23                         */
    if (/* hex digits required for `bit` */ > strlen(licenseCode)) return false;
    parse_number(licenseCode, /* format @0x1414ede78 */ &n);   /* LicenseCode as a number */
    return ((n >> (bit & 31)) & 1) != 0;       /* BIT TEST                            */
}
```

`code` 是**位索引**；`LicenseCode` 是该数字。下面每一个解析器都是一
系列这样的位测试。

## 4.2 它在何处被解析和解码

| 二进制 | 函数 | 角色 |
| --- | --- | --- |
| `WolframNB.exe` | `FUN_140dac1f0` | 按 `:` 拆分密码 → signature、**位于对象 `+0x167E` 的 `LicenseCode`**、expiry |
| `WolframNB.exe` | `FUN_140a8abd0` | `LicenseCode` → **ProductIDName**（产品） |
| `WolframNB.exe` | `FUN_140a8ad70` | `LicenseCode` → 许可类别（`Trial`/`Student`/`Site`/`Home`） |
| `WolframNB.exe` | `FUN_140a8b0e0` | `LicenseCode` → 能力 |
| `WolframNB.exe` | `FUN_1403754d0` | 回退的 ProductIDName（来自 env/registry 的 `ProductIDName`，否则为 `"Wolfram"`） |

证据：使用 REA/Ghidra 获得；参见 [`decompiled/`](decompiled/)。

## 4.3 位表

| 比特 | 掩码（十六进制） | 含义 | 定义于 |
| --- | --- | --- | --- |
| 0 | `0x0000001` | 基础标志（在正版 `800001` 中置位） | 已观察 |
| 1 | `0x0000002` | **Trial** | `FUN_140a8ad70` |
| 2 | `0x0000004` | **Student** | `FUN_140a8ad70` |
| 3 | `0x0000008` | **Site** | `FUN_140a8ad70` |
| 5 | `0x00000020` | **WolframPlayer** | `FUN_140a8abd0` |
| 6 | `0x00000040` | **WolframPlayerPro** | `FUN_140a8abd0` |
| 11 | `0x00000800` | **Home**（Home Edition） | `FUN_140a8ad70` |
| 13 | `0x00002000` | **EnterpriseSigning** | `FUN_140a8b0e0` |
| 19 | `0x00080000` | **AltExpirationPolicy** | `FUN_140a8b0e0` |
| 20 | `0x00100000` | **Wolfram\|Alpha Notebook Edition** | `FUN_140a8abd0` |
| 21 | `0x00200000` | **Wolfram\|One** | `FUN_140a8abd0` |
| 22 | `0x00400000` | **Wolfram Finance Platform** | `FUN_140a8abd0` |
| 23 | `0x00800000` | **Wolfram Mathematica** | `FUN_140a8abd0` |
| 24 | `0x01000000` | **Wolfram Financial Framework** | `FUN_140a8abd0` |
| 26 | `0x04000000` | **Wolfram Raspberry Pi** | `FUN_140a8abd0` |
| 28 | `0x10000000` | 当**置位**时，禁用 `LLMSupport` | `FUN_140a8b0e0` |
| 29 | `0x20000000` | **AutoRenewingSubscription** | `FUN_140a8b0e0` |

未列出的比特没有观察到任何效应。`license_code_has_bit` 会根据字符串长度进行防护，
因此更长的 `LicenseCode`（更多十六进制数字）可以携带更高的比特。

## 4.4 逻辑

```
product = first of the following whose bit is set (this order):
              bit20 -> "WolframAlphaNB"
              bit22 -> "WolframFinancePlatform"
              bit21 -> "WolframOne"
              bit23 -> "Mathematica"
              bit24 -> "WolframFinancialFramework"
              bit26 -> "WolframRaspberryPi"
              bit6  -> "WolframPlayerPro"
              bit5  -> "WolframPlayer"
          else  -> $ProductIDName (env/registry) or "Wolfram"      (FUN_1403754d0)

class   = bit1 -> "Trial" | bit2 -> "Student" | bit3 -> "Site" | bit11 -> "Home"
          (none)  -> Professional

caps    = bit13 -> EnterpriseSigning ; bit19 -> AltExpirationPolicy ;
          bit29 -> AutoRenewingSubscription ; bit28 clear -> LLMSupport
```

**产品**字符串成为许可证的 **`ProductIDName`**，由
`PacletManager`Package`getProductID[]` 使用（`SystemFiles\Autoload\PacletManager\Kernel\Utils.m`）：

```wl
$currentProductID = Select[CurrentValue["ActivationInformation"], #["Status"]=="Active"&][[All,"ProductIDName"]]
```

它会与每个随附 shell paclet 的 `"ProductID"` 进行匹配（`productIDMatches`）。
类别字符串驱动 `System`$LicenseType` 以及许可类型 UI 栏；能力
字符串则成为特性标志。

## 4.5 为什么它“启动了一个不同的子程序”

产品比特会选择 `SystemFiles\Components\` 下的一个**前端 shell paclet**——
`Mathematica`（`ProductID "Mathematica"`）、`WolframAlphaNotebookEdition`（`"WolframAlphaNB"`）、
`WolframFinancePlatform`、`WolframFinancialFramework`、`WolframProgrammingLab`——它会
带来该产品的菜单、品牌标识和欢迎界面
（`FrontEnd\SystemResources\WelcomeScreen-<variant>.nb`，变体有 `M`、`M-Home`、
`M-Student`、`M-Trial`、`ANB`、`WD`、`WFP`、`WPL`、`Player`、`PlayerPro`、`RPi`），
同时前端会应用每个产品的特性标志（`NoLocalFileAccess`、……），而
类别则选择许可类型栏（`TrialBar`、`HomeEditionBar`、`StudentBar`、
`PlayerBar`）。这是单次安装内部的呈现/特性选择，**而非**一个
单独安装的应用程序。

**v15.0.1 仍然随附这些组件。** 它们是外壳和标志，而非单独的
安装程序；如今已不再有单独的 `Player`/`Finance` 产品安装。

## 4.6 经验验证（只读预言机）

前端（`WolframNB.exe -pwfile <file>`；系统许可证不受影响）——窗口标题：

| `LicenseCode` | 置位的比特 | 欢迎标题 |
| --- | --- | --- |
| `800001` | 0, 23 | Welcome to Wolfram Mathematica |
| `800000` | 23 | Welcome to Wolfram Mathematica |
| `100000` | 20 | Welcome to Wolfram\|Alpha Notebook Edition |
| `200001` | 0, 21 | Welcome to Wolfram\|One |
| `400001` | 0, 22 | Welcome to Wolfram Finance Platform |
| `000020` | 5 | Welcome to Wolfram Player |
| `000040` | 6 | Welcome to Wolfram Player \| PRO |
| `000023` | 0, 1, 5 | Welcome to Wolfram Player |

内核（`wolframscript`）——`$LicenseType`：

| `LicenseCode` | 比特 | `$LicenseType` |
| --- | --- | --- |
| `800001` | 0, 23 | Professional |
| `800002` | 1, 23 | Trial |
| `800004` | 2, 23 | Student |
| `800021` | 0, 5, 23 | *被拒绝*（Player 与 Mathematica 比特冲突） |

因此，公开的 JavaScript 模型所说的“首字符 ∈ {1,2,4,8}”正是高
半字节为比特 20–23 之一。

## 4.7 未知项

- 比特 4、7–10、12、14–18、25、27、30、31 在此构建中没有观察到任何含义。
- 是否为每个可购买的 SKU 签发特定的比特组合，这是一个服务端
  决策，无法从单次安装中确定。

---

**← 上一篇：** [03 — 验证流程](03-verification-flow.zh.md) · **下一篇：** [05 — Accepted CRC 表](05-accepted-crc.zh.md)
