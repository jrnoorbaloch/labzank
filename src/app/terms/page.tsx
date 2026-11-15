import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { StaticPage } from "@/components/pages/Extra";

export const metadata: Metadata = {
  title: "Terms of use — Labzaank",
  description: "Terms for using Labzaank.",
  alternates: { canonical: "/terms.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <Nav onHome={false} active="nav.terms" />
      <main>
        <StaticPage slug="terms" />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
