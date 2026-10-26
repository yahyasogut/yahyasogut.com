import Link from "next/link";
import { site } from "@/site.config";
import type { Dict, Locale } from "@/lib/i18n";

export default function Footer({ lang, t }: { lang: Locale; t: Dict }) {
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <Link href={`/${lang}/contact/`} className="group block">
          <p className="text-sm text-ink-2">{t.nav.contact}</p>
          <p className="mt-2 break-words font-display text-3xl leading-tight sm:text-4xl transition-colors group-hover:text-accent md:text-6xl">
            {site.email} <span className="inline-block transition-transform group-hover:translate-x-2">→</span>
          </p>
        </Link>
        <div className="mt-14 flex flex-col gap-4 text-sm text-ink-2 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {site.name} · {t.footer}</p>
          <div className="flex gap-5">
            <a href={site.linkedin} target="_blank" rel="noopener" className="hover:text-ink">LinkedIn ↗</a>
            <a href={`/${lang}/feed.xml`} className="hover:text-ink">RSS</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
