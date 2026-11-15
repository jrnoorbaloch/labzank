"use client";

import { useBranding } from "@/lib/branding";

/**
 * The site's logo: the uploaded image if there is one (Admin → Site → Branding),
 * otherwise the site name as a wordmark in Merriweather Heavy.
 * `variant="dark"` is for dark backgrounds (footer) and uses the dark-background logo.
 */
export default function Logo({
  className = "text-[23px] text-[var(--text)]",
  imgClass = "h-[34px]",
  variant = "light",
}: {
  className?: string;
  imgClass?: string;
  variant?: "light" | "dark";
}) {
  const b = useBranding();
  const src = variant === "dark" ? b.logoDarkUrl : b.logoUrl;
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={b.name} className={`w-auto max-w-[220px] object-contain ${imgClass}`} data-logo="image" />;
  return (
    <span
      className={`font-black leading-none tracking-[-0.01em] ${className}`}
      style={{ fontFamily: "var(--latin-display)" }}
      lang="en"
      dir="ltr"
      data-logo="text"
    >
      {b.name}
    </span>
  );
}
