/** Public address of the site, used for the sitemap, robots.txt and social share links. Set NEXT_PUBLIC_SITE_URL when you deploy. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://labzank.example").replace(/\/$/, "");
