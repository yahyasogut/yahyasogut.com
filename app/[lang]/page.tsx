import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { getEntries } from "@/lib/content";
import { site } from "@/site.config";
import { Reveal, SplitHeadline } from "@/components/motion";
import ContactGrid from "@/components/ContactGrid";
import { ArticleRow, PostCard, ProjectCard, SectionHead } from "@/components/Cards";

export default async function Home({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = dict[lang];
  const projects = getEntries("projects", lang).slice(0, 3);
  const articles = getEntries("articles", lang).slice(0, 3);
  const posts = getEntries("posts", lang).slice(0, 3);

  return (
    <>
      {/* HERO */}
      <section className="relative flex min-h-[80vh] flex-col justify-center pb-16 pt-32">
        <Reveal>
          <p className="mb-8 flex items-center gap-3 font-mono text-xs uppercase tracking-wider text-ink-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {site.role[lang]} · {site.org} · {site.location[lang]}
          </p>
        </Reveal>
        <SplitHeadline text={site.headline[lang]} className="max-w-5xl font-display text-[2.6rem] leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-[5.4rem]" />
        <Reveal delay={0.6}>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link href={`/${lang}/projects/`} className="group rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-accent">
              {t.hero.cta1} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <a href={site.linkedin} target="_blank" rel="noopener" className="rounded-full border border-line px-6 py-3 text-sm font-medium transition-colors hover:border-ink">
              {t.hero.cta2} ↗
            </a>
          </div>
        </Reveal>
      </section>

      {/* ODAK ALANLARI */}
      <section className="border-y border-line py-10">
        <Reveal>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
            <p className="shrink-0 text-sm text-ink-2">{t.sections.focus}</p>
            <ul className="flex flex-wrap gap-x-8 gap-y-3 font-display text-2xl md:text-3xl">
              {site.focus[lang].map((f, i) => (
                <li key={f} className="flex items-center gap-8">
                  {f}
                  {i < site.focus[lang].length - 1 && <span className="hidden font-mono text-base text-accent md:inline">/</span>}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* RAKAMLAR */}
      <section className="pt-16">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 md:grid-cols-5">
          {site.stats.map((s, i) => (
            <Reveal key={i} delay={i * 0.05} className={`bg-paper px-5 py-6 ${i === site.stats.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
              <p className="font-display text-4xl tabular-nums text-accent md:text-5xl">{s.value}</p>
              <p className="mt-1.5 text-sm text-ink-2">{s.label[lang]}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PROJELER */}
      <section className="pt-28">
        <SectionHead title={t.sections.latestProjects} href={`/${lang}/projects/`} more={t.sections.seeAll} />
        <div className="grid gap-5 md:grid-cols-3">
          {projects.map((e, i) => <ProjectCard key={e.slug} e={e} lang={lang} i={i} />)}
        </div>
      </section>

      {/* MAKALELER */}
      <section className="pt-28">
        <SectionHead title={t.sections.latestArticles} href={`/${lang}/articles/`} more={t.sections.seeAll} />
        <div className="border-b border-line">
          {articles.map((e, i) => <ArticleRow key={e.slug} e={e} lang={lang} t={t} i={i} />)}
        </div>
      </section>

      {/* LINKEDIN NOTLARI */}
      <section className="pt-28">
        <SectionHead title={t.sections.latestPosts} href={`/${lang}/posts/`} more={t.sections.seeAll} />
        <div className="columns-1 gap-5 md:columns-3">
          {posts.map((e, i) => <PostCard key={e.slug} e={e} lang={lang} t={t} i={i} />)}
        </div>
      </section>

      {/* İLETİŞİM */}
      <section className="pt-28">
        <SectionHead title={t.contact.heading} href={`/${lang}/contact/`} more={t.nav.contact} />
        <Reveal>
          <ContactGrid lang={lang} t={t} />
        </Reveal>
      </section>
    </>
  );
}
