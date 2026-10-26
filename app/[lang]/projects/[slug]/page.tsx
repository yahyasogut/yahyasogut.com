import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEntries, getEntry } from "@/lib/content";
import { locales, type Locale } from "@/lib/i18n";
import EntryDetail from "@/components/EntryDetail";

export const dynamicParams = false;

export function generateStaticParams({ params }: { params: { lang: string } }) {
  const langs = (params?.lang ? [params.lang] : locales) as Locale[];
  return langs.flatMap((lang) => getEntries("projects", lang).map((e) => ({ lang, slug: e.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: Locale; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const e = getEntry("projects", lang, slug);
  if (!e) return {};
  return {
    title: e.title,
    description: e.summary,
    openGraph: { type: "article", title: e.title, description: e.summary, publishedTime: e.date, images: e.cover ? [e.cover] : ["/og.jpg"] },
  };
}

export default async function Page({ params }: { params: Promise<{ lang: Locale; slug: string }> }) {
  const { lang, slug } = await params;
  const e = getEntry("projects", lang, slug);
  if (!e) notFound();
  return <EntryDetail e={e} lang={lang} />;
}
