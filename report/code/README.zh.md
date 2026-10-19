[English](README.md) · **中文**

# 报告代码

逆向出的 `mathpass` 方案的 TypeScript 实现。使用支持 TypeScript 的 Node 运行（Node ≥ 22 可通过类型擦除直接运行 `.ts`；已在 Node 26 上测试）。以下命令假设以本文件夹为工作目录；若从仓库根目录运行，请为其加上 `report/code/` 前缀。

```bash
node selfcheck.ts                    # validates the reconstruction end-to-end
node cli.ts table                    # print the installed build's accepted-CRC table (v15.0.1)
node cli.ts verify      0000-00000-00000 0000-0000-AAAAAA 9528-122-377::800001:20300101
node cli.ts acceptedcrc 0000-00000-00000 0000-0000-AAAAAA 9528-122-377::800001:20300101
node cli.ts generate    0000-00000-00000 0000-0000-AAAAAA 800001 20300101 59222
node cli.ts decode      800001                       # LicenseCode -> product / class / caps
node accepted-crc-table.ts "…\WolframEngine.dll"     # extract the table from a PE
```

| 文件 | 内容 |
| --- | --- |
| `mathpass.ts` | `crc16`, `crc16Uint16`, `solveLinear16`, `solveAppend2`, `extract`, `messageOf`, `messageOfLegacy`, `acceptedCrcOf`, `acceptedCrcOfSignature`, `verify`, `verifyMessage`, `verifySignature`, `generateSignature`, `generatePassword`, `generatePasswordLegacy`, `ACCEPTED_CRC_TABLE_V15_0_1` |
| `licenseCode.ts` | `LICENSE_BITS`, `licenseCodeValue`, `hasBit`, `decodeLicenseCode` — `LicenseCode` 位掩码 |
| `accepted-crc-table.ts` | `parsePe`, `findCodeRefs`, `scanAcceptedCrcTables` — 从 PE 中提取 Accepted CRC 表 |
| `cli.ts` | 命令行：`verify` / `acceptedcrc` / `generate` / `decode` / `table` |
| `selfcheck.ts` | 生成并验证一个合成的占位许可；检查每一个表项及每一个 `LicenseCode` 情形 |

此处使用的所有许可值均为**合成的占位值**，而非真实激活数据。

## `selfcheck.ts`（全部通过）

```
PASS  generate(acceptedCrc=59222) = 9528-122-377::800001:20300101
PASS  verify sample licence -> acceptedCrc=59222 inTable=true valid=true
PASS  off-table accepted CRC 24816 -> acceptedCrc=24816 inTable=false valid=false
PASS  solveAppend2=56555 == brute-force=56555
PASS  all 21 accepted-CRC values generate valid passwords
PASS  LicenseCode 800001 -> product=Mathematica class=Professional
PASS  LicenseCode 100000 -> product=WolframAlphaNB class=Professional
PASS  LicenseCode 000020 -> product=WolframPlayer class=Professional
PASS  LicenseCode 000040 -> product=WolframPlayerPro class=Professional
PASS  LicenseCode 800002 -> product=Mathematica class=Trial
PASS  LicenseCode 800004 -> product=Mathematica class=Student
…
```

## `accepted-crc-table.ts`（提取）

```
candidate table
  VA          : 0x186d4dd40  (file offset 0x6d4cb40)
  count       : 21
  code refs   : 0x181cf3d0e   <-- referenced by validator
  values      : 35944, 59222, 46288, ... 61068
```

`code refs` 行将*真正的*表与无关的整数数组区分开来：它由 CRC 校验器内部的一条 RIP 相对加载所引用。
