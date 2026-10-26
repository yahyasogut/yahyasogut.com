#!/usr/bin/env node
/**
 * LinkedIn erişim anahtarını (token) almak için tek seferlik yardımcı.
 * Token 60 gün geçerlidir; süresi dolunca bu komutu tekrar çalıştır.
 *
 *   1. .env dosyasına LINKEDIN_CLIENT_ID ve LINKEDIN_CLIENT_SECRET yaz
 *   2. LinkedIn uygulamanda "Authorized redirect URL" olarak
 *      http://localhost:8787/callback ekle
 *   3. npm run linkedin:auth  → tarayıcıda açılan linkten giriş yap
 *   4. Ekrana yazılan iki değeri GitHub → Settings → Secrets'a ekle
 */
import http from "node:http";
import fs from "node:fs";
import crypto from "node:crypto";

// .env dosyasını basitçe oku
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { LINKEDIN_CLIENT_ID: ID, LINKEDIN_CLIENT_SECRET: SECRET } = process.env;
if (!ID || !SECRET) {
  console.error("Önce .env dosyasına LINKEDIN_CLIENT_ID ve LINKEDIN_CLIENT_SECRET ekle.");
  process.exit(1);
}

const REDIRECT = "http://localhost:8787/callback";
const state = crypto.randomBytes(12).toString("hex");
const authUrl =
  "https://www.linkedin.com/oauth/v2/authorization?" +
  new URLSearchParams({ response_type: "code", client_id: ID, redirect_uri: REDIRECT, state, scope: "openid profile w_member_social" });

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, REDIRECT);
  if (u.pathname !== "/callback") return res.end();
  if (u.searchParams.get("state") !== state) return res.end("Geçersiz istek.");

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code: u.searchParams.get("code"), redirect_uri: REDIRECT, client_id: ID, client_secret: SECRET }),
  });
  const tok = await tokenRes.json();
  if (!tok.access_token) {
    res.end("Hata: " + JSON.stringify(tok));
    console.error(tok);
    return server.close();
  }
  const me = await (await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } })).json();
  const urn = `urn:li:person:${me.sub}`;
  const exp = new Date(Date.now() + tok.expires_in * 1000).toLocaleDateString("tr-TR");

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<h2>Tamam, ${me.name}!</h2><p>Terminale dön.</p>`);
  console.log(`\n✓ Giriş başarılı: ${me.name}\n`);
  console.log("GitHub → Settings → Secrets and variables → Actions içine ekle:\n");
  console.log(`LINKEDIN_ACCESS_TOKEN = ${tok.access_token}\n`);
  console.log(`LINKEDIN_PERSON_URN   = ${urn}\n`);
  console.log(`⏰ Token ${exp} tarihinde sona erecek — o tarihten önce bu komutu tekrar çalıştır.\n`);
  server.close();
});

server.listen(8787, () => {
  console.log("\nŞu linki tarayıcıda aç ve LinkedIn hesabınla izin ver:\n\n" + authUrl + "\n");
});
