# 07 — The Mathematics

**English** · [中文](07-mathematics.zh.md)

## 7.1 CRC as arithmetic over GF(2)

A CRC is polynomial division. Treat a bit string `b_0 … b_{k-1}` as the polynomial
`B(x) = Σ b_i x^{k-1-i}` over GF(2), and the 16-bit state `s` as `S(x)` of degree < 16.
One bit **step** is

```
S(x) ← x·S(x) + b_i   (mod P(x))
```

where the *polynomial* `P(x)` (degree 16) is encoded by our `poly` constant **with the
x¹⁶ term included**:

```
P_A(x) = x^16 + x^12 + x^10 + x^9 + x^6 + x^3 + x + 1     (0x1064b)
P_B(x) = x^16 + x^12 + x^10 + x^8 + x^7 + x^6 + x + 1     (0x105c3)
```

Feeding a byte string `D` of `n` bytes is `x^{8n}`-multiply-then-add modularly.

## 7.2 The fundamental identity (and why everything is invertible)

For a fixed message `D` of `n` bytes, the map from an initial value `s` to the final
CRC is **affine**:

```
CRC_P(s, D) = ( s · x^{8n} mod P )  ⊕  CRC_P(0, D)
              └────── linear in s ──┘    └── constant for D ──┘
```

Write `S_k(s) = s · x^{8k} mod P` (advance by `k` zero bytes). `S_k` is a **bijection**
on 16-bit states, and `S_1` has a two-instruction inverse:

```
S_1 (s) = ((s << 1) & 0xFFFF) ^ ((s >> 15) ? P : 0)
S_1⁻¹(y): t = y & 1;  return ((y ^ (t ? P : 0)) >> 1) | (t << 15)
```

Now split a 2-byte *prefix* `w` from the rest `D`:

```
CRC_P(I, w ‖ D) = S_{n}( CRC_P(I, w) )  ⊕  CRC_P(0, D)
CRC_P(I, w)     = S_2(I) ⊕ L_P(w)                (L_P linear & bijective)
```

so for any desired target `t`:

```
L_P(w) = S_n⁻¹( t ⊕ CRC_P(0, D) ) ⊕ S_2(I)      ⇒      w = L_P⁻¹( · )
```

This is an **affine (in fact linear) solve over GF(2)**, computed with a 16×16 Gaussian
elimination — **O(16²), no search**. `code/mathpass.ts` implements precisely this
(`solveLinear16`, `solveAppend2`).

## 7.3 Instantiation for this scheme

Let `MESSAGE = mathID@expiry$LicenseCode&activationKey`, `n = |MESSAGE|`.

* **Condition B (accepted CRC).** `M = CRC_{P_B}(0xA5B6, n0 ‖ MESSAGE)`.
  With `w = n0`, `D = MESSAGE`, `I = 0xA5B6`:
  `n0` is uniquely determined by any chosen `M`, and conversely `M` is determined by
  `n0`. Hence the designer can pick `M` freely from the whitelist and solve for `n0`.

* **Condition A (integrity).** `0 = CRC_{P_A}(0xA5B6, n2 ‖ MESSAGE ‖ ω(n0))`.
  Fix `n0` (hence `ω(n0)`); the same argument gives a unique `n2`.

So the two 16-bit residues are two *dependent variables*; the free parameters are the
**whitelist choice `M`** and the message itself. The scheme pins `2·16 = 32` bits with a
32-bit certificate — an exact fit, like a CRC checksum.

## 7.4 The decimal encoding (`v ↔ n`) is a bijection

```
n = ceil(v · 65535 / 99999)      (16-bit "hash" space, v ∈ [0, 99999])
v = floor(n · 99999 / 65535)     (5-digit decimal space)
```

together with the fixed digit permutations of [08](08-reconstructed-source.md). This maps
the 16-bit residues into 5-decimal-digit groups so the password is all digits. It is a
bijection (with the tiny ceiling slack absorbed by the `ω(·)` round-trip) and contributes
**no security** — it is obfuscation and human-typability.

## 7.5 Relationship to the public JavaScript model

The reference `main@v14.1.0.js` expresses the same scheme with an LSB-first
hasher and constants `HASH_CODE_1 = 0x82E1`, `HASH_CODE_2 = 0x8325`. The binary's
MSB-first polynomials are the mirror forms:

```
P_B = 2·0x82E1 + 1 = 0x105c3
P_A = 2·0x8325 + 1 = 0x1064b
```

and the JavaScript side compares the CRC to `0xA5B6`, which is exactly the binary's
**initial value**. In other words:

| | JavaScript | Binary |
| --- | --- | --- |
| "accepted CRC" | initial value (`MathPass.hash`) | *result* of condition B |
| `0xA5B6` | target | initial value |
| constraint | `CRC == 0xA5B6` | `CRC ∈ table` |

Both are the *same* affine equation, solved for different unknowns. The empirical check
in [code/selfcheck.ts](code/selfcheck.ts) confirms the binary's accepted CRC equals the
JavaScript model's required initial value on a genuine license.

## 7.6 Why design it this way?

- **Cheap to verify, cheap to generate.** A CRC is a few shifts/XORs; generation is one
  linear solve. No big-integer maths, no crypto library, no network.
- **Resists naive tampering, not dedicated attacks.** Flipping a digit changes the CRC;
  a random guess hits condition A with probability `2⁻¹⁶` and the whitelist with
  `21/2¹⁶`, i.e. `≈ 5·10⁻⁷` per try.
- **Edition discrimination via a small table.** A single binary can validate several
  products/editions because condition B only requires membership in a set of 16-bit keys.
- **It is a MAC-like checksum, not a signature.** Because CRC is *linear*, anyone who
  knows `P_A`, `P_B`, `0xA5B6` and the whitelist can forge any license. The designers
  relied on the polynomials, the initial value and the whitelist being *undocumented*
  rather than *secret* — which is exactly why this reverse-engineering succeeds.

### Empirical security figure

For the genuine message, brute-forcing the initial value finds **exactly one** value that
satisfies condition B (`59222`), and it is a table member. A forger without the table
would have to guess one of 21 of 65536 states *and* satisfy condition A — feasible once
the structure is known, impossible by blind guessing.

---

**← Previous:** [06 — Server-Side Key Generation](06-key-generation.md) · **Next:** [08 — Reconstructed Source (renamed variables)](08-reconstructed-source.md)
