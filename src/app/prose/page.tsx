import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { ProsePage } from "@/components/pages/Extra";

export const metadata: Metadata = {
  title: "Balochi prose — short stories, essays and tales · Labzaank",
  description: "Balochi short stories (afsana), essays, tales, travelogues and memoirs, with translations.",
  alternates: { canonical: "/prose.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <Nav onHome={false} active="nav.prose" />
      <main>
        <ProsePage />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
