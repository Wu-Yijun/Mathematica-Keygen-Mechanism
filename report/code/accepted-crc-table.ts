/**
 * accepted-crc-table.ts — extract the mathpass accepted-CRC table directly from a shipped
 * PE binary, without a disassembler.
 *
 * Two methods are provided:
 *
 *   findAcceptedCrcTables()  (primary, robust)
 *     The validator is located by its own error strings ("Bad password.",
 *     "Password not in format dddd-ddd-ddd."), its enclosing functions are taken from
 *     `.pdata`, and every RIP-relative data operand inside those functions is checked for
 *     the table shape (K values in 1..0xffff, with the word K right after them — the code
 *     may reference either the table or its length, so both directions are tried).
 *
 *     This matters because the length is not always stored next to the table: in the 14.2
 *     kernel the *run of small u32* continues past the length into the following array, so
 *     the purely shape-based scan below merges the table with its neighbours and misses it
 *     (and the length can be an inline constant, so it may not even be referenced).
 *
 *   scanAcceptedCrcTables()  (fallback, shape-only)
 *     A plain scan for "a run of K u32, each a valid 16-bit value, whose last element or
 *     following word equals K". Useful when the error strings are stripped/absent, but it
 *     can miss tables — see above.
 *
 * Usage:  node accepted-crc-table.ts <path-to-pe>
 */

import { readFileSync } from "node:fs";

export interface Section { name: string; va: number; roff: number; vsize: number; rsize: number; code: boolean }
export interface PeImage { imageBase: number; sections: Section[] }

export function parsePe(buf: Buffer): PeImage {
  const peOff = buf.readUInt32LE(0x3c);
  if (buf.toString("latin1", peOff, peOff + 4) !== "PE\0\0") throw new Error("not a PE file");
  const numSec = buf.readUInt16LE(peOff + 6);
  const optSize = buf.readUInt16LE(peOff + 20);
  const optOff = peOff + 24;
  const peMagic = buf.readUInt16LE(optOff);
  const imageBase = peMagic === 0x20b
    ? Number(buf.readBigUInt64LE(optOff + 24))
    : buf.readUInt32LE(optOff + 28);
  const secOff = optOff + optSize;
  const sections: Section[] = [];
  for (let i = 0; i < numSec; i++) {
    const o = secOff + i * 40;
    const name = buf.toString("latin1", o, o + 8).replace(/\0.*/, "");
    const vsize = buf.readUInt32LE(o + 8);
    const va = buf.readUInt32LE(o + 12);
    const rsize = buf.readUInt32LE(o + 16);
    const roff = buf.readUInt32LE(o + 20);
    const chars = buf.readUInt32LE(o + 36);
    sections.push({ name, va: imageBase + va, roff, vsize, rsize, code: !!(chars & 0x20) });
  }
  return { imageBase, sections };
}

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

const span = (s: Section) => Math.max(s.rsize, s.vsize);
const DATA_SECTIONS = [".rdata", ".data", "_RDATA"];

export function sectionOf(sections: Section[], va: number): Section | undefined {
  return sections.find((s) => va >= s.va && va < s.va + span(s));
}

export function vaToFileOffset(sections: Section[], va: number): number {
  const s = sectionOf(sections, va);
  return s ? s.roff + (va - s.va) : -1;
}

export function fileOffsetToVA(sections: Section[], fo: number): number {
  for (const s of sections) if (fo >= s.roff && fo < s.roff + span(s)) return s.va + (fo - s.roff);
  return -1;
}

/**
 * Find RIP-relative code references to a virtual address, returning instruction VAs.
 * Recognises `lea r64,[rip+d]` (48/4C 8D), `mov r64,[rip+d]` (48/4C 8B) and
 * `mov r32,[rip+d]` (44 8B); used to locate the validator from its strings.
 */
export function findCodeRefs(buf: Buffer, sections: Section[], targetVA: number): string[] {
  const refs: string[] = [];
  for (const s of sections.filter((x) => x.code)) {
    const start = s.roff;
    const end = s.roff + Math.min(s.rsize, s.vsize);
    for (let p = start; p + 7 <= end; p++) {
      const b0 = buf[p], b1 = buf[p + 1], m = buf[p + 2];
      let dispOff = -1;
      if ((b0 === 0x48 || b0 === 0x4c) && (b1 === 0x8d || b1 === 0x8b) && (m & 0xc7) === 0x05) dispOff = p + 3;
      else if (b0 === 0x44 && b1 === 0x8b && (m & 0xc7) === 0x05) dispOff = p + 3;
      else if (b1 === 0x8d && (m & 0xc7) === 0x05 && (b0 & 0xf8) === 0x40) dispOff = p + 2;
      if (dispOff < 0) continue;
      const disp = buf.readInt32LE(dispOff);
      const ip = s.va + (dispOff + 4 - s.roff);
      if (((ip + disp) >>> 0) === (targetVA >>> 0))
        refs.push("0x" + (s.va + (p - s.roff)).toString(16));
    }
  }
  return refs;
}

/** Function ranges from `.pdata` (RUNTIME_FUNCTION { Begin, End, Unwind } RVAs). */
export function functionRanges(buf: Buffer, image: PeImage): Array<{ begin: number; end: number }> {
  const pdata = image.sections.find((s) => s.name === ".pdata" || s.name === ".PDATA");
  if (!pdata) return [];
  const n = Math.min(pdata.rsize, pdata.vsize) / 12;
  const out: Array<{ begin: number; end: number }> = [];
  for (let i = 0; i < n; i++) {
    const o = pdata.roff + i * 12;
    out.push({ begin: image.imageBase + buf.readUInt32LE(o), end: image.imageBase + buf.readUInt32LE(o + 4) });
  }
  return out;
}

export function functionContaining(ranges: Array<{ begin: number; end: number }>, va: number) {
  return ranges.find((r) => va >= r.begin && va < r.end) ?? null;
}

/**
 * Every RIP-relative operand target inside [begin, end): both the REX-prefixed form
 * (`48 8d 05 disp32`) and the short form (`8b 05 disp32`). Addresses are 64-bit, so no
 * 32-bit truncation anywhere.
 */
export function ripTargetsInRange(buf: Buffer, sections: Section[], begin: number, end: number): number[] {
  const s = sectionOf(sections, begin);
  if (!s) return [];
  const a = begin - s.va + s.roff;
  const b = Math.min(s.roff + Math.min(s.rsize, s.vsize), end - s.va + s.roff);
  const out = new Set<number>();
  for (let p = a; p + 7 <= b; p++) {
    if ((buf[p] & 0xf0) === 0x40 && (buf[p + 2] & 0xc7) === 0x05) {
      const at = fileOffsetToVA(sections, p + 3);
      if (at > 0) out.add(at + 4 + buf.readInt32LE(p + 3));
    } else if ((buf[p + 1] & 0xc7) === 0x05) {
      const at = fileOffsetToVA(sections, p + 2);
      if (at > 0) out.add(at + 4 + buf.readInt32LE(p + 2));
    }
  }
  return [...out];
}

export interface AcceptedCrcTableCandidate {
  valueVA: number;
  fileOffset: number;
  count: number;
  values: number[];
  /** VAs of code that references the table (or its length). */
  referencedAt: number[];
  /** how it was found */
  method: "code-guided" | "shape-scan";
  /** true when the (expensive) code-reference scan was skipped for this candidate */
  scanned: boolean;
}

const u32At = (buf: Buffer, sections: Section[], va: number): number => {
  const fo = vaToFileOffset(sections, va);
  return fo >= 0 && fo + 4 <= buf.length ? buf.readUInt32LE(fo) : -1;
};

/**
 * K such that the K words at `va` are all valid 16-bit values (1..0xffff) and the word
 * right after them equals K.
 */
function lengthsWithTrailingCount(buf: Buffer, sections: Section[], va: number, maxLen = 128): number[] {
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

/** K such that the K words *before* `va` are valid 16-bit values and `va` holds K. */
function lengthsWithLeadingCount(buf: Buffer, sections: Section[], va: number, maxLen = 128): number[] {
  const k = u32At(buf, sections, va);
  if (k < 5 || k > maxLen) return [];
  for (let i = 1; i <= k; i++) {
    const v = u32At(buf, sections, va - i * 4);
    if (v < 1 || v > 0xffff) return [];
  }
  return [k];
}

function makeCandidate(
  buf: Buffer, sections: Section[], va: number, count: number, method: AcceptedCrcTableCandidate["method"], referencedAt: number[],
): AcceptedCrcTableCandidate {
  const values: number[] = [];
  for (let i = 0; i < count; i++) values.push(u32At(buf, sections, va + i * 4));
  return { valueVA: va, fileOffset: vaToFileOffset(sections, va), count, values, referencedAt, method, scanned: true };
}

const LICENCE_STRINGS = ["Bad password.", "Password not in format dddd-ddd-ddd."];

/**
 * Locate the accepted-CRC table by walking the validator: find its error strings, the
 * functions that use them, and the data operands those functions touch.
 */
export function findAcceptedCrcTables(buf: Buffer, image: PeImage): AcceptedCrcTableCandidate[] {
  const { sections } = image;
  const ranges = functionRanges(buf, image);
  const functions = new Map<string, { begin: number; end: number }>();

  for (const needle of LICENCE_STRINGS) {
    const fo = buf.indexOf(Buffer.from(needle, "latin1"));
    if (fo < 0) continue;
    const strVA = fileOffsetToVA(sections, fo);
    if (strVA < 0) continue;
    for (const ref of findCodeRefs(buf, sections, strVA)) {
      const fn = functionContaining(ranges, Number(ref));
      if (fn) functions.set(`${fn.begin}`, fn);
    }
  }

  const found = new Map<string, AcceptedCrcTableCandidate>();
  for (const fn of functions.values()) {
    for (const target of ripTargetsInRange(buf, sections, fn.begin, fn.end)) {
      const sec = sectionOf(sections, target);
      if (!sec || !DATA_SECTIONS.includes(sec.name)) continue;
      for (const k of lengthsWithTrailingCount(buf, sections, target)) {
        const c = makeCandidate(buf, sections, target, k, "code-guided", []);
        found.set(`${c.valueVA}/${c.count}`, c);
      }
      for (const k of lengthsWithLeadingCount(buf, sections, target)) {
        const c = makeCandidate(buf, sections, target - k * 4, k, "code-guided", []);
        found.set(`${c.valueVA}/${c.count}`, c);
      }
    }
  }

  // attach the code reference(s) that point at the table or at its length
  const out = [...found.values()];
  for (const c of out) {
    const refs = new Set<string>();
    for (const va of [c.valueVA, c.valueVA + c.count * 4]) {
      for (const r of findCodeRefs(buf, sections, va)) refs.add(r);
    }
    c.referencedAt = [...refs].map((r) => Number(r));
  }
  return out.sort((a, b) => b.referencedAt.length - a.referencedAt.length || b.count - a.count);
}

/**
 * Shape-only scan (fallback). A run of K u32, each in (0, 0x10000), whose following word
 * (or whose last element) equals K. Can miss a table whose run merges with the data after
 * it — prefer findAcceptedCrcTables().
 */
export function scanAcceptedCrcTables(buf: Buffer, sections: Section[], minLen = 5, maxLen = 128): AcceptedCrcTableCandidate[] {
  const out: AcceptedCrcTableCandidate[] = [];
  const u32 = (p: number) => buf.readUInt32LE(p);
  for (const s of sections) {
    const start = s.roff, end = s.roff + Math.min(s.rsize, s.vsize);
    let runStart = -1, runLen = 0;
    const flush = () => {
      if (runLen >= minLen && runLen <= maxLen) {
        const after = runStart + runLen * 4;
        const values: number[] = [];
        for (let k = 0; k < runLen; k++) values.push(u32(runStart + k * 4));
        let count = -1;
        if (after + 4 <= end && u32(after) === runLen) count = runLen;
        else if (values[runLen - 1] === runLen - 1) { count = runLen - 1; values.pop(); }
        if (count > 0) {
          const va = fileOffsetToVA(sections, runStart);
          if (va > 0) {
            out.push({
              valueVA: va, fileOffset: runStart, count, values,
              referencedAt: [], method: "shape-scan", scanned: false,
            });
          }
        }
      }
      runStart = -1; runLen = 0;
    };
    for (let p = start; p + 4 <= end; p += 4) {
      const v = u32(p);
      if (v >= 1 && v <= 0xffff) { if (runStart < 0) { runStart = p; runLen = 0; } runLen++; }
      else flush();
    }
    flush();
  }
  return out;
}

/** Primary entry point: code-guided first, shape scan as a fallback. */
export function extractAcceptedCrcTables(buf: Buffer, image: PeImage): AcceptedCrcTableCandidate[] {
  const guided = findAcceptedCrcTables(buf, image);
  if (guided.length) return guided;
  const shape = scanAcceptedCrcTables(buf, image.sections);
  for (const c of shape) {
    c.referencedAt = findCodeRefs(buf, image.sections, c.valueVA).map((r) => Number(r));
    c.scanned = true;
  }
  return shape;
}

/* ---------------------------------- CLI ---------------------------------- */

function main(): void {
  const path = process.argv[2];
  if (!path) { console.error("usage: node accepted-crc-table.ts <path-to-pe>"); process.exit(2); }
  const buf = readFileSync(path);
  const image = parsePe(buf);
  console.log(`file        : ${path}`);
  console.log(`image base  : 0x${image.imageBase.toString(16)}`);
  console.log(`sections    : ${image.sections.map((s) => `${s.name}@0x${s.va.toString(16)}`).join(", ")}\n`);

  const candidates = extractAcceptedCrcTables(buf, image);
  if (!candidates.length) { console.log("no accepted-CRC table found."); return; }

  for (const t of candidates) {
    const refs = t.referencedAt.map((v) => "0x" + v.toString(16));
    console.log(`candidate table  (${t.method})`);
    console.log(`  VA          : 0x${t.valueVA.toString(16)}  (file offset 0x${t.fileOffset.toString(16)})`);
    console.log(`  count       : ${t.count}`);
    console.log(`  code refs   : ${refs.length ? refs.join(", ") : "(none)"}${refs.length ? "   <-- referenced by the validator" : ""}`);
    console.log(`  values      : ${t.values.join(", ")}\n`);
  }
}

const isMain = process.argv[1] && /accepted-crc-table\.(ts|js|mjs)$/.test(process.argv[1]);
if (isMain) main();
