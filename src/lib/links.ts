/**
 * Page links that work both in `next dev` (/dictionary) and in the static
 * export served from any folder (./dictionary.html). When the app moves to a
 * Next server, replace with plain "/dictionary" routes.
 */
const prod = process.env.NODE_ENV === "production";
export type PageName = "home" | "dictionary" | "admin" | "poets" | "poetry" | "library" | "articles" | "media" | "about" | "privacy" | "terms" | "contact";
export function page(p: PageName, hash = ""): string {
  const h = hash ? `#${hash}` : "";
  if (p === "home") return (prod ? "./index.html" : "/") + h;
  return (prod ? `./${p}.html` : `/${p}`) + h;
}
