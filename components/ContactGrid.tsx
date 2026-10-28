"use client";

import { useState } from "react";
import type { Dict, Locale } from "@/lib/i18n";
import { site } from "@/site.config";
import { IconBriefcase, IconLinkedIn, IconMail, IconPin, IconWhatsApp } from "./Icons";

type Item = {
  key: string;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  copy?: string;
  hint?: string;
  icon: React.ReactNode;
};

/** İletişim kanallarını yan yana kartlar olarak gösterir (ana sayfa + iletişim sayfası) */
export default function ContactGrid({ lang, t }: { lang: Locale; t: Dict }) {
  const [copied, setCopied] = useState<string | null>(null);

  const items: Item[] = [
    { key: "work", label: t.contact.emailWork, value: site.emailWork, href: `mailto:${site.emailWork}`, copy: site.emailWork, icon: <IconBriefcase /> },
    { key: "personal", label: t.contact.emailPersonal, value: site.email, href: `mailto:${site.email}`, copy: site.email, icon: <IconMail /> },
    { key: "linkedin", label: t.contact.linkedin, value: "in/" + site.linkedin.split("/in/")[1].replace(/\/$/, ""), href: site.linkedin, external: true, icon: <IconLinkedIn /> },
    { key: "whatsapp", label: t.contact.whatsapp, value: "@" + site.whatsapp, copy: "@" + site.whatsapp, hint: t.contact.whatsappHint, icon: <IconWhatsApp /> },
    { key: "location", label: t.contact.location, value: site.location[lang], icon: <IconPin /> },
  ];

  const doCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {}
  };

  return (
    <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-[1.3fr_1.15fr_0.9fr_0.9fr_0.95fr]">
      {items.map((it, i) => {
        const Body = (
          <>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:-translate-y-0.5">
              {it.icon}
            </span>
            <span className="mt-5 block font-mono text-[11px] uppercase tracking-wider text-ink-2">{it.label}</span>
            <span className="mt-1.5 block break-words text-[15px] font-medium leading-snug">{it.value}</span>
            {it.hint && <span className="mt-1 block text-xs text-ink-2">{it.hint}</span>}
          </>
        );
        return (
          <li key={it.key} className={`relative bg-paper ${i === items.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
            {it.href ? (
              <a
                href={it.href}
                target={it.external ? "_blank" : undefined}
                rel={it.external ? "noopener" : undefined}
                className="group block h-full p-6 transition-colors hover:bg-paper-2"
              >
                {Body}
              </a>
            ) : (
              <div className="group block h-full p-6">{Body}</div>
            )}
            {it.copy && (
              <button
                type="button"
                onClick={() => doCopy(it.key, it.copy!)}
                className="absolute right-4 top-4 rounded-full border border-line bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-2 transition-colors hover:border-ink hover:text-ink"
              >
                {copied === it.key ? t.contact.copied : t.contact.copy}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
