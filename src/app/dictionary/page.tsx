import type { Metadata } from "next";
import Nav from "@/components/Nav";
import DictionaryApp from "@/components/dictionary/DictionaryApp";
import SearchOverlay from "@/components/SearchOverlay";

export const metadata: Metadata = {
  title: "Balochi Dictionary — Labzank",
  description: "Search Balochi words in Arabic or Latin script, with meanings in Balochi, English, Urdu and Brahui.",
  alternates: { canonical: "/dictionary.html" },
};

export default function DictionaryPage() {
  return (
    <>
      <div className="grain" aria-hidden />
      <Nav onHome={false} active="nav.dictionary" />
      <main>
        <DictionaryApp />
      </main>
      <SearchOverlay />
    </>
  );
}
