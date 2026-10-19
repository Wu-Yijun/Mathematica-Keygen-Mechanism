/**
 * i18n.ts — all user-visible strings, in English and Chinese.
 *
 * The page language follows the browser on first visit and is remembered in
 * localStorage afterwards. Every static text node in index.html carries a
 * `data-i18n="key"` attribute; `applyI18n()` fills them in.
 */

export const GITHUB_BASE = "https://github.com/Wu-Yijun/Mathematica-Keygen-Mechanism";
/** Report chapters live in the repository (the deployed dist/ does not include them). */
export const DOC_BASE = `${GITHUB_BASE}/blob/main/report/`;

export type Lang = "zh" | "en";

interface Text { zh: string; en: string }

const en = (s: string): Text => ({ zh: s, en: s });

export const STRINGS: Record<string, Text> = {
  "nav.report": { zh: "逆向报告", en: "Report" },
  "nav.disclaimer": { zh: "免责声明", en: "Disclaimer" },
  "nav.mode.toAdvanced": { zh: "高级模式", en: "Advanced" },
  "nav.mode.toBasic": { zh: "基础模式", en: "Basic" },

  "agree.lead": {
    zh: "MathPass 依据 Math ID 生成与校验密码，只是一个方便本地做研究与互操作性验证的小工具。",
    en: "MathPass generates and checks passwords from a Math ID. It is a small tool for local research and interoperability work.",
  },
  "agree.body": {
    zh: "所有计算都在你的浏览器里完成，文件不会被上传；仓库不含任何厂商二进制、也不含真实许可证或可用密钥。请自行确认使用方式符合你所在地的法律与许可条款。",
    en: "Everything runs in your browser; files are never uploaded. The repository contains no vendor binaries, no real licence and no working key. You are responsible for using it in accordance with the law and licence terms that apply to you.",
  },
  "agree.b1": { zh: "我是穷学生，但我同意", en: "I'm poor student, but I agree" },
  "agree.b2": { zh: "我同意", en: "I Agree" },
  "agree.b3": { zh: "我不能再同意了", en: "I can't agree more" },
  "agree.hide": { zh: "算了，藏起来", en: "Anyhow, hide it" },

  "version.label": { zh: "Mathematica 版本", en: "Mathematica version" },
  "version.le14": { zh: "≤ 14.0.x", en: "≤ 14.0.x" },
  "version.ge141": { zh: "≥ 14.1.0", en: "≥ 14.1.0" },
  "version.note.ge141.title": { zh: "当前格式：", en: "Current format:" },
  "version.note.le14.title": { zh: "旧格式：", en: "Old format:" },
  "version.note.password": { zh: "password", en: "password" },
  "version.note.message": { zh: "消息", en: "message" },
  "version.note.actkey.ge141": {
    zh: "激活码可含数字与字母（xxxx-xxxx-aaaaaa）",
    en: "the activation key may contain digits and letters (xxxx-xxxx-aaaaaa)",
  },
  "version.note.actkey.le14": {
    zh: "激活码为 6 位数字（xxxx-xxxx-xxxxxx）",
    en: "the activation key is 6 digits (xxxx-xxxx-xxxxxx)",
  },

  "mathid.label": { zh: "Math ID", en: "Math ID" },
  "common.required": { zh: "必填", en: "required" },
  "common.idle": { zh: "待生成", en: "idle" },
  "common.clickForDocs": { zh: "点击查看文档", en: "Click for the documentation" },

  "btn.sample": { zh: "示例", en: "sample" },
  "btn.random": { zh: "随机", en: "random" },
  "btn.paste": { zh: "粘贴", en: "paste" },
  "btn.copy": { zh: "复制", en: "copy" },
  "btn.copyPassword": { zh: "复制密钥", en: "Copy password" },

  "actkey.label": { zh: "激活码", en: "Activation key" },
  "actkey.note.ge141": {
    zh: "格式 xxxx-xxxx-aaaaaa：可含数字与字母（留空则随机生成）。",
    en: "Format xxxx-xxxx-aaaaaa: digits and letters (random if left empty).",
  },
  "actkey.note.le14": {
    zh: "格式 xxxx-xxxx-xxxxxx：仅数字（留空则随机生成）。",
    en: "Format xxxx-xxxx-xxxxxx: digits only (random if left empty).",
  },

  "lc.label": { zh: "LicenseCode", en: "LicenseCode" },
  "lc.product": { zh: "产品（单选）", en: "Product (single choice)" },
  "lc.class": { zh: "许可类别（单选）", en: "Licence class (single choice)" },
  "lc.caps": { zh: "特性（可多选）", en: "Capabilities (multi-choice)" },
  "lc.product.none": { zh: "不指定（Wolfram）", en: "unspecified (Wolfram)" },
  "lc.class.none": { zh: "Professional（无类别位）", en: "Professional (no class bit)" },
  "lc.note.le14": {
    zh: "≤ 14.0 的 LicenseCode 语义未经二进制验证，此处只提供文本编辑。",
    en: "The LicenseCode semantics are only documented for ≥ 14.1; for ≤ 14.0 only the text field is offered.",
  },
  "lc.summary.product": { zh: "产品", en: "product" },
  "lc.summary.class": { zh: "类别", en: "class" },
  "lc.summary.caps": { zh: "特性", en: "capabilities" },
  "lc.summary.none": { zh: "无", en: "none" },

  "expiry.label": { zh: "到期日", en: "Expire date" },
  "expiry.add1m": { zh: "+1 月", en: "+1 month" },
  "expiry.add1y": { zh: "+1 年", en: "+1 year" },
  "expiry.add2y": { zh: "+2 年", en: "+2 years" },
  "expiry.note": { zh: "YYYYMMDD，默认今天 +1 年。", en: "YYYYMMDD; defaults to today + 1 year." },
  "expiry.note.le14": {
    zh: "≤ 14.0 的密码不含到期日，此字段不参与计算。",
    en: "Passwords of ≤ 14.0 carry no expiry date; this field is not used.",
  },

  "crc.label": { zh: "Accepted CRC", en: "Accepted CRC" },
  "crc.note.builtin": {
    zh: "当前表：内置 WolframEngine.dll v15.0.1（21 项）。",
    en: "Current table: built-in WolframEngine.dll v15.0.1 (21 entries).",
  },
  "crc.note.v14": {
    zh: "当前表：≤ 14.0 默认值 24816（该版本的完整表未经二进制验证，可在下方导入或手填）。",
    en: "Current table: default 24816 for ≤ 14.0 (that build's full table is not verified; import or type one below).",
  },
  "crc.note.file": { zh: "当前表：来自你导入的模块。", en: "Current table: imported from your module." },
  "crc.note.manual": { zh: "当前表：手动填写。", en: "Current table: typed by hand." },
  "crc.note.notInTable": {
    zh: "注意：该值不在当前表中，内核会拒绝它。",
    en: "Note: this value is not in the current table, so the kernel will reject it.",
  },

  "actions.generate": { zh: "生成密码", en: "Generate" },
  "actions.verify": { zh: "验证密码", en: "Verify" },
  "actions.extract": { zh: "提取 Accepted CRC", en: "Extract accepted CRC" },

  "basic.result.title": { zh: "结果", en: "Result" },

  "result.title": { zh: "详细结果", en: "Details" },
  "result.password": { zh: "密码", en: "password" },
  "result.kv.message": { zh: "MESSAGE", en: "MESSAGE" },
  "result.kv.version": { zh: "版本模式", en: "version mode" },
  "result.kv.n1": { zh: "n1（签名）", en: "n1 (signature)" },
  "result.kv.n2": { zh: "n2（签名）", en: "n2 (signature)" },
  "result.kv.n0": { zh: "n0 = n1 + 0x8D06", en: "n0 = n1 + 0x8D06" },
  "result.kv.condA": { zh: "条件 A（完整性）= 0", en: "condition A (integrity) = 0" },
  "result.kv.condB": { zh: "条件 B（Accepted CRC）", en: "condition B (accepted CRC)" },
  "result.kv.inTable": { zh: "属于当前表", en: "member of the table" },
  "result.kv.product": { zh: "解码产品", en: "decoded product" },
  "result.kv.class": { zh: "解码类别", en: "decoded class" },
  "result.kv.caps": { zh: "解码特性", en: "decoded capabilities" },
  "result.kv.expiry": { zh: "到期日 / 剩余天数", en: "expiry / days left" },
  "result.yes": { zh: "是", en: "yes" },
  "result.no": { zh: "否", en: "no" },
  "result.daysLeft": { zh: "剩 {n} 天", en: "{n} days left" },
  "result.expired": { zh: "已过期", en: "expired" },

  "verdict.valid": { zh: "有效", en: "valid" },
  "verdict.invalid": { zh: "无效", en: "invalid" },

  "table.title": { zh: "Accepted-CRC 表", en: "Accepted-CRC table" },
  "table.intro": {
    zh: "选择本机的 WolframEngine.dll（或任何内嵌该校验器的模块）。文件只在本地解析，不上传。",
    en: "Pick your local WolframEngine.dll (or any module embedding the same validator). The file is parsed locally and never uploaded.",
  },
  "table.builtin": { zh: "载入内置 v15.0.1 表", en: "Load built-in v15.0.1 table" },
  "table.manual.summary": { zh: "手动填写 / 粘贴", en: "Type or paste" },
  "table.manual.use": { zh: "用作当前表", en: "Use as current table" },
  "table.status.idle": { zh: "尚未解析文件。", en: "No file parsed yet." },
  "table.status.reading": { zh: "正在读取 {mb} MB…", en: "Reading {mb} MB…" },
  "table.status.scanning": { zh: "正在扫描…", en: "Scanning…" },
  "table.status.found": { zh: "找到 {n} 个候选表，其中有 {r} 个被校验器引用。", en: "Found {n} candidate table(s); {r} of them are referenced by the validator." },
  "table.status.noRefs": {
    zh: "候选表都没有被校验器引用（该模块可能把表长度存放在别处）；如确认无误可在下面手动选用。",
    en: "None of the candidates is referenced by the validator (this module may keep the length elsewhere); pick one below if you are certain.",
  },
  "table.status.none": { zh: "没有找到符合形状的候选表。", en: "No whitelist-shaped table found." },
  "table.status.picked": { zh: "已自动选用被校验器引用的那一张表。", en: "Automatically picked the table referenced by the validator." },
  "table.status.error": { zh: "读取失败：{msg}", en: "Could not read the file: {msg}" },
  "table.status.builtin": { zh: "已载入内置 v15.0.1 表。", en: "Built-in v15.0.1 table loaded." },
  "table.status.manual": { zh: "已使用手动填写的表。", en: "Using the hand-typed table." },
  "table.col.va": { zh: "VA", en: "VA" },
  "table.col.count": { zh: "数量", en: "count" },
  "table.col.refs": { zh: "代码引用", en: "code refs" },
  "table.col.values": { zh: "值", en: "values" },
  "table.use": { zh: "用作当前表", en: "Use this table" },
  "table.referenced": { zh: "被校验器引用", en: "referenced by the validator" },
  "table.unreferenced": { zh: "未引用", en: "not referenced" },
  "table.unchecked": { zh: "未检查", en: "not checked" },

  "toast.copied": { zh: "已复制。", en: "Copied." },
  "toast.copyFailed": { zh: "复制失败。", en: "Copy failed." },
  "toast.pasted": { zh: "已粘贴。", en: "Pasted." },
  "toast.pasteFailed": { zh: "无法读取剪贴板。", en: "Clipboard unavailable." },
  "toast.invalidMathId": { zh: "Math ID 格式应为 xxxx-xxxxx-xxxxx。", en: "Math ID must look like xxxx-xxxxx-xxxxx." },
  "toast.invalidActKey": { zh: "激活码格式不正确。", en: "The activation key format is wrong." },
  "toast.badLicenseCode": { zh: "LicenseCode 应该是十六进制（如 800001）。", en: "LicenseCode should be hexadecimal (e.g. 800001)." },
  "toast.generated": { zh: "已生成。", en: "Generated." },
  "toast.extracted": { zh: "已从密码中提取 Accepted CRC。", en: "Accepted CRC extracted from the password." },
  "toast.tableLoaded": { zh: "已切换当前表。", en: "Current table switched." },
  "toast.needInputs": { zh: "请先填写 Math ID、激活码与密码。", en: "Fill in the Math ID, activation key and password first." },

  "footer.text": { zh: "仅用于研究与互操作性验证；不含任何厂商二进制或可用密钥。", en: "For research and interoperability only; no vendor binaries and no working keys." },

  "tip.version": {
    zh: "控制消息与密码格式：≥14.1 带到期日，≤14.0 不带。",
    en: "Controls the message and password format: ≥ 14.1 carries an expiry date, ≤ 14.0 does not.",
  },
  "tip.mathid": {
    zh: "机器标识，MESSAGE 的第一段，也决定签名的输入。",
    en: "Machine identifier: the first part of MESSAGE and part of the input to the signature.",
  },
  "tip.actkey": {
    zh: "激活码，MESSAGE 的最后一段。",
    en: "Activation key: the last part of MESSAGE.",
  },
  "tip.licensecode": {
    zh: "十六进制位掩码：每一位代表产品 / 许可类别 / 特性。",
    en: "A hexadecimal bitmask: each bit is a product, a licence class or a capability.",
  },
  "tip.expiry": {
    zh: "到期日，位于 MESSAGE 中；它也被两个 CRC 条件覆盖。",
    en: "Expiry date, part of MESSAGE; it is covered by both CRC conditions.",
  },
  "tip.crc": {
    zh: "条件 B 要求密码的 CRC 落在所选表内。",
    en: "Condition B requires the password's CRC to land inside the selected table.",
  },
  "tip.table": {
    zh: "条件 B 的白名单表，随构建而变（默认值 59222 即取自内置的 15.0.1 表）。",
    en: "The condition-B whitelist, which is build-specific (the default 59222 comes from the built-in 15.0.1 table).",
  },
  "tip.password": {
    zh: "由 Math ID、激活码、LicenseCode、到期日与 Accepted CRC 共同决定。",
    en: "Determined by the Math ID, activation key, LicenseCode, expiry date and accepted CRC.",
  },
  "tip.verify": {
    zh: "对给定的 Math ID / 激活码 / 密码同时检查条件 A 与条件 B。",
    en: "Checks condition A and condition B for the given Math ID / activation key / password.",
  },
  "tip.extract": {
    zh: "由密码直接算出条件 B 的结果（不做任何搜索）。",
    en: "Computes the condition-B result straight from the password (no search).",
  },
};

export const DOCS: Record<string, keyof typeof STRINGS | string> = {
  version: "03-verification-flow.md",
  mathid: "03-verification-flow.md",
  actkey: "03-verification-flow.md",
  licensecode: "04-license-code.md",
  expiry: "03-verification-flow.md",
  crc: "05-accepted-crc.md",
  table: "05-accepted-crc.md",
  password: "03-verification-flow.md",
  verify: "03-verification-flow.md",
  extract: "05-accepted-crc.md",
};

let lang: Lang = "en";

export function getLang(): Lang { return lang; }

export function setLang(next: Lang): void { lang = next; }

/** Pick the initial language from the browser (zh* → Chinese, otherwise English). */
export function detectLang(): Lang {
  const list = [navigator.language, ...(navigator.languages ?? [])];
  return list.some((l) => /^zh/i.test(l ?? "")) ? "zh" : "en";
}

export function t(key: string): string {
  const s = STRINGS[key];
  if (!s) return key;
  return lang === "zh" ? s.zh : s.en;
}

/** t() with {name} placeholders replaced. */
export function tf(key: string, vars: Record<string, string | number>): string {
  return t(key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

/** Fill every [data-i18n] node below `root`. */
export function applyI18n(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n!;
    const text = t(key);
    if (el.hasAttribute("data-i18n-attr")) {
      el.setAttribute(el.getAttribute("data-i18n-attr")!, text);
    } else if (el instanceof HTMLInputElement) {
      el.placeholder = text;
    } else {
      el.textContent = text;
    }
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-tip]")) {
    el.dataset.tipText = `${t(el.dataset.tip!)} — ${t("common.clickForDocs")}`;
  }
}

export { en };
