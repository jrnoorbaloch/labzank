"use client";

import { useEffect, useMemo, useState } from "react";
import Logo from "@/components/Logo";
import { entries, wordOfDaySchedule, bySlug } from "@/lib/dictionary/data";
import { check, Checked, errorReport, guessMapping, Mapping, parseCSV, parseExcel, parseJSON, Row, SAMPLE_CSV, summary, TARGET_FIELDS, TargetKey } from "@/lib/dictionary/importer";
import { detectScript } from "@/lib/dictionary/normalize";
import { page } from "@/lib/links";
import { supabase } from "@/lib/db/client";
import { Duplicates, ReviewQueue, Sources, WordEditor, WordList, WotdScheduler } from "./AdminEditing";
import { BrandingSettings, ContentManager, DictionaryVisibility, HomepageBuilder, LanguageSettings, Messages, Subscribers, TableKey } from "@/components/admin/ContentCMS";
import type { Session } from "@supabase/supabase-js";

/**
 * Dictionary admin — demo build. Overview + Bulk import work in the browser
 * (batches are kept in this browser's localStorage); the other sections need
 * the Postgres backend (phase 2) and say so.
 */

// Definitions, translations, pronunciation, root and derived words are all edited in the word editor.
const MENU = [
  ["overview", "Overview"], ["words", "Manage words"], ["add", "Add new word"], ["review", "Review queue"],
  ["wotd", "Word of the Day"], ["import", "Bulk import"], ["history", "Import history"], ["duplicates", "Duplicates"],
  ["sources", "Sources"], ["alpha", "Alphabetical index ↗"],
] as const;
const CONTENT_MENU = [
  ["authors", "Poets & authors"], ["poems", "Poetry"], ["prose", "Prose (afsana, essay…)"], ["books", "Books / library"], ["articles", "Articles / blog"], ["videos", "Videos"], ["events", "Events & news"],
  ["folk_items", "Folk literature"], ["audio_items", "Audio poetry"], ["hero_slides", "Hero slider"],
  ["pages", "Pages (About, Privacy…)"], ["homepage", "Homepage builder"], ["subscribers", "Newsletter"], ["messages", "Messages"],
] as const;
const SITE_MENU = [["branding", "Branding"], ["languages", "Languages"], ["dict-visibility", "Dictionary visibility"]] as const;
type Sec = (typeof MENU)[number][0] | (typeof CONTENT_MENU)[number][0] | (typeof SITE_MENU)[number][0] | "edit";
const CONTENT_TABLES = ["authors", "poems", "prose", "books", "events", "folk_items", "audio_items", "hero_slides", "articles", "videos", "pages"] as const;
const LOCAL_OK: Sec[] = ["overview", "import", "history", "wotd", "alpha"];

type Batch = { id: string; at: string; file: string; source: string; licence: string; imported: number; skipped: number; merged?: number; status?: string; rows: Checked["mapped"][] };
// Supabase rows without generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;
const KEY = "labzank-import-batches";
const loadBatches = (): Batch[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const saveBatches = (b: Batch[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {}
};

async function loadServerBatches(): Promise<Batch[]> {
  const { data, error } = await supabase!
    .from("dict_import_batches")
    .select("id, created_at, file_name, status, counts, dict_sources(name, licence)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((b: AnyRow) => ({
    id: String(b.id), at: b.created_at, file: b.file_name ?? "", status: b.status,
    source: b.dict_sources?.name ?? "", licence: b.dict_sources?.licence ?? "",
    imported: b.counts?.imported ?? 0, merged: b.counts?.merged ?? 0, skipped: b.counts?.skipped ?? 0, rows: [],
  }));
}

export default function AdminDictionary() {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase || !session) return setRoles(null);
    supabase.from("profiles").select("roles").eq("id", session.user.id).single()
      .then(({ data }) => setRoles((data?.roles as string[]) ?? []));
  }, [session]);

  if (supabase && !authReady) return <div className="p-10 text-[var(--dim)]">…</div>;
  if (supabase && !session) return <SignIn />;
  const staff = !supabase || (roles ?? []).some((r) => ["super_admin", "admin", "editor", "dict_admin", "dict_linguist", "dict_translator", "dict_reviewer"].includes(r));
  if (supabase && roles && !staff) return <NoRole email={session?.user.email ?? ""} />;
  return <AdminShell canImport={!supabase || (roles ?? []).some((r) => ["super_admin", "admin", "dict_admin"].includes(r))} email={session?.user.email} roles={roles ?? []} />;
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
  };
  const link = async () => {
    if (!email) return setMsg("Enter your email first.");
    const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href, shouldCreateUser: false } });
    setMsg(error ? error.message : "Check your inbox for a sign-in link.");
  };
  return (
    <div className="grid min-h-screen place-items-center p-6" lang="en" dir="ltr" style={{ fontFamily: "var(--latin-body)" }}>
      <form onSubmit={go} className="card w-full max-w-[400px] p-8">
        <Logo className="text-[28px] text-[var(--text)]" />
        <h1 className="mt-1 text-[22px] font-semibold">Admin sign-in</h1>
        <p className="mt-1 text-[13px] text-[var(--dim)]">Dictionary staff only. Accounts are created by a Super Admin in Supabase.</p>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="mt-6 w-full rounded-lg border border-[var(--faint)] bg-white px-3 py-2.5 outline-none focus:border-[var(--gold)]/60" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="mt-3 w-full rounded-lg border border-[var(--faint)] bg-white px-3 py-2.5 outline-none focus:border-[var(--gold)]/60" />
        <button className="pill pill-gold mt-5 w-full justify-center disabled:opacity-50" disabled={busy}>{busy ? "…" : "Sign in"}</button>
        <button type="button" onClick={link} className="mt-3 w-full text-center text-[13px] text-[var(--dim)] hover:text-[var(--text)]">Email me a sign-in link instead</button>
        {msg && <p className="mt-4 text-[13px] text-[var(--gold-bright)]">{msg}</p>}
      </form>
    </div>
  );
}

function NoRole({ email }: { email: string }) {
  return (
    <div className="grid min-h-screen place-items-center p-6" lang="en" dir="ltr" style={{ fontFamily: "var(--latin-body)" }}>
      <div className="card max-w-[460px] p-8 text-[14px]">
        <h1 className="text-[20px] font-semibold">No dictionary role yet</h1>
        <p className="mt-2 text-[var(--dim)]">You are signed in as <b className="text-[var(--text)]">{email}</b>, but this account has no staff role. A Super Admin can add one in the <code>profiles</code> table.</p>
        <button className="chip mt-5" onClick={() => supabase!.auth.signOut()}>Sign out</button>
      </div>
    </div>
  );
}

function AdminShell({ canImport, email, roles }: { canImport: boolean; email?: string; roles: string[] }) {
  const canContent = roles.some((r) => ["super_admin", "admin", "editor"].includes(r));
  const canSite = roles.some((r) => ["super_admin", "admin"].includes(r));
  const [sec, setSec] = useState<Sec>("overview");
  const [editSlug, setEditSlug] = useState<string | undefined>();
  const [batches, setBatches] = useState<Batch[]>([]);
  const refresh = () => {
    if (supabase) loadServerBatches().then(setBatches).catch((e) => console.warn(e));
    else setBatches(loadBatches());
  };
  useEffect(() => {
    refresh();
    const f = () => {
      const h = location.hash.slice(1);
      if (h.startsWith("edit-")) {
        setEditSlug(decodeURIComponent(h.slice(5)));
        setSec("edit");
      } else if (h === "alpha") {
        location.href = page("dictionary", "letter-0");
      } else if (MENU.some(([k]) => k === h) || CONTENT_MENU.some(([k]) => k === h) || SITE_MENU.some(([k]) => k === h)) {
        setEditSlug(undefined);
        setSec(h as Sec);
      }
      window.scrollTo({ top: 0 });
    };
    f();
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  const update = (b: Batch[]) => {
    setBatches(b);
    if (!supabase) saveBatches(b);
  };
  const rollback = async (id: string) => {
    if (supabase) {
      const { error } = await supabase.rpc("dict_rollback", { p_batch: Number(id) });
      if (error) return alertBox(error.message);
      refresh();
    } else update(batches.filter((b) => b.id !== id));
  };

  return (
    <div className="min-h-screen" lang="en" dir="ltr" style={{ fontFamily: "var(--latin-body)" }}>
      <header className="flex items-center justify-between border-b border-[var(--faint)] px-6 py-3">
        <a href={page("home")} className="flex items-baseline gap-2">
          <Logo className="text-[20px] text-[var(--text)]" />
          <span className="text-[11px] uppercase tracking-[0.3em] text-[var(--dim)]">Admin</span>
        </a>
        <span className="flex items-center gap-3 text-[11px]">
          {supabase ? (
            <>
              <span className="text-[var(--dim)]">{email}</span>
              <span className="rounded-full border border-[var(--gold)]/40 px-3 py-1 text-[var(--gold)]">Supabase · live</span>
              <button className="chip !py-1" onClick={() => supabase!.auth.signOut()}>Sign out</button>
            </>
          ) : (
            <span className="rounded-full border border-[var(--gold)]/40 px-3 py-1 text-[var(--gold)]">Demo — no database configured</span>
          )}
        </span>
      </header>
      <div className="grid md:grid-cols-[240px_1fr]">
        <aside className="border-e border-[var(--faint)] p-4 md:min-h-[calc(100vh-57px)]">
          {supabase && canContent && (
            <>
              <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--dim)]">Literature</p>
              <nav className="mb-6 flex flex-row flex-wrap gap-1 md:flex-col">
                {CONTENT_MENU.map(([k, label]) => (
                  <a key={k} href={`#${k}`} className={`rounded-lg px-3 py-1.5 text-[14px] ${sec === k ? "bg-[var(--gold)]/15 text-[var(--gold-bright)]" : "text-[var(--dim)] hover:bg-[var(--ink-2)] hover:text-[var(--text)]"}`}>
                    {label}
                  </a>
                ))}
              </nav>
            </>
          )}
          {supabase && canSite && (
            <>
              <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--dim)]">Site</p>
              <nav className="mb-6 flex flex-row flex-wrap gap-1 md:flex-col">
                {SITE_MENU.map(([k, label]) => (
                  <a key={k} href={`#${k}`} className={`rounded-lg px-3 py-1.5 text-[14px] ${sec === k ? "bg-[var(--gold)]/15 text-[var(--gold-bright)]" : "text-[var(--dim)] hover:bg-[var(--ink-2)] hover:text-[var(--text)]"}`}>
                    {label}
                  </a>
                ))}
              </nav>
            </>
          )}
          <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--dim)]">Dictionary</p>
          <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
            {MENU.map(([k, label]) => (
              <a
                key={k}
                href={`#${k}`}
                className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-[14px] ${sec === k || (sec === "edit" && k === "words") ? "bg-[var(--gold)]/15 text-[var(--gold-bright)]" : "text-[var(--dim)] hover:bg-[var(--ink-2)] hover:text-[var(--text)]"}`}
              >
                {label}
                {!supabase && !LOCAL_OK.includes(k) && <span className="ms-2 shrink-0 text-[9px] uppercase tracking-wider opacity-50">db</span>}
              </a>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 p-6 md:p-10">
          {sec === "overview" && <Overview batches={batches} />}
          {sec === "import" && (canImport ? <Importer onImported={(b) => (supabase ? refresh() : update([b, ...batches]))} /> : <Phase2 name="Bulk import (Dictionary Administrator only)" />)}
          {sec === "history" && <History batches={batches} onRollback={rollback} />}
          {sec === "wotd" && (supabase ? <WotdScheduler /> : <Wotd />)}
          {supabase ? (
            <>
              {sec === "words" && <WordList />}
              {sec === "add" && <WordEditor roles={roles} />}
              {sec === "edit" && <WordEditor slug={editSlug} roles={roles} />}
              {sec === "review" && <ReviewQueue roles={roles} />}
              {sec === "duplicates" && <Duplicates />}
              {sec === "sources" && <Sources />}
              {CONTENT_TABLES.includes(sec as TableKey) && (canContent ? <ContentManager table={sec as TableKey} /> : <Phase2 name="Literature (Admin or Editor role needed)" />)}
              {sec === "homepage" && (canContent ? <HomepageBuilder /> : <Phase2 name="Homepage (Admin or Editor role needed)" />)}
              {sec === "subscribers" && <Subscribers />}
              {sec === "messages" && <Messages />}
              {sec === "branding" && (canSite ? <BrandingSettings /> : <Phase2 name="Branding (Admin role needed)" />)}
              {sec === "languages" && (canSite ? <LanguageSettings /> : <Phase2 name="Languages (Admin role needed)" />)}
              {sec === "dict-visibility" && (canSite ? <DictionaryVisibility /> : <Phase2 name="Dictionary visibility (Admin role needed)" />)}
            </>
          ) : (
            !LOCAL_OK.includes(sec as (typeof MENU)[number][0]) && <Phase2 name={MENU.find(([k]) => k === sec)?.[1] ?? "Edit word"} />
          )}
        </main>
      </div>
    </div>
  );
}

function alertBox(msg: string) {
  console.error(msg);
  const el = document.createElement("div");
  el.textContent = msg;
  el.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] rounded-xl bg-[var(--rust)] px-5 py-3 text-[14px] text-white shadow-2xl";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function H({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[28px] font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 max-w-[70ch] text-[14px] text-[var(--dim)]">{sub}</p>}
    </div>
  );
}

type Stats = { entries: number; senses: number; with_examples: number; with_audio: number; imported: number; by_status: Record<string, number>; coverage: Record<string, number> };

function localStats(batches: Batch[]): Stats {
  const senses = entries.flatMap((e) => e.senses);
  const cov = (l: "bal" | "en" | "ur" | "brh") => senses.filter((s) => s.gloss[l]).length;
  return {
    entries: entries.length, senses: senses.length,
    with_examples: entries.filter((e) => e.senses.some((s) => s.examples?.length)).length,
    with_audio: entries.filter((e) => e.audio).length,
    imported: batches.reduce((n, b) => n + b.imported, 0),
    by_status: { draft: entries.filter((e) => e.status === "draft").length },
    coverage: { en: cov("en"), ur: cov("ur"), bal: cov("bal"), brh: cov("brh") },
  };
}

function Overview({ batches }: { batches: Batch[] }) {
  const [st, setSt] = useState<Stats>(() => localStats(batches));
  useEffect(() => {
    if (!supabase) return setSt(localStats(batches));
    supabase.rpc("dict_stats").then(({ data, error }) => (error ? alertBox(error.message) : setSt(data as Stats)));
  }, [batches]);
  const stats = [
    ["Entries", st.entries],
    ["Senses", st.senses],
    ["With examples", st.with_examples],
    ["With audio", st.with_audio],
    [supabase ? "Imported, awaiting review" : "Imported (this browser)", st.imported],
  ] as const;
  const langs = [["English", st.coverage.en ?? 0], ["Urdu", st.coverage.ur ?? 0], ["Balochi definition", st.coverage.bal ?? 0], ["Brahui", st.coverage.brh ?? 0]] as const;
  return (
    <>
      <H sub={supabase ? "Live counts from the Supabase database." : "Counts come from the sample dictionary in this build. Every entry is a draft until a linguistic editor verifies it."}>Dictionary overview</H>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map(([l, n]) => (
          <div key={l} className="card p-5">
            <div className="text-[32px] font-semibold text-[var(--gold)]">{n}</div>
            <div className="text-[13px] text-[var(--dim)]">{l}</div>
          </div>
        ))}
      </div>
      <h2 className="mb-3 mt-10 text-[16px] font-semibold">Translation coverage (senses with a meaning)</h2>
      <div className="card flex flex-col gap-3 p-5">
        {langs.map(([l, n]) => (
          <div key={l} className="grid grid-cols-[170px_1fr_70px] items-center gap-3 text-[14px]">
            <span>{l}</span>
            <span className="h-2 overflow-hidden rounded-full bg-[var(--ink-3)]">
              <span className="block h-full rounded-full bg-[var(--gold)]" style={{ width: `${(n / (st.senses || 1)) * 100}%` }} />
            </span>
            <span className="text-end text-[var(--dim)]">{n}/{st.senses}</span>
          </div>
        ))}
      </div>
      <h2 className="mb-3 mt-10 text-[16px] font-semibold">Verification queue</h2>
      <div className="card p-5 text-[14px] text-[var(--dim)]">
        {["draft", "imported", "pending_review", "verified", "published", "rejected"].map((k, i) => (
          <span key={k}>{i > 0 && " · "}{k.replace("_", " ")}: <b className="text-[var(--text)]">{st.by_status[k] ?? 0}</b></span>
        ))}
      </div>
    </>
  );
}

function Wotd() {
  const [rows, setRows] = useState<{ date: string; arab: string; latn: string; en: string }[]>(() =>
    wordOfDaySchedule.map((w) => {
      const e = bySlug(w.slug)!;
      return { date: w.date, arab: e.arab, latn: e.latn, en: e.senses[0].gloss.en ?? "" };
    })
  );
  useEffect(() => {
    if (!supabase) return;
    supabase.from("dict_word_of_day").select("day, dict_entries(headword_arab, headword_latn)").order("day").then(({ data, error }) => {
      if (error) return alertBox(error.message);
      setRows((data ?? []).map((r: AnyRow) => ({ date: r.day, arab: r.dict_entries?.headword_arab ?? "", latn: r.dict_entries?.headword_latn ?? "", en: "" })));
    });
  }, []);
  return (
    <>
      <H sub="Scheduled words (word_of_day table). A date with no word falls back to a rotating pick. Editing the schedule needs the backend.">Word of the Day</H>
      <div className="card divide-y divide-[var(--faint)]">
        {rows.map((w) => (
          <div key={w.date} className="flex items-center justify-between px-5 py-3 text-[14px]">
            <span className="text-[var(--dim)]">{w.date}</span>
            <span>
              <span lang="bal" className="nastaliq me-3 text-[20px]" style={{ lineHeight: 1.8 }}>{w.arab}</span>
              <span className="italic text-[var(--gold-bright)]">{w.latn}</span>
            </span>
            <span className="text-[var(--dim)]">{w.en}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Phase2({ name }: { name: string }) {
  return (
    <>
      <H>{name}</H>
      <div className="card max-w-[640px] p-6 text-[14px] text-[var(--dim)]">
        This screen edits the database, so it needs Supabase. Add <code className="text-[var(--text)]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="text-[var(--text)]">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code className="text-[var(--text)]">.env.local</code> (see SUPABASE.md).
      </div>
    </>
  );
}

function History({ batches, onRollback }: { batches: Batch[]; onRollback: (id: string) => void }) {
  return (
    <>
      <H sub={`${supabase ? "Batches in the database." : "Batches imported in this browser."} Rolling back removes every row of the batch that is still in the Imported state.`}>Import history</H>
      {batches.length === 0 ? (
        <p className="card p-6 text-[14px] text-[var(--dim)]">No imports yet — try Bulk import with the sample file.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead className="text-start text-[12px] text-[var(--dim)]">
              <tr>{["Batch", "When", "File", "Source / licence", "Imported", "Merged", "Skipped", ""].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t border-[var(--faint)]">
                  <td className="px-4 py-3 font-mono text-[12px]">{b.id}</td>
                  <td className="px-4 py-3 text-[var(--dim)]">{new Date(b.at).toLocaleString("en-GB")}</td>
                  <td className="px-4 py-3">{b.file}</td>
                  <td className="px-4 py-3">{b.source}<span className="block text-[12px] text-[var(--dim)]">{b.licence}</span></td>
                  <td className="px-4 py-3">{b.imported}</td>
                  <td className="px-4 py-3">{b.merged ?? 0}</td>
                  <td className="px-4 py-3">{b.skipped}</td>
                  <td className="px-4 py-3 text-end">
                    {b.status === "rolled_back" ? <span className="text-[12px] text-[var(--dim)]">rolled back</span> : <button className="chip" onClick={() => onRollback(b.id)}>Roll back</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ─────────────────────────── import wizard ─────────────────────────── */

function Importer({ onImported }: { onImported: (b: Batch) => void }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [source, setSource] = useState("");
  const [licence, setLicence] = useState("");
  const [permission, setPermission] = useState(false);
  const [mapping, setMapping] = useState<Mapping>({});
  const [filter, setFilter] = useState<"all" | "error" | "warn">("all");
  const [done, setDone] = useState<Batch | null>(null);
  const [copied, setCopied] = useState(false);

  const columns = useMemo(() => [...new Set(rows.flatMap((r) => Object.keys(r)))], [rows]);
  const checked = useMemo(() => check(rows, mapping), [rows, mapping]);
  const sum = summary(checked);

  const load = (name: string, r: Row[]) => {
    if (!r.length) return setErr("The file has no data rows.");
    setErr("");
    setFile(name);
    setRows(r);
    setMapping(guessMapping(Object.keys(r[0])));
  };

  const onFile = async (f: File) => {
    try {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext === "csv" || ext === "tsv") load(f.name, parseCSV(await f.text()));
      else if (ext === "json") load(f.name, parseJSON(await f.text()));
      else if (ext === "xlsx" || ext === "xls") load(f.name, await parseExcel(await f.arrayBuffer()));
      else setErr("Use CSV, Excel (.xlsx) or JSON.");
    } catch (e) {
      setErr(`Could not read the file: ${(e as Error).message}`);
    }
  };

  const editCell = (rowIdx: number, key: TargetKey, value: string) => {
    const col = mapping[key];
    if (!col) return;
    setRows((rs) => rs.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r)));
  };

  const canStep2 = rows.length > 0 && source.trim() && licence.trim() && permission;
  const shown = checked.filter((c) => filter === "all" || c.issues.some((i) => i.level === filter));

  const [busy, setBusy] = useState(false);
  const runImport = async () => {
    const ok = checked.filter((c) => !c.issues.some((i) => i.level === "error"));
    if (supabase) {
      setBusy(true);
      const sourceId = source.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "import";
      const fmt = file.split(".").pop()?.toLowerCase();
      const { data, error } = await supabase.rpc("dict_import", {
        p_source: { id: sourceId, name: source, licence, attribution: licence, third_party: true },
        p_file: file,
        p_format: fmt === "xlsx" || fmt === "xls" ? "xlsx" : fmt === "json" ? "json" : "csv",
        p_mapping: mapping,
        p_rows: ok.map((c) => ({ ...c.mapped, ref: c.mapped.ref || `row-${c.n}` })),
        p_permission: permission,
      });
      setBusy(false);
      if (error) return alertBox(error.message);
      const r = data as { batch: number; imported: number; merged: number; skipped: number };
      const b: Batch = { id: String(r.batch), at: new Date().toISOString(), file, source, licence, imported: r.imported, merged: r.merged, skipped: r.skipped + (checked.length - ok.length), rows: [] };
      onImported(b);
      setDone(b);
      setStep(4);
      return;
    }
    const b: Batch = {
      id: "imp-" + Date.now().toString(36),
      at: new Date().toISOString(),
      file,
      source,
      licence,
      imported: ok.length,
      skipped: checked.length - ok.length,
      rows: ok.map((c) => c.mapped),
    };
    onImported(b);
    setDone(b);
    setStep(4);
  };

  const Step = ({ n, label }: { n: number; label: string }) => (
    <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] ${step === n ? "bg-[var(--gold)] text-[var(--ink)]" : step > n ? "text-[var(--gold-bright)]" : "text-[var(--dim)]"}`}>
      <span className="font-semibold">{n}</span> {label}
    </div>
  );

  return (
    <>
      <H sub="Bring in an authorised dataset. Nothing is published by an import: every row lands as Imported and waits for review, with its source and licence attached.">Bulk import</H>
      <div className="mb-8 flex flex-wrap gap-1 rounded-full border border-[var(--faint)] p-1 w-fit">
        <Step n={1} label="Upload & source" />
        <Step n={2} label="Map fields" />
        <Step n={3} label="Preview & validate" />
        <Step n={4} label="Import" />
      </div>

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="mb-3 font-semibold">File</h2>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--faint)] p-8 text-center text-[14px] text-[var(--dim)] hover:border-[var(--gold)]/60">
              <span className="text-[28px]">⇪</span>
              <span>Choose a CSV, Excel or JSON file</span>
              <input type="file" accept=".csv,.tsv,.json,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
            <button className="chip mt-3" onClick={() => load("sample.csv", parseCSV(SAMPLE_CSV))}>Load the sample file (6 rows, with problems)</button>
            {file && <p className="mt-3 text-[14px]">Loaded <b>{file}</b> — {rows.length} rows, {columns.length} columns.</p>}
            {err && <p className="mt-3 text-[14px] text-[var(--rust)]">{err}</p>}
            <p className="mt-4 text-[12px] text-[var(--dim)]">Authorised API import uses the same mapping and checks; it needs the backend to hold the API key.</p>
          </div>
          <div className="card p-6">
            <h2 className="mb-3 font-semibold">Source and licence (required)</h2>
            <label className="mb-3 block text-[13px] text-[var(--dim)]">
              Source name
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Labzaank editorial, field notes 2026" className="mt-1 w-full rounded-lg border border-[var(--faint)] bg-white px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--gold)]/60" />
            </label>
            <label className="mb-3 block text-[13px] text-[var(--dim)]">
              Licence and attribution
              <input value={licence} onChange={(e) => setLicence(e.target.value)} placeholder="e.g. CC BY-SA 4.0 — credit: …" className="mt-1 w-full rounded-lg border border-[var(--faint)] bg-white px-3 py-2 text-[var(--text)] outline-none focus:border-[var(--gold)]/60" />
            </label>
            <label className="flex items-start gap-3 text-[13px]">
              <input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} className="mt-1" />
              <span>We own this data or hold written permission to import and publish it. Third-party entries will be credited, never presented as our own research.</span>
            </label>
          </div>
          <div className="lg:col-span-2">
            <button className="pill pill-gold disabled:opacity-40" disabled={!canStep2} onClick={() => setStep(2)}>Next: map fields →</button>
            {!canStep2 && <span className="ms-3 text-[12px] text-[var(--dim)]">Needs a file, a source, a licence and the permission box.</span>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card max-w-[760px] p-6">
          <h2 className="mb-1 font-semibold">Match your columns to dictionary fields</h2>
          <p className="mb-5 text-[13px] text-[var(--dim)]">Guessed from the column names — check each one.</p>
          <div className="grid gap-3">
            {TARGET_FIELDS.map((f) => (
              <label key={f.key} className="grid grid-cols-[1fr_1fr] items-center gap-4 text-[14px]">
                <span>
                  {f.label} {"required" in f && f.required && <span className="text-[var(--rust)]">*</span>}
                </span>
                <select
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                  className="rounded-lg border border-[var(--faint)] bg-[var(--ink-2)] px-3 py-2 outline-none"
                >
                  <option value="">— not in file —</option>
                  {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button className="chip" onClick={() => setStep(1)}>← Back</button>
            <button className="pill pill-gold disabled:opacity-40" disabled={!mapping.arab} onClick={() => setStep(3)}>Next: preview →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Rows", sum.total, ""],
              ["Ready", sum.clean, "text-[var(--gold)]"],
              ["Warnings", sum.warnings, "text-[#e2b04a]"],
              ["Errors (skipped)", sum.errors, "text-[var(--rust)]"],
              ["Duplicates", sum.duplicates, ""],
            ].map(([l, n, c]) => (
              <div key={l as string} className="card p-4">
                <div className={`text-[26px] font-semibold ${c}`}>{n as number}</div>
                <div className="text-[12px] text-[var(--dim)]">{l as string}</div>
              </div>
            ))}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
            {(["all", "error", "warn"] as const).map((f) => (
              <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f === "all" ? "All rows" : f === "error" ? "Errors" : "Warnings"}</button>
            ))}
            <span className="ms-auto text-[12px] text-[var(--dim)]">Click a cell to fix it — checks re-run as you type.</span>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[900px] text-[14px]">
              <thead className="text-[12px] text-[var(--dim)]">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">Row</th>
                  {(["arab", "latn", "pos", "gloss_en", "gloss_ur", "gloss_brh"] as TargetKey[]).map((k) => (
                    <th key={k} className="px-3 py-2 text-start font-medium">{TARGET_FIELDS.find((f) => f.key === k)!.label.replace(" meaning", "")}</th>
                  ))}
                  <th className="px-3 py-2 text-start font-medium">Checks</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => {
                  const ri = c.n - 2;
                  const bad = c.issues.some((i) => i.level === "error");
                  return (
                    <tr key={c.n} className={`border-t border-[var(--faint)] align-top ${bad ? "bg-[var(--rust)]/10" : ""}`}>
                      <td className="px-3 py-2 text-[var(--dim)]">{c.n}</td>
                      {(["arab", "latn", "pos", "gloss_en", "gloss_ur", "gloss_brh"] as TargetKey[]).map((k) => {
                        const v = c.mapped[k] ?? "";
                        const rtl = detectScript(v) === "arab";
                        return (
                          <td key={k} className="px-1 py-1">
                            <input
                              value={v}
                              disabled={!mapping[k]}
                              onChange={(e) => editCell(ri, k, e.target.value)}
                              dir={rtl ? "rtl" : "ltr"}
                              lang={rtl ? "bal" : undefined}
                              className="w-full min-w-[90px] rounded-md bg-transparent px-2 py-1 outline-none hover:bg-[var(--ink-2)] focus:bg-[var(--ink-3)] disabled:opacity-30"
                            />
                          </td>
                        );
                      })}
                      <td className="px-3 py-2">
                        {c.issues.length === 0 ? (
                          <span className="text-[var(--gold)]">Ready</span>
                        ) : (
                          <ul className="flex flex-col gap-1 text-[12px]">
                            {c.issues.map((i, j) => (
                              <li key={j} className={i.level === "error" ? "text-[var(--rust)]" : "text-[#e2b04a]"}>
                                {i.level === "error" ? "✕" : "!"} {i.msg}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="chip" onClick={() => setStep(2)}>← Back</button>
            <button
              className="chip"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(errorReport(checked));
                } catch {}
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Error report copied" : "Copy error report (CSV)"}
            </button>
            <button className="pill pill-gold disabled:opacity-40" disabled={busy || sum.total - sum.errors === 0} onClick={runImport}>
              Import {sum.total - sum.errors} rows as “Imported” →
            </button>
          </div>
        </>
      )}

      {step === 4 && done && (
        <div className="card max-w-[640px] p-6">
          <h2 className="text-[20px] font-semibold text-[var(--gold-bright)]">Batch {done.id} imported</h2>
          <p className="mt-2 text-[14px] text-[var(--dim)]">
            {done.imported} new words are now <b className="text-[var(--text)]">Imported</b> and waiting for review{done.merged ? `; ${done.merged} rows were added as extra meanings of existing words (nothing overwritten)` : ""}; {done.skipped} rows with errors were skipped. Source “{done.source}” and licence “{done.licence}” are attached to every row.
          </p>
          <div className="mt-5 flex gap-3">
            <a href="#history" className="pill pill-line">Import history</a>
            <button
              className="chip"
              onClick={() => {
                setStep(1);
                setRows([]);
                setFile("");
                setDone(null);
              }}
            >
              New import
            </button>
          </div>
        </div>
      )}
    </>
  );
}
