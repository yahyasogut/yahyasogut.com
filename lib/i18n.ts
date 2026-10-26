export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "tr";

export function isLocale(x: string): x is Locale {
  return (locales as readonly string[]).includes(x);
}

export const dict = {
  tr: {
    nav: { home: "Ana Sayfa", projects: "Projeler", articles: "Makaleler", posts: "Notlar", about: "Hakkımda", contact: "İletişim" },
    hero: { cta1: "Projeleri incele", cta2: "LinkedIn'de takip et" },
    sections: {
      focus: "Odak alanları",
      latestProjects: "Son projeler",
      latestArticles: "Son makaleler",
      latestPosts: "LinkedIn'den notlar",
      seeAll: "Tümünü gör",
    },
    pages: {
      projects: { title: "Projeler", lead: "Üzerinde çalıştığım, liderlik ettiğim ve öğrendiğim işler." },
      articles: { title: "Makaleler", lead: "Uzun soluklu düşünceler, deneyimler ve vaka analizleri." },
      posts: { title: "Notlar", lead: "LinkedIn'de paylaştığım kısa gözlemler — hepsi tek yerde." },
      about: { title: "Hakkımda" },
      contact: { title: "İletişim", lead: "Bir proje, konuşma ya da iş birliği fikrin mi var? Yaz." },
    },
    meta: { readOn: "LinkedIn'de görüntüle", minRead: "dk okuma", back: "Geri", publishedOn: "Yayın tarihi", tags: "Etiketler", empty: "Yakında burada içerik olacak." },
    contact: { email: "E-posta", linkedin: "LinkedIn", location: "Konum", write: "E-posta gönder" },
    footer: "Tüm içerikler LinkedIn ile senkron yayınlanır.",
  },
  en: {
    nav: { home: "Home", projects: "Projects", articles: "Articles", posts: "Notes", about: "About", contact: "Contact" },
    hero: { cta1: "Explore projects", cta2: "Follow on LinkedIn" },
    sections: {
      focus: "Focus areas",
      latestProjects: "Latest projects",
      latestArticles: "Latest articles",
      latestPosts: "Notes from LinkedIn",
      seeAll: "See all",
    },
    pages: {
      projects: { title: "Projects", lead: "Work I've built, led and learned from." },
      articles: { title: "Articles", lead: "Long-form thinking, experience and case studies." },
      posts: { title: "Notes", lead: "Short observations I share on LinkedIn — all in one place." },
      about: { title: "About" },
      contact: { title: "Contact", lead: "Have a project, a conversation or a collaboration in mind? Get in touch." },
    },
    meta: { readOn: "View on LinkedIn", minRead: "min read", back: "Back", publishedOn: "Published", tags: "Tags", empty: "Content coming soon." },
    contact: { email: "Email", linkedin: "LinkedIn", location: "Location", write: "Send an email" },
    footer: "All content is published in sync with LinkedIn.",
  },
} as const;

export type Dict = (typeof dict)[Locale];

export function formatDate(iso: string, lang: Locale) {
  return new Date(iso).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
