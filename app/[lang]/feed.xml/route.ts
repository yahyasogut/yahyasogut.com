import { getEntries, kinds } from "@/lib/content";
import { locales, type Locale } from "@/lib/i18n";
import { site } from "@/site.config";

export const dynamic = "force-static";
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export async function GET(_: Request, { params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const items = kinds
    .flatMap((k) => getEntries(k, lang))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 50);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(site.name)}</title><link>${site.url}/${lang}/</link><description>${esc(site.headline[lang])}</description><language>${lang}</language>
${items
  .map((e) => {
    const url = e.kind === "posts" ? `${site.url}/${lang}/posts/#${e.slug}` : `${site.url}/${lang}/${e.kind}/${e.slug}/`;
    return `<item><title>${esc(e.title)}</title><link>${url}</link><guid>${url}</guid><pubDate>${new Date(e.date).toUTCString()}</pubDate><category>${e.kind}</category><description>${esc(e.summary)}</description></item>`;
  })
  .join("\n")}
</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
