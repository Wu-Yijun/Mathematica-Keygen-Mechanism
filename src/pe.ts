/**
 * pe.ts — minimal PE reader and accepted-CRC table scanner, for the browser.
 *
 * Browser twin of report/code/accepted-crc-table.ts. The table is located by *code*, not by
 * guessing at the data layout:
 *
 *   1. the validator is found through its own error strings ("Bad password.", …);
 *   2. its enclosing function comes from `.pdata`;
 *   3. every RIP-relative data operand inside that function is checked for the table shape
 *      — K values in 1..0xffff with the word K right after them. Both directions are tried,
 *      because a build may reference the table or only its length.
 *
 * A purely shape-based scan (a "run of small u32 followed by K") is not enough: in the 14.2
 * kernel the run continues past the length into the next array, so the run length never
 * equals the stored count and the table is missed.
 *
 * All addresses are 64-bit and are never truncated to 32 bits.
 */

export interface PeSection {
  name: string;
  va: number;
  roff: number;
  vsize: number;
  rsize: number;
  code: boolean;
}

export interface PeImage {
  imageBase: number;
  sections: PeSection[];
}

export interface CrcTableCandidate {
  valueVA: number;
  fileOffset: number;
  count: number;
  values: number[];
  /** code VAs that reference the table (or its length) */
  refs: number[];
  /** false when the code-reference scan was skipped for this candidate */
  scanned: boolean;
  method: "code-guided" | "shape-scan";
  /** true when the validator compares the computed CRC against this array (membership test) */
  membership: boolean;
}

export function parsePe(buf: Uint8Array): PeImage {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const peOff = dv.getUint32(0x3c, true);
  const sig = String.fromCharCode(buf[peOff], buf[peOff + 1], buf[peOff + 2], buf[peOff + 3]);
  if (sig !== "PE\0\0") throw new Error("not a PE file");
  const numSec = dv.getUint16(peOff + 6, true);
  const optSize = dv.getUint16(peOff + 20, true);
  const optOff = peOff + 24;
  const peMagic = dv.getUint16(optOff, true); // PE32 (0x10b) or PE32+ (0x20b)
  const imageBase = peMagic === 0x20b
    ? Number(dv.getBigUint64(optOff + 24, true))
    : dv.getUint32(optOff + 28, true);
  const secOff = optOff + optSize;
  const sections: PeSection[] = [];
  for (let i = 0; i < numSec; i++) {
    const o = secOff + i * 40;
    let name = "";
    for (let j = 0; j < 8 && buf[o + j]; j++) name += String.fromCharCode(buf[o + j]);
    const vsize = dv.getUint32(o + 8, true);
    const va = dv.getUint32(o + 12, true);
    const rsize = dv.getUint32(o + 16, true);
    const roff = dv.getUint32(o + 20, true);
    const chars = dv.getUint32(o + 36, true);
    sections.push({ name, va: imageBase + va, roff, vsize, rsize, code: !!(chars & 0x20) });
  }
  return { imageBase, sections };
}

const span = (s: PeSection) => Math.max(s.rsize, s.vsize);
const DATA_SECTIONS = [".rdata", ".data", "_RDATA"];
const dvOf = (buf: Uint8Array) => new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

function sectionOf(sections: PeSection[], va: number): PeSection | undefined {
  return sections.find((s) => va >= s.va && va < s.va + span(s));
}

function vaToFo(sections: PeSection[], va: number): number {
  const s = sectionOf(sections, va);
  return s ? s.roff + (va - s.va) : -1;
}

function foToVA(sections: PeSection[], fo: number): number {
  for (const s of sections) if (fo >= s.roff && fo < s.roff + span(s)) return s.va + (fo - s.roff);
  return -1;
}

/**
 * Find RIP-relative references to `targetVA` inside executable sections.
 * Recognises `lea r64,[rip+d]` (48/4C 8D), `mov r64,[rip+d]` (48/4C 8B),
 * `mov r32,[rip+d]` (44 8B) and `lea r32,[rip+d]` (4x 8D).
 */
export function findCodeRefs(buf: Uint8Array, sections: PeSection[], targetVA: number): number[] {
  const dv = dvOf(buf);
  const refs: number[] = [];
  for (const s of sections) {
    if (!s.code) continue;
    const start = s.roff;
    const end = Math.min(buf.length, s.roff + Math.min(s.rsize, s.vsize));
    for (let p = start; p + 7 <= end; p++) {
      const b0 = buf[p], b1 = buf[p + 1], m = buf[p + 2];
      let dispOff = -1;
      if ((b0 === 0x48 || b0 === 0x4c) && (b1 === 0x8d || b1 === 0x8b) && (m & 0xc7) === 0x05) dispOff = p + 3;
      else if (b0 === 0x44 && b1 === 0x8b && (m & 0xc7) === 0x05) dispOff = p + 3;
      else if (b1 === 0x8d && (m & 0xc7) === 0x05 && (b0 & 0xf8) === 0x40) dispOff = p + 2;
      if (dispOff < 0) continue;
      const disp = dv.getInt32(dispOff, true);
      const ip = s.va + (dispOff + 4 - s.roff);
      if (ip + disp === targetVA) refs.push(s.va + (p - s.roff));
    }
  }
  return refs;
}

interface FnRange { begin: number; end: number }

function functionRanges(buf: Uint8Array, image: PeImage): FnRange[] {
  const pdata = image.sections.find((s) => s.name === ".pdata" || s.name === ".PDATA");
  if (!pdata) return [];
  const dv = dvOf(buf);
  const n = Math.min(pdata.rsize, pdata.vsize) / 12;
  const out: FnRange[] = [];
  for (let i = 0; i < n; i++) {
    const o = pdata.roff + i * 12;
    out.push({ begin: image.imageBase + dv.getUint32(o, true), end: image.imageBase + dv.getUint32(o + 4, true) });
  }
  return out;
}

/** Every RIP-relative operand target inside [begin, end) — both the REX and short forms. */
function ripOperandsInRange(
  buf: Uint8Array, sections: PeSection[], begin: number, end: number,
): Array<{ target: number; at: number; len: number }> {
  const dv = dvOf(buf);
  const s = sectionOf(sections, begin);
  if (!s) return [];
  const a = begin - s.va + s.roff;
  const b = Math.min(buf.length, Math.min(s.roff + Math.min(s.rsize, s.vsize), end - s.va + s.roff));
  const out: Array<{ target: number; at: number; len: number }> = [];
  for (let p = a; p + 7 <= b; p++) {
    if ((buf[p] & 0xf0) === 0x40 && (buf[p + 2] & 0xc7) === 0x05) {
      const at = foToVA(sections, p + 3);
      if (at > 0) out.push({ target: at + 4 + dv.getInt32(p + 3, true), at: foToVA(sections, p), len: 7 });
    } else if ((buf[p + 1] & 0xc7) === 0x05) {
      const at = foToVA(sections, p + 2);
      if (at > 0) out.push({ target: at + 4 + dv.getInt32(p + 2, true), at: foToVA(sections, p), len: 6 });
    }
  }
  return out;
}

/**
 * Is the code right after the RIP-relative load a compare against that operand?
 * Multi-byte NOP padding between the load and the loop's `cmp` is skipped.
 */
function isMembershipSite(buf: Uint8Array, sections: PeSection[], at: number, len: number): boolean {
  const start = vaToFo(sections, at + len);
  if (start < 0) return false;
  const isNopByte = (b: number) => b === 0x90 || b === 0x66 || b === 0x0f || b === 0x1f
    || b === 0x00 || (b >= 0x40 && b <= 0x4f) || b === 0x24 || b === 0x44 || b === 0x80;
  for (let i = 0; i < 16 && start + i < buf.length; i++) {
    const b = buf[start + i];
    if (b === 0x39 || b === 0x3b || b === 0x38 || b === 0x3a) return true; // cmp r/m,r · cmp r,r/m
    if (!isNopByte(b)) return false;
  }
  return false;
}

function u32At(buf: Uint8Array, sections: PeSection[], va: number): number {
  const dv = dvOf(buf);
  const fo = vaToFo(sections, va);
  return fo >= 0 && fo + 4 <= buf.length ? dv.getUint32(fo, true) : -1;
}

function lengthsWithTrailingCount(buf: Uint8Array, sections: PeSection[], va: number, maxLen = 128): number[] {
  const out: number[] = [];
  for (let k = 5; k <= maxLen; k++) {
    let ok = true;
    for (let i = 0; i < k; i++) {
      const v = u32At(buf, sections, va + i * 4);
      if (v < 1 || v > 0xffff) { ok = false; break; }
    }
    if (!ok) break;
    if (u32At(buf, sections, va + k * 4) === k) out.push(k);
  }
  return out;
}

function lengthsWithLeadingCount(buf: Uint8Array, sections: PeSection[], va: number, maxLen = 128): number[] {
  const k = u32At(buf, sections, va);
  if (k < 5 || k > maxLen) return [];
  for (let i = 1; i <= k; i++) {
    const v = u32At(buf, sections, va - i * 4);
    if (v < 1 || v > 0xffff) return [];
  }
  return [k];
}

const LICENCE_STRINGS = ["Bad password.", "Password not in format dddd-ddd-ddd."];

function makeCandidate(
  buf: Uint8Array, sections: PeSection[], va: number, count: number, method: CrcTableCandidate["method"],
  membership = false,
): CrcTableCandidate {
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(u32At(buf, sections, va + i * 4));
  return { valueVA: va, fileOffset: vaToFo(sections, va), count, values, refs: [], scanned: true, method, membership };
}

/** Locate the accepted-CRC table by walking the validator and validating the data shape. */
export function findAcceptedCrcTables(buf: Uint8Array, image: PeImage): CrcTableCandidate[] {
  const { sections } = image;
  const ranges = functionRanges(buf, image);
  const fns = new Map<number, FnRange>();
  const encoder = new TextEncoder();

  for (const needle of LICENCE_STRINGS) {
    const bytes = encoder.encode(needle);
    let fo = -1;
    outer: for (let i = 0; i + bytes.length <= buf.length; i++) {
      for (let j = 0; j < bytes.length; j++) if (buf[i + j] !== bytes[j]) continue outer;
      fo = i; break;
    }
    if (fo < 0) continue;
    const strVA = foToVA(sections, fo);
    if (strVA < 0) continue;
    for (const ref of findCodeRefs(buf, sections, strVA)) {
      const fn = ranges.find((r) => ref >= r.begin && ref < r.end);
      if (fn) fns.set(fn.begin, fn);
    }
  }

  const found = new Map<string, CrcTableCandidate>();
  for (const fn of fns.values()) {
    for (const op of ripOperandsInRange(buf, sections, fn.begin, fn.end)) {
      const sec = sectionOf(sections, op.target);
      if (!sec || !DATA_SECTIONS.includes(sec.name)) continue;
      const membership = isMembershipSite(buf, sections, op.at, op.len);
      for (const k of lengthsWithTrailingCount(buf, sections, op.target)) {
        const c = makeCandidate(buf, sections, op.target, k, "code-guided", membership);
        found.set(`${c.valueVA}/${c.count}`, c);
      }
      for (const k of lengthsWithLeadingCount(buf, sections, op.target)) {
        const c = makeCandidate(buf, sections, op.target - k * 4, k, "code-guided", membership);
        found.set(`${c.valueVA}/${c.count}`, c);
      }
    }
  }

  const out = [...found.values()];
  for (const c of out) {
    const refs = new Set<number>();
    for (const va of [c.valueVA, c.valueVA + c.count * 4]) {
      for (const r of findCodeRefs(buf, sections, va)) refs.add(r);
    }
    c.refs = [...refs];
  }
  return out.sort((a, b) =>
    Number(b.membership) - Number(a.membership) ||
    b.refs.length - a.refs.length ||
    b.count - a.count);
}

/** Shape-only fallback: a run of K u32 in (0, 0x10000) followed by (or ending with) K. */
export function scanAcceptedCrcTables(
  buf: Uint8Array, sections: PeSection[], minLen = 5, maxLen = 128,
): CrcTableCandidate[] {
  const dv = dvOf(buf);
  const out: CrcTableCandidate[] = [];
  for (const s of sections) {
    const start = s.roff;
    const end = Math.min(buf.length, s.roff + Math.min(s.rsize, s.vsize));
    let runStart = -1, runLen = 0;
    const flush = () => {
      if (runLen >= minLen && runLen <= maxLen) {
        const after = runStart + runLen * 4;
        const values: number[] = [];
        for (let k = 0; k < runLen; k++) values.push(dv.getUint32(runStart + k * 4, true));
        let count = -1;
        if (after + 4 <= end && dv.getUint32(after, true) === runLen) count = runLen;
        else if (values[runLen - 1] === runLen - 1) { count = runLen - 1; values.pop(); }
        if (count > 0) {
          const va = foToVA(sections, runStart);
          if (va > 0) {
            out.push({ valueVA: va, fileOffset: runStart, count, values, refs: [], scanned: false, method: "shape-scan", membership: false });
          }
        }
      }
      runStart = -1; runLen = 0;
    };
    for (let p = start; p + 4 <= end; p += 4) {
      const v = dv.getUint32(p, true);
      if (v >= 1 && v <= 0xffff) { if (runStart < 0) { runStart = p; runLen = 0; } runLen++; }
      else flush();
    }
    flush();
  }
  return out;
}

/** Primary entry point: code-guided first, shape scan as a fallback. */
export function scanWithCodeRefs(buf: Uint8Array, image: PeImage): CrcTableCandidate[] {
  const guided = findAcceptedCrcTables(buf, image);
  if (guided.length) return guided;
  const shape = scanAcceptedCrcTables(buf, image.sections);
  for (const c of shape) {
    c.refs = findCodeRefs(buf, image.sections, c.valueVA);
    c.scanned = true;
  }
  return shape.sort((a, b) => Number(b.refs.length > 0) - Number(a.refs.length > 0) || b.count - a.count);
}
