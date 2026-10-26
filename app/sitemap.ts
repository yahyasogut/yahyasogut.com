import type { MetadataRoute } from "next";
import { getEntries, kinds } from "@/lib/content";
import { locales } from "@/lib/i18n";
import { site } from "@/site.config";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "projects/", "articles/", "posts/", "about/", "contact/"];
  return locales.flatMap((lang) => [
    ...pages.map((p) => ({ url: `${site.url}/${lang}/${p}` })),
    ...kinds.filter((k) => k !== "posts").flatMap((k) =>
      getEntries(k, lang).map((e) => ({ url: `${site.url}/${lang}/${k}/${e.slug}/`, lastModified: e.date })),
    ),
  ]);
}
