import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { StaticPage } from "@/components/pages/Extra";

export const metadata: Metadata = {
  title: "Privacy policy — Labzaank",
  description: "How Labzaank handles personal data.",
  alternates: { canonical: "/privacy.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <Nav onHome={false} active="nav.privacy" />
      <main>
        <StaticPage slug="privacy" />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
