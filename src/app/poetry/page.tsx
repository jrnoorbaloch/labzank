import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { PoetryPage } from "@/components/pages/Literature";

export const metadata: Metadata = {
  title: "Balochi Poetry — Labzaank",
  description: "Balochi poetry in Arabic script with Roman Balochi and approved English and Urdu translations.",
  alternates: { canonical: "/poetry.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <div className="grain" aria-hidden />
      <Nav onHome={false} active="nav.poetry" />
      <main>
        <PoetryPage />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
