import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { dict, isLocale, locales } from "@/lib/i18n";
import { site } from "@/site.config";


export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = isLocale(lang) ? lang : "tr";
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name} — ${site.role[l]}`, template: `%s · ${site.name}` },
    description: site.headline[l],
    alternates: {
      canonical: `/${l}/`,
      languages: { tr: "/tr/", en: "/en/" },
      types: { "application/rss+xml": `/${l}/feed.xml` },
    },
    openGraph: { type: "website", siteName: site.name, locale: l === "tr" ? "tr_TR" : "en_US", images: ["/og.jpg"] },
    twitter: { card: "summary_large_image" },
    icons: { icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/favicon.ico" }], apple: "/apple-touch-icon.png" },
  };
}

// Tema tercihini sayfa boyanmadan önce uygular (yanıp sönmeyi önler)
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = dict[lang];

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain min-h-screen font-sans">
        <Header lang={lang} t={t} />
        <main className="mx-auto max-w-6xl px-5 md:px-8">{children}</main>
        <Footer lang={lang} t={t} />
      </body>
    </html>
  );
}
