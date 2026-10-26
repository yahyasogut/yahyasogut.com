# yahyasogut.com

Kişisel marka ve portföy sitesi — **Next.js + Tailwind + Framer Motion**, TR/EN iki dilli, statik çıktı.
Site **ana kaynak**tır: içerik burada yazılır, yayınlanınca **otomatik olarak LinkedIn'de paylaşılır**.

```
İçerik yaz (Markdown) ──► GitHub'a gönder ──► Site yayınlanır ──► LinkedIn'de paylaşılır
                                    ▲                                     │
                    Her sabah 09:05 otomatik kontrol        Paylaşım linki siteye işlenir
```

---

## 1. İlk kurulum (bir kez, ~30 dk)

### a) Bilgisayarda çalıştır
```bash
npm install
npm run dev          # http://localhost:3000/tr
```
Kişisel bilgilerini **`site.config.ts`** dosyasından düzenle (isim, unvan, biyografi, e-posta, LinkedIn linki, kariyer zaman çizelgesi).
Fotoğrafını `public/portrait.jpg` olarak ekleyip `site.config.ts` içindeki `portrait` alanına `"/portrait.jpg"` yaz. Logo `public/logo.jpg`, paylaşım görseli `public/og.jpg`.

### b) GitHub'a yükle ve yayınla (ücretsiz)
1. GitHub'da `yahyasogut.com` adında bir repo aç, bu klasörü gönder.
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. Repo → **Settings → Pages → Custom domain:** `yahyasogut.com`, **Enforce HTTPS** işaretle.
4. Domain sağlayıcının DNS paneline şunları ekle:

| Tür | Ad | Değer |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | `<github-kullanıcı-adın>.github.io` |

> Alternatif: Vercel / Netlify / Cloudflare Pages da olur — build komutu `npm run build`, çıktı klasörü `out`.

### c) LinkedIn bağlantısı
1. https://www.linkedin.com/developers/apps → **Create app** (bir LinkedIn sayfasına bağlanması gerekir; yoksa basit bir sayfa açabilirsin).
2. **Products** sekmesinden ekle: **Share on LinkedIn** ve **Sign In with LinkedIn using OpenID Connect**.
3. **Auth** sekmesinde *Authorized redirect URL* olarak `http://localhost:8787/callback` ekle.
4. `.env.example` dosyasını `.env` olarak kopyala, Client ID ve Secret'ı yaz.
5. `npm run linkedin:auth` → açılan linkten izin ver → ekrana yazılan iki değeri al.
6. GitHub repo → **Settings → Secrets and variables → Actions**:
   - *Secrets*: `LINKEDIN_ACCESS_TOKEN`, `LINKEDIN_PERSON_URN`
   - *Variables*: `LINKEDIN_ENABLED` = `true`

> ⏰ LinkedIn token'ı **60 günde bir** yenilenmeli (LinkedIn kişisel uygulamalara yenileme anahtarı vermiyor). Takvimine hatırlatma koy: `npm run linkedin:auth` → Secret'ı güncelle. Süre dolarsa site çalışmaya devam eder, sadece LinkedIn paylaşımı durur.

---

## 2. Günlük kullanım

```bash
npm run new -- makale "Başlık"
npm run new -- proje  "Başlık"
npm run new -- not    "Başlık" --tarih 2026-11-10
```
Bu komut `content/<tür>/<slug>/tr.md` ve `en.md` oluşturur. Yaz, kaydet, GitHub'a gönder. Gerisi otomatik.

| Alan | Açıklama |
|---|---|
| `date` | **İleri tarih verirsen içerik zamanlanır:** o sabah sitede görünür ve LinkedIn'e gider |
| `linkedin: true` | LinkedIn'de paylaşılsın mı |
| `linkedinText` | LinkedIn'de özet yerine farklı bir giriş metni |
| `draft: true` | Taslak — hiçbir yerde görünmez |
| `tags` | Etiketler; LinkedIn'de hashtag olur |

- **Projeler / Makaleler** → LinkedIn'e sitedeki sayfaya link veren paylaşım olarak gider (trafik siteye akar).
- **Notlar** → LinkedIn'e doğrudan metin gönderisi olarak gider; sitede de "Notlar" akışında arşivlenir.
- LinkedIn'e varsayılan olarak **Türkçe** sürüm gider (`LINKEDIN_LANG=en` ile değiştirilebilir).
- Aynı içerik asla iki kez paylaşılmaz (`data/linkedin-published.json` kaydı tutar).
- Göndermeden önce ne paylaşılacağını görmek için: `npm run linkedin:publish -- --dry-run`

GitHub'ı terminalsiz kullanmak istersen: github.com'da `content/` klasöründe **Add file → Create new file** ile de içerik ekleyebilirsin.

---

## 3. Önerilen yayın ritmi

| Sıklık | Tür | Örnek |
|---|---|---|
| Haftada 2 | **Not** (Salı + Perşembe, 09:05) | Sahadan bir gözlem, okunan kitaptan bir cümle, kısa ders |
| Ayda 2 | **Makale** (1. ve 3. Pazartesi) | 800–1500 kelime: deneyim, vaka analizi, görüş |
| Çeyrekte 1 | **Proje** | Problem → Yaklaşım → Sonuç formatında vaka |

İpucu: Ayın ilk günü bir saatte 8 notu ileri tarihlerle yaz → ay boyunca kendiliğinden yayınlanır.

---

## 4. Dosya haritası

```
site.config.ts          ← kişisel bilgiler (ilk düzenlenecek yer)
content/                ← tüm içerik (Markdown)
app/[lang]/             ← sayfalar (ana sayfa, projeler, makaleler, notlar, hakkımda, iletişim, RSS)
components/             ← arayüz bileşenleri + Framer Motion animasyonları
app/globals.css         ← renkler ve yazı tipleri
scripts/                ← LinkedIn yayın/izin ve içerik oluşturma komutları
.github/workflows/      ← otomatik yayın
```

Tasarımı genişletmek için 21st.dev'deki hazır bileşenleri (referanslar, SSS, CTA vb.) `components/` altına ekleyebilirsin; renkleri `app/globals.css` içindeki değişkenlerden aldığı sürece siteyle uyumlu görünür.
