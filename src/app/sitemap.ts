import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// Main pages. Individual poets/poems/books open via #slug on these pages, which search engines treat as the same URL.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/poetry.html`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/poets.html`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/library.html`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/dictionary.html`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/prose.html`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/articles.html`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/media.html`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/about.html`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact.html`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/privacy.html`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms.html`, changeFrequency: "yearly", priority: 0.2 },
  ].map((e) => ({ ...e, lastModified: now })) as MetadataRoute.Sitemap;
}
