import Nav from "@/components/Nav";
import HeroCarousel from "@/components/HeroCarousel";
import BrandSections from "@/components/BrandSections";
import SearchOverlay from "@/components/SearchOverlay";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <HeroCarousel />
        <BrandSections />
      </main>
      <SearchOverlay />
    </>
  );
}
