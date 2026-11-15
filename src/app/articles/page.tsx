import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { ArticlesPage } from "@/components/pages/Extra";

export const metadata: Metadata = {
  title: "Labzaank blog — Essays, news and research",
  description: "Essays, news, interviews and research on Balochi literature and language.",
  alternates: { canonical: "/articles.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <Nav onHome={false} active="nav.articles" />
      <main>
        <ArticlesPage />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
