import Link from "next/link";
import type { Entry } from "@/lib/content";
import { formatDate, type Dict, type Locale } from "@/lib/i18n";
import { Reveal } from "./motion";

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2">{children}</span>;
}

export function ProjectCard({ e, lang, i = 0 }: { e: Entry; lang: Locale; i?: number }) {
  return (
    <Reveal delay={i * 0.08}>
      <Link href={`/${lang}/projects/${e.slug}/`} className="group block h-full rounded-2xl border border-line bg-paper-2/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)] md:p-7">
        <div className="mb-10 flex items-center justify-between text-xs text-ink-2">
          <span className="font-mono uppercase tracking-wider">{new Date(e.date).getFullYear()}</span>
          {e.status && <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{e.status}</span>}
        </div>
        <h3 className="font-display text-2xl leading-tight md:text-[1.75rem]">{e.title}</h3>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-2">{e.summary}</p>
        <div className="mt-6 flex flex-wrap gap-1.5">{e.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}</div>
        <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-accent">
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </Link>
    </Reveal>
  );
}

export function ArticleRow({ e, lang, t, i = 0 }: { e: Entry; lang: Locale; t: Dict; i?: number }) {
  return (
    <Reveal delay={i * 0.06}>
      <Link href={`/${lang}/articles/${e.slug}/`} className="group grid gap-2 border-t border-line py-7 md:grid-cols-[160px_1fr_auto] md:items-baseline md:gap-8">
        <time className="font-mono text-xs uppercase tracking-wider text-ink-2">{formatDate(e.date, lang)}</time>
        <div>
          <h3 className="font-display text-2xl leading-snug transition-colors group-hover:text-accent md:text-[1.7rem]">{e.title}</h3>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-2">{e.summary}</p>
        </div>
        <span className="text-sm text-ink-2">{e.readingMinutes} {t.meta.minRead}</span>
      </Link>
    </Reveal>
  );
}

export function PostCard({ e, lang, t, i = 0 }: { e: Entry; lang: Locale; t: Dict; i?: number }) {
  return (
    <Reveal delay={i * 0.06} className="break-inside-avoid">
      <article id={e.slug} className="mb-5 scroll-mt-24 rounded-2xl border border-line bg-paper p-6">
        <div className="mb-4 flex items-center gap-2 font-mono text-xs text-ink-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#0a66c2]"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>
          <time>{formatDate(e.date, lang)}</time>
        </div>
        <div className="prose prose-site max-w-none text-[0.97rem] leading-relaxed prose-p:my-2" dangerouslySetInnerHTML={{ __html: e.html }} />
        {e.linkedinUrl && (
          <a href={e.linkedinUrl} target="_blank" rel="noopener" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            {t.meta.readOn} ↗
          </a>
        )}
      </article>
    </Reveal>
  );
}

export function SectionHead({ title, href, more }: { title: string; href?: string; more?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
      {href && (
        <Link href={href} className="group shrink-0 text-sm text-ink-2 hover:text-ink">
          {more} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}

export function PageHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="pb-12 pt-36 md:pb-16 md:pt-44">
      <Reveal>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-7xl">{title}</h1>
        {lead && <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">{lead}</p>}
      </Reveal>
    </div>
  );
}
