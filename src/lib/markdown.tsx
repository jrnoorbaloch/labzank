/**
 * Small, safe Markdown renderer for CMS text (articles, static pages).
 * Builds React elements directly — no raw HTML is ever injected.
 * Supports: ## / ### headings, paragraphs, - / 1. lists, > quotes, ---, **bold**, *italic*,
 * `code`, [links](url). Links are limited to http(s), mailto and in-site pages.
 */
import { Fragment, ReactNode } from "react";
import { page, PageName } from "./links";

const PAGES: PageName[] = ["home", "dictionary", "poets", "poetry", "library", "articles", "media", "about", "privacy", "terms", "contact"];

function safeHref(raw: string): { href: string; external: boolean } | null {
  const h = raw.trim();
  if (/^https?:\/\//i.test(h)) return { href: h, external: true };
  if (/^mailto:/i.test(h)) return { href: h, external: false };
  if (/^#[\w-]*$/.test(h)) return { href: h, external: false };
  const m = h.match(/^(?:\.\/|\/)?([a-z]+)(?:\.html)?(?:#([\w=%.-]*))?$/);
  if (m && PAGES.includes(m[1] as PageName)) return { href: page(m[1] as PageName, m[2] ?? ""), external: false };
  return null; // anything else (javascript:, data:, odd paths) is shown as plain text
}

function inline(text: string, key = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[2]) out.push(<strong key={k}>{inline(m[2], k)}</strong>);
    else if (m[4]) out.push(<em key={k}>{inline(m[4], k)}</em>);
    else if (m[6]) out.push(<code key={k} className="rounded bg-[var(--ink-3)] px-1 text-[0.92em]">{m[6]}</code>);
    else if (m[8]) {
      const l = safeHref(m[9]);
      out.push(
        l ? (
          <a key={k} href={l.href} className="text-[var(--gold)] underline underline-offset-2 hover:text-[var(--gold-bright)]" {...(l.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
            {inline(m[8], k)}
          </a>
        ) : (
          <Fragment key={k}>{m[8]}</Fragment>
        )
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let b = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const k = `b${b++}`;
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      const level = m[1].length;
      const cls = level <= 2 ? "mt-10 mb-3 text-[1.45em] font-semibold" : "mt-8 mb-2 text-[1.2em] font-semibold";
      blocks.push(level <= 2 ? <h2 key={k} className={`display ${cls}`}>{inline(m[2], k)}</h2> : <h3 key={k} className={cls}>{inline(m[2], k)}</h3>);
      i++;
    } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(<hr key={k} className="my-8 border-[var(--faint)]" />);
      i++;
    } else if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push(<blockquote key={k} className="my-5 border-s-4 border-[var(--gold)]/60 ps-4 italic text-[var(--dim)]">{inline(q.join(" "), k)}</blockquote>);
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={k} className={`my-4 space-y-1.5 ps-6 ${ordered ? "list-decimal" : "list-disc"} marker:text-[var(--gold)]`}>
          {items.map((it, j) => <li key={j}>{inline(it, `${k}-${j}`)}</li>)}
        </Tag>
      );
    } else {
      const p: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\s*([-*]|\d+\.)\s+|-{3,}$)/.test(lines[i])) p.push(lines[i++]);
      blocks.push(<p key={k} className="my-4">{inline(p.join(" "), k)}</p>);
    }
  }
  return <div className={className}>{blocks}</div>;
}
