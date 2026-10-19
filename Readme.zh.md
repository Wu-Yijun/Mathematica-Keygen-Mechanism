[English](Readme.md) · **中文**

# Mathematica-Keygen-Mechanism

一个基于逆向工程的 Wolfram `mathpass` 许可密码工具：**生成**、**验证**、**提取 Accepted CRC**，
并可以直接从你本机的 `WolframEngine.dll` 里**读出 Accepted-CRC 表**。
完整的逆向过程、算法推导与服务端密钥生成分析见 [`report/`](report/README.md)。

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

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/` | 页面源码（TypeScript；直接 `import` 报告里的 `report/code/mathpass.ts`，构建时内联） |
| `report/` | 逆向报告（01–09）+ 算法实现（`mathpass.ts` / `licenseCode.ts` / `accepted-crc-table.ts`）+ 伪代码 + 反编译样例 |
| `dist/` | 构建产物（由 CI 构建，已在 `.gitignore` 中） |
| `scripts/serve.mjs` | 本地静态服务器（`pnpm preview`） |
| `.github/workflows/deploy.yaml` | 安装 → 类型检查 → 跑算法自检 → 构建 → 部署 `dist/` |

## 说明

- 页面里所有默认值都是**合成样例**；本仓库**不含任何厂商二进制**，也**不含真实许可证或可用密钥**。
- 界面顶部可在**基础模式**（只需版本 + Math ID）与**高级模式**（全部字段 + 位编辑器 + 表导入）之间切换；支持中英文切换。
- 免责声明见 [`DISCLAIMER.md`](DISCLAIMER.md)。
