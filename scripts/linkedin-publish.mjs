#!/usr/bin/env node
/**
 * Siteden LinkedIn'e otomatik yayın.
 *
 * Mantık:
 *  - content/ altındaki her içerikte `linkedin: true` varsa ve
 *  - tarihi bugün veya geçmişteyse (ileri tarihli içerik = zamanlanmış paylaşım) ve
 *  - data/linkedin-published.json içinde yoksa
 *  → LinkedIn'de paylaşılır ve sonuç JSON'a kaydedilir (aynı içerik asla iki kez paylaşılmaz).
 *
 *  Projeler ve makaleler: sitedeki sayfaya link veren bir "makale paylaşımı"
 *  Notlar (posts): doğrudan LinkedIn metin gönderisi
 *
 * Kullanım:
 *   node scripts/linkedin-publish.mjs            → gerçekten paylaşır
 *   node scripts/linkedin-publish.mjs --dry-run  → sadece ne paylaşılacağını gösterir
 *
 * Gerekli ortam değişkenleri: LINKEDIN_ACCESS_TOKEN, SITE_URL
 * İsteğe bağlı: LINKEDIN_PERSON_URN (boşsa token'dan otomatik bulunur)
 * İsteğe bağlı: LINKEDIN_LANG (varsayılan "tr" — LinkedIn'e hangi dil sürümü gitsin)
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DRY = process.argv.includes("--dry-run");
const ROOT = process.cwd();
const STORE = path.join(ROOT, "data/linkedin-published.json");
const LANG = process.env.LINKEDIN_LANG || "tr";
const SITE = (process.env.SITE_URL || "https://yahyasogut.com").replace(/\/$/, "");
const TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
let AUTHOR = process.env.LINKEDIN_PERSON_URN;
// LinkedIn API sürümü (YYYYMM). LinkedIn her sürümü ~1 yıl destekler; yılda bir güncelle.
const API_VERSION = process.env.LINKEDIN_VERSION || "202608";

const kinds = ["projects", "articles", "posts"];
const store = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, "utf8")) : {};

// LinkedIn "little text" formatında bu karakterler kaçırılmazsa metin bozulur
const escapeCommentary = (s) => s.replace(/[\\|{}@\[\]()<>#*_~]/g, (c) => "\\" + c);

// Markdown'u LinkedIn'e uygun düz metne çevir
function mdToText(md) {
  return md
    .replace(/^>\s?\*\*(Örnek|Sample).*$/gim, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const hashtags = (tags = []) =>
  tags.map((t) => "#" + String(t).replace(/[^\p{L}\p{N}]/gu, "")).filter((t) => t.length > 1).join(" ");

function collect() {
  const out = [];
  const now = Date.now();
  for (const kind of kinds) {
    const dir = path.join(ROOT, "content", kind);
    if (!fs.existsSync(dir)) continue;
    for (const slug of fs.readdirSync(dir)) {
      const file = path.join(dir, slug, `${LANG}.md`);
      if (!fs.existsSync(file)) continue;
      const { data, content } = matter(fs.readFileSync(file, "utf8"));
      const key = `${kind}/${slug}/${LANG}`;
      if (!data.linkedin || data.draft || store[key]) continue;
      if (new Date(data.date).getTime() > now) continue; // zamanı gelmemiş
      out.push({ kind, slug, key, data, content });
    }
  }
  return out.sort((a, b) => new Date(a.data.date) - new Date(b.data.date));
}

function buildBody(item) {
  const { kind, slug, data, content } = item;
  const url = `${SITE}/${LANG}/${kind}/${slug}/`;
  const base = {
    author: AUTHOR,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (kind === "posts") {
    // Notlar: LinkedIn'e doğrudan metin olarak gider
    const text = [mdToText(content), hashtags(data.tags)].filter(Boolean).join("\n\n");
    return { ...base, commentary: escapeCommentary(text) };
  }

  // Proje / makale: özel metin (linkedinText) yoksa özet + link
  const intro = data.linkedinText || `${data.title}\n\n${data.summary || ""}`;
  const label = LANG === "tr" ? (kind === "projects" ? "Projenin detayları" : "Yazının tamamı") : kind === "projects" ? "Project details" : "Read the full article";
  const text = [intro.trim(), `${label} 👉 ${url}`, hashtags(data.tags)].filter(Boolean).join("\n\n");
  return {
    ...base,
    commentary: escapeCommentary(text),
    content: { article: { source: url, title: data.title, description: data.summary || "" } },
  };
}

async function publish(body) {
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "LinkedIn-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error("Token süresi dolmuş. LinkedIn Token Generator'dan yeni token alıp GitHub Secret'ı (LINKEDIN_ACCESS_TOKEN) güncelle.");
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${await res.text()}`);
  const urn = res.headers.get("x-restli-id");
  return { urn, url: `https://www.linkedin.com/feed/update/${urn}/` };
}

const items = collect();
if (!items.length) {
  console.log("✓ Paylaşılacak yeni içerik yok.");
  process.exit(0);
}
if (!DRY && !TOKEN) {
  console.error("LINKEDIN_ACCESS_TOKEN tanımlı olmalı (GitHub → Settings → Secrets).");
  process.exit(1);
}
// Kişi kimliği verilmemişse token'dan otomatik bul
if (!DRY && !AUTHOR) {
  const r = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (r.status === 401) {
    console.error("Token geçersiz ya da süresi dolmuş. LinkedIn Token Generator'dan yeni token alıp GitHub Secret'ı güncelle.");
    process.exit(1);
  }
  const me = await r.json();
  if (!me.sub) {
    console.error("Kişi bilgisi alınamadı. Token oluştururken 'openid' ve 'profile' izinlerini seçtiğinden emin ol.", me);
    process.exit(1);
  }
  AUTHOR = `urn:li:person:${me.sub}`;
  console.log(`LinkedIn hesabı: ${me.name}`);
}

for (const item of items) {
  const body = buildBody(item);
  if (DRY) {
    console.log(`\n── [DRY RUN] ${item.key}\n${body.commentary.replace(/\\(.)/g, "$1")}`);
    continue;
  }
  try {
    const r = await publish(body);
    store[item.key] = { ...r, publishedAt: new Date().toISOString() };
    fs.writeFileSync(STORE, JSON.stringify(store, null, 2) + "\n");
    console.log(`✓ Paylaşıldı: ${item.key} → ${r.url}`);
    await new Promise((r) => setTimeout(r, 3000)); // art arda spam görünmesin
  } catch (e) {
    console.error(`✗ ${item.key}: ${e.message}`);
    process.exitCode = 1;
  }
}
