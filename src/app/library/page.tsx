import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { LibraryPage } from "@/components/pages/Literature";

export const metadata: Metadata = {
  title: "Balochi Library — Labzaank",
  description: "Books on Balochi poetry, literature, history and language.",
  alternates: { canonical: "/library.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <div className="grain" aria-hidden />
      <Nav onHome={false} active="nav.books" />
      <main>
        <LibraryPage />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
