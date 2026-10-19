# 01 — 目标与工具链

**中文** · [English](01-target-and-tooling.md)

## 1. 目标身份

| 字段 | 值 |
| --- | --- |
| 已安装产品 | **Wolfram 15.0.1**（产品代码 `W-WIN-Standard`） |
| 主要目标 | `<WOLFRAM_INSTALL>\SystemFiles\Libraries\Windows-x86-64\WolframEngine.dll` |
| 格式 / 架构 | PE，x86-64，120,477,928 字节，映像基址 `0x180000000` |
| SHA-256 | `9a9a7d88d1a9285bc792e885cf589374285b1a247116eb3bfaefb2f71d2bad6f` |
| 许可证密码文件 | `%ProgramData%\Wolfram\Licensing\mathpass`（Windows） |
| 工具链 | REA（`rea-agents` 6.5.0）驱动 **Ghidra 12.1.4**（headless） |

> 本仓库中的公开参考实现 `main@v14.1.0.js` 是 **v14.1.0** 产物；此处分析的二进制是
> **已安装的 15.0.1**。方案与密码格式相同，但 **Accepted CRC 白名单因构建而异**
> （见 [05](05-accepted-crc.zh.md)）；此处提取的一切均为 15.0.1 的表。

相同的许可代码（错误字符串完全一致）被静态链接进多个随附二进制中。其中任何一个都是有效的分析目标：

| 二进制（相对于 `<WOLFRAM_INSTALL>`） | 大小 | 备注 |
| --- | --- | --- |
| `SystemFiles\Libraries\Windows-x86-64\WolframEngine.dll` | 120 MB | 内核 — 对 Mathematica 具有权威性 |
| `SystemFiles\Components\WSMCore\bin\SessionManager.exe` | 6.7 MB | 最小的副本；用于快速侦察 |
| `SystemFiles\FrontEnd\Binaries\Windows-x86-64\WolframNB.exe` | 36 MB | 前端 |
| `SystemFiles\Components\WSMCore\bin\WSMKernelX.exe` | 94 MB | System Modeler 内核 |

`SystemFiles\Activation\Windows-x86-64\reqpwd.exe` **仅**是在线激活客户端 —
它以 `actkey=…&pactkey=…&mathid=…` POST 到
`https://user.wolfram.com/services/1.0/password`。这证明*生成*在服务端，而
*离线验证*嵌入在上述二进制中。

## 2. 为什么需要反汇编器

验证是带有全局表且无符号的原生 x86-64 代码。静态文本扫描只能揭示*字符串*；将字符串映射到使用它的代码，并还原 CRC 逻辑，需要反汇编/反编译。REA 通过封装自带的 **Ghidra** 来提供这一能力（REA 不安装它）。

## 3. 工具链配置（Windows）

1. 将官方 **Ghidra 12.1.4** 发行版解压到某处，例如
   `<GHIDRA_INSTALL_DIR>`。
2. 提供一个 64 位 **JDK 21**（任意发行版；Wolfram 自身在
   `SystemFiles\Java\` 下随附了一个）。它必须满足 Ghidra 声明的 `application.java.min=21`。
3. 让 REA 指向它们（在启动时由 REA 服务器读取）：

```powershell
$env:GHIDRA_INSTALL_DIR = "<GHIDRA_INSTALL_DIR>"
$env:JAVA_HOME          = "<JAVA_HOME>"
$env:GHIDRA_HEADLESS_MAXMEM = "12G"                 # headless default is only 2G
$env:REA_GHIDRA_STARTUP_TIMEOUT_MS = "10800000"     # 120 MB analysis needs hours
```

`rea doctor --client opencode --json` 必须报告 `ghidra: available, version 12.1.4`。

## 4. 分析成本 / 实用说明

对 120 MB 的 `WolframEngine.dll` 进行完整的默认自动分析需要 **约 60–90 分钟**。
将其转换为一次性作业并复用结果：

- 在你自己的终端中运行，例如
  `rea function <binary> --procedure <VA> --provider ghidra`，它会将
  反编译结果以 JSON 形式打印出来。
- 或者使用 REA MCP 会话（`open_binary` … `analyze_function`），前提是你的宿主将其
  保持存活足够久。

对于快速侦察，可对 6.7 MB 的 `SessionManager.exe` 运行，其
**静态链接的相同函数副本**约 85 秒即可反编译。`SessionManager.exe` 内部的地址（例如 `0x1400f3f30`）**不**等于 `WolframEngine.dll` 内部的地址（例如 `0x181cf3650`）；应按*行为与常量*而非地址来映射。

## 5. 复现清单

1. 在 Wolfram 安装目录下执行
   `findstr /s /m /c:"Password not in format dddd-ddd-ddd." *.dll *.exe` → 找出哪些模块嵌入了许可代码。
2. 反编译校验器（见 [02](02-reverse-engineering.zh.md)）；本报告保留的提取主体位于
   [`decompiled/`](decompiled/)。
3. 验证模型并用
   [`code/selfcheck.ts`](code/selfcheck.ts) 重新生成密码（见 [07](07-mathematics.zh.md)）。
4. 提取该构建的 Accepted CRC 表（[05](05-accepted-crc.zh.md)，
   [`code/accepted-crc-table.ts`](code/accepted-crc-table.ts)）。

---

**下一篇：** [02 — 逆向工程：方法、工具链与组件图](02-reverse-engineering.zh.md)
