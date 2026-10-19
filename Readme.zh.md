# Mathematica-Keygen-Mechanism

**中文** · [English](Readme.md)

一个基于逆向工程的 Wolfram `mathpass` 许可密码工具：**生成**、**验证**、**提取 Accepted CRC**，
并可以直接从你本机的 `WolframEngine.dll` 里**读出 Accepted-CRC 表**。
完整的逆向过程、算法推导与服务端密钥生成分析见 [`report/`](report/README.zh.md)。

## 它能做什么

| 功能 | 说明 |
| --- | --- |
| 生成 | 由 Math ID、激活密钥、LicenseCode、到期日与 Accepted CRC 生成 `signature::LicenseCode:YYYYMMDD`（≥ 14.1）或 `signature::LicenseCode`（≤ 14.0） |
| 验证 | 同时检查条件 A（完整性：CRC == 0）与条件 B（CRC ∈ Accepted-CRC 表），并解码 LicenseCode、算出到期剩余天数 |
| 提取 Accepted CRC | 由密码**直接算出**（O(1)，不做任何搜索） |
| 读取表 | 选择本机的 `WolframEngine.dll`，在浏览器里解析 PE、扫描白名单，并用「是否被校验器代码引用」交叉验证；**文件只在本地解析，不会上传** |

## 使用

在线：<https://wu-yijun.github.io/Mathematica-Keygen-Mechanism/>

本地：

```bash
pnpm install
pnpm build      # src/index.ts -> dist/index.js，并把 index.html / index.css / logo.svg / favicon.ico 复制进 dist/
pnpm preview    # http://localhost:8137/
```

### 脚本用法（Node）

算法与命令行实现都在 [`report/code/`](report/code)；Node ≥ 22 可直接运行 `.ts`（类型擦除）。

命令行：

```bash
node report/code/cli.ts table                          # 打印内置的 v15.0.1 Accepted-CRC 表（21 项）
node report/code/cli.ts verify      <MathID> <激活密钥> <密码>
node report/code/cli.ts acceptedcrc <MathID> <激活密钥> <密码>     # 由密码直接算出 Accepted CRC
node report/code/cli.ts generate    <MathID> <激活密钥> <LicenseCode> <YYYYMMDD> [acceptedCrc]
node report/code/cli.ts decode      <LicenseCode|密码>             # 解码产品 / 类别 / 特性
node report/code/accepted-crc-table.ts <PE 文件>                   # 从本机模块里扫出 Accepted-CRC 表
```

作为模块 `import`：

```ts
import {
  // 验证：条件 A（完整性，须为 0）+ 条件 B（Accepted CRC 须在表内）
  verify, verifyMessage, verifySignature,
  // 生成（≥ 14.1 / ≤ 14.0）
  generatePassword, generatePasswordLegacy,
  // 由密码，或由 MESSAGE + 签名算出条件 B 的结果
  acceptedCrcOf, acceptedCrcOfSignature,
  messageOf, messageOfLegacy, parsePassword, extract,
  ACCEPTED_CRC_TABLE_V15_0_1,                       // 内置表
} from "./report/code/mathpass.ts";
import { decodeLicenseCode, LICENSE_BITS } from "./report/code/licenseCode.ts";
import { parsePe, findCodeRefs, scanAcceptedCrcTables } from "./report/code/accepted-crc-table.ts";

const pw = generatePassword("1234-56789-12345", "1234-5678-ABCDEF", "800001", "20300101", 59222);
console.log(verify("1234-56789-12345", "1234-5678-ABCDEF", pw, ACCEPTED_CRC_TABLE_V15_0_1).valid); // true
console.log(decodeLicenseCode("800001"));        // Mathematica / Professional
```

网页 `src/` 正是直接 `import` 这些模块——构建时被内联进 `dist/index.js`，因此页面与脚本永远共用同一份算法实现。

## 结构与数学

**结构。** `src/` 是页面源码，`tsdown` 把它打包成 `dist/`（连同 `index.html`、`index.css`、`logo.svg`、`favicon.ico` 一并复制）。`report/` 是逆向产物：`01`–`09` 章节正文、`code/`（上节列出的算法与 CLI）、`pseudocode/`（语言无关伪代码）、`decompiled/`（Ghidra 反编译原文）。`scripts/serve.mjs` 提供本地预览；`.github/workflows/deploy.yaml` 依次执行 安装 → 类型检查 → 算法自检 → 构建 → 部署 `dist/`。

**数学。** 密码 `signature::LicenseCode[:YYYYMMDD]` 的 12 位签名编码两个 16 位值，其中 `v1`、`v2` 是按固定置换从签名数字里取出的两个 5 位十进制数（置换本身只是混淆）：

```
n1 = ceil(v1 · 65535 / 99999)      n2 = ceil(v2 · 65535 / 99999)
n0 = (n1 + 0x8D06) mod 2^16
```

校验用两条共享初值 `0xA5B6` 的 **MSB-first CRC-16**（多项式 `P_A = 0x1064B`、`P_B = 0x105C3`）：

- **条件 A（完整性）** —— `CRC_{P_A}(n2 ‖ MESSAGE ‖ ω(n0)) == 0`
- **条件 B（真实性）** —— `CRC_{P_B}(n0 ‖ MESSAGE) ∈ Accepted-CRC 表`（每个构建一份白名单；15.0.1 为 21 项）

其中 `MESSAGE = mathID@YYYYMMDD$LicenseCode&activationKey`（≥ 14.1）或 `mathID$LicenseCode&activationKey`（≤ 14.0）。

**生成不需要任何搜索。** `MESSAGE` 固定后，`n0`、`n2` 只是 `MESSAGE` 与 `ω(n0)` 前面的 2 字节前缀；而 2 字节前缀对 CRC 状态是 **GF(2) 上的仿射双射**，所以解一个 16×16 线性方程组即可（复杂度 `O(|MESSAGE|)`），既不是密钥空间搜索，也不是参数爆破。

## 说明

- 页面里所有默认值都是**合成样例**；本仓库**不含任何厂商二进制**，也**不含真实许可证或可用密钥**。
- 界面顶部可在**基础模式**（只需版本 + Math ID）与**高级模式**（全部字段 + 位编辑器 + 表导入）之间切换；支持中英文切换。
- 免责声明见 [`DISCLAIMER.zh.md`](DISCLAIMER.zh.md)。
