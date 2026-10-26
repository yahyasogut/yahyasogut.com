import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import type { Locale } from "./i18n";

/**
 * İçerik yapısı (her içerik bir klasör, her dil bir dosya):
 *
 *   content/
 *     projects/<slug>/tr.md   en.md
 *     articles/<slug>/tr.md   en.md
 *     posts/<slug>/tr.md      en.md
 *
 * Bir dilin dosyası yoksa o içerik sadece diğer dilde görünür.
 */

export const kinds = ["projects", "articles", "posts"] as const;
export type Kind = (typeof kinds)[number];

export type Entry = {
  kind: Kind;
  slug: string;
  lang: Locale;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  cover?: string;
  role?: string; // projeler için: üstlendiğin rol
  status?: string; // projeler için: Tamamlandı / Devam ediyor
  linkedinUrl?: string; // yayınlandıktan sonra otomatik doldurulur
  draft: boolean;
  html: string;
  readingMinutes: number;
};

const ROOT = path.join(process.cwd(), "content");

function readPublishedMap(): Record<string, { url: string }> {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/linkedin-published.json"), "utf8"));
  } catch {
    return {};
  }
}

export function getEntries(kind: Kind, lang: Locale): Entry[] {
  const dir = path.join(ROOT, kind);
  if (!fs.existsSync(dir)) return [];
  const published = readPublishedMap();

  return fs
    .readdirSync(dir)
    .filter((slug) => fs.existsSync(path.join(dir, slug, `${lang}.md`)))
    .map((slug) => {
      const raw = fs.readFileSync(path.join(dir, slug, `${lang}.md`), "utf8");
      const { data, content } = matter(raw);
      const words = content.trim().split(/\s+/).length;
      const key = `${kind}/${slug}/${lang}`;
      return {
        kind,
        slug,
        lang,
        title: data.title ?? slug,
        date: new Date(data.date ?? Date.now()).toISOString(),
        summary: data.summary ?? "",
        tags: data.tags ?? [],
        cover: data.cover,
        role: data.role,
        status: data.status,
        linkedinUrl: data.linkedinUrl ?? published[key]?.url,
        draft: Boolean(data.draft),
        html: marked.parse(content, { async: false }) as string,
        readingMinutes: Math.max(1, Math.round(words / 200)),
      } satisfies Entry;
    })
    .filter((e) => !e.draft && +new Date(e.date) <= Date.now()) // ileri tarihli = zamanlanmış
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getEntry(kind: Kind, lang: Locale, slug: string) {
  return getEntries(kind, lang).find((e) => e.slug === slug);
}

export function allSlugs(kind: Kind) {
  const dir = path.join(ROOT, kind);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir);
}
