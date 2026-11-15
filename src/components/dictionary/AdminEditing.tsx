"use client";

/**
 * Dictionary editing screens (Supabase only):
 *   WordList · WordEditor · ReviewQueue · WotdScheduler · Duplicates · Sources
 * All writes go through the RPCs in supabase/migrations/…_editing.sql,
 * which enforce roles and the Draft → Pending review → Verified → Published flow.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/db/client";
import { arabToLatn } from "@/lib/dictionary/translit";
import { page } from "@/lib/links";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;
type Status = "draft" | "imported" | "pending_review" | "verified" | "published" | "rejected";
const LANGS = [
  ["bal", "Balochi definition", "rtl"],
  ["en", "English", "ltr"],
  ["ur", "Urdu", "rtl"],
  ["brh", "Brahui", "ltr"],
] as const;
const POS = ["noun", "verb", "adjective", "adverb", "pronoun", "particle"];
const REL = ["synonym", "antonym", "see_also", "derived", "variant"];

/* ─────────────────────────── shared ─────────────────────────── */

export function toast(msg: string, kind: "error" | "ok" = "error") {
  if (kind === "error") console.error(msg);
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] rounded-xl px-5 py-3 text-[14px] shadow-2xl ${kind === "error" ? "bg-[var(--rust)] text-white" : "bg-[var(--gold)] text-[var(--ink)]"}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), kind === "error" ? 6000 : 2500);
}

async function rpc<T = AnyRow>(fn: string, args: AnyRow = {}): Promise<T | null> {
  const { data, error } = await supabase!.rpc(fn, args);
  if (error) {
    toast(error.message);
    return null;
  }
  return data as T;
}

export function StatusChip({ s }: { s: string }) {
  const tone: Record<string, string> = {
    draft: "border-black/15 text-[var(--dim)]",
    imported: "border-sky-400/40 text-sky-300",
    pending_review: "border-amber-400/50 text-amber-700",
    verified: "border-emerald-400/50 text-emerald-700",
    published: "border-[var(--gold)] text-[var(--gold-bright)]",
    rejected: "border-[var(--rust)] text-[var(--rust)]",
  };
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] ${tone[s] ?? ""}`}>{s.replace("_", " ")}</span>;
}

const inputCls = "w-full rounded-lg border border-[var(--faint)] bg-white px-3 py-2 outline-none focus:border-[var(--gold)]/60";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-[13px]">
      <span className="mb-1 block text-[var(--dim)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[var(--dim)]/70">{hint}</span>}
    </label>
  );
}

/** search-as-you-type word picker (returns a slug) */
function WordPicker({ onPick, placeholder = "Find a word…", exclude }: { onPick: (w: AnyRow) => void; placeholder?: string; exclude?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<AnyRow[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!q.trim()) return setHits([]);
    const id = setTimeout(async () => {
      const r = await rpc<{ rows: AnyRow[] }>("dict_admin_list", { q, lim: 8, off: 0 });
      setHits((r?.rows ?? []).filter((w) => w.slug !== exclude));
    }, 200);
    return () => clearTimeout(id);
  }, [q, exclude]);
  return (
    <div className="relative">
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} className={inputCls} />
      {open && hits.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--faint)] bg-[var(--ink-2)] p-1 shadow-2xl">
          {hits.map((w) => (
            <button key={w.slug} type="button" onClick={() => { onPick(w); setQ(""); setOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-1.5 text-start hover:bg-[var(--ink-2)]">
              <span><span lang="bal" className="me-2 text-[17px]">{w.arab}</span><span className="italic text-[var(--gold-bright)]">{w.latn}</span></span>
              <StatusChip s={w.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── word list ─────────────────────────── */

const FILTERS: (Status | "")[] = ["", "draft", "imported", "pending_review", "verified", "published", "rejected"];

export function WordList({ initialStatus = "" }: { initialStatus?: Status | "" }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "">(initialStatus);
  const [off, setOff] = useState(0);
  const [data, setData] = useState<{ total: number; rows: AnyRow[] }>({ total: 0, rows: [] });
  const [loading, setLoading] = useState(true);
  const LIM = 50;
  useEffect(() => {
    const id = setTimeout(async () => {
      setLoading(true);
      const r = await rpc<{ total: number; rows: AnyRow[] }>("dict_admin_list", { q, p_status: status || null, lim: LIM, off });
      if (r) setData(r);
      setLoading(false);
    }, 200);
    return () => clearTimeout(id);
  }, [q, status, off]);
  useEffect(() => setOff(0), [q, status]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Manage words</h1>
          <p className="mt-1 text-[14px] text-[var(--dim)]">{data.total} words{status && ` · ${status.replace("_", " ")}`}</p>
        </div>
        <a href="#add" className="pill pill-gold">+ Add new word</a>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Arabic or Latin headword…" className={`${inputCls} max-w-[340px]`} />
        {FILTERS.map((f) => (
          <button key={f || "all"} className={`chip ${status === f ? "on" : ""}`} onClick={() => setStatus(f)}>{f ? f.replace("_", " ") : "All"}</button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-[14px]">
          <thead className="text-[12px] text-[var(--dim)]">
            <tr>{["Headword", "Latin", "Meanings", "Languages", "Status", "Updated", ""].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.rows.map((w) => (
              <tr key={w.slug} className="cursor-pointer border-t border-[var(--faint)] hover:bg-[var(--ink-2)]" onClick={() => (location.hash = `edit-${w.slug}`)}>
                <td className="px-4 py-2.5"><span lang="bal" className="text-[19px]">{w.arab}</span></td>
                <td className="px-4 py-2.5 italic text-[var(--gold-bright)]">{w.latn}</td>
                <td className="px-4 py-2.5">{w.senses}</td>
                <td className="px-4 py-2.5">
                  {["bal", "en", "ur", "brh"].map((l) => (
                    <span key={l} className={`me-1 inline-block rounded px-1.5 text-[10px] uppercase ${w.langs.includes(l) ? "bg-[var(--gold)]/20 text-[var(--gold-bright)]" : "bg-[var(--ink-2)] text-[var(--dim)]/50 line-through"}`}>{l}</span>
                  ))}
                </td>
                <td className="px-4 py-2.5"><StatusChip s={w.status} /></td>
                <td className="px-4 py-2.5 text-[12px] text-[var(--dim)]">{new Date(w.updated).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-2.5 text-end text-[var(--gold)]">Edit →</td>
              </tr>
            ))}
            {!loading && data.rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-[var(--dim)]">No words match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data.total > LIM && (
        <div className="mt-4 flex items-center gap-3 text-[13px]">
          <button className="chip" disabled={off === 0} onClick={() => setOff(Math.max(0, off - LIM))}>← Previous</button>
          <span className="text-[var(--dim)]">{off + 1}–{Math.min(off + LIM, data.total)} of {data.total}</span>
          <button className="chip" disabled={off + LIM >= data.total} onClick={() => setOff(off + LIM)}>Next →</button>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── word editor ─────────────────────────── */

type Ex = { arab: string; latn: string; en: string; ur: string };
type Sense = { pos: string; gloss: Record<string, string>; gloss_status?: Record<string, string>; imported?: boolean; examples: Ex[] };
type Form = {
  slug?: string; arab: string; latn: string; word_type: string; root: string; ipa: string; syllables: string;
  editor_notes: string; senses: Sense[]; relations: { type: string; to: string; arab?: string }[];
};
const emptySense = (): Sense => ({ pos: "noun", gloss: {}, examples: [] });
const emptyForm = (): Form => ({ arab: "", latn: "", word_type: "simple", root: "", ipa: "", syllables: "", editor_notes: "", senses: [emptySense()], relations: [] });

export function WordEditor({ slug, roles }: { slug?: string; roles: string[] }) {
  const [form, setForm] = useState<Form>(emptyForm());
  const [meta, setMeta] = useState<AnyRow | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState("");
  const [armDelete, setArmDelete] = useState(false);
  const has = (...r: string[]) => roles.includes("super_admin") || r.some((x) => roles.includes(x));
  const canStructure = has("dict_admin", "dict_linguist", "admin", "editor");
  const canDelete = has("dict_admin", "admin");

  const load = useCallback(async (s: string) => {
    setLoading(true);
    const e = await rpc<AnyRow>("dict_admin_get", { p_slug: s });
    setLoading(false);
    if (!e) return;
    setMeta(e);
    setForm({
      slug: e.slug, arab: e.arab, latn: e.latn ?? "", word_type: e.type ?? "simple", root: e.root ?? "",
      ipa: e.ipa ?? "", syllables: (e.syllables ?? []).join(" · "), editor_notes: e.editor_notes ?? "",
      senses: (e.senses ?? []).map((x: AnyRow) => ({
        pos: x.pos, gloss: x.gloss ?? {}, gloss_status: x.gloss_status ?? {}, imported: x.imported,
        examples: (x.examples ?? []).map((y: AnyRow) => ({ arab: y.arab ?? "", latn: y.latn ?? "", en: y.en ?? "", ur: y.ur ?? "" })),
      })),
      relations: (e.relations ?? []).map((r: AnyRow) => ({ type: r.type, to: r.to, arab: r.arab })),
    });
    setDirty(false);
  }, []);

  useEffect(() => {
    if (slug) load(slug);
    else {
      setForm(emptyForm());
      setMeta(null);
      setLoading(false);
    }
  }, [slug, load]);

  // warn before leaving with unsaved edits
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = (patch: Partial<Form>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };
  const setSense = (i: number, patch: Partial<Sense>) => set({ senses: form.senses.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const moveSense = (i: number, d: -1 | 1) => {
    const s = [...form.senses];
    const j = i + d;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    set({ senses: s });
  };

  const save = async () => {
    if (!form.arab.trim()) return toast("The Arabic-script headword is required.");
    if (!form.senses.some((s) => Object.values(s.gloss).some((v) => v?.trim()))) return toast("Add at least one meaning.");
    setSaving(true);
    const payload = {
      ...form,
      latn: form.latn.trim(),
      editor_notes: form.editor_notes.trim() || null, // empty ≠ changed: keeps the history clean
      syllables: form.syllables.split(/[·.\s,-]+/).map((x) => x.trim()).filter(Boolean),
      senses: form.senses.map((s) => ({ pos: s.pos, gloss: s.gloss, examples: s.examples.filter((x) => x.arab.trim()) })),
      relations: form.relations.map((r) => ({ type: r.type, to: r.to })),
    };
    const r = await rpc<{ slug: string; created: boolean }>("dict_save_entry", { p: payload });
    setSaving(false);
    if (!r) return;
    toast(r.created ? "Word created as draft" : "Saved", "ok");
    setDirty(false);
    if (r.created || r.slug !== slug) location.hash = `edit-${r.slug}`;
    else load(r.slug);
  };

  const setStatus = async (s: Status) => {
    if (dirty) return toast("Save your changes first.");
    const r = await rpc("dict_set_status", { p_slug: form.slug, p_status: s, p_note: note || null });
    if (r) {
      toast(`Status: ${s.replace("_", " ")}`, "ok");
      setNote("");
      load(form.slug!);
    }
  };

  const del = async () => {
    if (!armDelete) {
      setArmDelete(true);
      setTimeout(() => setArmDelete(false), 4000);
      return;
    }
    const { error } = await supabase!.rpc("dict_delete_entry", { p_slug: form.slug });
    if (error) return toast(error.message);
    toast("Word deleted", "ok");
    location.hash = "words";
  };

  if (loading) return <p className="text-[var(--dim)]">Loading…</p>;
  if (slug && !meta) return <p className="text-[var(--dim)]">Word not found. <a href="#words" className="text-[var(--gold)]">Back to the list</a></p>;

  const status = (meta?.status_raw ?? "draft") as Status;
  const actions: { to: Status; label: string; show: boolean; tone?: string }[] = [
    { to: "pending_review", label: "Send to review", show: ["draft", "imported", "rejected"].includes(status) },
    { to: "verified", label: "Verify (linguist)", show: ["draft", "imported", "pending_review"].includes(status) && has("dict_admin", "dict_linguist", "admin") },
    { to: "published", label: "Publish", show: status === "verified" && has("dict_admin", "dict_reviewer", "admin"), tone: "gold" },
    { to: "rejected", label: "Reject", show: status !== "rejected" && has("dict_admin", "dict_linguist", "dict_reviewer", "admin"), tone: "rust" },
    { to: "draft", label: "Back to draft", show: ["rejected", "published", "verified"].includes(status) && has("dict_admin", "dict_linguist", "admin", "editor") },
  ];

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <a href="#words" className="text-[13px] text-[var(--dim)] hover:text-[var(--text)]">← All words</a>
        <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold tracking-tight">{slug ? "Edit word" : "Add new word"}</h1>
          {meta && <StatusChip s={status} />}
          {meta && <span className="text-[12px] text-[var(--dim)]">{meta.id} · v{meta.version}</span>}
          {dirty && <span className="text-[12px] text-amber-700">Unsaved changes</span>}
        </div>
        {!canStructure && <p className="card mb-4 p-4 text-[13px] text-[var(--dim)]">Translator access: you can change the meanings of existing senses. Headword, senses, examples and relations are read-only for you.</p>}

        {/* headword */}
        <section className="card mb-5 grid gap-4 p-5 md:grid-cols-2">
          <Field label="Headword — Arabic script *">
            <input value={form.arab} disabled={!canStructure} onChange={(e) => set({ arab: e.target.value })} dir="rtl" lang="bal" className={`${inputCls} text-[22px]`} />
          </Field>
          <Field label="Headword — Latin script" hint="The converter suggests a spelling; an editor must confirm it.">
            <div className="flex gap-2">
              <input value={form.latn} disabled={!canStructure} onChange={(e) => set({ latn: e.target.value })} dir="ltr" className={`${inputCls} italic`} />
              <button type="button" disabled={!canStructure || !form.arab} className="chip shrink-0" onClick={() => set({ latn: arabToLatn(form.arab).text.toLowerCase() })}>Suggest</button>
            </div>
          </Field>
          <Field label="Word type">
            <select value={form.word_type} disabled={!canStructure} onChange={(e) => set({ word_type: e.target.value })} className={inputCls}>
              {["simple", "derived", "compound", "phrase", "loan"].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Root word">
            {form.root ? (
              <div className="flex items-center gap-2">
                <span className="chip on">{form.root}</span>
                {canStructure && <button type="button" className="text-[12px] text-[var(--dim)]" onClick={() => set({ root: "" })}>remove</button>}
              </div>
            ) : canStructure ? (
              <WordPicker exclude={form.slug} onPick={(w) => set({ root: w.slug })} placeholder="Search the root word…" />
            ) : <span className="text-[var(--dim)]">—</span>}
          </Field>
          <Field label="Pronunciation (IPA)">
            <input value={form.ipa} disabled={!canStructure} onChange={(e) => set({ ipa: e.target.value })} dir="ltr" placeholder="/ɑːp/" className={inputCls} />
          </Field>
          <Field label="Syllables" hint="Separate with · or spaces">
            <input value={form.syllables} disabled={!canStructure} onChange={(e) => set({ syllables: e.target.value })} dir="ltr" placeholder="ke · táb" className={inputCls} />
          </Field>
        </section>

        {/* senses */}
        <h2 className="mb-3 text-[16px] font-semibold">Meanings</h2>
        {form.senses.map((s, i) => (
          <section key={i} className="card mb-4 p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="text-[22px] font-semibold text-[var(--gold)]">{i + 1}</span>
              <select value={s.pos} disabled={!canStructure} onChange={(e) => setSense(i, { pos: e.target.value })} className={`${inputCls} w-auto`}>
                {POS.map((p) => <option key={p}>{p}</option>)}
              </select>
              {s.imported && <span className="rounded-full border border-sky-400/40 px-2 py-0.5 text-[11px] text-sky-300">from import — hidden until verified</span>}
              {canStructure && (
                <span className="ms-auto flex gap-1">
                  <button type="button" className="chip" onClick={() => moveSense(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className="chip" onClick={() => moveSense(i, 1)} disabled={i === form.senses.length - 1}>↓</button>
                  <button type="button" className="chip" disabled={form.senses.length === 1} onClick={() => set({ senses: form.senses.filter((_, j) => j !== i) })}>Remove</button>
                </span>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {LANGS.map(([l, label, dir]) => (
                <Field key={l} label={`${label}${s.gloss_status?.[l] ? ` · ${s.gloss_status[l]}` : ""}`}>
                  <textarea
                    rows={2}
                    value={s.gloss[l] ?? ""}
                    onChange={(e) => setSense(i, { gloss: { ...s.gloss, [l]: e.target.value } })}
                    dir={dir}
                    lang={l === "bal" ? "bal" : l}
                    placeholder={s.gloss[l] ? "" : "not yet translated"}
                    className={`${inputCls} ${dir === "rtl" ? "text-[17px]" : ""}`}
                  />
                </Field>
              ))}
            </div>
            <div className="mt-4">
              <p className="mb-2 text-[12px] text-[var(--dim)]">Examples</p>
              {s.examples.map((x, k) => (
                <div key={k} className="mb-2 grid gap-2 rounded-lg border border-[var(--faint)] p-2 md:grid-cols-2">
                  {(["arab", "latn", "en", "ur"] as const).map((f) => (
                    <input
                      key={f}
                      value={x[f]}
                      disabled={!canStructure}
                      onChange={(e) => setSense(i, { examples: s.examples.map((y, m) => (m === k ? { ...y, [f]: e.target.value } : y)) })}
                      placeholder={{ arab: "Balochi sentence (Arabic script)", latn: "Latin script", en: "English translation", ur: "Urdu translation" }[f]}
                      dir={f === "arab" || f === "ur" ? "rtl" : "ltr"}
                      className={inputCls}
                    />
                  ))}
                  {canStructure && <button type="button" className="justify-self-start text-[12px] text-[var(--dim)] hover:text-[var(--rust)]" onClick={() => setSense(i, { examples: s.examples.filter((_, m) => m !== k) })}>Remove example</button>}
                </div>
              ))}
              {canStructure && <button type="button" className="chip" onClick={() => setSense(i, { examples: [...s.examples, { arab: "", latn: "", en: "", ur: "" }] })}>+ Example</button>}
            </div>
          </section>
        ))}
        {canStructure && <button type="button" className="chip mb-6" onClick={() => set({ senses: [...form.senses, emptySense()] })}>+ Another meaning</button>}

        {/* relations */}
        <h2 className="mb-3 text-[16px] font-semibold">Related words</h2>
        <section className="card mb-5 p-5">
          {form.relations.length === 0 && <p className="mb-3 text-[13px] text-[var(--dim)]">None yet.</p>}
          {form.relations.map((r, i) => (
            <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
              <select value={r.type} disabled={!canStructure} onChange={(e) => set({ relations: form.relations.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) })} className={`${inputCls} w-auto`}>
                {REL.map((t) => <option key={t}>{t}</option>)}
              </select>
              <span className="chip on">{r.arab && <span lang="bal" className="me-1">{r.arab}</span>}{r.to}</span>
              {canStructure && <button type="button" className="text-[12px] text-[var(--dim)] hover:text-[var(--rust)]" onClick={() => set({ relations: form.relations.filter((_, j) => j !== i) })}>remove</button>}
            </div>
          ))}
          {canStructure && (
            <div className="mt-3 max-w-[360px]">
              <WordPicker exclude={form.slug} placeholder="+ Link a related word…" onPick={(w) => set({ relations: [...form.relations, { type: "see_also", to: w.slug, arab: w.arab }] })} />
            </div>
          )}
        </section>

        <Field label="Editor notes (internal)">
          <textarea rows={3} value={form.editor_notes} disabled={!canStructure} onChange={(e) => set({ editor_notes: e.target.value })} className={inputCls} />
        </Field>

        <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--faint)] bg-[var(--ink)]/95 py-4 backdrop-blur">
          <button className="pill pill-gold disabled:opacity-50" disabled={saving} onClick={save}>{saving ? "Saving…" : slug ? "Save changes" : "Create word"}</button>
          {slug && canDelete && (
            <button className={`chip ${armDelete ? "!border-[var(--rust)] !text-[var(--rust)]" : ""}`} onClick={del}>
              {armDelete ? "Click again to delete permanently" : "Delete word"}
            </button>
          )}
          {slug && status !== "imported" && status !== "rejected" && (
            <a href={page("dictionary", `word-${form.slug}`)} target="_blank" rel="noreferrer" className="text-[13px] text-[var(--dim)] hover:text-[var(--text)]">View on site ↗</a>
          )}
          {slug && ["verified", "published"].includes(status) && <span className="text-[12px] text-[var(--dim)]">Saving a change sends this word back to review.</span>}
        </div>
      </div>

      {/* side panel: workflow + history */}
      {slug && meta && (
        <aside className="flex flex-col gap-5">
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Review</h3>
            <div className="mb-3 flex items-center gap-2 text-[13px]">Current: <StatusChip s={status} /></div>
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the next reviewer (optional)" className={`${inputCls} mb-3 text-[13px]`} />
            <div className="flex flex-wrap gap-2">
              {actions.filter((a) => a.show).map((a) => (
                <button key={a.to} onClick={() => setStatus(a.to)} className={a.tone === "gold" ? "pill pill-gold !px-4 !py-1.5 text-[13px]" : `chip ${a.tone === "rust" ? "hover:!border-[var(--rust)] hover:!text-[var(--rust)]" : ""}`}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-[var(--dim)]">Verify → a linguist. Publish → a different reviewer (Super Admin may do both).</p>
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Decisions</h3>
            {(meta.reviews ?? []).length === 0 && <p className="text-[13px] text-[var(--dim)]">None yet.</p>}
            <ul className="flex flex-col gap-2 text-[13px]">
              {(meta.reviews ?? []).map((r: AnyRow, i: number) => (
                <li key={i} className="border-b border-[var(--faint)] pb-2">
                  <span className={r.decision === "approve" ? "text-emerald-700" : r.decision === "reject" ? "text-[var(--rust)]" : "text-amber-700"}>{r.decision.replace("_", " ")}</span>
                  <span className="text-[var(--dim)]"> · {r.stage} · {r.by ?? "?"} · {new Date(r.at).toLocaleString("en-GB")}</span>
                  {r.note && <p className="mt-0.5 text-[var(--text)]/80">“{r.note}”</p>}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="mb-3 font-semibold">Change history</h3>
            {(meta.history ?? []).length === 0 && <p className="text-[13px] text-[var(--dim)]">No edits recorded yet.</p>}
            <ul className="flex flex-col gap-2 text-[12px]">
              {(meta.history ?? []).map((h: AnyRow, i: number) => (
                <li key={i} className="border-b border-[var(--faint)] pb-2">
                  <span className="text-[var(--dim)]">{new Date(h.at).toLocaleString("en-GB")} · {h.by ?? "system"}</span>
                  {h.entity === "gloss" ? (
                    <p><span className="uppercase text-[var(--gold)]">{h.diff.lang}</span> <span className="line-through opacity-60">{h.diff.before}</span> → {h.diff.after}</p>
                  ) : (
                    <p>{h.diff.before?.status !== h.diff.after?.status ? `status ${h.diff.before?.status} → ${h.diff.after?.status}` : `headword ${h.diff.before?.latn ?? ""} → ${h.diff.after?.latn ?? ""}`}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}

/* ─────────────────────────── review queue ─────────────────────────── */

export function ReviewQueue({ roles }: { roles: string[] }) {
  const tabs: [Status, string][] = [["pending_review", "Awaiting review"], ["imported", "Imported"], ["draft", "Drafts"], ["verified", "Ready to publish"]];
  const [tab, setTab] = useState<Status>("pending_review");
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const has = (...r: string[]) => roles.includes("super_admin") || r.some((x) => roles.includes(x));
  const refresh = useCallback(async () => {
    const r = await rpc<{ rows: AnyRow[] }>("dict_admin_list", { p_status: tab, lim: 100, off: 0 });
    setRows(r?.rows ?? []);
    const c: Record<string, number> = {};
    for (const [s] of tabs) c[s] = (await rpc<{ total: number }>("dict_admin_list", { p_status: s, lim: 1, off: 0 }))?.total ?? 0;
    setCounts(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  useEffect(() => { refresh(); }, [refresh]);
  const act = async (slug: string, to: Status) => {
    const r = await rpc("dict_set_status", { p_slug: slug, p_status: to });
    if (r) { toast(`${slug}: ${to.replace("_", " ")}`, "ok"); refresh(); }
  };
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Review queue</h1>
      <p className="mb-6 mt-1 max-w-[70ch] text-[14px] text-[var(--dim)]">Linguistic verification and translation review. A word goes public only after a linguist verifies it and a second person publishes it.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([s, label]) => (
          <button key={s} className={`chip ${tab === s ? "on" : ""}`} onClick={() => setTab(s)}>{label} <span className="opacity-70">({counts[s] ?? "…"})</span></button>
        ))}
      </div>
      <div className="card divide-y divide-[var(--faint)]">
        {rows.length === 0 && <p className="p-8 text-center text-[var(--dim)]">Nothing here.</p>}
        {rows.map((w) => (
          <div key={w.slug} className="flex flex-wrap items-center gap-4 px-5 py-3">
            <a href={`#edit-${w.slug}`} className="min-w-[200px] flex-1">
              <span lang="bal" className="me-3 text-[20px]">{w.arab}</span>
              <span className="italic text-[var(--gold-bright)]">{w.latn}</span>
              <span className="ms-3 text-[12px] text-[var(--dim)]">{w.langs.join(", ") || "no meanings"} · {w.source}</span>
            </a>
            <div className="flex flex-wrap gap-2">
              <a href={`#edit-${w.slug}`} className="chip">Open</a>
              {tab !== "verified" && tab !== "pending_review" && <button className="chip" onClick={() => act(w.slug, "pending_review")}>Send to review</button>}
              {tab !== "verified" && has("dict_admin", "dict_linguist", "admin") && <button className="chip" onClick={() => act(w.slug, "verified")}>Verify</button>}
              {tab === "verified" && has("dict_admin", "dict_reviewer", "admin") && <button className="pill pill-gold !px-4 !py-1 text-[13px]" onClick={() => act(w.slug, "published")}>Publish</button>}
              {has("dict_admin", "dict_linguist", "dict_reviewer", "admin") && <button className="chip hover:!border-[var(--rust)] hover:!text-[var(--rust)]" onClick={() => act(w.slug, "rejected")}>Reject</button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────── word of the day ─────────────────────────── */

export function WotdScheduler() {
  const days = Array.from({ length: 21 }, (_, i) => new Date(Date.now() + i * 864e5).toISOString().slice(0, 10));
  const [map, setMap] = useState<Record<string, AnyRow>>({});
  const [picking, setPicking] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const { data, error } = await supabase!
      .from("dict_word_of_day")
      .select("day, entry_id, dict_entries(slug, headword_arab, headword_latn, status)")
      .gte("day", days[0]).lte("day", days[days.length - 1]);
    if (error) return toast(error.message);
    setMap(Object.fromEntries((data ?? []).map((r: AnyRow) => [r.day, r.dict_entries])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const assign = async (day: string, slug: string) => {
    const { data: e, error } = await supabase!.from("dict_entries").select("id").eq("slug", slug).single();
    if (error || !e) return toast(error?.message ?? "word not found");
    const { error: e2 } = await supabase!.from("dict_word_of_day").upsert({ day, entry_id: e.id, featured_on_home: true });
    if (e2) return toast(e2.message);
    setPicking(null);
    refresh();
  };
  const clear = async (day: string) => {
    const { error } = await supabase!.from("dict_word_of_day").delete().eq("day", day);
    if (error) return toast(error.message);
    refresh();
  };
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Word of the Day</h1>
      <p className="mb-6 mt-1 text-[14px] text-[var(--dim)]">Schedule the next three weeks. A day with no word shows a rotating pick. The homepage and the dictionary both show it.</p>
      <div className="card divide-y divide-[var(--faint)]">
        {days.map((d, i) => {
          const w = map[d];
          return (
            <div key={d} className="flex flex-wrap items-center gap-4 px-5 py-2.5 text-[14px]">
              <span className={`w-[150px] ${i === 0 ? "font-semibold text-[var(--gold)]" : "text-[var(--dim)]"}`}>
                {new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}{i === 0 && " · today"}
              </span>
              <span className="min-w-[180px] flex-1">
                {w ? (<><span lang="bal" className="me-2 text-[19px]">{w.headword_arab}</span><span className="italic text-[var(--gold-bright)]">{w.headword_latn}</span>{w.status !== "published" && <span className="ms-2"><StatusChip s={w.status} /></span>}</>) : <span className="text-[var(--dim)]/60">auto (rotating)</span>}
              </span>
              {picking === d ? (
                <span className="w-[300px]"><WordPicker onPick={(x) => assign(d, x.slug)} placeholder="Search a word…" /></span>
              ) : (
                <span className="flex gap-2">
                  <button className="chip" onClick={() => setPicking(d)}>{w ? "Change" : "Choose"}</button>
                  {w && <button className="chip" onClick={() => clear(d)}>Clear</button>}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─────────────────────────── duplicates ─────────────────────────── */

export function Duplicates() {
  const [groups, setGroups] = useState<AnyRow[] | null>(null);
  useEffect(() => { rpc<AnyRow[]>("dict_duplicates").then((g) => setGroups(g ?? [])); }, []);
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Duplicates</h1>
      <p className="mb-6 mt-1 text-[14px] text-[var(--dim)]">Headwords spelled the same once letter variants and diacritics are ignored. Merge them by copying meanings into one word, then delete the other.</p>
      {groups === null ? <p className="text-[var(--dim)]">Loading…</p> : groups.length === 0 ? <p className="card p-8 text-center text-[var(--dim)]">No duplicates found.</p> : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <div key={g.norm} className="card p-4">
              <p className="mb-2 text-[12px] text-[var(--dim)]">normalised: <span lang="bal" className="text-[16px] text-[var(--text)]">{g.norm}</span></p>
              <div className="flex flex-wrap gap-2">
                {g.words.map((w: AnyRow) => (
                  <a key={w.slug} href={`#edit-${w.slug}`} className="chip flex items-center gap-2">
                    <span lang="bal">{w.arab}</span><span className="italic">{w.latn}</span><StatusChip s={w.status} /><span className="text-[10px] opacity-60">{w.source}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── sources ─────────────────────────── */

export function Sources() {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [edit, setEdit] = useState<AnyRow | null>(null);
  const refresh = useCallback(async () => {
    const { data, error } = await supabase!.from("dict_sources").select("*").order("created_at");
    if (error) return toast(error.message);
    setRows(data ?? []);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const save = async () => {
    if (!edit?.licence?.trim() || !edit?.attribution?.trim()) return toast("Licence and attribution are required.");
    const { error } = await supabase!.from("dict_sources").update({ name: edit.name, licence: edit.licence, attribution: edit.attribution, url: edit.url || null, is_third_party: !!edit.is_third_party }).eq("id", edit.id);
    if (error) return toast(error.message);
    toast("Source saved", "ok");
    setEdit(null);
    refresh();
  };
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (edit) first.current?.focus(); }, [edit]);
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Sources</h1>
      <p className="mb-6 mt-1 max-w-[70ch] text-[14px] text-[var(--dim)]">Every word and example points to a source. The licence and attribution travel with each imported record and are shown on its public page.</p>
      <div className="card divide-y divide-[var(--faint)]">
        {rows.map((s) => (
          <div key={s.id} className="px-5 py-4">
            {edit && edit.id === s.id ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name"><input ref={first} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inputCls} /></Field>
                <Field label="Licence *"><input value={edit.licence} onChange={(e) => setEdit({ ...edit, licence: e.target.value })} className={inputCls} /></Field>
                <Field label="Attribution shown to readers *"><input value={edit.attribution} onChange={(e) => setEdit({ ...edit, attribution: e.target.value })} className={inputCls} /></Field>
                <Field label="URL"><input value={edit.url ?? ""} onChange={(e) => setEdit({ ...edit, url: e.target.value })} className={inputCls} /></Field>
                <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!edit.is_third_party} onChange={(e) => setEdit({ ...edit, is_third_party: e.target.checked })} /> Third-party data (not our own research)</label>
                <div className="flex gap-2 md:col-span-2"><button className="pill pill-gold !py-2" onClick={save}>Save</button><button className="chip" onClick={() => setEdit(null)}>Cancel</button></div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{s.name} <span className="ms-2 font-mono text-[11px] text-[var(--dim)]">{s.id}</span>{s.is_third_party && <span className="ms-2 rounded-full border border-sky-400/40 px-2 text-[10px] text-sky-300">third party</span>}</p>
                  <p className="text-[13px] text-[var(--dim)]">{s.licence} · {s.attribution}</p>
                </div>
                <button className="chip" onClick={() => setEdit({ ...s })}>Edit</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
