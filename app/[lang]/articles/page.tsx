import type { Metadata } from "next";
import { dict, type Locale } from "@/lib/i18n";
import { getEntries } from "@/lib/content";
import { ArticleRow, PageHead } from "@/components/Cards";

export async function generateMetadata({ params }: { params: Promise<{ lang: Locale }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[lang].pages.articles.title, description: dict[lang].pages.articles.lead };
}

export default async function Page({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = dict[lang];
  const items = getEntries("articles", lang);
  return (
    <>
      <PageHead title={t.pages.articles.title} lead={t.pages.articles.lead} />
      {items.length ? (
        <div className="border-b border-line">
          {items.map((e, i) => <ArticleRow key={e.slug} e={e} lang={lang} t={t} i={i} />)}
        </div>
      ) : <p className="text-ink-2">{t.meta.empty}</p>}
    </>
  );
}
