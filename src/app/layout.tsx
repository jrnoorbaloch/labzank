import type { Metadata, Viewport } from "next";
import "@fontsource/noto-nastaliq-urdu/arabic-400.css";
import "@fontsource/noto-nastaliq-urdu/arabic-700.css";
import "@fontsource/noto-naskh-arabic/arabic-400.css";
import "@fontsource/noto-naskh-arabic/arabic-600.css";
import "@fontsource/fraunces/latin-400.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/fraunces/latin-400-italic.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/fraunces/latin-ext-400.css";
import "@fontsource/fraunces/latin-ext-400-italic.css";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import { ContentProvider } from "@/lib/content-store";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Labzank — Balochi Literature & Heritage",
  description:
    "A digital home for Balochi poetry, poets, books, the Balochi dictionary and cultural heritage — in Balochi, English and Urdu.",
  keywords: ["Balochi", "Balochi poetry", "Balochi dictionary", "Balochi literature", "Baloch poets", "بلوچی", "بلوچی شاعری", "Labzank"],
  openGraph: {
    title: "Labzank — Balochi Literature & Heritage",
    description: "Balochi poetry, poets, books, dictionary and heritage — in Balochi, English and Urdu.",
    type: "website",
    siteName: "Labzank",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Labzank — Balochi literature & heritage" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = { themeColor: "#0d0a07" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // English is the default interface language; LangProvider applies the
  // admin's language settings and the visitor's choice on the client.
  return (
    <html lang="en" dir="ltr" className="lang-en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LangProvider>
          <ContentProvider>{children}</ContentProvider>
        </LangProvider>
      </body>
    </html>
  );
}
