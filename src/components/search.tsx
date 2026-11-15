/** Open the site-wide search overlay (optionally with a query already typed). */
export function openSearch(q = "") {
  window.dispatchEvent(new CustomEvent("labzank:search", { detail: q }));
}

export function SearchIcon({ className = "text-[var(--gold)]", size = 18 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={`shrink-0 ${className}`} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
