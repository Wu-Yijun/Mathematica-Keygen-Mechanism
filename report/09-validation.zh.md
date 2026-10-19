# 09 — 验证

**中文** · [English](09-validation.md)

本报告中的每一项断言都由反编译代码（见
[02](02-reverse-engineering.zh.md) 和 [`decompiled/`](decompiled/)）或一个只读
oracle 作为支撑。本章汇集了这些*验证* —— 那些证实重建正确、而非仅仅看似合理的实验。

> **关于此处所用的值。** 下文每个许可证值都是一个**合成
> 占位符**（`0000-00000-00000` / `0000-0000-AAAAAA` / `800001` / `20300101`）。
> 重建最初是针对所分析安装的一份**真实**许可证进行核对的，并逐字节地
> 重现了其密码；该许可证的值有意不予公开。此处所示的一切都可用这些
> 占位符复现。

## 9.1 生成器逐字节重现许可证密码

[`code/selfcheck.ts`](code/selfcheck.ts) 使用取自所提取白名单的一个 accepted CRC
生成密码，然后验证它：

```
mathID = 0000-00000-00000   activationKey = 0000-0000-AAAAAA
LicenseCode = 800001        expiryDate = 20300101        acceptedCrc = 59222

generate(...)     ==  "9528-122-377::800001:20300101"
verify(...).valid ==  true
```

对本次安装的真实许可证运行同一流程，精确重现了该许可证的
密码 —— 这是对提取公式、accepted CRC
公式、白名单和生成算法最强有力的单一确认。

运行它：`node report/code/selfcheck.ts`（从仓库根目录运行）。

## 9.2 对示例许可证的验证

`verify("0000-00000-00000", "0000-0000-AAAAAA", "9528-122-377::800001:20300101")`：

| 量 | 值 |
| --- | --- |
| `n0`、`n1`、`n2` | `24474`、`53908`、`17951` |
| 条件 A（完整性） | `0` ✔ |
| 条件 B 结果（accepted CRC） | `59222` ∈ 白名单 ✔ |
| 判定 | valid |

## 9.3 Accepted CRC 唯一且是白名单成员

将条件 B 驱动至某个选定 accepted CRC 的那个 2 字节前缀是**唯一的**（一个 2 字节
前缀在 CRC 状态上充当仿射双射）。在示例消息上进行一次穷举的 65536 次迭代
搜索，恰好找到一个前缀，且它等于闭式解。任何位于 21 项白名单之外的
accepted CRC —— 例如公开概念验证的
`24816` —— 都会被拒绝。

## 9.4 白名单因构建而异

| 表 | 位置 | 数量 | 与另一个的差异 |
| --- | --- | --- | --- |
| `SessionManager.exe` `DAT_140659e20` | System Modeler 模块 | 21 | 第 #15 项 = `16897` |
| `WolframEngine.dll` `0x186d4dd40` | 内核 | 21 | 第 #15 项 = `16905` |

公开 JavaScript PoC 列表中的 `59222` 和 `35944` 恰好与内核的
21 项吻合 —— 这与该列表来自一个*不同的*构建相符。

## 9.5 `LicenseCode` 映射 —— 只读 oracle

**前端**（`WolframNB.exe -pwfile <file>`；系统许可证不会被修改）——
产品从欢迎窗口标题读取：

| `LicenseCode` | 比特 | 欢迎标题 |
| --- | --- | --- |
| `800001` | 0, 23 | Welcome to Wolfram Mathematica |
| `800000` | 23 | Welcome to Wolfram Mathematica |
| `100000` | 20 | Welcome to Wolfram\|Alpha Notebook Edition |
| `200001` | 0, 21 | Welcome to Wolfram\|One |
| `400001` | 0, 22 | Welcome to Wolfram Finance Platform |
| `000020` | 5 | Welcome to Wolfram Player |
| `000040` | 6 | Welcome to Wolfram Player \| PRO |
| `000023` | 0, 1, 5 | Welcome to Wolfram Player |

**内核**（`wolframscript`）—— 许可证类别：

| `LicenseCode` | 比特 | `$LicenseType` |
| --- | --- | --- |
| `800001` | 0, 23 | Professional |
| `800002` | 1, 23 | Trial |
| `800004` | 2, 23 | Student |
| `200002` | 1, 21 | Trial |
| `400004` | 2, 22 | Student |
| `800021` | 0, 5, 23 | *rejected*（Player 与 Mathematica 位冲突） |

这些确认了 [04](04-license-code.zh.md) 中的 `LicenseCode` 位表。

## 9.6 闭式 2 字节求解等于穷举搜索

`code/selfcheck.ts` 将 O(1) 的 GF(2) 求解器与一次 65536 次迭代的暴力破解进行核对：

```
solveAppend2(0x82e1, 0x1234, 0xa5b6) == brute_force(...)     # identical
```

## 9.7 所有白名单项都产生有效密码

用 21 个白名单项中的**每一项**为示例消息生成一个密码，
然后验证它，全部 21 项都成功 —— 白名单恰好就是本次构建可接受的
accepted-CRC 值集合。

## 9.8 复现这些检查

```bash
node report/code/selfcheck.ts        # all of the above
```

§9.5 中的 `LicenseCode` oracle 实验是针对一份许可证
文件的**副本**运行的（前端用 `WolframNB.exe -pwfile`，`wolframscript` 用一份临时的
`mathpass`），因此位于
`%ProgramData%\Wolfram\Licensing\mathpass` 的系统许可证从未被修改。

> 支撑本次反编译的 REA/Ghidra Evidence JSON **未随**本
> 仓库提供；所提取的伪代码主体保存在 [`decompiled/`](decompiled/) 中。

---

**← 上一篇：** [08 — 重建源码（已重命名变量）](08-reconstructed-source.zh.md)
