import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Labzank — Balochi Literature & Heritage",
    short_name: "Labzank",
    description: "Balochi poetry, poets, books and dictionary — in Balochi, English and Urdu.",
    start_url: "./",
    display: "standalone",
    background_color: "#0d0a07",
    theme_color: "#0d0a07",
    icons: [{ src: "favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
