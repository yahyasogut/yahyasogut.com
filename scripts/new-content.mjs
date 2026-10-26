#!/usr/bin/env node
/**
 * Yeni içerik iskeleti oluşturur (TR + EN).
 *
 *   npm run new -- makale "Başlık"
 *   npm run new -- proje  "Başlık"
 *   npm run new -- not    "Başlık" --tarih 2026-11-03
 *
 * --tarih ileri bir gün verilirse içerik o gün sitede görünür ve LinkedIn'e o gün gider.
 */
import fs from "node:fs";
import path from "node:path";

const [, , type, ...rest] = process.argv;
const kindMap = { makale: "articles", article: "articles", proje: "projects", project: "projects", not: "posts", post: "posts" };
const kind = kindMap[type];
const dateIdx = rest.findIndex((a) => a === "--tarih" || a === "--date");
const date = dateIdx >= 0 ? rest.splice(dateIdx, 2)[1] : new Date().toISOString().slice(0, 10);
const title = rest.join(" ").trim();

if (!kind || !title) {
  console.log('Kullanım: npm run new -- <makale|proje|not> "Başlık" [--tarih YYYY-AA-GG]');
  process.exit(1);
}

const tr = { ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
const base = title.toLowerCase().replace(/[çğıİöşüâîû]/g, (c) => tr[c] || c).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const slug = kind === "posts" ? `${date}-${base}`.slice(0, 60) : base;
const dir = path.join("content", kind, slug);
if (fs.existsSync(dir)) {
  console.error("Bu içerik zaten var: " + dir);
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });

const extra = kind === "projects" ? "role: \nstatus: Devam ediyor\n" : "";
const extraEn = kind === "projects" ? "role: \nstatus: In progress\n" : "";
const body = {
  articles: "Giriş paragrafı…\n\n## Ara başlık\n\nMetin…\n",
  projects: "## Problem\n\n## Yaklaşım\n\n## Sonuç\n",
  posts: "Kısa notun buraya…\n",
}[kind];

fs.writeFileSync(path.join(dir, "tr.md"), `---\ntitle: ${title}\ndate: ${date}\nsummary: \ntags: []\n${extra}linkedin: true\n# linkedinText: LinkedIn'de farklı bir giriş metni istersen buraya yaz\n---\n${body}`);
fs.writeFileSync(path.join(dir, "en.md"), `---\ntitle: ${title}\ndate: ${date}\nsummary: \ntags: []\n${extraEn}draft: true   # İngilizce çeviriyi bitirince bu satırı sil\n---\n${body}`);
console.log(`✓ Oluşturuldu: ${dir}/tr.md ve en.md`);
