/**
 * pe.ts — minimal PE reader and accepted-CRC table scanner, for the browser.
 *
 * It is the browser twin of report/code/accepted-crc-table.ts (which runs on Node's
 * Buffer); the algorithm is identical:
 *
 *   1. the table is a run of little-endian u32, each a valid 16-bit value, immediately
 *      followed by the run's element count;
 *   2. the real one is read by the validator with a RIP-relative `lea`/`mov`, so each
 *      candidate is cross-checked for a code reference to its address.
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
  refs: number[];
  /** false when the (expensive) code-reference scan was skipped for this candidate. */
  scanned: boolean;
}

export function parsePe(buf: Uint8Array): PeImage {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const peOff = dv.getUint32(0x3c, true);
  const sig = String.fromCharCode(buf[peOff], buf[peOff + 1], buf[peOff + 2], buf[peOff + 3]);
  if (sig !== "PE\0\0") throw new Error("not a PE file");
  const numSec = dv.getUint16(peOff + 6, true);
  const optSize = dv.getUint16(peOff + 20, true);
  const optOff = peOff + 24;
  const magic = dv.getUint16(optOff, true); // PE32 (0x10b) or PE32+ (0x20b)
  const imageBase = magic === 0x20b
    ? Number(dv.getBigUint64(optOff + 24, true))
    : dv.getUint32(optOff + 28, true) >>> 0;
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

const dvOf = (buf: Uint8Array) => new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

function sectionEnd(buf: Uint8Array, s: PeSection): number {
  return Math.min(buf.length, s.roff + Math.min(s.rsize, s.vsize));
}

function fileOffsetToVA(sections: PeSection[], fo: number): number | null {
  for (const s of sections)
    if (fo >= s.roff && fo < s.roff + Math.max(s.rsize, s.vsize)) return s.va + (fo - s.roff);
  return null;
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
    const end = sectionEnd(buf, s);
    for (let p = start; p + 7 <= end; p++) {
      const b0 = buf[p], b1 = buf[p + 1], m = buf[p + 2];
      let dispOff = -1;
      if ((b0 === 0x48 || b0 === 0x4c) && (b1 === 0x8d || b1 === 0x8b) && (m & 0xc7) === 0x05) dispOff = p + 3;
      else if (b0 === 0x44 && b1 === 0x8b && (m & 0xc7) === 0x05) dispOff = p + 3;
      else if (b1 === 0x8d && (m & 0xc7) === 0x05 && (b0 & 0xf8) === 0x40) dispOff = p + 2;
      if (dispOff < 0) continue;
      const disp = dv.getInt32(dispOff, true);
      const ip = s.va + (dispOff + 4 - s.roff);
      // RIP-relative: the hardware adds the signed displacement to the 64-bit IP.
      if (ip + disp === targetVA) refs.push(s.va + (p - s.roff));
    }
  }
  return refs;
}

/** Scan every section for whitelist-shaped runs (see the file header). */
export function scanAcceptedCrcTables(
  buf: Uint8Array, sections: PeSection[], minLen = 5, maxLen = 128,
): Array<{ valueVA: number; fileOffset: number; count: number; values: number[] }> {
  const dv = dvOf(buf);
  const out: Array<{ valueVA: number; fileOffset: number; count: number; values: number[] }> = [];
  for (const s of sections) {
    const start = s.roff;
    const end = sectionEnd(buf, s);
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
          const va = fileOffsetToVA(sections, runStart);
          if (va != null) out.push({ valueVA: va, fileOffset: runStart, count, values });
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

/** Full analysis: scan, then cross-check the most plausible candidates with a code-ref scan. */
export function scanWithCodeRefs(buf: Uint8Array, image: PeImage, maxCandidates = 8): CrcTableCandidate[] {
  // The real table is one of the longest runs, so check those first; a full code-ref
  // scan walks every byte of .text, which is expensive on a 100 MB module.
  const all = scanAcceptedCrcTables(buf, image.sections).sort((a, b) => b.count - a.count);
  const refsByCandidate = new Map<number, number[]>();
  let scanned = 0;
  for (const t of all) {
    if (scanned++ >= maxCandidates) break;
    refsByCandidate.set(t.valueVA, findCodeRefs(buf, image.sections, t.valueVA));
  }
  return all
    .map((t) => ({ ...t, refs: refsByCandidate.get(t.valueVA) ?? [], scanned: refsByCandidate.has(t.valueVA) }))
    .sort((a, b) => Number(b.refs.length > 0) - Number(a.refs.length > 0) || b.count - a.count);
}
