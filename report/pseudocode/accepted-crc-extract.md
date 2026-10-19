**中文** · [English](accepted-crc-extract.zh.md)

# Pseudocode — extracting the accepted-CRC whitelist from a PE

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

The table whose `codeRefs` lie inside the CRC checker (`FUN_181cf3650`) is the real
whitelist. For `WolframEngine.dll` that is VA `0x186d4dd40`, count `0x186d4dd94` = 21;
see [../05-accepted-crc.md](../05-accepted-crc.md).
