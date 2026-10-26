import type { Metadata } from "next";
import { dict, type Locale } from "@/lib/i18n";
import { site } from "@/site.config";
import { PageHead } from "@/components/Cards";
import { Reveal } from "@/components/motion";

export async function generateMetadata({ params }: { params: Promise<{ lang: Locale }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[lang].pages.about.title };
}

export default async function Page({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = dict[lang];
  return (
    <>
      <PageHead title={t.pages.about.title} />
      <div className="grid gap-16 md:grid-cols-[1fr_1.4fr]">
        <Reveal>
          {/* TODO: public/portrait.jpg ekleyip aşağıdaki div'i <img src="/portrait.jpg" .../> ile değiştir */}
          <div className="grid aspect-[4/5] place-items-center rounded-2xl border border-line bg-paper-2 font-display text-8xl text-ink-2/40">
            {site.initials}
          </div>
        </Reveal>
        <div>
          <Reveal>
            <p className="font-display text-3xl leading-snug md:text-4xl">{site.headline[lang]}</p>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-2">
              {site.bio[lang].map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <ol className="mt-14 border-t border-line">
              {site.timeline.map((r, i) => (
                <li key={i} className="grid grid-cols-[90px_1fr] gap-4 border-b border-line py-5">
                  <span className="font-mono text-sm text-ink-2">{r.year}</span>
                  <span>{r[lang]}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </>
  );
}
