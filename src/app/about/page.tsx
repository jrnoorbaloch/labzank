import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { StaticPage } from "@/components/pages/Extra";

export const metadata: Metadata = {
  title: "About — Labzaank",
  description: "About Labzaank, the digital home for Balochi literature.",
  alternates: { canonical: "/about.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <Nav onHome={false} active="nav.about" />
      <main>
        <StaticPage slug="about" />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
