"use client";

/**
 * Literature CMS — one schema-driven editor for every content table
 * (authors, poems, books, events, folk_items, audio_items, hero_slides),
 * plus the homepage builder and the newsletter list.
 * Writes go straight to Supabase tables; Row Level Security allows them only
 * for admin / editor (and super_admin).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/db/client";
import { toast } from "@/components/dictionary/AdminEditing";
import { Lang, LANGS, LangSettings, useLang } from "@/lib/i18n";
import { Bucket, LIMITS, bookPdfUrl, mediaUrl, removeMedia, uploadMedia } from "@/lib/media";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
type L = { bal?: string; "bal-latn"?: string; en?: string; ur?: string };

type FieldType = "text" | "textarea" | "number" | "bool" | "select" | "L" | "Ltext" | "translation" | "quote" | "palette" | "date" | "datetime" | "author" | "book" | "image" | "audio" | "pdf" | "cta";
type Field = { key: string; label: string; type: FieldType; required?: boolean; options?: string[]; hint?: string; dir?: "rtl" | "ltr"; wide?: boolean };

const MEDIA_BUCKET: Partial<Record<FieldType, Bucket>> = { image: "images", audio: "audio", pdf: "books" };
const STATUS: Field = { key: "status", label: "Status", type: "select", options: ["draft", "pending_review", "published", "archived"], hint: "Only “published” appears on the site." };
const SORT: Field = { key: "sort", label: "Order", type: "number", hint: "Lower numbers show first." };
const BOOK_CATS = ["poetry", "literature", "history", "culture", "linguistics", "research", "fiction", "novels", "short-stories", "biography", "folk", "religious", "dictionary", "educational"];

export type TableKey = "authors" | "poems" | "books" | "events" | "folk_items" | "audio_items" | "hero_slides";

export const TABLES: Record<TableKey, { title: string; singular: string; titleField: string; fields: Field[]; defaults: Row; hasStatus: boolean; note?: string }> = {
  authors: {
    title: "Poets & authors", singular: "poet", titleField: "name", hasStatus: true,
    defaults: { period: "modern", works: 0, hue: 30, featured: false, sort: 0, status: "draft" },
    fields: [
      { key: "name", label: "Name", type: "L", required: true, wide: true },
      { key: "slug", label: "URL slug", type: "text", required: true, hint: "Lower-case Latin letters and dashes, e.g. gul-khan-naseer" },
      { key: "photo_path", label: "Portrait", type: "image", hint: "Square photo works best. Use only photos you have permission to publish." },
      { key: "period", label: "Literary period", type: "select", options: ["classical", "modern", "contemporary"] },
      { key: "years", label: "Years", type: "text", hint: "e.g. 1914–1983" },
      { key: "works", label: "Number of works", type: "number" },
      { key: "place", label: "Birthplace", type: "L", wide: true },
      { key: "bio", label: "Short biography", type: "Ltext", wide: true },
      { key: "hue", label: "Medallion colour (0–360)", type: "number", hint: "Used until a portrait is uploaded." },
      { key: "featured", label: "Featured", type: "bool" },
      SORT, STATUS,
    ],
  },
  poems: {
    title: "Poetry", singular: "poem", titleField: "original", hasStatus: true,
    note: "The Balochi original is stored as written and is never overwritten by a translation.",
    defaults: { translation: {}, is_sample: false, featured: true, sort: 0, status: "draft" },
    fields: [
      { key: "original", label: "Original Balochi text (Arabic script)", type: "textarea", required: true, dir: "rtl", wide: true, hint: "One line per verse line." },
      { key: "roman", label: "Roman Balochi", type: "textarea", dir: "ltr", wide: true },
      { key: "translation", label: "Approved translations", type: "translation", wide: true },
      { key: "slug", label: "URL slug", type: "text", required: true },
      { key: "form", label: "Form (ghazal, nazm…)", type: "L", required: true, wide: true },
      { key: "author_id", label: "Poet", type: "author" },
      { key: "contributor", label: "Credit line (if not a listed poet)", type: "L", wide: true },
      { key: "is_sample", label: "Sample / placeholder text", type: "bool" },
      { key: "featured", label: "Show on homepage", type: "bool" },
      SORT, STATUS,
    ],
  },
  books: {
    title: "Books / library", singular: "book", titleField: "title", hasStatus: true,
    defaults: { cat: "poetry", palette: ["#3a1020", "#d9a441"], can_download: false, is_demo: false, sort: 0, status: "draft" },
    fields: [
      { key: "title", label: "Title", type: "L", required: true, wide: true },
      { key: "slug", label: "URL slug", type: "text", required: true },
      { key: "cat", label: "Category", type: "select", options: BOOK_CATS },
      { key: "author_id", label: "Author (listed poet)", type: "author" },
      { key: "author_text", label: "Author credit (as printed)", type: "L", wide: true },
      { key: "pages", label: "Pages", type: "number" },
      { key: "year", label: "Year", type: "text" },
      { key: "isbn", label: "ISBN", type: "text" },
      { key: "cover_path", label: "Cover image", type: "image", hint: "Portrait ratio, about 2:3." },
      { key: "palette", label: "Cover colours", type: "palette", hint: "Used when there is no cover image." },
      { key: "pdf_path", label: "Book PDF", type: "pdf", hint: "Stored privately. Readers can open it only when the book is published and “Download allowed” is ticked." },
      { key: "copyright", label: "Copyright / permission", type: "text", wide: true },
      { key: "can_download", label: "Download allowed", type: "bool" },
      { key: "is_demo", label: "Demo entry", type: "bool" },
      SORT, STATUS,
    ],
  },
  events: {
    title: "Events & news", singular: "event", titleField: "title", hasStatus: true,
    defaults: { sort: 0, status: "draft" },
    fields: [
      { key: "title", label: "Title", type: "L", required: true, wide: true },
      { key: "event_date", label: "Date", type: "date" },
      { key: "day", label: "Day shown on card", type: "text", required: true, hint: "e.g. 02" },
      { key: "month", label: "Month shown on card", type: "L", required: true, wide: true },
      { key: "place", label: "Place", type: "L", wide: true },
      SORT, STATUS,
    ],
  },
  folk_items: {
    title: "Folk literature", singular: "folk item", titleField: "title", hasStatus: true,
    defaults: { glyph: "◆", sort: 0, status: "draft" },
    fields: [
      { key: "title", label: "Title", type: "L", required: true, wide: true },
      { key: "body", label: "Description", type: "Ltext", required: true, wide: true },
      { key: "glyph", label: "Ornament", type: "text", hint: "◆ ✦ ❖ ✧" },
      SORT, STATUS,
    ],
  },
  audio_items: {
    title: "Audio poetry", singular: "recording", titleField: "title", hasStatus: true,
    defaults: { sort: 0, status: "draft" },
    fields: [
      { key: "title", label: "Title", type: "L", required: true, wide: true },
      { key: "by_line", label: "Reciter / credit", type: "L", required: true, wide: true },
      { key: "author_id", label: "Poet", type: "author" },
      { key: "audio_path", label: "Audio file", type: "audio", wide: true, hint: "Without a file the player shows a silent demo waveform." },
      { key: "duration", label: "Duration", type: "text", hint: "Filled in automatically after upload; e.g. 3:42" },
      SORT, STATUS,
    ],
  },
  hero_slides: {
    title: "Hero slider", singular: "slide", titleField: "heading", hasStatus: false,
    note: "The homepage carousel. Wide images work best (about 1600 × 560, artwork on the left, calm space on the right for the text). Without an image the built-in artwork for that position is shown.",
    defaults: { enabled: true, sort: 0, cta: [] },
    fields: [
      { key: "heading", label: "Heading", type: "L", required: true, wide: true },
      { key: "description", label: "Description", type: "Ltext", wide: true },
      { key: "image_desktop_path", label: "Image (desktop)", type: "image" },
      { key: "image_mobile_path", label: "Image (mobile, optional)", type: "image" },
      { key: "cta", label: "Button", type: "cta", wide: true, hint: "Link examples: @poetry, @poets, @library, @dictionary, #folk, or a full https:// address. Leave the label empty for no button." },
      { key: "enabled", label: "Enabled", type: "bool" },
      { key: "publish_from", label: "Show from", type: "datetime" },
      { key: "publish_until", label: "Show until", type: "datetime" },
      SORT,
    ],
  },
};

const inputCls = "w-full rounded-lg border border-[var(--faint)] bg-white px-3 py-2 outline-none focus:border-[var(--gold)]/60";
const LLANGS: [keyof L, string, "rtl" | "ltr"][] = [["bal", "بلوچی", "rtl"], ["bal-latn", "Balòchi (Latin)", "ltr"], ["en", "English", "ltr"], ["ur", "اردو", "rtl"]];

const pickL = (v: unknown): string => {
  const l = (v ?? {}) as L;
  return typeof v === "string" ? v.split("\n")[0] : l.bal || l.en || l["bal-latn"] || l.ur || "—";
};
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const cleanL = (l: L) => Object.fromEntries(Object.entries(l ?? {}).filter(([, v]) => typeof v === "string" && v.trim()).map(([k, v]) => [k, (v as string).trim()]));

function StatusPill({ s }: { s: string }) {
  const tone: Record<string, string> = { draft: "border-black/15 text-[var(--dim)]", pending_review: "border-amber-400/50 text-amber-700", published: "border-[var(--gold)] text-[var(--gold-bright)]", archived: "border-black/10 text-[var(--dim)]/60" };
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] ${tone[s] ?? ""}`}>{s.replace("_", " ")}</span>;
}

/* ─────────────────────────── field editors ─────────────────────────── */

function LInput({ value, onChange, multiline, required }: { value: L; onChange: (v: L) => void; multiline?: boolean; required?: boolean }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {LLANGS.map(([k, label, dir]) => {
        const props = {
          value: value?.[k] ?? "",
          onChange: (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value }),
          dir, lang: k === "bal-latn" ? "bal-Latn" : k,
          placeholder: label + (k === "bal" && required ? " *" : ""),
          className: `${inputCls} ${dir === "rtl" ? "text-[17px]" : ""}`,
        };
        return multiline ? <textarea key={k} rows={3} {...props} /> : <input key={k} {...props} />;
      })}
    </div>
  );
}

function MediaField({ kind, folder, value, set, onUploaded, onDuration }: { kind: "image" | "audio" | "pdf"; folder: string; value?: string | null; set: (v: string | null) => void; onUploaded: (p: string) => void; onDuration?: (d: string) => void }) {
  const bucket = MEDIA_BUCKET[kind]!;
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const path = await uploadMedia(bucket, folder, file);
      onUploaded(path);
      set(path);
      if (kind === "audio" && onDuration) {
        const a = new Audio(URL.createObjectURL(file));
        a.addEventListener("loadedmetadata", () => {
          if (isFinite(a.duration)) onDuration(`${Math.floor(a.duration / 60)}:${String(Math.round(a.duration % 60)).padStart(2, "0")}`);
        });
      }
    } catch (e) {
      toast((e as Error).message);
    }
    setBusy(false);
  };
  const openPdf = async () => {
    try { window.open(await bookPdfUrl(value!), "_blank", "noopener"); } catch (e) { toast((e as Error).message); }
  };
  const url = kind === "pdf" ? undefined : mediaUrl(bucket as "images" | "audio", value);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-[var(--faint)] p-3" data-media={kind}>
      {value && kind === "image" && <img src={url} alt="" className="h-20 w-20 rounded-md object-cover" />}
      {value && kind === "audio" && <audio controls src={url} className="h-9 max-w-full" preload="metadata" />}
      {value && kind === "pdf" && <button type="button" className="chip" onClick={openPdf}>Open PDF ↗</button>}
      {value && <span className="max-w-[220px] truncate font-mono text-[11px] text-[var(--dim)]" title={value}>{value.split("/").pop()}</span>}
      <label className={`chip cursor-pointer ${busy ? "opacity-60" : ""}`}>
        {busy ? "Uploading…" : value ? "Replace" : "Upload"}
        <input type="file" accept={LIMITS[bucket].accept} className="hidden" disabled={busy} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {value && !busy && <button type="button" className="chip" onClick={() => set(null)}>Remove</button>}
      <span className="w-full text-[11px] text-[var(--dim)]/70">{LIMITS[bucket].label}</span>
    </div>
  );
}

function FieldEditor({ f, value, set, authors, books, table, onUploaded, setOther }: { f: Field; value: unknown; set: (v: unknown) => void; authors: Row[]; books: Row[]; table: string; onUploaded: (bucket: Bucket, p: string) => void; setOther: (k: string, v: unknown) => void }) {
  switch (f.type) {
    case "image": case "audio": case "pdf":
      return <MediaField kind={f.type} folder={table} value={value as string} set={set} onUploaded={(p) => onUploaded(MEDIA_BUCKET[f.type]!, p)} onDuration={f.type === "audio" ? (d) => setOther("duration", d) : undefined} />;
    case "text": return <input value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} dir={f.dir} className={inputCls} />;
    case "textarea": return <textarea rows={4} value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} dir={f.dir} lang={f.dir === "rtl" ? "bal" : undefined} className={`${inputCls} ${f.dir === "rtl" ? "nastaliq text-[20px]" : ""}`} style={f.dir === "rtl" ? { lineHeight: 2.2 } : undefined} />;
    case "number": return <input type="number" value={(value as number) ?? ""} onChange={(e) => set(e.target.value === "" ? null : Number(e.target.value))} className={inputCls} />;
    case "bool": return <label className="flex items-center gap-2 pt-2"><input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} /> <span className="text-[13px]">{value ? "Yes" : "No"}</span></label>;
    case "select": return <select value={(value as string) ?? ""} onChange={(e) => set(e.target.value)} className={inputCls}>{f.options!.map((o) => <option key={o} value={o}>{o.replace("_", " ")}</option>)}</select>;
    case "date": return <input type="date" value={(value as string) ?? ""} onChange={(e) => set(e.target.value || null)} className={inputCls} />;
    case "datetime": return <input type="datetime-local" value={value ? String(value).slice(0, 16) : ""} onChange={(e) => set(e.target.value ? new Date(e.target.value).toISOString() : null)} className={inputCls} />;
    case "L": return <LInput value={(value as L) ?? {}} onChange={set} required={f.required} />;
    case "Ltext": return <LInput value={(value as L) ?? {}} onChange={set} multiline required={f.required} />;
    case "translation": {
      const v = (value as { en?: string; ur?: string }) ?? {};
      return (
        <div className="grid gap-2 md:grid-cols-2">
          <textarea rows={3} placeholder="English" value={v.en ?? ""} onChange={(e) => set({ ...v, en: e.target.value })} className={inputCls} />
          <textarea rows={3} placeholder="اردو" dir="rtl" lang="ur" value={v.ur ?? ""} onChange={(e) => set({ ...v, ur: e.target.value })} className={`${inputCls} text-[17px]`} />
        </div>
      );
    }
    case "quote": {
      const v = (value as { text?: string; roman?: string; credit?: L }) ?? {};
      return (
        <div className="grid gap-2">
          <input placeholder="Quote (Balochi, Arabic script)" dir="rtl" lang="bal" value={v.text ?? ""} onChange={(e) => set({ ...v, text: e.target.value })} className={`${inputCls} text-[18px]`} />
          <input placeholder="Roman Balochi" value={v.roman ?? ""} onChange={(e) => set({ ...v, roman: e.target.value })} className={inputCls} />
          <span className="text-[12px] text-[var(--dim)]">Credit</span>
          <LInput value={v.credit ?? {}} onChange={(c) => set({ ...v, credit: c })} />
        </div>
      );
    }
    case "cta": {
      const arr = (value as { label?: L; href?: string }[]) ?? [];
      const v = arr[0] ?? {};
      return (
        <div className="grid gap-2">
          <LInput value={v.label ?? {}} onChange={(label) => set([{ ...v, label }])} />
          <input placeholder="Link, e.g. @poetry" dir="ltr" value={v.href ?? ""} onChange={(e) => set([{ ...v, href: e.target.value }])} className={inputCls} />
        </div>
      );
    }
    case "palette": {
      const v = (value as string[]) ?? ["#3a1020", "#d9a441"];
      return (
        <div className="flex items-center gap-3">
          {[0, 1].map((i) => <input key={i} type="color" value={v[i] ?? "#000000"} onChange={(e) => set(i === 0 ? [e.target.value, v[1]] : [v[0], e.target.value])} className="h-10 w-14 rounded border border-[var(--faint)] bg-transparent" />)}
          <span className="h-14 w-10 rounded" style={{ background: `linear-gradient(160deg, ${v[0]}, #000 140%)`, boxShadow: `inset 0 0 0 2px ${v[1]}66` }} />
        </div>
      );
    }
    case "author":
      return (
        <select value={(value as number) ?? ""} onChange={(e) => set(e.target.value ? Number(e.target.value) : null)} className={inputCls}>
          <option value="">— none —</option>
          {authors.map((a) => <option key={a.id} value={a.id}>{pickL(a.name)} · {a.name?.en ?? ""}</option>)}
        </select>
      );
    case "book":
      return (
        <select value={(value as string) ?? ""} onChange={(e) => set(e.target.value || null)} className={inputCls}>
          <option value="">— none —</option>
          {books.map((b) => <option key={b.slug} value={b.slug}>{pickL(b.title)} · {b.title?.en ?? ""}</option>)}
        </select>
      );
  }
}

/* ─────────────────────────── list + form ─────────────────────────── */

export function ContentManager({ table }: { table: TableKey }) {
  const cfg = TABLES[table];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [armDelete, setArmDelete] = useState(false);
  const [authors, setAuthors] = useState<Row[]>([]);
  const [books, setBooks] = useState<Row[]>([]);
  const [original, setOriginal] = useState<Row | null>(null);
  const [fresh, setFresh] = useState<[Bucket, string][]>([]); // uploaded during this edit, not yet saved
  const mediaFields = cfg.fields.filter((f) => MEDIA_BUCKET[f.type]);
  const open = (r: Row | null) => { setEdit(r ? structuredClone(r) : null); setOriginal(r); setFresh([]); };
  const close = async (saved: boolean) => {
    // clean up storage: unsaved uploads on cancel; replaced/removed originals after save
    if (!saved) for (const [b, p] of fresh) await removeMedia(b, [p]);
    setEdit(null); setOriginal(null); setFresh([]);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase!.from(table).select("*").order("sort").order("id");
    setLoading(false);
    if (error) return toast(error.message);
    setRows(data ?? []);
  }, [table]);

  useEffect(() => {
    setEdit(null); setOriginal(null); setFresh([]);
    refresh();
    if (cfg.fields.some((f) => f.type === "author")) supabase!.from("authors").select("id, name").order("sort").then(({ data }) => setAuthors(data ?? []));
    if (cfg.fields.some((f) => f.type === "book")) supabase!.from("books").select("slug, title").order("sort").then(({ data }) => setBooks(data ?? []));
  }, [table, refresh, cfg.fields]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) => JSON.stringify(r[cfg.titleField] ?? "").toLowerCase().includes(n) || String(r.slug ?? "").includes(n));
  }, [rows, q, cfg.titleField]);

  const set = (k: string, v: unknown) => {
    setEdit((e) => {
      const next = { ...e!, [k]: v };
      // suggest a slug from the Latin / English title for new rows
      if (!e!.id && cfg.fields.some((f) => f.key === "slug") && (k === cfg.titleField) && !e!._slugTouched) {
        const l = v as L;
        next.slug = slugify(l?.["bal-latn"] || l?.en || "");
      }
      if (k === "slug") next._slugTouched = true;
      return next;
    });
  };

  const save = async () => {
    if (!edit) return;
    for (const f of cfg.fields) {
      if (!f.required) continue;
      const v = edit[f.key];
      const empty = f.type === "L" || f.type === "Ltext" ? !(v as L)?.bal?.trim() : v == null || String(v).trim() === "";
      if (empty) return toast(`${f.label}${f.type === "L" || f.type === "Ltext" ? " (Balochi)" : ""} is required.`);
    }
    const out: Row = {};
    for (const f of cfg.fields) {
      let v = edit[f.key];
      if (f.type === "L" || f.type === "Ltext") v = Object.keys(cleanL(v)).length ? cleanL(v) : null;
      if (f.type === "translation") v = cleanL(v ?? {});
      if (f.type === "quote") v = v?.text ? { text: v.text, roman: v.roman ?? "", credit: cleanL(v.credit ?? {}) } : null;
      if (f.type === "cta") {
        const c = (v ?? [])[0] ?? {};
        const label = cleanL(c.label ?? {});
        v = label.bal && c.href?.trim() ? [{ label, href: c.href.trim() }] : [];
      }
      if (f.type === "text" && typeof v === "string") v = v.trim() || null;
      if (f.key === "slug" && typeof v === "string") v = slugify(v);
      out[f.key] = v ?? null;
    }
    if (table === "authors") out.updated_at = new Date().toISOString();
    if (table === "poems" && out.status === "published" && !edit.published_at) out.published_at = new Date().toISOString();
    setSaving(true);
    const { error } = edit.id ? await supabase!.from(table).update(out).eq("id", edit.id) : await supabase!.from(table).insert(out);
    setSaving(false);
    if (error) return toast(error.code === "23505" ? "That slug is already used — choose another." : error.message);
    toast(edit.id ? "Saved" : `New ${cfg.singular} created`, "ok");
    for (const f of mediaFields) {
      const old = original?.[f.key];
      if (old && old !== out[f.key]) await removeMedia(MEDIA_BUCKET[f.type]!, [old]);
      // a file uploaded and then replaced again in the same edit
      for (const [b, p] of fresh) if (b === MEDIA_BUCKET[f.type] && p !== out[f.key] && !mediaFields.some((g) => out[g.key] === p)) await removeMedia(b, [p]);
    }
    await close(true);
    refresh();
  };

  const del = async () => {
    if (!armDelete) { setArmDelete(true); setTimeout(() => setArmDelete(false), 4000); return; }
    const { error } = await supabase!.from(table).delete().eq("id", edit!.id);
    if (error) return toast(error.message);
    for (const f of mediaFields) {
      const paths = [original?.[f.key], edit![f.key]].filter((p, i, a) => p && a.indexOf(p) === i);
      await removeMedia(MEDIA_BUCKET[f.type]!, paths);
    }
    toast("Deleted", "ok");
    await close(true);
    refresh();
  };

  const quickStatus = async (r: Row, status: string) => {
    const { error } = await supabase!.from(table).update({ status }).eq("id", r.id);
    if (error) return toast(error.message);
    refresh();
  };

  if (edit) {
    return (
      <div className="max-w-[980px]">
        <button className="text-[13px] text-[var(--dim)] hover:text-[var(--text)]" onClick={() => close(false)}>← {cfg.title}</button>
        <h1 className="mb-1 mt-2 text-[28px] font-semibold tracking-tight">{edit.id ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}</h1>
        {cfg.note && <p className="mb-5 text-[13px] text-[var(--dim)]">{cfg.note}</p>}
        <div className="card grid gap-5 p-6 md:grid-cols-2">
          {cfg.fields.map((f) => {
            const Wrap = MEDIA_BUCKET[f.type] ? "div" : "label";
            return (
            <Wrap key={f.key} className={`block text-[13px] ${f.wide ? "md:col-span-2" : ""}`}>
              <span className="mb-1 block text-[var(--dim)]">{f.label}{f.required && <span className="text-[var(--rust)]"> *</span>}</span>
              <FieldEditor f={f} value={edit[f.key]} set={(v) => set(f.key, v)} authors={authors} books={books} table={table} onUploaded={(b, p) => setFresh((x) => [...x, [b, p]])} setOther={set} />
              {f.hint && <span className="mt-1 block text-[11px] text-[var(--dim)]/70">{f.hint}</span>}
            </Wrap>
            );
          })}
        </div>
        <div className="sticky bottom-0 mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--faint)] bg-[var(--ink)]/95 py-4 backdrop-blur">
          <button className="pill pill-gold disabled:opacity-50" disabled={saving} onClick={save}>{saving ? "Saving…" : edit.id ? "Save changes" : `Create ${cfg.singular}`}</button>
          <button className="chip" onClick={() => close(false)}>Cancel</button>
          {edit.id && <button className={`chip ${armDelete ? "!border-[var(--rust)] !text-[var(--rust)]" : ""}`} onClick={del}>{armDelete ? "Click again to delete permanently" : "Delete"}</button>}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">{cfg.title}</h1>
          <p className="mt-1 text-[14px] text-[var(--dim)]">{rows.length} {rows.length === 1 ? cfg.singular : cfg.singular + "s"}{cfg.hasStatus && ` · ${rows.filter((r) => r.status === "published").length} published`}</p>
        </div>
        <button className="pill pill-gold" onClick={() => { open(null); setEdit({ ...structuredClone(cfg.defaults) }); }}>+ New {cfg.singular}</button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className={`${inputCls} mb-4 max-w-[320px]`} />
      <div className="card divide-y divide-[var(--faint)]">
        {loading && <p className="p-6 text-[var(--dim)]">Loading…</p>}
        {!loading && shown.length === 0 && <p className="p-8 text-center text-[var(--dim)]">Nothing yet.</p>}
        {shown.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-3 hover:bg-[var(--ink-2)]">
            <button className="min-w-[220px] flex-1 text-start" onClick={() => open(r)}>
              <span lang="bal" dir="rtl" className="me-3 text-[18px]">{pickL(r[cfg.titleField])}</span>
              <span className="text-[13px] text-[var(--dim)]">{typeof r[cfg.titleField] === "object" ? r[cfg.titleField]?.en ?? "" : r.slug}</span>
            </button>
            <span className="w-12 text-center text-[12px] text-[var(--dim)]">#{r.sort}</span>
            {cfg.hasStatus ? (
              <span className="flex items-center gap-2">
                <StatusPill s={r.status} />
                {r.status !== "published" ? <button className="chip !py-0.5 text-[12px]" onClick={() => quickStatus(r, "published")}>Publish</button> : <button className="chip !py-0.5 text-[12px]" onClick={() => quickStatus(r, "draft")}>Unpublish</button>}
              </span>
            ) : (
              <span className={`text-[12px] ${r.enabled ? "text-[var(--gold)]" : "text-[var(--dim)]"}`}>{r.enabled ? "enabled" : "disabled"}</span>
            )}
            <button className="chip" onClick={() => open(r)}>Edit</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────── homepage builder ─────────────────────────── */

const SECTION_LABELS: Record<string, string> = {
  manifesto: "Manifesto", potd: "Today's special (poet of the day)", poetry: "Today's top poetry", dictionary: "Word of the Day",
  stats: "Archive numbers", poets: "Recommended poets", library: "From the library", folk: "More from Labzank (folk)", audio: "Labzank recent (audio)",
  events: "News & events", newsletter: "Newsletter band", cta: "Closing call to action",
};

export function HomepageBuilder() {
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase!.from("homepage_sections").select("*").order("sort");
    if (error) return toast(error.message);
    setRows(data ?? []);
    setDirty(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const r = [...rows];
    [r[i], r[j]] = [r[j], r[i]];
    setRows(r);
    setDirty(true);
  };
  const toggle = (i: number) => { setRows(rows.map((r, j) => (j === i ? { ...r, enabled: !r.enabled } : r))); setDirty(true); };
  const save = async () => {
    setSaving(true);
    for (const [i, r] of rows.entries()) {
      const { error } = await supabase!.from("homepage_sections").update({ sort: (i + 1) * 10, enabled: r.enabled }).eq("key", r.key);
      if (error) { setSaving(false); return toast(error.message); }
    }
    setSaving(false);
    toast("Homepage updated", "ok");
    load();
  };
  return (
    <div className="max-w-[720px]">
      <h1 className="text-[28px] font-semibold tracking-tight">Homepage builder</h1>
      <p className="mb-6 mt-1 text-[14px] text-[var(--dim)]">Order and visibility of the sections below the scroll film. Visitors see the change on their next page load.</p>
      <div className="card divide-y divide-[var(--faint)]">
        {rows.map((r, i) => (
          <div key={r.key} className={`flex items-center gap-4 px-5 py-3 ${r.enabled ? "" : "opacity-50"}`}>
            <span className="w-6 text-center text-[13px] text-[var(--gold)]">{i + 1}</span>
            <span className="flex-1">{SECTION_LABELS[r.key] ?? r.key}<span className="ms-2 font-mono text-[11px] text-[var(--dim)]">{r.key}</span></span>
            <button className="chip" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            <button className="chip" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={r.enabled} onChange={() => toggle(i)} /> Show</label>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button className="pill pill-gold disabled:opacity-50" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save homepage"}</button>
        {dirty && <button className="chip" onClick={load}>Discard</button>}
      </div>
    </div>
  );
}

/* ─────────────────────────── newsletter ─────────────────────────── */

export function Subscribers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    supabase!.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }).then(({ data, error }) => (error ? toast(error.message) : setRows(data ?? [])));
  }, []);
  return (
    <div className="max-w-[820px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Newsletter subscribers</h1>
          <p className="mt-1 text-[14px] text-[var(--dim)]">{rows.length} subscribers. Only admins can see this list.</p>
        </div>
        <button className="chip" disabled={!rows.length} onClick={async () => {
          try { await navigator.clipboard.writeText(rows.map((r) => r.email).join(", ")); } catch {}
          setCopied(true); setTimeout(() => setCopied(false), 1500);
        }}>{copied ? "Copied" : "Copy all emails"}</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-[14px]">
          <thead className="text-[12px] text-[var(--dim)]"><tr>{["Email", "Language", "Joined"].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--faint)]">
                <td className="px-4 py-2.5">{r.email}</td>
                <td className="px-4 py-2.5 text-[var(--dim)]">{r.lang ?? "—"}</td>
                <td className="px-4 py-2.5 text-[var(--dim)]">{new Date(r.created_at).toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-[var(--dim)]">No subscribers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────── site languages ─────────────────────────── */

const LANG_INFO: Record<Lang, string> = {
  en: "English — left-to-right",
  bal: "Balochi in Arabic script — right-to-left",
  "bal-latn": "Balochi in Latin script (Roman Balochi) — left-to-right",
  ur: "Urdu — right-to-left",
};

export function LanguageSettings() {
  const { settings, applySettings } = useLang();
  const [enabled, setEnabled] = useState<Lang[]>(settings.enabled);
  const [def, setDef] = useState<Lang>(settings.default);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase!.from("site_settings").select("value").eq("key", "languages").maybeSingle().then(({ data, error }) => {
      if (error) return toast(error.message);
      const v = data?.value as LangSettings | undefined;
      if (v?.enabled?.length) { setEnabled(v.enabled); setDef(v.default); }
    });
  }, []);
  const toggle = (c: Lang) => {
    const next = enabled.includes(c) ? enabled.filter((x) => x !== c) : LANGS.map((l) => l.code).filter((x) => x === c || enabled.includes(x));
    if (!next.length) return toast("At least one language must stay on.");
    setEnabled(next);
    if (!next.includes(def)) setDef(next[0]);
  };
  const dirty = JSON.stringify(enabled) !== JSON.stringify(settings.enabled) || def !== settings.default;
  const save = async () => {
    setSaving(true);
    const value: LangSettings = { enabled, default: def };
    const { error } = await supabase!.from("site_settings").upsert({ key: "languages", value, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast(error.code === "42501" ? "Only an admin can change site languages." : error.message);
    try { localStorage.setItem("labzank-languages", JSON.stringify(value)); } catch {}
    applySettings(value);
    toast("Languages saved — visitors see the change on their next page load", "ok");
  };
  return (
    <div className="max-w-[760px]">
      <h1 className="text-[28px] font-semibold tracking-tight">Languages</h1>
      <p className="mb-6 mt-1 text-[14px] text-[var(--dim)]">Tick the interface languages to show in the website’s language menu, and pick the language every new visit opens in.</p>
      <div className="card divide-y divide-[var(--faint)]">
        {LANGS.map((l) => {
          const on = enabled.includes(l.code);
          return (
            <div key={l.code} className={`flex flex-wrap items-center gap-4 px-5 py-4 ${on ? "" : "opacity-60"}`} data-lang-row={l.code}>
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={on} onChange={() => toggle(l.code)} className="h-4 w-4" />
                <span lang={l.htmlLang} dir={l.dir} className="min-w-[90px] text-[17px]">{l.label}</span>
                <span className="text-[13px] text-[var(--dim)]">{LANG_INFO[l.code]}</span>
              </label>
              <label className={`flex items-center gap-2 text-[13px] ${on ? "cursor-pointer" : "pointer-events-none"}`}>
                <input type="radio" name="default-lang" checked={def === l.code} disabled={!on} onChange={() => setDef(l.code)} />
                Default
              </label>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-[var(--dim)]">
        Content is never machine-translated: if a poem or bio has no approved text in the chosen language, the Balochi original is shown with an “Original” badge.
      </p>
      <div className="mt-5 flex items-center gap-3">
        <button className="pill pill-gold disabled:opacity-50" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save languages"}</button>
        {dirty && <button className="chip" onClick={() => { setEnabled(settings.enabled); setDef(settings.default); }}>Discard</button>}
      </div>
    </div>
  );
}

/* ─────────────────────────── dictionary visibility ─────────────────────────── */

export function DictionaryVisibility() {
  const [preview, setPreview] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase!.from("site_settings").select("value").eq("key", "dictionary").maybeSingle().then(({ data, error }) => {
      if (error) return toast(error.message);
      const v = !!(data?.value as { preview?: boolean } | undefined)?.preview;
      setPreview(v); setSaved(v);
    });
    supabase!.rpc("dict_stats").then(({ data }) => setCounts((data as { by_status?: Record<string, number> } | null)?.by_status ?? {}));
  }, []);
  const n = (...s: string[]) => s.reduce((a, k) => a + (counts[k] ?? 0), 0);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase!.from("site_settings").upsert({ key: "dictionary", value: { preview: !!preview }, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast(error.code === "42501" ? "Only an admin can change this." : error.message);
    setSaved(preview);
    toast("Dictionary visibility saved", "ok");
  };
  if (preview === null) return <p className="text-[var(--dim)]">Loading…</p>;
  const opts: { v: boolean; title: string; body: string; count: number }[] = [
    { v: false, title: "Launch mode — reviewed words only", body: "Visitors see only words marked Verified or Published. Recommended once the site is public.", count: n("verified", "published") },
    { v: true, title: "Preview mode — include unreviewed words", body: "Drafts and words awaiting review are also visible. Useful while building; unreviewed meanings may contain mistakes.", count: n("verified", "published", "draft", "pending_review") },
  ];
  return (
    <div className="max-w-[760px]">
      <h1 className="text-[28px] font-semibold tracking-tight">Dictionary visibility</h1>
      <p className="mb-6 mt-1 text-[14px] text-[var(--dim)]">Choose which dictionary words the public can see. Imported and rejected words are never public; staff always see everything.</p>
      <div className="grid gap-3">
        {opts.map((o) => (
          <label key={String(o.v)} data-mode={o.v ? "preview" : "launch"} className={`card flex cursor-pointer items-start gap-4 p-5 ${preview === o.v ? "!border-[var(--gold)]/60" : ""}`}>
            <input type="radio" name="dict-vis" className="mt-1.5" checked={preview === o.v} onChange={() => setPreview(o.v)} />
            <span className="flex-1">
              <span className="block text-[17px]">{o.title}{saved === o.v && <span className="ms-2 rounded-full border border-[var(--gold)]/50 px-2 py-0.5 text-[11px] text-[var(--gold)]">current</span>}</span>
              <span className="mt-1 block text-[13px] text-[var(--dim)]">{o.body}</span>
            </span>
            <span className="text-end"><span className="block text-[24px] text-[var(--gold-bright)]">{o.count}</span><span className="text-[11px] text-[var(--dim)]">public words</span></span>
          </label>
        ))}
      </div>
      {!preview && n("verified", "published") === 0 && (
        <p className="mt-4 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 text-[13px] text-amber-800">
          No word is Verified or Published yet, so the public dictionary would be empty. Review words in Dictionary → Review queue first.
        </p>
      )}
      <div className="mt-5 flex items-center gap-3">
        <button className="pill pill-gold disabled:opacity-50" disabled={preview === saved || saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

/* ─────────────────────────── contact messages ─────────────────────────── */

export function Messages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    supabase!.from("contact_messages").select("*").order("created_at", { ascending: false }).then(({ data, error }) => (error ? toast(error.message) : setRows(data ?? [])));
  }, []);
  return (
    <div className="max-w-[900px]">
      <h1 className="text-[28px] font-semibold tracking-tight">Messages</h1>
      <p className="mb-6 mt-1 text-[14px] text-[var(--dim)]">Sent from the “Write to us” form in the website footer. Only admins can read them.</p>
      <div className="card divide-y divide-[var(--faint)]">
        {rows.length === 0 && <p className="p-8 text-center text-[var(--dim)]">No messages yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="px-5 py-3" data-message>
            <button className="flex w-full flex-wrap items-baseline gap-x-4 text-start" onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className="font-medium">{r.name}</span>
              <a href={`mailto:${r.email}`} className="text-[13px] text-[var(--gold)] hover:underline" onClick={(e) => e.stopPropagation()}>{r.email}</a>
              <span className="ms-auto text-[12px] text-[var(--dim)]">{new Date(r.created_at).toLocaleString("en-GB")}</span>
              <span className={`w-full text-[14px] text-[var(--dim)] ${open === r.id ? "whitespace-pre-wrap" : "truncate"}`}>{r.message}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
