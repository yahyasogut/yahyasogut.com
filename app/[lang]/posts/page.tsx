import type { Metadata } from "next";
import { dict, type Locale } from "@/lib/i18n";
import { getEntries } from "@/lib/content";
import { PageHead, PostCard } from "@/components/Cards";

export async function generateMetadata({ params }: { params: Promise<{ lang: Locale }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[lang].pages.posts.title, description: dict[lang].pages.posts.lead };
}

export default async function Page({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = dict[lang];
  const items = getEntries("posts", lang);
  return (
    <>
      <PageHead title={t.pages.posts.title} lead={t.pages.posts.lead} />
      {items.length ? (
        <div className="columns-1 gap-5 md:columns-2 lg:columns-3">
          {items.map((e, i) => <PostCard key={e.slug} e={e} lang={lang} t={t} i={i % 6} />)}
        </div>
      ) : <p className="text-ink-2">{t.meta.empty}</p>}
    </>
  );
}
