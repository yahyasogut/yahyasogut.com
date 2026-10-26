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
  const L = lang === "tr"
    ? { story: "Hikâyem", career: "Kariyer yolculuğu", edu: "Eğitim", focus: "Odak alanları", contact: "Birlikte çalışalım" }
    : { story: "My story", career: "Career journey", edu: "Education", focus: "Focus areas", contact: "Let's work together" };

  return (
    <>
      <PageHead title={t.pages.about.title} />

      {/* Görsel + giriş */}
      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:gap-16">
        <Reveal>
          <figure className="relative overflow-hidden rounded-2xl border border-line bg-[#03141c]">
            <img
              src={site.portrait || "/logo.jpg"}
              alt={site.name}
              className="aspect-[4/5] w-full object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-12 font-mono text-xs uppercase tracking-wider text-white/85">
              <span>{site.name}</span>
              <span>{site.location[lang]}</span>
            </figcaption>
          </figure>
        </Reveal>

        <div className="min-w-0">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-wider text-accent">{site.role[lang]}</p>
            <p className="mt-4 font-display text-3xl leading-snug md:text-4xl">{site.headline[lang]}</p>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="mt-14 font-mono text-xs uppercase tracking-wider text-ink-2">{L.story}</h2>
            <div className="mt-5 max-w-[65ch] space-y-5 text-lg leading-relaxed text-ink-2">
              {site.bio[lang].map((p, i) => (
                <p key={i} className={i === 0 ? "text-ink" : undefined}>{p}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <h2 className="mt-14 font-mono text-xs uppercase tracking-wider text-ink-2">{L.focus}</h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {site.focus[lang].map((f) => (
                <li key={f} className="rounded-full border border-line px-3.5 py-1.5 text-sm">{f}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>

      {/* Kariyer yolculuğu */}
      <section className="mt-28">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl">{L.career}</h2>
        </Reveal>
        <ol className="relative mt-10 border-l border-line pl-8 md:ml-[140px]">
          {site.career.map((c, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <li className="relative pb-12 last:pb-0">
                <span className="absolute -left-[37px] top-1.5 h-3 w-3 rounded-full border-2 border-paper bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" />
                <p className="font-mono text-xs uppercase tracking-wider text-ink-2 md:absolute md:-left-[180px] md:top-1 md:w-[120px] md:text-right">
                  {c.period[lang]}
                </p>
                <h3 className="mt-1 font-display text-2xl md:mt-0">{c.title[lang]}</h3>
                <p className="mt-1 text-sm text-ink-2">
                  {[c.org, c.place[lang]].filter(Boolean).join(" · ")}
                </p>
                {c.desc[lang] && <p className="mt-3 max-w-[65ch] leading-relaxed text-ink-2">{c.desc[lang]}</p>}
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* Eğitim */}
      {site.education.length > 0 && (
        <section className="mt-28">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl">{L.edu}</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {site.education.map((e, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-line p-6">
                  <p className="font-mono text-xs uppercase tracking-wider text-ink-2">{e.period}</p>
                  <h3 className="mt-3 font-display text-xl">{e.school}</h3>
                  <p className="mt-1 text-ink-2">{e.degree[lang]}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
