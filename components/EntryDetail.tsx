import Link from "next/link";
import type { Entry } from "@/lib/content";
import { dict, formatDate, type Locale } from "@/lib/i18n";
import { site } from "@/site.config";
import { Reveal } from "./motion";
import { Tag } from "./Cards";

export default function EntryDetail({ e, lang }: { e: Entry; lang: Locale }) {
  const t = dict[lang];
  const backHref = `/${lang}/${e.kind}/`;
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${site.url}/${lang}/${e.kind}/${e.slug}/`)}`;

  return (
    <article className="mx-auto max-w-3xl pb-10 pt-32 md:pt-40">
      <Reveal>
        <Link href={backHref} className="text-sm text-ink-2 hover:text-ink">← {t.nav[e.kind]}</Link>
        <h1 className="mt-6 font-display text-4xl leading-[1.08] tracking-tight md:text-6xl">{e.title}</h1>
        <p className="mt-5 text-xl leading-relaxed text-ink-2">{e.summary}</p>

        <dl className="mt-10 grid grid-cols-2 gap-6 border-y border-line py-5 text-sm md:grid-cols-4">
          <div><dt className="text-ink-2">{t.meta.publishedOn}</dt><dd className="mt-1">{formatDate(e.date, lang)}</dd></div>
          {e.role && <div><dt className="text-ink-2">{lang === "tr" ? "Rol" : "Role"}</dt><dd className="mt-1">{e.role}</dd></div>}
          {e.status && <div><dt className="text-ink-2">{lang === "tr" ? "Durum" : "Status"}</dt><dd className="mt-1">{e.status}</dd></div>}
          <div><dt className="text-ink-2">{lang === "tr" ? "Okuma" : "Reading"}</dt><dd className="mt-1">{e.readingMinutes} {t.meta.minRead}</dd></div>
        </dl>
      </Reveal>

      {e.cover && <img src={e.cover} alt="" className="mt-10 w-full rounded-2xl border border-line" />}

      <Reveal delay={0.1}>
        <div
          className="prose prose-site prose-lg mt-12 max-w-none prose-headings:font-display prose-headings:font-semibold prose-h2:text-3xl prose-blockquote:font-display prose-blockquote:text-2xl prose-blockquote:font-medium prose-blockquote:not-italic"
          dangerouslySetInnerHTML={{ __html: e.html }}
        />
      </Reveal>

      <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
        <div className="flex flex-wrap gap-1.5">{e.tags.map((x) => <Tag key={x}>{x}</Tag>)}</div>
        <div className="flex gap-2">
          {e.linkedinUrl && (
            <a href={e.linkedinUrl} target="_blank" rel="noopener" className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
              {t.meta.readOn} ↗
            </a>
          )}
          <a href={shareUrl} target="_blank" rel="noopener" className="rounded-full bg-ink px-4 py-2 text-sm text-paper hover:bg-accent">
            {lang === "tr" ? "Paylaş" : "Share"} ↗
          </a>
        </div>
      </div>
    </article>
  );
}
