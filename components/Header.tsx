"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import type { Locale, Dict } from "@/lib/i18n";
import { site } from "@/site.config";

export default function Header({ lang, t }: { lang: Locale; t: Dict }) {
  const pathname = usePathname() || `/${lang}/`;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    setDark(document.documentElement.classList.contains("dark"));
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  const other: Locale = lang === "tr" ? "en" : "tr";
  const switchHref = pathname.replace(/^\/(tr|en)/, `/${other}`);

  const links = [
    { href: `/${lang}/projects/`, label: t.nav.projects },
    { href: `/${lang}/articles/`, label: t.nav.articles },
    { href: `/${lang}/posts/`, label: t.nav.posts },
    { href: `/${lang}/about/`, label: t.nav.about },
    { href: `/${lang}/contact/`, label: t.nav.contact },
  ];

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "border-b border-line bg-paper/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href={`/${lang}/`} className="group flex items-center gap-2.5">
          <img
            src="/logo-mark.jpg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg ring-1 ring-line transition-shadow group-hover:shadow-[0_0_14px_var(--accent)]"
          />
          <span className="font-medium tracking-tight">{site.name}</span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link href={l.href} className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${active ? "text-ink" : "text-ink-2 hover:text-ink"}`}>
                  {active && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-paper-2" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-1">
          <Link href={switchHref} className="rounded-full px-2.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-ink-2 hover:text-ink" aria-label="Language">
            {other}
          </Link>
          <button onClick={toggleTheme} aria-label="Tema" className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-paper-2 hover:text-ink">
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            )}
          </button>
          <button onClick={() => setOpen((o) => !o)} aria-label="Menü" className="grid h-9 w-9 place-items-center rounded-full hover:bg-paper-2 md:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-line bg-paper px-5 md:hidden"
          >
            {links.map((l) => (
              <li key={l.href} className="border-t border-line first:border-t-0">
                <Link href={l.href} className="block py-3.5 font-display text-2xl">{l.label}</Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
