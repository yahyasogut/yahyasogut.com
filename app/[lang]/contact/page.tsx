import type { Metadata } from "next";
import { dict, type Locale } from "@/lib/i18n";
import { site } from "@/site.config";
import { PageHead } from "@/components/Cards";
import { Reveal } from "@/components/motion";
import ContactGrid from "@/components/ContactGrid";
import { IconMail } from "@/components/Icons";

export async function generateMetadata({ params }: { params: Promise<{ lang: Locale }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: dict[lang].pages.contact.title };
}

export default async function Page({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = dict[lang];
  return (
    <>
      <PageHead title={t.pages.contact.title} lead={t.pages.contact.lead} />
      <Reveal>
        <ContactGrid lang={lang} t={t} />
      </Reveal>
      <Reveal delay={0.1}>
        <a href={`mailto:${site.email}`} className="mt-10 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-accent">
          <IconMail className="h-4 w-4" /> {t.contact.write} →
        </a>
      </Reveal>
    </>
  );
}
