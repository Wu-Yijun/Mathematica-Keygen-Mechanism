import { defineConfig } from "tsdown";

/**
 * The site is a single-page bundle:
 *   src/index.ts  ->  dist/index.js
 * plus the static shell and assets copied verbatim into dist/.
 *
 * `report/` is not part of the bundle: src/ imports the algorithm from
 * ../report/code/mathpass.ts and rolldown inlines it at build time, so the deployed
 * pages need nothing but dist/.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  platform: "browser",
  target: "es2022",
  dts: false,
  sourcemap: false,
  minify: false,
  clean: true,
  copy: [
    { from: "index.html", to: "dist" },
    { from: "index.css", to: "dist" },
    { from: "logo.svg", to: "dist" },
    { from: "favicon.ico", to: "dist" },
  ],
});
