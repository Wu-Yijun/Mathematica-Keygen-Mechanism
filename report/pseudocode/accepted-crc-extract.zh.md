[English](accepted-crc-extract.md) · **中文**

# 伪代码 — 从 PE 中提取 Accepted-CRC 白名单

```
function extract_accepted_crc_tables(path):
    pe        = parse_pe(path)         # { imageBase, sections {name, VA, rawOffset, rawSize, size} }
    data      = read_bytes(path)

    # --- structural rule -------------------------------------------------
    # a whitelist is a run of K consecutive u32, each in (0, 0x10000),
    # immediately followed by a u32 equal to K (or with K as the run's last element)
    candidates = []
    for each section:
        run = []
        for p on 4-byte boundaries:
            v = u32(data, p)
            if 1 <= v <= 0xFFFF: run.append(v)
            else:
                if length(run) >= 5 and u32(data, p) == length(run):
                    candidates.append({ va: va_of(run.start), count: length(run), values: run })
                run = []

    # --- cross-check against code ---------------------------------------
    # the validator loads the base with a RIP-relative `lea rcx,[rip+disp]`
    # and the count with `mov r8d,[rip+disp]`; the same primitive verifies any
    # string/table reference (see discovery.md)
    for c in candidates:
        c.codeRefs = find_rip_relative_refs_to(c.va)
    return candidates
```

`codeRefs` 位于 CRC 校验器（`FUN_181cf3650`）内部的表即为真正的白名单。
对于 `WolframEngine.dll`，其 VA 为 `0x186d4dd40`，count 为 `0x186d4dd94` = 21；
参见 [../05-accepted-crc.md](../05-accepted-crc.md)。
