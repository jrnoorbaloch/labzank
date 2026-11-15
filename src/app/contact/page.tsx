import type { Metadata } from "next";
import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import SearchOverlay from "@/components/SearchOverlay";
import { ContactPage } from "@/components/pages/Extra";

export const metadata: Metadata = {
  title: "Contact — Labzaank",
  description: "Write to the Labzaank team about texts, translations, recordings, corrections or rights.",
  alternates: { canonical: "/contact.html" },
};

export default function Page() {
  return (
    <SmoothScroll>
      <Nav onHome={false} active="nav.contact" />
      <main>
        <ContactPage />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
