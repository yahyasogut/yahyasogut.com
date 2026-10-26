import type { Metadata } from "next";
import { dict, type Locale } from "@/lib/i18n";
import { site } from "@/site.config";
import { PageHead } from "@/components/Cards";
import { Reveal } from "@/components/motion";

export async function generateMetadata({ params }: { params: Promise<{ lang: Locale }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[lang].pages.contact.title };
}

export default async function Page({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = dict[lang];
  const rows = [
    { k: t.contact.email, v: site.email, href: `mailto:${site.email}` },
    { k: t.contact.linkedin, v: site.linkedin.replace("https://www.", ""), href: site.linkedin },
    { k: t.contact.location, v: site.location[lang] },
  ];
  return (
    <>
      <PageHead title={t.pages.contact.title} lead={t.pages.contact.lead} />
      <Reveal>
        <dl className="border-t border-line">
          {rows.map((r) => (
            <div key={r.k} className="grid gap-1 border-b border-line py-6 md:grid-cols-[200px_1fr]">
              <dt className="text-sm text-ink-2">{r.k}</dt>
              <dd className="font-display text-2xl md:text-3xl">
                {r.href ? <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noopener" className="hover:text-accent">{r.v}</a> : r.v}
              </dd>
            </div>
          ))}
        </dl>
        <a href={`mailto:${site.email}`} className="mt-10 inline-block rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-accent">
          {t.contact.write} →
        </a>
      </Reveal>
    </>
  );
}
