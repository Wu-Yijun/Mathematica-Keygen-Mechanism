**中文** · [English](05-accepted-crc.zh.md)

# 05 — The Accepted CRCs

## 5.1 What an accepted CRC actually is

The value demanded by condition B has been called the **magic number** in earlier
write-ups (and the *initial hash* in the public reference implementation). The reversed
code shows what it really is: the **output of condition B**, which must be a member of a
**built-in table** (whitelist).

```
  acceptedCrc = CRC16(poly = 0x105c3, init = 0xa5b6, n0 ‖ MESSAGE)
```

There is **one table per build**. It is the closest thing in the scheme to a key.

## 5.2 Extraction principle (what makes them findable in a binary)

The whitelist is stored as a plain array of little-endian `u32`, each a valid 16-bit
value, immediately followed by its element count:

```
  .data:  [ m_0 ][ m_1 ] … [ m_{K-1} ][ K ]        (each cell 4 bytes)
```

and it is *used* from the checker by

```
  mov  r8d, [rip + <count>]      ; K
  lea  rcx, [rip + <table>]      ; &m_0
  ...
  cmp  [rcx], eax                ; table[i] == acceptedCrc ?
  je   accepted
```

So extraction proceeds in two independent, cross-checkable ways:

1. **Structural scan.** Find the longest run of consecutive `u32` values that all lie in
   `(0, 0x10000)` and whose *next* `u32` equals the run length. That is a candidate
   whitelist. (Generalises: also accept the count as the last element of the run.)
2. **Code-reference scan.** Compute `target = VA(instrEnd) + disp32` for every
   RIP-relative `mov r8d,[rip+…]` / `lea rcx,[rip+…]`; keep the target that both lies in
   `.data`/`.rdata` and points at a valid table start from step 1.

Both are implemented in [code/accepted-crc-table.ts](code/accepted-crc-table.ts); neither needs a
disassembler.

## 5.3 The v15.0.1 whitelist, as extracted

`WolframEngine.dll` (SHA-256 `9a9a7d88…`):

| item | value |
| --- | --- |
| table VA | `0x186d4dd40` (file offset `0x6d4cb40`, `.data`) |
| count VA | `0x186d4dd94` = **21** |
| referenced from | `0x181cf3650` (the CRC checker), at `0x181cf3d0e` (`lea rcx,[rip+0x505a02b]`) |

```
35944  59222  46288  52525   8925  26304  54607  45075  21527  31889  22384
31827  25836  29678  16905  35954  53711  24735  28536  11836  61068
```

Cross-checks:

- The **same structural rule** finds the same table in `SessionManager.exe`
  (`DAT_140659e20`, count `DAT_140659e74 = 21`), differing in exactly one entry:
  `16897` there versus `16905` in `WolframEngine.dll` — proving the whitelist is
  **per-module/per-build**.
- A whole-file structural scan of `WolframEngine.dll` finds **exactly one** table of this
  shape (the other matches are five unrelated 5-element integer arrays). So the accepted-CRC set
  is fully enumerated for this build.
- `SessionManager.exe` additionally has a **second** table used only when a mode flag
  equals `"Y"` (`DAT_140659e78`, 10 entries); `WolframEngine.dll` v15.0.1 does not contain
  it, i.e. the mode is not used there.

## 5.4 Design rationale — why a table of these numbers?

Condition B could have used a single constant, but then every product would share one
key. Using a *set* lets one binary validate **many editions/products**, with the server
choosing the entry that matches the product. The set is small enough to embed cheaply and
large enough to make blind guessing negligible (`21 / 2¹⁶ ≈ 0.03 %`).

## 5.5 Do the values follow a pattern? (analysis)

Computed statistics for the 21 values:

| property | result |
| --- | --- |
| range | `8925 … 61068`, all `< 2¹⁶` |
| mean | `34513` (≈ `2¹⁶ / 1.90`) |
| parity | 10 odd / 11 even (balanced) |
| primes | **0** (all composite) |
| sorted gaps | `2911, 5069, 4622, 857, 2351, 1101, 468, 2232, 1142, 2149, 62, 4055, 10, 9121, 1213, 6237, 1186, 896, 4615, 1846` — irregular |
| arithmetic progression? | no |
| `CRC_B(0xa5b6, "<product name>")` for `Mathematica`, `Player`, `Wolfram`, `Wolfram One`, `Finance Platform`, … | none lands in the table |

Conclusions (kept explicit about certainty):

- **Observed:** the values are opaque, well-spread 16-bit constants with no arithmetic
  structure detectable from a single build. They behave like *assigned* product/edition
  identifiers (or CRC outputs of an unknown per-edition seed).
- **Not established:** whether each value is the CRC of a product name, a product code,
  or randomly assigned. Deciding this needs the server or several genuine licenses.
- The "0 primes" observation is likely coincidental (`P(all-composite) ≈ 0.14` for 21
  random 16-bit values) and is **not** used as evidence of a rule.

## 5.6 Which value is correct for *this* build

The table is what matters, not any external list. Empirically:

- The genuine license's accepted CRC is `59222` — it is **in** this build's table and
  regenerating with it reproduces the genuine password.
- The value `24816` from the public proof-of-concept is **not** in this build's table and
  would be rejected. (Only `59222` and `35944` of that public list coincide with the
  21 entries here.)

So "the accepted CRC" is build-dependent; the robust procedure is to **extract the table
from the exact binary** with [code/accepted-crc-table.ts](code/accepted-crc-table.ts) and use one of
its entries.
