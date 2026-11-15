import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SearchOverlay from "@/components/SearchOverlay";
import { PoetsPage } from "@/components/pages/Literature";

export const metadata: Metadata = {
  title: "Balochi Poets & Authors — Labzank",
  description: "Profiles of classical and modern Balochi poets and writers, with their poetry, books and recitations.",
  alternates: { canonical: "/poets.html" },
};

export default function Page() {
  return (
    <>
      <div className="grain" aria-hidden />
      <Nav onHome={false} active="nav.poets" />
      <main>
        <PoetsPage />
      </main>
      <SearchOverlay />
    </>
  );
}
