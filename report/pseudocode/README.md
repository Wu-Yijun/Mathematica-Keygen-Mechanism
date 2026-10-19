# Pseudocode

Language-neutral pseudocode for every component, one file per topic. These correspond
one-to-one with the runnable TypeScript in [`../code/`](../code/) and the raw decompiler
output in [`../decompiled/`](../decompiled/).

| file | topic |
| --- | --- |
| [verify.md](verify.md) | the verifier: CRC, message, signature parsing, `ω`, both conditions |
| [generate.md](generate.md) | server-side generation (closed-form CRC inversion) |
| [license-code.md](license-code.md) | `LicenseCode` bitmask: predicate + product/class/feature resolvers |
| [accepted-crc-extract.md](accepted-crc-extract.md) | extracting the accepted-CRC whitelist from a PE |
| [discovery.md](discovery.md) | RE primitives: RIP-relative xrefs, `.pdata` function ranges |
