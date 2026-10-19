# Mathematica-Keygen-Mechanism

**English** · [中文](Readme.zh.md)

A reverse-engineering based tool for Wolfram's `mathpass` licence passwords:
**generate**, **verify** and **extract the Accepted CRC**, plus **read the Accepted-CRC
table straight out of your own `WolframEngine.dll`**. The full reverse-engineering
process, the algorithm derivation and the server-side key-generation analysis live in
[`report/`](report/README.md).

## What it does

| Feature | Notes |
| --- | --- |
| Generate | Builds `signature::LicenseCode:YYYYMMDD` (≥ 14.1) or `signature::LicenseCode` (≤ 14.0) from Math ID, activation key, LicenseCode, expiry and the Accepted CRC |
| Verify | Checks condition A (integrity: CRC == 0) and condition B (CRC ∈ Accepted-CRC table), decodes the LicenseCode and reports the days left |
| Extract Accepted CRC | Computed straight from the password — O(1), no search |
| Read the table | Pick a local `WolframEngine.dll`: the page parses the PE in your browser, scans for the whitelist and cross-checks it against the validator's code reference. **The file is parsed locally and never uploaded.** |

## Usage

Online: <https://wu-yijun.github.io/Mathematica-Keygen-Mechanism/>

Local:

```bash
pnpm install
pnpm build      # src/index.ts -> dist/index.js, and copies index.html / index.css / logo.svg / favicon.ico into dist/
pnpm preview    # http://localhost:8137/
```

## Layout

| Path | Contents |
| --- | --- |
| `src/` | page source (TypeScript; it `import`s `report/code/mathpass.ts`, inlined at build time) |
| `report/` | reverse-engineering report (01–09) + algorithm implementations (`mathpass.ts` / `licenseCode.ts` / `accepted-crc-table.ts`) + pseudocode + decompiled samples |
| `dist/` | build output (built by CI; listed in `.gitignore`) |
| `scripts/serve.mjs` | local static server (`pnpm preview`) |
| `.github/workflows/deploy.yaml` | install → type check → run the algorithm self-check → build → deploy `dist/` |

## Notes

- Every default value on the page is a **synthetic placeholder**; this repository ships **no vendor binaries**, **no real licence** and **no working key**.
- The top of the UI switches between **Basic mode** (just a version and a Math ID) and **Advanced mode** (all fields + bit editor + table import); it supports Chinese/English switching.
- See [`DISCLAIMER.md`](DISCLAIMER.md) for the disclaimer.
