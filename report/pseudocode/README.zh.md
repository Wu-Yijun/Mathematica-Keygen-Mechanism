# 伪代码

**中文** · [English](README.md)

针对每个组件的语言无关伪代码，每个主题一个文件。它们与 [`../code/`](../code/) 中可运行的 TypeScript，以及 [`../decompiled/`](../decompiled/) 中的原始反编译器输出一一对应。

| 文件 | 主题 |
| --- | --- |
| [verify.zh.md](verify.zh.md) | 校验器：CRC、消息、签名解析、`ω`、两个条件 |
| [generate.zh.md](generate.zh.md) | 服务端生成（闭式 CRC 求逆） |
| [license-code.zh.md](license-code.zh.md) | `LicenseCode` 位掩码：谓词 + 产品/类别/特性解析器 |
| [accepted-crc-extract.zh.md](accepted-crc-extract.zh.md) | 从 PE 中提取 Accepted-CRC 白名单 |
| [discovery.zh.md](discovery.zh.md) | 逆向工程原语：RIP 相对交叉引用、`.pdata` 函数区间 |
