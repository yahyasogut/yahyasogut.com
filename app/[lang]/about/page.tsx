import type { Metadata } from "next";
import Link from "next/link";
import { dict, type Locale } from "@/lib/i18n";
import { site } from "@/site.config";
import { Reveal } from "@/components/motion";

export async function generateMetadata({ params }: { params: Promise<{ lang: Locale }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[lang].pages.about.title, description: site.bio[lang][0] };
}

const label = {
  tr: { eyebrow: "Hakkımda", story: "Hikâyem", scope: "Sorumluluk alanım", scopeLead: "Ankutsan Grubu'nun tüm şirketlerinde BT altyapısı, güvenliği ve kurumsal uygulamaları tek bir standartla yönetiyorum.", companies: "şirket", locations: "lokasyon", career: "Kariyer", projects: "Öne çıkan projeler", edu: "Eğitim", cert: "Sertifika", lang: "Diller", contact: "İletişime geç", linkedin: "LinkedIn profili" },
  en: { eyebrow: "About", story: "My story", scope: "My scope", scopeLead: "I run IT infrastructure, security and enterprise applications to one standard across every Ankutsan Group company.", companies: "companies", locations: "locations", career: "Career", projects: "Selected projects", edu: "Education", cert: "Certification", lang: "Languages", contact: "Get in touch", linkedin: "LinkedIn profile" },
};

function SectionTitle({ children, kicker }: { children: React.ReactNode; kicker: string }) {
  return (
    <Reveal>
      <p className="font-mono text-xs uppercase tracking-wider text-accent">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl md:text-5xl">{children}</h2>
    </Reveal>
  );
}

export default async function Page({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const L = label[lang];

  return (
    <>
      {/* ── GİRİŞ ─────────────────────────────────────────── */}
      <section className="grid items-end gap-10 pb-16 pt-32 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-16 md:pt-40">
        <div className="min-w-0">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-wider text-ink-2">
              {L.eyebrow} · {site.location[lang]}
            </p>
            <h1 className="mt-5 font-display text-5xl leading-[1.02] md:text-7xl">{site.name}</h1>
            <p className="mt-4 text-xl text-ink-2 md:text-2xl">
              {site.role[lang]} <span className="text-accent">@</span> {site.org}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-8 max-w-[60ch] text-lg leading-relaxed">{site.bio[lang][0]}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={site.linkedin} target="_blank" rel="noopener" className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-accent">
                {L.linkedin} ↗
              </a>
              <Link href={`/${lang}/contact/`} className="rounded-full border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-ink">
                {L.contact} →
              </Link>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <figure className="relative mx-auto max-w-sm overflow-hidden rounded-3xl border border-line bg-[#2b2c2e] md:max-w-none">
            <img src={site.portrait || "/logo.jpg"} alt={site.name} className="aspect-square w-full object-cover" />
          </figure>
        </Reveal>
      </section>

      {/* ── RAKAMLAR ──────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-5">
        {site.stats.map((s, i) => (
          <Reveal key={i} delay={i * 0.05} className={`bg-paper p-6 md:p-7 ${i === site.stats.length - 1 ? "col-span-2 md:col-span-1" : ""}`}>
            <p className="font-display text-5xl tabular-nums text-accent md:text-6xl">{s.value}</p>
            <p className="mt-2 text-sm text-ink-2">{s.label[lang]}</p>
          </Reveal>
        ))}
      </section>

      {/* ── HİKÂYE ────────────────────────────────────────── */}
      <section className="pt-28">
        <SectionTitle kicker="01">{L.story}</SectionTitle>
        <ol className="mt-12">
          {site.story.map((c, i) => (
            <Reveal key={i} delay={0.04}>
              <li className="group grid gap-3 border-t border-line py-10 md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
                <div>
                  <p className="font-mono text-sm tabular-nums text-accent">{c.years}{c.years.endsWith("– ") ? (lang === "tr" ? "bugün" : "now") : ""}</p>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-2xl md:text-3xl">{c.title[lang]}</h3>
                  <p className="mt-4 max-w-[68ch] text-lg leading-relaxed text-ink-2">{c.text[lang]}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ── SORUMLULUK ALANI ───────────────────────────────── */}
      <section className="pt-20">
        <SectionTitle kicker="02">{L.scope}</SectionTitle>
        <div className="mt-12 grid gap-8 overflow-hidden rounded-3xl border border-line md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:gap-0">
          <Reveal className="flex flex-col justify-between gap-10 bg-[#0b1114] p-8 text-[#eceef0] md:p-10">
            <p className="max-w-[36ch] text-lg leading-relaxed opacity-80">{L.scopeLead}</p>
            <div className="flex gap-10">
              <div>
                <p className="font-display text-7xl tabular-nums md:text-8xl">{site.group.length}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider opacity-70">{L.companies}</p>
              </div>
              <div>
                <p className="font-display text-7xl tabular-nums text-[#4fdbe6] md:text-8xl">{site.group.reduce((a, g) => a + g.count, 0)}</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider opacity-70">{L.locations}</p>
              </div>
            </div>
          </Reveal>
          <ul className="divide-y divide-line px-6 md:px-10">
            {site.group.map((g, i) => (
              <Reveal key={g.name} delay={i * 0.05}>
                <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl md:text-2xl">{g.name}</h3>
                    <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-2">{g.sites[lang]}</p>
                  </div>
                  {g.count > 0 && (
                    <div className="flex gap-1.5" aria-hidden>
                      {Array.from({ length: g.count }).map((_, k) => (
                        <span key={k} className="h-3 w-3 rounded-full bg-accent shadow-[0_0_0_3px_var(--accent-soft)]" />
                      ))}
                    </div>
                  )}
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── KARİYER ───────────────────────────────────────── */}
      <section className="pt-20">
        <SectionTitle kicker="03">{L.career}</SectionTitle>
        <div className="mt-12 grid gap-6">
          {site.career.map((co, ci) => (
            <Reveal key={ci} delay={ci * 0.05}>
              <article className="rounded-2xl border border-line bg-paper-2/50 p-6 md:p-8">
                <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-5">
                  <h3 className="font-display text-2xl">{co.org}</h3>
                  <span className="font-mono text-xs uppercase tracking-wider text-ink-2">{co.span[lang]}</span>
                </header>
                <ol className="relative mt-6 space-y-7 border-l border-line pl-6">
                  {co.roles.map((r, ri) => (
                    <li key={ri} className="relative">
                      <span className={`absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full ${ri === 0 && ci === 0 ? "bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" : "border border-ink-2 bg-paper"}`} />
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h4 className="text-lg font-medium">{r.title[lang]}</h4>
                        <span className="font-mono text-xs tabular-nums text-ink-2">{r.period[lang]}{r.place ? ` · ${r.place}` : ""}</span>
                      </div>
                      {r.desc[lang] && <p className="mt-1.5 max-w-[70ch] text-ink-2">{r.desc[lang]}</p>}
                    </li>
                  ))}
                </ol>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PROJELER ──────────────────────────────────────── */}
      <section className="pt-28">
        <SectionTitle kicker="04">{L.projects}</SectionTitle>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
          {site.projects.map((g, i) => (
            <Reveal key={i} delay={i * 0.05} className="bg-paper p-6 md:p-8">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-2">{g.group[lang]}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {g.items.map((it) => (
                  <li key={it} className="rounded-full border border-line px-3 py-1.5 text-sm">{it}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── EĞİTİM ────────────────────────────────────────── */}
      <section className="pt-28">
        <SectionTitle kicker="05">{L.edu}</SectionTitle>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {site.education.map((e, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="flex h-full flex-col rounded-2xl border border-line p-6">
                <p className="font-mono text-xs tabular-nums text-ink-2">{e.period}</p>
                <h3 className="mt-4 font-display text-xl">{e.school}</h3>
                <p className="mt-2 text-ink-2">{e.degree[lang]}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-line p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-2">{L.cert}</p>
              {site.certifications.map((c) => <p key={c} className="mt-3">{c}</p>)}
            </div>
            <div className="rounded-2xl border border-line p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-2">{L.lang}</p>
              <ul className="mt-3 space-y-1.5">
                {site.languages.map((l) => (
                  <li key={l.name.en} className="flex justify-between gap-4">
                    <span>{l.name[lang]}</span>
                    <span className="text-ink-2">{l.level[lang]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
