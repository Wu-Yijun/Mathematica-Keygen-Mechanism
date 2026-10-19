/**
 * accepted-crc-table.ts — extract the mathpass "accepted CRC" whitelist directly from a
 * shipped PE binary, without a disassembler.
 *
 * Extraction principle (see report/05-accepted-crc.md):
 *   The whitelist is a plain array of little-endian u32, each a valid 16-bit value,
 *   immediately followed by its element count. The validator reads it with
 *   `mov r8d,[rip+count]` / `lea rcx,[rip+table]` (RIP-relative), so the table is
 *   cross-checked by finding a code reference to it.
 *
 * Usage:  node accepted-crc-table.ts <path-to-pe>
 */

import { readFileSync } from "node:fs";

interface Section { name: string; va: number; roff: number; vsize: number; rsize: number; code: boolean }

export function parsePe(buf: Buffer): { imageBase: number; sections: Section[] } {
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

function fo2va(sections: Section[], fo: number): number | null {
  for (const s of sections)
    if (fo >= s.roff && fo < s.roff + Math.max(s.rsize, s.vsize)) return s.va + (fo - s.roff);
  return null;
}

/**
 * Find RIP-relative code references to a virtual address, returning instruction VAs.
 * Recognises `lea r64,[rip+d]` (48/4C 8D), `mov r64,[rip+d]` (48/4C 8B) and
 * `mov r32,[rip+d]` (44 8B).
 */
export function findCodeRefs(buf: Buffer, sections: Section[], targetVA: number): string[] {
  const refs: string[] = [];
  for (const s of sections.filter((x) => x.code)) {
    const start = s.roff;
    const end = s.roff + Math.min(s.rsize, s.vsize);
    for (let p = start; p + 7 <= end; p++) {
      const b0 = buf[p], b1 = buf[p + 1], m = buf[p + 2];
      let dispOff = -1, len = 7;
      if ((b0 === 0x48 || b0 === 0x4c) && (b1 === 0x8d || b1 === 0x8b) && (m & 0xc7) === 0x05) dispOff = p + 3;
      else if (b0 === 0x44 && b1 === 0x8b && (m & 0xc7) === 0x05) dispOff = p + 3;
      else if (b1 === 0x8d && (m & 0xc7) === 0x05 && (b0 & 0xf8) === 0x40) { dispOff = p + 2; len = 6; }
      if (dispOff < 0) continue;
      const disp = buf.readInt32LE(dispOff);
      const ip = s.va + (dispOff + 4 - s.roff);
      if (((ip + disp) >>> 0) === (targetVA >>> 0))
        refs.push("0x" + (s.va + (p - s.roff)).toString(16));
    }
  }
  return refs;
}

export interface AcceptedCrcTableCandidate { valueVA: number; fileOffset: number; count: number; values: number[] }

/**
 * Scan for whitelist candidates: a run of K u32 all in (0, 0x10000) whose following
 * u32 equals K, or whose last element equals K-1.
 */
export function scanAcceptedCrcTables(buf: Buffer, sections: Section[], minLen = 5, maxLen = 128): AcceptedCrcTableCandidate[] {
  const out: AcceptedCrcTableCandidate[] = [];
  const u32 = (p: number) => buf.readUInt32LE(p);
  // iterate over every section's raw data on 4-byte boundaries
  for (const s of sections) {
    const start = s.roff, end = s.roff + Math.min(s.rsize, s.vsize);
    let runStart = -1, runLen = 0;
    const flush = () => {
      if (runLen >= minLen && runLen <= maxLen) {
        const after = runStart + runLen * 4;
        const values: number[] = [];
        for (let k = 0; k < runLen; k++) values.push(u32(runStart + k * 4));
        let count = -1;
        if (after + 4 <= end && u32(after) === runLen) count = runLen;               // count after run
        else if (values[runLen - 1] === runLen - 1) { count = runLen - 1; values.pop(); } // count as last
        if (count > 0) {
          const va = fo2va(sections, runStart);
          if (va != null) out.push({ valueVA: va, fileOffset: runStart, count, values });
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

/* ---------------------------------- CLI ---------------------------------- */

function main(): void {
  const path = process.argv[2];
  if (!path) { console.error("usage: node accepted-crc-table.ts <path-to-pe>"); process.exit(2); }
  const buf = readFileSync(path);
  const { imageBase, sections } = parsePe(buf);
  console.log(`file        : ${path}`);
  console.log(`image base  : 0x${imageBase.toString(16)}`);
  console.log(`sections    : ${sections.map((s) => `${s.name}@0x${s.va.toString(16)}`).join(", ")}\n`);

  const candidates = scanAcceptedCrcTables(buf, sections);
  if (!candidates.length) { console.log("no whitelist-shaped table found."); return; }

  for (const t of candidates) {
    const refs = findCodeRefs(buf, sections, t.valueVA);
    console.log(`candidate table`);
    console.log(`  VA          : 0x${t.valueVA.toString(16)}  (file offset 0x${t.fileOffset.toString(16)})`);
    console.log(`  count       : ${t.count}`);
    console.log(`  code refs   : ${refs.length ? refs.join(", ") : "(none)"}${refs.length ? "   <-- referenced by validator" : ""}`);
    console.log(`  values      : ${t.values.join(", ")}\n`);
  }
}

const isMain = process.argv[1] && /accepted-crc-table\.(ts|js|mjs)$/.test(process.argv[1]);
if (isMain) main();
