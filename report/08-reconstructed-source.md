# 08 — Reconstructed Source (renamed variables)

The following C is a faithful reconstruction of the decompiled code, with every
`uVarN`/`local_NN`/`param_N` renamed to its meaning. Comments mark what was *observed*
in the binary versus what is *inferred*.

```c
/* ------------------------------------------------------------------ *
 *  maths primitives
 * ------------------------------------------------------------------ */

typedef unsigned short u16;
typedef unsigned int   u32;

/* One step of an MSB-first CRC-16 whose polynomial carries the x^16 term.
   The 16-bit state is shifted left, the next message bit is injected at the
   bottom, and the polynomial is XORed in when a bit leaves the top.        */
static u16 crc16_step(u16 state, u32 poly, u32 message_bit)
{
    u32 s = ((u32)state << 1) | (message_bit & 1);
    if (state & 0x8000u)
        s ^= poly;                 /* poly = 0x105c3 or 0x1064b */
    return (u16)s;
}

/* Full byte string. `poly` is 17-bit (x^16 included); `state` starts at 0xa5b6. */
static u16 crc16_msb(u32 poly, u16 state, const unsigned char *data, size_t len)
{
    for (size_t i = 0; i < len; i++) {
        for (int bit = 7; bit >= 0; bit--)
            state = crc16_step(state, poly, (u32)(data[i] >> bit));
    }
    return state;
}

/* A bit-stream helper used when the input is a 16-bit integer rather than bytes. */
static u16 crc16_uint16_msb(u32 poly, u16 state, u16 value)
{
    for (int bit = 15; bit >= 0; bit--)
        state = crc16_step(state, poly, (u32)(value >> bit));
    return state;
}

/* ------------------------------------------------------------------ *
 *  password parser  (observed in FUN_181cf3d50)
 * ------------------------------------------------------------------ */

#define SIG_LEN        12
#define DEC_DIGITS     5
#define DEC_MAX        99999u     /* largest 5-digit value            */
#define HEX_MAX        0xFFFFu    /* largest 16-bit value             */

/* 5 decimal digits -> 16-bit space, rounded up */
static u16 decimal_to_hash(u32 v)
{
    double scaled = ((double)v / (double)DEC_MAX) * (double)HEX_MAX;
    u32 trunc = (u32)scaled;
    return (u16)((scaled <= (double)trunc) ? trunc : trunc + 1);   /* == ceil() */
}

/*
 * Parses the 12-char signature and returns the two 16-bit residues.
 * Returns 0 on success, or the string "Password not in format dddd-ddd-ddd.".
 */
const char *parse_password_signature(const char *signature, u16 *out_residue0, u16 *out_residue2)
{
    if (strlen(signature) != SIG_LEN ||
        signature[4] != '-' || signature[8] != '-' ||
        !all_other_chars_are_digits(signature))
        return "Password not in format dddd-ddd-ddd.";

    /* fixed digit permutation (obfuscation only) */
    char group1[DEC_DIGITS + 1] = {
        signature[3], signature[2], signature[6], signature[1], signature[10], 0
    };
    char group2[DEC_DIGITS + 1] = {
        signature[7], signature[11], signature[9], signature[0], signature[5], 0
    };

    u16 n1 = decimal_to_hash((u32)atoi(group1));
    u16 n2 = decimal_to_hash((u32)atoi(group2));

    *out_residue0 = (u16)(n1 - 0x72faU);      /* == (n1 + 0x8d06) mod 2^16 */
    *out_residue2 = n2;
    return NULL;
}

/* ------------------------------------------------------------------ *
 *  omega()  (observed in FUN_181cf3fa0)
 *  Inverts the digit encoding: residue0 -> the 5-digit group, as a 16-bit value.
 * ------------------------------------------------------------------ */

static u16 omega_residue(u16 residue0)
{
    u16  n1      = (u16)((short)residue0 + 0x72fa);   /* signed add, wrapped        */
    u32  group   = (u32)(((double)n1 / (double)HEX_MAX) * (double)DEC_MAX); /* = v1   */
    char text[8];
    snprintf(text, sizeof text, "%05u", group);
    permute_group(text);                              /* d0 d1 d2 d3 d4 -> d0 d1 d3 d4 d2 */
    u32  permuted = (u32)atoi(text);
    return decimal_to_hash(permuted);                 /* back to the 16-bit space   */
}

/* ------------------------------------------------------------------ *
 *  the checker  (observed in FUN_181cf3650)
 * ------------------------------------------------------------------ */

#define POLY_A      0x1064bu   /* integrity */
#define POLY_B      0x105c3u   /* accepted CRC */
#define CRC_INIT    0xa5b6u
#define INTEGRITY_TARGET    0x0000u    /* condition A target */

/*
 * message   : "${mathID}@${expiryDate}$${LicenseCode}&${activationKey}"
 * residue0  : from parse_password_signature()
 * residue2  : from parse_password_signature()
 * accepted-CRC table: global DAT_...  (u32 entries), length in DAT_..94
 */
const char *verify_password(const char *message, u16 residue0, u16 residue2)
{
    bool in_table = false;

    /* --- condition A: integrity --- */
    u16 a = crc16_uint16_msb(POLY_A, CRC_INIT, residue2);  /* seed with n2   */
    a = crc16_msb(POLY_A, a, (const unsigned char *)message,         /* then msg     */
                  strlen(message));
    a = crc16_uint16_msb(POLY_A, a, omega_residue(residue0));        /* then omega(n0)*/

    /* --- condition B: accepted CRC --- */
    u16 b = crc16_uint16_msb(POLY_B, CRC_INIT, residue0);  /* seed with n0   */
    b = crc16_msb(POLY_B, b, (const unsigned char *)message,         /* then msg     */
                  strlen(message));

    /* --- membership test --- */
    for (u32 i = 0; i < ACCEPTED_CRC_TABLE_LEN; i++)
        if (ACCEPTED_CRC_TABLE[i] == b) { in_table = true; break; }

    if (a == INTEGRITY_TARGET && in_table)
        return NULL;                       /* accepted */
    return "Bad password.";
}
```

### Comments on the reconstruction

- `decimal_to_hash` reproduces the exact `((double)v / 99999.0) * 65535.0` then
  `ceil` idiom the compiler emitted (`if (scaled <= trunc) result = trunc; else
  result = trunc + 1;`). Floating point is used here only because the original did;
  it is mathematically `ceil(v · 65535 / 99999)`.
- `omega_residue` mirrors `FUN_181cf3fa0`; the exact permutation it inverts does not
  affect the outcome (condition A is satisfied by construction for generated
  passwords). The reconstructed generator uses the mathematically clean bit-stream
  helpers instead ([code/mathpass.ts](code/mathpass.ts)).
- `ACCEPTED_CRC_TABLE` / `ACCEPTED_CRC_TABLE_LEN` are the globals `DAT_186d4dd40` /
  `DAT_186d4dd94` (see [05](05-accepted-crc.md)).

### Older variant (no expiry date)

Older builds use `xxxx-xxx-xxx::LicenseCode` (no expiry) and

```
MESSAGE_v14_0 = "${mathID}$${LicenseCode}&${activationKey}"
```

The two CRC conditions and the table are unchanged; only the message differs and the
expiry step is skipped.
