[English](discovery.md) · **中文**

# 伪代码 — 发现原语

整个调查由两个原语驱动；二者都只需要 PE 文件的字节。

## 1. RIP 相对引用扫描（定位使用字符串/表的代码）

```
function find_rip_relative_refs_to(targetVA):
    refs = []
    for each executable section (VA, rawOffset, rawSize):
        for p = rawOffset .. rawOffset+rawSize-7:
            b0,b1,modrm = data[p], data[p+1], data[p+2]
            dispOff = choose:
                if (b0 in {0x48,0x4C}) and (b1 in {0x8D,0x8B}) and (modrm & 0xC7)==0x05: p+3   # lea/mov r64,[rip+d]
                if (b0==0x44) and (b1==0x8B)          and (modrm & 0xC7)==0x05: p+3   # mov r32,[rip+d]
                if (b1==0x8D) and (b0 & 0xF8)==0x40   and (modrm & 0xC7)==0x05: p+2   # lea r32,[rip+d]
            if none: continue
            disp = i32(data, dispOff)
            ip   = sectionVA + (dispOff + 4 - rawOffset)
            if (ip + disp) == targetVA:
                refs.append(sectionVA + (p - rawOffset))
    return refs
```

## 2. `.pdata` 函数区间（在无符号信息的情况下获取精确边界）

```
function function_range_for(rva):
    # .pdata = array of RUNTIME_FUNCTION { BeginRVA:u32, EndRVA:u32, UnwindRVA:u32 }
    for entry in .pdata:
        if entry.BeginRVA <= rva < entry.EndRVA:
            return (entry.BeginRVA, entry.EndRVA)
    return none
```

## 3. 工作流

```
locate(target_string)        -> string VA
find_rip_relative_refs_to()  -> code VAs that use it
function_range_for()         -> containing function
decompile(containing function)  with Ghidra (via REA)  -> pseudocode + references
```

## 4. 预言机

```
kernel_oracle(mathpass):   run `wolframscript -file …` printing
                           $LicenseType / $LicenseID / $LicenseExpirationDate /
                           $ActivationKey / $MachineID / $ProductInformation

frontend_oracle(pwfile):   launch `WolframNB.exe -pwfile <file>`; read the welcome
                           window title (product).  Does not touch the system licence.
```
