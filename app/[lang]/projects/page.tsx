import type { Metadata } from "next";
import { dict, type Locale } from "@/lib/i18n";
import { getEntries } from "@/lib/content";
import { PageHead, ProjectCard } from "@/components/Cards";

export async function generateMetadata({ params }: { params: Promise<{ lang: Locale }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[lang].pages.projects.title, description: dict[lang].pages.projects.lead };
}

export default async function Page({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = dict[lang];
  const items = getEntries("projects", lang);
  return (
    <>
      <PageHead title={t.pages.projects.title} lead={t.pages.projects.lead} />
      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((e, i) => <ProjectCard key={e.slug} e={e} lang={lang} i={i} />)}
        </div>
      ) : <p className="text-ink-2">{t.meta.empty}</p>}
    </>
  );
}
