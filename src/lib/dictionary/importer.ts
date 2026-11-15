/**
 * Reusable dictionary importer: parse → map → validate → (import as batch).
 * Runs in the browser for the admin preview; the same functions run on the
 * server when the Postgres backend lands (import_batches / import_rows).
 */

import { entries, Entry, GlossLang, Pos } from "./data";
import { detectScript, normArab, normLatn } from "./normalize";

export const TARGET_FIELDS = [
  { key: "arab", label: "Headword (Arabic script)", required: true },
  { key: "latn", label: "Headword (Latin script)" },
  { key: "pos", label: "Part of speech" },
  { key: "gloss_bal", label: "Balochi definition" },
  { key: "gloss_en", label: "English meaning" },
  { key: "gloss_ur", label: "Urdu meaning" },
  { key: "gloss_brh", label: "Brahui meaning" },
  { key: "example", label: "Example (Arabic script)" },
  { key: "root", label: "Root word" },
  { key: "ipa", label: "IPA" },
  { key: "ref", label: "Source reference" },
] as const;
export type TargetKey = (typeof TARGET_FIELDS)[number]["key"];
export type Mapping = Partial<Record<TargetKey, string>>; // target → source column

export type Row = Record<string, string>;
export type Issue = { level: "error" | "warn"; code: string; msg: string };
export type Checked = { n: number; row: Row; mapped: Partial<Record<TargetKey, string>>; issues: Issue[]; dupOf?: string };

const POS: Pos[] = ["noun", "verb", "adjective", "adverb", "pronoun", "particle"];
const GLOSS: GlossLang[] = ["bal", "en", "ur", "brh"];

/* ─────────── parsing ─────────── */

export function parseCSV(text: string): Row[] {
  const rows: string[][] = [];
  let cur: string[] = [], cell = "", q = false;
  const t = text.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { cur.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      cur.push(cell); rows.push(cur); cur = []; cell = "";
    } else cell += c;
  }
  if (cell || cur.length) { cur.push(cell); rows.push(cur); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

export function parseJSON(text: string): Row[] {
  const data = JSON.parse(text);
  const arr: unknown[] = Array.isArray(data) ? data : data.entries ?? data.rows ?? [];
  return arr.map((o) => {
    const flat: Row = {};
    const walk = (v: unknown, prefix: string) => {
      if (v && typeof v === "object" && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) walk(x, prefix ? `${prefix}.${k}` : k);
      else flat[prefix] = Array.isArray(v) ? v.join("; ") : String(v ?? "");
    };
    walk(o, "");
    return flat;
  });
}

export async function parseExcel(buf: ArrayBuffer): Promise<Row[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: "", raw: false });
}

/* ─────────── mapping ─────────── */

const HINTS: Record<TargetKey, RegExp> = {
  arab: /^(arab|headword|word|balochi|bal|لبز|لفظ)(_?arab(ic)?)?$|headword\.arab/i,
  latn: /latn|latin|roman/i,
  pos: /^pos$|part.?of.?speech|type/i,
  gloss_bal: /gloss.?bal|definition|bal.?def/i,
  gloss_en: /english|gloss.?en|^en$|meaning.?en/i,
  gloss_ur: /urdu|gloss.?ur|^ur$/i,
  gloss_brh: /brahui|brahvi|brh/i,
  example: /example/i,
  root: /root/i,
  ipa: /ipa|phonetic/i,
  ref: /ref|source/i,
};

export function guessMapping(columns: string[]): Mapping {
  const m: Mapping = {};
  for (const f of TARGET_FIELDS) {
    const hit = columns.find((c) => HINTS[f.key].test(c) && !Object.values(m).includes(c));
    if (hit) m[f.key] = hit;
  }
  return m;
}

/* ─────────── validation ─────────── */

export function check(rows: Row[], mapping: Mapping, existing: Entry[] = entries): Checked[] {
  const existingKey = new Map(existing.map((e) => [normArab(e.arab), e.slug]));
  const seen = new Map<string, number>();
  return rows.map((row, i) => {
    const n = i + 2; // spreadsheet row number (header = 1)
    const mapped: Checked["mapped"] = {};
    for (const [k, col] of Object.entries(mapping)) if (col) mapped[k as TargetKey] = (row[col] ?? "").trim();
    const issues: Issue[] = [];
    let dupOf: string | undefined;

    if (!mapped.arab) issues.push({ level: "error", code: "missing_headword", msg: "No Arabic-script headword" });
    else if (detectScript(mapped.arab) !== "arab") issues.push({ level: "error", code: "wrong_script", msg: "Headword column is not in Arabic script" });
    if (mapped.latn && detectScript(mapped.latn) !== "latn") issues.push({ level: "error", code: "wrong_script_latn", msg: "Latin column holds non-Latin text" });
    if (mapped.gloss_ur && detectScript(mapped.gloss_ur) === "latn") issues.push({ level: "warn", code: "urdu_latin", msg: "Urdu meaning looks like Latin script" });
    if (mapped.pos && !POS.includes(mapped.pos.toLowerCase() as Pos)) issues.push({ level: "warn", code: "pos_unknown", msg: `Unknown part of speech “${mapped.pos}”` });

    const missing = GLOSS.filter((g) => !mapped[`gloss_${g}` as TargetKey]);
    if (missing.length === GLOSS.length) issues.push({ level: "error", code: "no_meaning", msg: "No meaning in any language" });
    else if (missing.length) issues.push({ level: "warn", code: "missing_translation", msg: `Missing: ${missing.map((g) => ({ bal: "Balochi", en: "English", ur: "Urdu", brh: "Brahui" })[g]).join(", ")}` });

    if (mapped.arab) {
      const key = normArab(mapped.arab) + "|" + (mapped.pos ?? "").toLowerCase();
      const k0 = normArab(mapped.arab);
      if (seen.has(key)) issues.push({ level: "warn", code: "dup_in_file", msg: `Duplicate of row ${seen.get(key)}` });
      else seen.set(key, n);
      if (existingKey.has(k0)) {
        dupOf = existingKey.get(k0);
        issues.push({ level: "warn", code: "dup_existing", msg: `Already in dictionary (${dupOf}) — will merge as new sense, not overwrite` });
      }
    }
    if (mapped.latn && mapped.arab && normLatn(mapped.latn).length < 1) issues.push({ level: "warn", code: "latn_empty", msg: "Latin headword empty after normalising" });
    return { n, row, mapped, issues, dupOf };
  });
}

export function summary(c: Checked[]) {
  return {
    total: c.length,
    errors: c.filter((x) => x.issues.some((i) => i.level === "error")).length,
    warnings: c.filter((x) => !x.issues.some((i) => i.level === "error") && x.issues.length).length,
    clean: c.filter((x) => x.issues.length === 0).length,
    duplicates: c.filter((x) => x.issues.some((i) => i.code.startsWith("dup"))).length,
    missingTranslations: c.filter((x) => x.issues.some((i) => i.code === "missing_translation")).length,
  };
}

/** Error report as CSV (row, level, code, message). */
export function errorReport(c: Checked[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = ["row,level,code,message"];
  for (const x of c) for (const i of x.issues) lines.push([x.n, i.level, i.code, esc(i.msg)].join(","));
  return lines.join("\n");
}

export const SAMPLE_CSV = `headword_arab,headword_latn,pos,english,urdu,brahui,balochi_definition,example,source_ref
روچ,róch,noun,sun,سورج,,,روچ درآتک,demo-1
گوات,gwát,noun,wind,ہوا,,,,demo-2
سبز,sabz,adjective,green,سبز,,,,demo-3
سبز,sabz,adjective,green,سبز,,,,demo-4
dasht,dasht,noun,desert plain,,,,,demo-5
بیابان,,noun,,,,,,demo-6`;
