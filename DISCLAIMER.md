**中文** · [English](DISCLAIMER.zh.md)

# Disclaimer

This repository documents the **reverse engineering of the offline licence-password
scheme** used by Wolfram products (`mathpass`) for research, interoperability and
educational purposes.

## What is in this repository

- An English write-up of the analysis (`report/01` … `report/09`).
- Language-neutral pseudocode of the recovered algorithms (`report/pseudocode/`).
- TypeScript implementations of the recovered algorithms (`report/code/`).
- A small, curated set of raw decompiler outputs (`report/decompiled/`).

## What is **not** in this repository

- **No Wolfram binaries.** No `.dll`, `.exe`, installer or any other copyrighted file is
  redistributed here. All analysis was performed on binaries the author had installed;
  only decompiler *output* (derived text) is shown.
- **No working licence keys.** Every licence value used in the report and the code is a
  **synthetic placeholder** (e.g. `0000-00000-00000` / `0000-0000-AAAAAA`). No real
  activation key, licence ID or password is published.
- **No machine-specific data.** No local paths, user names or host identifiers.

## Legal notice

Reverse engineering may be restricted by the licence terms of the software concerned
and by law (for example anti-circumvention provisions such as DMCA §1201 in the United
States). This material is published for study and interoperability research. **You are
responsible for how you use it.** The author does not encourage or condone using it to
circumvent licence terms, and provides it "as is", without warranty of any kind.

If you are a rights holder and would like something changed or removed, please open an
issue.

## Trademarks

Wolfram, Mathematica and the Wolfram logo are trademarks of Wolfram Research, Inc. The
mark in `logo.svg` / `favicon.ico` is used only to identify the subject of this research;
no affiliation with, or endorsement by, Wolfram Research is implied.
