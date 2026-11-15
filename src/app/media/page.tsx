import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { MediaPage } from "@/components/pages/Extra";

export const metadata: Metadata = {
  title: "Audio & Video — Labzaank",
  description: "Recitations, readings and videos of Balochi poetry and literature.",
  alternates: { canonical: "/media.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <Nav onHome={false} active="nav.media" />
      <main>
        <MediaPage />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
