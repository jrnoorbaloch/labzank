import Nav from "@/components/Nav";
import SmoothScroll from "@/components/SmoothScroll";
import HeroCarousel from "@/components/HeroCarousel";
import BrandSections from "@/components/BrandSections";
import SearchOverlay from "@/components/SearchOverlay";

export default function Home() {
  return (
    <SmoothScroll>
      <Nav />
      <main>
        <HeroCarousel />
        <BrandSections />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
