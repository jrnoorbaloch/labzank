/** The wordmark: just "Labzaank", set in Merriweather Heavy. */
export default function Logo({ className = "text-[23px] text-[var(--text)]" }: { className?: string }) {
  return (
    <span
      className={`font-black leading-none tracking-[-0.01em] ${className}`}
      style={{ fontFamily: "var(--latin-display)" }}
      lang="en"
      dir="ltr"
      data-logo
    >
      Labzaank
    </span>
  );
}
