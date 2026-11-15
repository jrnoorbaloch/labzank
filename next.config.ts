import type { NextConfig } from "next";

/**
 * Static export with RELATIVE asset paths so the build runs from any subpath
 * (GitHub Pages /<repo>/, an artifact host, a CDN folder).
 * When the CMS + Postgres backend lands, drop `output: "export"` and deploy as
 * a normal Next server (SSR pages, API routes, /admin).
 */
const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: process.env.NODE_ENV === "production" ? "." : undefined,
  images: { unoptimized: true },
  trailingSlash: false, // → out/index.html, out/dictionary.html, out/admin.html
};

export default nextConfig;
