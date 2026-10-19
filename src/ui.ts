/**
 * ui.ts — the whole page: state wiring, the LicenceCode bit editor, the two modes,
 * the accepted-CRC table panel and the results.
 */
import {
  generateSignature, messageOf, messageOfLegacy, parsePassword,
  verifySignature, type VerifyResult,
} from "../../report/code/mathpass.ts";
import { decodeLicenseCode } from "../../report/code/licenseCode.ts";
import { DOC_BASE, GITHUB_BASE, applyI18n, detectLang, getLang, setLang, t, tf } from "./i18n.ts";
import {
  CAPABILITY_BITS, CLASS_BITS, DEFAULT_ACCEPTED_CRC, PRODUCT_BITS, VERSION_FORMATS, addToDate, daysLeft,
  defaultAcceptedCrcFor, defaultTableFor, formatLicenseCode, fromYYYYMMDD, isValidActivationKey,
  isValidLicenseCode, isValidMathID, loadLang, loadState, randomActivationKey, randomMathID,
  saveLang, saveState, selectedBitOf, toYYYYMMDD, withBit, withExclusiveBit,
  type BitOption, type State, type VersionMode,
} from "./state.ts";
import { parsePe, scanWithCodeRefs, type CrcTableCandidate } from "./pe.ts";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

let state: State = loadState();
let lang = loadLang() ?? detectLang();
setLang(lang);

/** The last analysis shown, kept so a language switch can re-render it verbatim. */
let lastAnalysis: Analysis | null = null;

/* ------------------------------------------------------------------ *
 * small helpers
 * ------------------------------------------------------------------ */

function toast(message: string, kind: "info" | "warn" | "error" = "info"): void {
  const box = $("toasts");
  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;
  el.textContent = message;
  box.append(el);
  setTimeout(() => { el.style.opacity = "0"; }, 2600);
  setTimeout(() => el.remove(), 3400);
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(t("toast.copied"));
  } catch {
    toast(t("toast.copyFailed"), "warn");
  }
}

async function pasteInto(input: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  try {
    const text = await navigator.clipboard.readText();
    input.value = text.trim();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    toast(t("toast.pasted"));
  } catch {
    toast(t("toast.pasteFailed"), "warn");
  }
}

function persist(): void {
  saveState(state);
}

/* ------------------------------------------------------------------ *
 * version-dependent view
 * ------------------------------------------------------------------ */

function currentMessage(): string {
  return state.version === "ge141"
    ? messageOf(state.mathID, state.activationKey, state.licenseCode, state.expiry)
    : messageOfLegacy(state.mathID, state.activationKey, state.licenseCode);
}

function setVersion(version: VersionMode): void {
  markStale();
  state.version = version;
  const dflt = defaultTableFor(version);
  if (state.tableSource === "builtin" || state.tableSource === "v14") {
    state.table = dflt.table;
    state.tableSource = dflt.source;
  }
  if (!state.table.includes(state.acceptedCrc)) {
    state.acceptedCrc = defaultAcceptedCrcFor(version, state.table);
  }
  if (!isValidActivationKey(state.activationKey, version)) {
    state.activationKey = randomActivationKey(version);
  }
  persist();
  render();
}

/* ------------------------------------------------------------------ *
 * licence-code bit editor
 * ------------------------------------------------------------------ */

function bitChip(option: BitOption, kind: "exclusive" | "toggle", group?: BitOption[]): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bit";
  btn.dataset.bit = String(option.bit);
  btn.textContent = option.label;
  btn.title = `bit ${option.bit} → 0x${(1 << option.bit).toString(16).toUpperCase()}`;
  btn.addEventListener("click", () => {
    if (kind === "exclusive") {
      const on = selectedBitOf(state.licenseCode, group!) === option.bit;
      state.licenseCode = withExclusiveBit(state.licenseCode, group!, on ? null : option.bit);
    } else {
      const on = ((parseInt(state.licenseCode || "0", 16) >>> option.bit) & 1) === 1;
      state.licenseCode = withBit(state.licenseCode, option.bit, !on);
    }
    markStale();
    persist();
    renderLicenseCode();
  });
  return btn;
}

function noneChip(group: BitOption[]): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bit";
  btn.dataset.bit = "none";
  btn.textContent = t(group === PRODUCT_BITS ? "lc.product.none" : "lc.class.none");
  btn.addEventListener("click", () => {
    state.licenseCode = withExclusiveBit(state.licenseCode, group, null);
    markStale();
    persist();
    renderLicenseCode();
  });
  return btn;
}

function buildEditor(): void {
  $("lc-product").replaceChildren(noneChip(PRODUCT_BITS), ...PRODUCT_BITS.map((o) => bitChip(o, "exclusive", PRODUCT_BITS)));
  $("lc-class").replaceChildren(noneChip(CLASS_BITS), ...CLASS_BITS.map((o) => bitChip(o, "exclusive", CLASS_BITS)));
  $("lc-caps").replaceChildren(...CAPABILITY_BITS.map((o) => bitChip(o, "toggle")));
}

function renderLicenseCode(): void {
  const input = $<HTMLInputElement>("licensecode");
  if (document.activeElement !== input) input.value = state.licenseCode;

  const mark = (container: string, option: BitOption | null) => {
    const selected = option ? option.bit : null;
    for (const el of $(container).querySelectorAll<HTMLButtonElement>(".bit")) {
      const bit = el.dataset.bit;
      const on = bit === "none" ? selected === null : selected === Number(bit);
      el.classList.toggle("bit--on", on);
    }
  };
  mark("lc-product", PRODUCT_BITS.find((o) => o.bit === selectedBitOf(state.licenseCode, PRODUCT_BITS)) ?? null);
  mark("lc-class", CLASS_BITS.find((o) => o.bit === selectedBitOf(state.licenseCode, CLASS_BITS)) ?? null);

  for (const el of $("lc-caps").querySelectorAll<HTMLButtonElement>(".bit")) {
    const bit = Number(el.dataset.bit);
    el.classList.toggle("bit--on", ((parseInt(state.licenseCode || "0", 16) >>> bit) & 1) === 1);
  }

  const d = decodeLicenseCode(state.licenseCode || "0");
  const caps = d.capabilities.length ? d.capabilities.join(", ") : t("lc.summary.none");
  $("lc-summary").textContent =
    `${t("lc.summary.product")}: ${d.product} · ${t("lc.summary.class")}: ${d.licenseClass} · ` +
    `${t("lc.summary.caps")}: ${caps}`;
  $("lc-summary").title = `0x${d.value.toString(16).toUpperCase()} (bit ${d.bits.join(",")})`;

  $("lc-editor").hidden = state.version === "le14";
  $("lc-note-le14").hidden = state.version !== "le14";
}

/* ------------------------------------------------------------------ *
 * accepted-crc field
 * ------------------------------------------------------------------ */

function renderCrcField(): void {
  const input = $<HTMLInputElement>("acceptedcrc");
  if (document.activeElement !== input) input.value = String(state.acceptedCrc);

  const list = $<HTMLSelectElement>("acceptedcrc-list");
  const values = state.table.includes(state.acceptedCrc) ? state.table : [...state.table, state.acceptedCrc];
  list.replaceChildren(...values.map((v) => {
    const o = document.createElement("option");
    o.value = String(v);
    o.textContent = `${v} (0x${v.toString(16).toUpperCase()})`;
    return o;
  }));
  list.value = String(state.acceptedCrc);

  const key = state.tableSource === "builtin" ? "crc.note.builtin"
    : state.tableSource === "v14" ? "crc.note.v14"
      : state.tableSource === "file" ? "crc.note.file" : "crc.note.manual";
  $("crc-note").textContent = t(key) + (state.table.includes(state.acceptedCrc) ? "" : ` ${t("crc.note.notInTable")}`);
}

/* ------------------------------------------------------------------ *
 * results
 * ------------------------------------------------------------------ */

/** Any edit to the inputs invalidates the analysis shown next to the password. */
function markStale(): void {
  lastAnalysis = null;
  setVerdict("idle");
  clearKv();
}

function setPasswordState(kind: "idle" | "valid" | "invalid"): void {
  const el = $("result-password");
  el.classList.toggle("is-idle", kind === "idle");
  el.classList.toggle("is-valid", kind === "valid");
  el.classList.toggle("is-invalid", kind === "invalid");
}

function setVerdict(kind: "idle" | "valid" | "invalid", extra = ""): void {
  const cls = kind === "idle" ? "badge--idle" : kind === "valid" ? "badge--ok" : "badge--bad";
  const text = kind === "idle" ? t("common.idle") : kind === "valid" ? t("verdict.valid") : t("verdict.invalid");
  for (const [id, el] of [["basic-verdict", $("basic-verdict")], ["result-badge", $("result-badge")]] as const) {
    el.className = `badge ${cls}`;
    el.textContent = text + (extra ? ` · ${extra}` : "");
    void id;
  }
  setPasswordState(kind);
}

function setPassword(password: string): void {
  state.password = password;
  ($("basic-password") as HTMLInputElement).value = password;
  ($("result-password") as HTMLInputElement).value = password;
}

function clearKv(): void { $("result-kv").replaceChildren(); }

function addKv(labelKey: string, value: string): void {
  const dl = $("result-kv");
  const dt = document.createElement("dt");
  dt.textContent = t(labelKey);
  const dd = document.createElement("dd");
  dd.textContent = value;
  if (value.length > 40) dd.classList.add("kv--wrap");
  dl.append(dt, dd);
}

interface Analysis {
  message: string;
  modeLabel: string;
  result: VerifyResult;
  licenseCode: string;
  expiry: string;
}

/** Work out which version format a password uses, and analyse it. */
function analyse(mathID: string, activationKey: string, password: string): Analysis | null {
  const { signature, licenseCode, expiryDate } = parsePassword(password);
  if (!signature) return null;
  let version: VersionMode = state.version;
  if (version === "ge141" && !expiryDate) version = "le14";
  else if (version === "le14" && expiryDate) version = "ge141";
  const message = version === "ge141"
    ? messageOf(mathID, activationKey, licenseCode, expiryDate)
    : messageOfLegacy(mathID, activationKey, licenseCode);
  return {
    message,
    modeLabel: version === "ge141" ? t("version.ge141") : t("version.le14"),
    result: verifySignature(message, signature, state.table),
    licenseCode,
    expiry: expiryDate,
  };
}

function showAnalysis(a: Analysis): void {
  lastAnalysis = a;
  clearKv();
  const r = a.result;
  addKv("result.kv.message", a.message);
  addKv("result.kv.version", a.modeLabel);
  addKv("result.kv.n1", String(r.n1));
  addKv("result.kv.n2", String(r.n2));
  addKv("result.kv.n0", String(r.n0));
  addKv("result.kv.condA", r.integrityOk ? "0" : "≠ 0");
  addKv("result.kv.condB", `${r.acceptedCrc} (0x${r.acceptedCrc.toString(16).toUpperCase()})`);
  addKv("result.kv.inTable", r.inTable ? t("result.yes") : t("result.no"));
  const d = decodeLicenseCode(a.licenseCode || "0");
  addKv("result.kv.product", d.product);
  addKv("result.kv.class", d.licenseClass);
  addKv("result.kv.caps", d.capabilities.length ? d.capabilities.join(", ") : t("lc.summary.none"));
  if (a.expiry) {
    const left = daysLeft(a.expiry);
    addKv("result.kv.expiry", `${a.expiry} / ${left === null ? "—" : left < 0 ? t("result.expired") : tf("result.daysLeft", { n: left })}`);
  }
  setVerdict(r.valid ? "valid" : "invalid", r.valid ? `0x${r.acceptedCrc.toString(16).toUpperCase()}` : "");
}

/* ------------------------------------------------------------------ *
 * actions
 * ------------------------------------------------------------------ */

function ensureInputs(): boolean {
  const mathID = $<HTMLInputElement>("mathid").value.trim();
  if (!isValidMathID(mathID)) { toast(t("toast.invalidMathId"), "error"); return false; }
  state.mathID = mathID;
  if (!isValidActivationKey(state.activationKey, state.version)) {
    state.activationKey = randomActivationKey(state.version);
    $<HTMLInputElement>("actkey").value = state.activationKey;
  }
  if (!isValidLicenseCode(state.licenseCode)) { toast(t("toast.badLicenseCode"), "error"); return false; }
  state.licenseCode = formatLicenseCode(state.licenseCode);
  return true;
}

/** The password field the user can actually see: Advanced shows the right column, Basic does not. */
function passwordField(): HTMLInputElement {
  return state.mode === "advanced" ? $("result-password") : $("basic-password");
}

function generate(): void {
  if (!ensureInputs()) return;
  const message = currentMessage();
  const signature = generateSignature(message, state.acceptedCrc);
  const password = state.version === "ge141"
    ? `${signature}::${state.licenseCode}:${state.expiry}`
    : `${signature}::${state.licenseCode}`;
  setPassword(password);
  persist();
  const a = analyse(state.mathID, state.activationKey, password);
  if (a) showAnalysis(a);
  else setVerdict("valid", `0x${state.acceptedCrc.toString(16).toUpperCase()}`);
  toast(t("toast.generated"));
}

function verify(): void {
  const mathID = $<HTMLInputElement>("mathid").value.trim();
  const password = passwordField().value.trim();
  if (!isValidMathID(mathID) || !password) { toast(t("toast.needInputs"), "error"); return; }
  state.mathID = mathID;
  const a = analyse(mathID, state.activationKey, password);
  if (!a) { toast(t("toast.needInputs"), "error"); return; }
  setPassword(password);
  showAnalysis(a);
  persist();
}

function extractCrc(): void {
  const mathID = $<HTMLInputElement>("mathid").value.trim();
  const password = passwordField().value.trim();
  if (!isValidMathID(mathID) || !password) { toast(t("toast.needInputs"), "error"); return; }
  const a = analyse(mathID, state.activationKey, password);
  if (!a) { toast(t("toast.needInputs"), "error"); return; }
  state.acceptedCrc = a.result.acceptedCrc;
  persist();
  renderCrcField();
  setPassword(password);
  showAnalysis(a);
  toast(t("toast.extracted"));
}

/* ------------------------------------------------------------------ *
 * table panel
 * ------------------------------------------------------------------ */

function useTable(table: number[], source: State["tableSource"]): void {
  markStale();
  state.table = table;
  state.tableSource = source;
  if (!table.includes(state.acceptedCrc)) {
    state.acceptedCrc = table.includes(DEFAULT_ACCEPTED_CRC) ? DEFAULT_ACCEPTED_CRC : table[0];
  }
  persist();
  renderCrcField();
  toast(t("toast.tableLoaded"));
}

function renderCandidates(candidates: CrcTableCandidate[]): void {
  const box = $("table-candidates");
  box.replaceChildren();
  for (const c of candidates) {
    const el = document.createElement("div");
    el.className = "candidate";
    const head = document.createElement("div");
    head.className = "candidate__head";
    head.textContent =
      `${t("table.col.va")} 0x${c.valueVA.toString(16).toUpperCase()} · ${t("table.col.count")} ${c.count} · ` +
      `${t("table.col.refs")} ` + (c.scanned
        ? `${c.refs.length} ${c.refs.length ? `(${t("table.referenced")})` : `(${t("table.unreferenced")})`}`
        : t("table.unchecked"));
    const values = document.createElement("div");
    values.className = "candidate__values mono";
    values.textContent = c.values.join(", ");
    const use = document.createElement("button");
    use.type = "button";
    use.className = "btn btn--icon";
    use.textContent = t("table.use");
    use.addEventListener("click", () => useTable([...c.values], "file"));
    el.append(head, values, use);
    box.append(el);
  }
}

async function parseFile(file: File): Promise<void> {
  const status = $("table-status");
  try {
    status.textContent = tf("table.status.reading", { mb: (file.size / 1048576).toFixed(1) });
    await new Promise((r) => setTimeout(r, 30));
    const buf = new Uint8Array(await file.arrayBuffer());
    status.textContent = t("table.status.scanning");
    await new Promise((r) => setTimeout(r, 30));
    const image = parsePe(buf);
    const candidates = scanWithCodeRefs(buf, image);
    if (!candidates.length) { status.textContent = t("table.status.none"); return; }
    const referenced = candidates.filter((c) => c.refs.length > 0).length;
    status.textContent = tf("table.status.found", { n: candidates.length, r: referenced });
    renderCandidates(candidates);
    const best = candidates.find((c) => c.refs.length > 0);
    if (best) {
      useTable([...best.values], "file");
      status.textContent += ` ${t("table.status.picked")}`;
    } else {
      status.textContent += ` ${t("table.status.noRefs")}`;
    }
  } catch (err) {
    status.textContent = tf("table.status.error", { msg: err instanceof Error ? err.message : String(err) });
  }
}

/* ------------------------------------------------------------------ *
 * render / wiring
 * ------------------------------------------------------------------ */

let lastMode: State["mode"] | null = null;

function animateSwitch(): void {
  const wb = $("workbench");
  const wraps = [...document.querySelectorAll<HTMLElement>(".adv-collapse")];
  wb.classList.add("is-animating");
  for (const w of wraps) w.classList.add("is-animating");
  setTimeout(() => {
    wb.classList.remove("is-animating");
    for (const w of wraps) w.classList.remove("is-animating");
  }, 560);
}

function renderMode(): void {
  const advanced = state.mode === "advanced";
  if (lastMode !== null && lastMode !== state.mode) animateSwitch();
  lastMode = state.mode;
  $("workbench").className = `wb ${advanced ? "wb--advanced" : "wb--basic"}${$("workbench").classList.contains("is-animating") ? " is-animating" : ""}`;
  $("mode-toggle-text").textContent = t(advanced ? "nav.mode.toBasic" : "nav.mode.toAdvanced");
  $("mode-toggle").classList.toggle("chip--accent", !advanced);
}

function renderVersionNote(): void {
  const f = VERSION_FORMATS[state.version];
  const note = $("version-note");
  const title = document.createElement("span");
  title.className = "format__title";
  title.textContent = t(state.version === "ge141" ? "version.note.ge141.title" : "version.note.le14.title");
  const line = (label: string, code: string) => {
    const row = document.createElement("span");
    row.className = "format__line";
    const l = document.createElement("span");
    l.className = "format__label";
    l.textContent = `${label} =`;
    const c = document.createElement("code");
    c.textContent = code;
    row.append(l, c);
    return row;
  };
  const actkey = document.createElement("span");
  actkey.className = "format__line";
  actkey.textContent = t(state.version === "ge141" ? "version.note.actkey.ge141" : "version.note.actkey.le14");
  note.replaceChildren(
    title,
    line(t("version.note.password"), f.password),
    line(t("version.note.message"), f.message),
    actkey,
  );
}

function renderVersion(): void {
  for (const el of $("version-seg").querySelectorAll<HTMLButtonElement>(".seg")) {
    const on = el.dataset.version === state.version;
    el.classList.toggle("seg--on", on);
    el.setAttribute("aria-checked", String(on));
  }
  renderVersionNote();
  $("actkey-note").textContent = t(state.version === "ge141" ? "actkey.note.ge141" : "actkey.note.le14");

  const legacy = state.version === "le14";
  $("expiry-text").closest(".card")!.classList.toggle("card--disabled", legacy);
  ($("expiry-text") as HTMLInputElement).disabled = legacy;
  ($("expiry-date") as HTMLInputElement).disabled = legacy;
  for (const b of $("expiry-quick").querySelectorAll<HTMLButtonElement>("button")) b.disabled = legacy;
  $("expiry-note").textContent = legacy ? t("expiry.note.le14") : t("expiry.note");
}

function renderInputs(): void {
  ($("mathid") as HTMLInputElement).value = state.mathID;
  ($("actkey") as HTMLInputElement).value = state.activationKey;
  const expiryText = $<HTMLInputElement>("expiry-text");
  expiryText.value = state.expiry;
  const date = $<HTMLInputElement>("expiry-date");
  const d = fromYYYYMMDD(state.expiry);
  date.value = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
}

function render(): void {
  document.documentElement.lang = getLang() === "zh" ? "zh-CN" : "en";
  applyI18n(document);
  renderMode();
  renderVersion();
  renderInputs();
  renderLicenseCode();
  renderCrcField();
  if (lastAnalysis) showAnalysis(lastAnalysis);
  else setVerdict("idle");
  persist();
}

function wire(): void {
  // links
  const blob = (path: string) => `${GITHUB_BASE}/blob/main/${path}`;
  for (const el of document.querySelectorAll<HTMLElement>("[data-href]")) el.setAttribute("href", blob(el.dataset.href!));
  $("footer-disclaimer").setAttribute("href", blob("DISCLAIMER.md"));

  // hints
  for (const el of document.querySelectorAll<HTMLElement>(".hint")) {
    el.addEventListener("click", () => {
      const doc = el.dataset.doc;
      if (doc) window.open(DOC_BASE + doc, "_blank", "noopener");
    });
  }

  // user agreement
  const agreed = localStorage.getItem("mathpass.agreed");
  if (agreed) $("agree").hidden = true;
  for (const el of document.querySelectorAll<HTMLElement>("[data-agree]")) {
    el.addEventListener("click", () => {
      localStorage.setItem("mathpass.agreed", el.dataset.agree ?? "1");
      $("agree").hidden = true;
    });
  }
  $("agree-hide").addEventListener("click", () => {
    localStorage.setItem("mathpass.agreed", "0");
    $("agree").hidden = true;
  });

  // mode + language
  const toggleMode = () => { state.mode = state.mode === "advanced" ? "basic" : "advanced"; renderMode(); persist(); };
  $("mode-toggle").addEventListener("click", toggleMode);
  $("btn-advanced-basic").addEventListener("click", () => { state.mode = "advanced"; renderMode(); persist(); });

  $("lang-toggle").addEventListener("click", () => {
    lang = getLang() === "zh" ? "en" : "zh";
    setLang(lang);
    saveLang(lang);
    buildEditor();
    render();
  });

  // version
  for (const el of $("version-seg").querySelectorAll<HTMLButtonElement>(".seg")) {
    el.addEventListener("click", () => setVersion(el.dataset.version as VersionMode));
  }

  // identity
  $<HTMLInputElement>("mathid").addEventListener("input", (e) => {
    state.mathID = (e.target as HTMLInputElement).value.trim();
    markStale();
    persist();
  });
  $("mathid-sample").addEventListener("click", () => {
    state.mathID = randomMathID();
    renderInputs();
    markStale();
    persist();
  });
  $("mathid-paste").addEventListener("click", () => void pasteInto($<HTMLInputElement>("mathid")));

  $<HTMLInputElement>("actkey").addEventListener("input", (e) => {
    state.activationKey = (e.target as HTMLInputElement).value.trim();
    markStale();
    persist();
  });
  $("actkey-random").addEventListener("click", () => {
    state.activationKey = randomActivationKey(state.version);
    renderInputs();
    markStale();
    persist();
  });
  $("actkey-paste").addEventListener("click", () => void pasteInto($<HTMLInputElement>("actkey")));

  // license code
  const lc = $<HTMLInputElement>("licensecode");
  lc.addEventListener("input", () => {
    if (/^[0-9A-Fa-f]{1,8}$/.test(lc.value)) {
      state.licenseCode = lc.value.toUpperCase();
      lc.classList.remove("input--bad");
      markStale();
      persist();
      renderLicenseCode();
    } else {
      lc.classList.add("input--bad");
    }
  });
  lc.addEventListener("blur", () => {
    if (!/^[0-9A-Fa-f]{1,8}$/.test(lc.value)) {
      lc.value = state.licenseCode;
      lc.classList.remove("input--bad");
    }
  });
  $("lc-copy").addEventListener("click", () => void copyText(state.licenseCode));

  // expiry
  const expiryText = $<HTMLInputElement>("expiry-text");
  expiryText.addEventListener("input", () => {
    const v = expiryText.value.replace(/\D/g, "").slice(0, 8);
    expiryText.value = v;
    if (v.length === 8 && fromYYYYMMDD(v)) {
      state.expiry = v;
      renderInputs();
      markStale();
      persist();
    }
  });
  $<HTMLInputElement>("expiry-date").addEventListener("change", (e) => {
    const v = (e.target as HTMLInputElement).value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      state.expiry = v.replace(/-/g, "");
      renderInputs();
      markStale();
      persist();
    }
  });
  for (const b of $("expiry-quick").querySelectorAll<HTMLButtonElement>("button")) {
    b.addEventListener("click", () => {
      const base = fromYYYYMMDD(state.expiry) ?? new Date();
      state.expiry = toYYYYMMDD(addToDate(base, b.dataset.expiryAdd!));
      renderInputs();
      markStale();
      persist();
    });
  }

  // accepted crc
  const crc = $<HTMLInputElement>("acceptedcrc");
  crc.addEventListener("input", () => {
    const v = Number(crc.value.replace(/\D/g, ""));
    if (Number.isInteger(v) && v > 0 && v <= 0xffff) {
      state.acceptedCrc = v;
      markStale();
      persist();
      renderCrcField();
    }
  });
  $<HTMLSelectElement>("acceptedcrc-list").addEventListener("change", (e) => {
    state.acceptedCrc = Number((e.target as HTMLSelectElement).value);
    markStale();
    persist();
    renderCrcField();
  });

  // actions
  $("btn-generate").addEventListener("click", generate);
  $("btn-generate-basic").addEventListener("click", generate);
  $("btn-verify").addEventListener("click", verify);
  $("basic-verify").addEventListener("click", verify);
  $("btn-extract").addEventListener("click", extractCrc);
  $("result-copy").addEventListener("click", () => void copyText(state.password));
  $("basic-copy").addEventListener("click", () => void copyText(state.password));

  // editing either password field invalidates the verdict, and keeps the two in step
  const mirrorPassword = (from: HTMLInputElement, to: HTMLInputElement) => {
    from.addEventListener("input", () => {
      to.value = from.value;
      markStale();
    });
  };
  mirrorPassword($<HTMLInputElement>("basic-password"), $<HTMLInputElement>("result-password"));
  mirrorPassword($<HTMLInputElement>("result-password"), $<HTMLInputElement>("basic-password"));

  // table panel
  $<HTMLInputElement>("dll-file").addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) void parseFile(file);
  });
  $("table-builtin").addEventListener("click", () => {
    useTable([...defaultTableFor("ge141").table], "builtin");
    $("table-status").textContent = t("table.status.builtin");
  });
  $("table-use-manual").addEventListener("click", () => {
    const values = $<HTMLTextAreaElement>("table-manual").value
      .split(/[^0-9]+/)
      .filter((s) => s.length > 0)
      .map(Number)
      .filter((v) => Number.isInteger(v) && v > 0 && v <= 0xffff);
    if (!values.length) { void t("table.status.none"); $("table-status").textContent = t("table.status.none"); return; }
    useTable(values, "manual");
    $("table-status").textContent = t("table.status.manual");
  });

  $("table-status").textContent = t("table.status.idle");
}

/* ------------------------------------------------------------------ *
 * start
 * ------------------------------------------------------------------ */

// every advanced card gets a collapsing wrapper so the Basic ⇄ Advanced switch can
// animate as a whole (grid-template-rows 1fr -> 0fr) instead of snapping.
for (const el of [...document.querySelectorAll<HTMLElement>(".adv-only")]) {
  const wrap = document.createElement("div");
  wrap.className = "adv-collapse";
  el.replaceWith(wrap);
  wrap.append(el);
}

buildEditor();
wire();
render();
