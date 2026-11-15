import SmoothScroll from "@/components/SmoothScroll";
import Nav from "@/components/Nav";
import ScrollFilm from "@/components/ScrollFilm";
import BrandSections from "@/components/BrandSections";
import SearchOverlay from "@/components/SearchOverlay";

export default function Home() {
  return (
    <SmoothScroll>
      <div className="grain" aria-hidden />
      <Nav />
      <main>
        <ScrollFilm />
        <BrandSections />
      </main>
      <SearchOverlay />
    </SmoothScroll>
  );
}
