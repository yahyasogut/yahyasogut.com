import Link from "next/link";
import { site } from "@/site.config";
import type { Dict, Locale } from "@/lib/i18n";
import { IconBriefcase, IconLinkedIn, IconMail, IconRss, IconWhatsApp } from "./Icons";

export default function Footer({ lang, t }: { lang: Locale; t: Dict }) {
  const links = [
    { href: `mailto:${site.emailWork}`, label: site.emailWork, title: t.contact.emailWork, icon: <IconBriefcase className="h-4 w-4" /> },
    { href: `mailto:${site.email}`, label: site.email, title: t.contact.emailPersonal, icon: <IconMail className="h-4 w-4" /> },
  ];
  const icons = [
    { href: site.linkedin, title: "LinkedIn", icon: <IconLinkedIn className="h-4 w-4" />, external: true },
    { href: `/${lang}/contact/`, title: `WhatsApp @${site.whatsapp}`, icon: <IconWhatsApp className="h-4 w-4" /> },
    { href: `/${lang}/feed.xml`, title: "RSS", icon: <IconRss className="h-4 w-4" /> },
  ];
  return (
    <footer className="mt-32 border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href={`/${lang}/`} className="flex items-center gap-3">
              <img src="/logo-mark.jpg" alt="" width={36} height={36} className="h-9 w-9 rounded-lg ring-1 ring-line" />
              <span className="font-display text-xl">{site.name}</span>
            </Link>
            <p className="mt-2 text-sm text-ink-2">{site.role[lang]} · {site.org}</p>
          </div>
          <ul className="flex flex-col gap-2 text-sm md:items-end">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} title={l.title} className="inline-flex items-center gap-2 text-ink-2 transition-colors hover:text-accent">
                  {l.icon} {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10 flex flex-col-reverse gap-5 border-t border-line pt-6 text-sm text-ink-2 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {site.name} · {t.footer}</p>
          <div className="flex gap-2">
            {icons.map((i) => (
              <a
                key={i.title}
                href={i.href}
                title={i.title}
                aria-label={i.title}
                target={i.external ? "_blank" : undefined}
                rel={i.external ? "noopener" : undefined}
                className="grid h-9 w-9 place-items-center rounded-full border border-line transition-colors hover:border-accent hover:text-accent"
              >
                {i.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
