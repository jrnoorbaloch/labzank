/**
 * Balochi Arabic ⇄ Latin script converter — DRAFT RULE SET.
 *
 * Basis: Balochi Standard Alphabet vowel letters (ۏ ݔ ے) and the Latin
 * orthography of Modern Standard Balochi (á é í ó ú · sh ch zh kh gh).
 * Retroflex ٹ ڈ are written ṭ ḍ (ڑ merged into ḍ, as in the standard alphabet).
 *
 * It is more than letter swapping:
 *   1. lexicon first — a word found in the dictionary uses its edited spelling;
 *   2. position rules — initial / medial / final و ی ا ہ behave differently;
 *   3. izafat and hamza particles (ءِ ءَ ءُ) become é / á / o;
 *   4. shadda doubles, harakat give short vowels;
 *   5. every word the rules had to guess is flagged for an editor.
 *
 * The rule table MUST be reviewed by a Balochi linguist before converted text is
 * published. Output never replaces stored originals (see the review flow).
 */

import { entries } from "./data";
import { normArab, normLatn } from "./normalize";

export type Token = { text: string; word: boolean; unsure?: boolean; fromLexicon?: boolean };
export type Result = { lines: Token[][]; text: string; unsureCount: number };

const lexArab = new Map<string, string>();
const lexLatn = new Map<string, string>();
for (const e of entries) {
  lexArab.set(normArab(e.arab), e.latn);
  lexLatn.set(normLatn(e.latn), e.arab);
}

const CONS: Record<string, string> = {
  "ب": "b", "پ": "p", "ت": "t", "ٹ": "ṭ", "ث": "s", "ج": "j", "چ": "ch", "ح": "h", "خ": "kh",
  "د": "d", "ڈ": "ḍ", "ڑ": "ḍ", "ذ": "z", "ر": "r", "ز": "z", "ژ": "zh", "س": "s", "ش": "sh",
  "ص": "s", "ض": "z", "ط": "t", "ظ": "z", "ع": "'", "غ": "gh", "ف": "f", "ق": "q", "ک": "k",
  "ك": "k", "گ": "g", "ل": "l", "م": "m", "ن": "n", "ں": "n",
};
const HARAKAT: Record<string, string> = { "َ": "a", "ِ": "e", "ُ": "o" };
const SHADDA = "ّ";
const isArabWord = (s: string) => /[\u0621-\u064A\u0671-\u06D3\u06FA-\u06FF\u0750-\u077F]/.test(s);

/* ─────────── Arabic → Latin ─────────── */

function arabWordToLatn(w: string): { out: string; unsure: boolean; lex: boolean } {
  // particles written as separate words in Balochi
  if (w === "ءِ" || w === "ئے") return { out: "é", unsure: false, lex: false };
  if (w === "ءَ") return { out: "á", unsure: false, lex: false };
  if (w === "ءُ" || w === "و") return { out: "o", unsure: false, lex: false };
  const lex = lexArab.get(normArab(w));
  if (lex) return { out: lex, unsure: false, lex: true };

  const chars = [...w.normalize("NFC")].filter((c) => c !== "ـ");
  let out = "";
  let unsure = false;
  let hadVowelSinceCons = true;
  const letters = chars.filter((c) => !HARAKAT[c] && c !== SHADDA && c !== "ْ");
  let li = -1; // index among letters

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (HARAKAT[c]) { out += HARAKAT[c]; hadVowelSinceCons = true; continue; }
    if (c === SHADDA) { const m = out.match(/(sh|ch|zh|kh|gh|[a-zṭḍ'])$/); if (m) out += m[1]; continue; }
    if (c === "ْ") continue;
    li++;
    const initial = li === 0;
    const final = li === letters.length - 1;
    const prevVowel = /[aeiouáéíóú]$/.test(out);

    if (c === "آ") { out += "á"; hadVowelSinceCons = true; continue; }
    if (c === "ا") {
      if (initial) {
        const nx = chars[i + 1];
        if (nx && HARAKAT[nx]) continue; // vowel comes from the haraka
        out += "a"; unsure = true; // initial alef: a / e / o unwritten
      } else out += "á";
      hadVowelSinceCons = true; continue;
    }
    if (c === "ۏ") { out += "ó"; hadVowelSinceCons = true; continue; }
    if (c === "و") {
      const nxt = letters[li + 1];
      if (initial || prevVowel || nxt === "ا" || nxt === "آ") out += "w";
      else { out += final ? "ú" : "ó"; unsure = true; hadVowelSinceCons = true; }
      continue;
    }
    if (c === "ؤ") { out += "au"; hadVowelSinceCons = true; continue; }
    if (c === "ݔ" || c === "ے") { out += "é"; hadVowelSinceCons = true; continue; }
    if (c === "ی" || c === "ي" || c === "ى") {
      const nxy = letters[li + 1];
      if (initial || prevVowel || nxy === "ا" || nxy === "آ") out += "y";
      else { out += "í"; if (!final) unsure = true; hadVowelSinceCons = true; }
      continue;
    }
    if (c === "ئ") { out += prevVowel ? "y" : "ay"; hadVowelSinceCons = true; continue; }
    if (c === "ء") continue;
    if (c === "ہ" || c === "ه" || c === "ھ" || c === "ە") {
      if (final && !initial && !prevVowel) { out += "a"; hadVowelSinceCons = true; }
      else out += "h";
      continue;
    }
    const cons = CONS[c];
    if (cons) {
      if (!hadVowelSinceCons && !initial && /[bcdfghjklmnpqrstvwxzṭḍ]$/.test(out)) unsure = true;
      out += cons;
      hadVowelSinceCons = false;
      continue;
    }
    out += c;
  }
  // a word made only of consonants certainly lost its short vowels
  if (!/[aeiouáéíóú]/.test(out)) unsure = true;
  return { out, unsure, lex: false };
}

/* ─────────── Latin → Arabic ─────────── */

const L2A: [RegExp, string][] = [
  [/^sh/, "ش"], [/^ch/, "چ"], [/^zh/, "ژ"], [/^kh/, "خ"], [/^gh/, "غ"],
  [/^ṭ/, "ٹ"], [/^ḍ/, "ڈ"], [/^b/, "ب"], [/^p/, "پ"], [/^t/, "ت"], [/^j/, "ج"], [/^d/, "د"],
  [/^r/, "ر"], [/^z/, "ز"], [/^s/, "س"], [/^f/, "ف"], [/^q/, "ق"], [/^k/, "ک"], [/^g/, "گ"],
  [/^l/, "ل"], [/^m/, "م"], [/^n/, "ن"], [/^h/, "ہ"], [/^w/, "و"], [/^y/, "ی"], [/^'/, "ع"],
  [/^c/, "چ"], [/^x/, "خ"], [/^v/, "و"],
];

function latnWordToArab(w: string): { out: string; unsure: boolean; lex: boolean } {
  const lower = w.toLowerCase();
  if (lower === "é" || lower === "e") return { out: "ءِ", unsure: lower === "e", lex: false };
  if (lower === "á") return { out: "ءَ", unsure: false, lex: false };
  if (lower === "o") return { out: "ءُ", unsure: false, lex: false };
  const lex = lexLatn.get(normLatn(w));
  if (lex) return { out: lex, unsure: false, lex: true };

  let s = lower.normalize("NFC");
  let out = "";
  let unsure = false;
  let first = true;
  while (s.length) {
    const ch = s[0];
    const last = s.length === 1;
    // vowels
    if ("áa".includes(ch) && ch === "á") { out += first ? "آ" : "ا"; s = s.slice(1); first = false; continue; }
    if (ch === "a") { if (first) out += "اَ"; else if (last) out += "ہ"; else unsure = true; s = s.slice(1); first = false; continue; }
    if (ch === "e") { if (first) out += "اِ"; else if (last) out += "ہ"; else unsure = true; s = s.slice(1); first = false; continue; }
    if (ch === "o") { if (first) out += "اُ"; else unsure = true; s = s.slice(1); first = false; continue; }
    if (ch === "i") { out += first ? "اِ" : last ? "ی" : ""; unsure = true; s = s.slice(1); first = false; continue; }
    if (ch === "u") { out += first ? "اُ" : last ? "و" : ""; unsure = true; s = s.slice(1); first = false; continue; }
    if (ch === "é") { out += first ? "اے" : last ? "ے" : "ی"; s = s.slice(1); first = false; continue; }
    if (ch === "í") { out += first ? "ای" : "ی"; s = s.slice(1); first = false; continue; }
    if (ch === "ó") { out += first ? "او" : "و"; s = s.slice(1); first = false; continue; }
    if (ch === "ú") { out += first ? "او" : "و"; s = s.slice(1); first = false; continue; }
    const rule = L2A.find(([re]) => re.test(s));
    if (rule) {
      const m = s.match(rule[0])![0];
      out += rule[1];
      s = s.slice(m.length);
      // doubled consonant → shadda
      if (s.startsWith(m)) { out += SHADDA; s = s.slice(m.length); }
      first = false;
      continue;
    }
    out += ch;
    s = s.slice(1);
    first = false;
  }
  return { out, unsure, lex: false };
}

/* ─────────── public API ─────────── */

function convert(text: string, dir: "a2l" | "l2a"): Result {
  let unsureCount = 0;
  const lines = text.split("\n").map((line) => {
    const parts = line.split(/(\s+|[.,!?؟،۔:;"“”()\[\]«»\-—]+)/u).filter((p) => p !== "");
    const toks: Token[] = parts.map((p) => {
      const isWord = dir === "a2l" ? isArabWord(p) : /[A-Za-zÀ-ɏḀ-ỿ']/.test(p);
      if (!isWord) {
        const punct = dir === "a2l" ? p.replace(/،/g, ",").replace(/؟/g, "?").replace(/۔/g, ".") : p.replace(/,/g, "،").replace(/\?/g, "؟").replace(/\./g, "۔");
        return { text: punct, word: false };
      }
      const r = dir === "a2l" ? arabWordToLatn(p) : latnWordToArab(p);
      if (r.unsure) unsureCount++;
      return { text: r.out, word: true, unsure: r.unsure, fromLexicon: r.lex };
    });
    // sentence-initial capital for Latin output
    if (dir === "a2l") {
      const firstWord = toks.find((t) => t.word);
      if (firstWord) firstWord.text = firstWord.text.charAt(0).toUpperCase() + firstWord.text.slice(1);
    }
    return toks;
  });
  return { lines, text: lines.map((l) => l.map((t) => t.text).join("")).join("\n"), unsureCount };
}

export const arabToLatn = (t: string) => convert(t, "a2l");
export const latnToArab = (t: string) => convert(t, "l2a");
