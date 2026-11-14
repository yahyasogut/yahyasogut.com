# Elmaslar Damga Takip · kurulum rehberi

Adres: **https://yahyasogut.com/damga/** · Herkese açık QR kartı: **https://yahyasogut.com/damga/c/?k=EL-000123-xxxxx**

Sistem iki parçadan oluşuyor:

- **Arayüz:** Bu repodaki `public/damga/` klasörü. GitHub Pages ile yahyasogut.com/damga adresinde yayınlanır. İçinde müşteri verisi yoktur.
- **Veri ve giriş:** Supabase (bulut veritabanı). Müşteriler, cihazlar, planlar ve saha sonuçları burada tutulur. Satır düzeyi güvenlikle korunur: giriş yapmayan hiçbir şey göremez; saha personeli yalnızca kendisine atanan planları görür.

Kurulum bir kez yapılır ve yaklaşık 45 dakika sürer. Terminal gerekmez.

> **v2 güncellemesi (14.11.2026):** Kurulumu v1 ile yaptıysanız `supabase/damga.sql` dosyasını SQL Editor'da bir kez daha çalıştırın. Yeni kurulumda ek işlem gerekmez. Bu sürümde yeni açılan hesaplar **pasif** başlıyor: dışarıdan kendi kendine kayıt olan biri hiçbir veriyi göremiyor.

---

## 1. Supabase projesini aç (10 dk)

1. https://supabase.com adresinde **Start your project** ile hesap açın. GitHub hesabıyla giriş en kolayı.
2. **New project** düğmesine basın ve şu değerleri girin:
   - Name: `elmaslar-damga`
   - Database password: güçlü bir şifre (bir yere not edin; günlük kullanımda gerekmez)
   - Region: **Central EU (Frankfurt)**
   - Plan: Free ile başlanabilir.
3. Proje 1–2 dakikada hazır olur.

## 2. Veritabanını kur (2 dk)

1. Sol menüden **SQL Editor** → **New query** açın.
2. Bu repodaki `supabase/damga.sql` dosyasının **tamamını** kopyalayıp yapıştırın ve **Run** düğmesine basın.
3. "Success. No rows returned" görmelisiniz. Dosya tekrar çalıştırılabilir; ileride güncelleme gelirse aynı yöntemle çalıştırılır.

## 3. Giriş ayarları (5 dk)

1. **Authentication → Sign In / Providers → Email**:
   - "Confirm email" seçeneğini **kapatın**. Böylece panelden açtığınız personel hesapları hemen çalışır.
   - "Allow new users to sign up" **açık kalsın**. Panel personel hesabını bu yolla açıyor.
   - Kayıt herkese açık olsa da yeni hesaplar pasif başlar ve hiçbir veri göremez. Hesabı yalnızca yönetici etkinleştirir: panelden açtığınız hesaplar otomatik etkin olur.
   - Kaydedin.
2. **Authentication → URL Configuration**:
   - Site URL: `https://yahyasogut.com/damga/`
   - Redirect URLs: `https://yahyasogut.com/damga/*` ekleyin. "Şifremi unuttum" bağlantısı bunun için gerekli.
3. **Authentication → Users → Add user → Create new user**:
   - E-posta: `yahyasogut@ankutsan.com`, bir şifre belirleyin.
   - "Auto Confirm User" işaretli olsun.
   - Bu e-posta otomatik olarak **yönetici** olur. `admin@ankutsan.com` da yönetici listesinde.

## 4. Google Maps anahtarı (10 dk)

Konum bulma, harita ve gerçek yol süresi için gerekli. Anahtar olmadan da sistem çalışır, ancak konumlar ve mesafeler yaklaşık kalır.

1. https://console.cloud.google.com adresinde yeni bir proje açın: `elmaslar-damga`.
2. **APIs & Services → Library** bölümünden şu üç servisi **Enable** edin:
   - Maps JavaScript API
   - Geocoding API
   - Routes API (eski "Directions API" yeni projelerde açılamıyor)
3. Faturalandırma hesabı bağlayın. Google aylık ücretsiz kullanım kredisi veriyor; 1.000 adresin konumunu bulmak ve günlük rotalar bu sınırın çok altında kalır.
4. **APIs & Services → Credentials → Create credentials → API key** ile anahtar oluşturun.
5. Anahtarı düzenleyip kısıtlayın:
   - Application restrictions: **Websites** → `https://yahyasogut.com/damga/*`
   - API restrictions: yalnızca yukarıdaki 3 API (Maps JavaScript, Geocoding, Routes).

## 5. Ayar dosyasını doldur (3 dk)

1. Supabase'de **Project Settings → API** sayfasından iki değeri kopyalayın:
   - **Project URL**, örn. `https://abcdxyz.supabase.co`
   - **anon public** anahtarı (uzun bir metin)
2. GitHub'da `public/damga/config.js` dosyasını açın, kalem simgesiyle düzenleyin:

```js
SUPABASE_URL: "https://abcdxyz.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
GOOGLE_MAPS_KEY: "AIza...",
```

3. **Commit changes** düğmesine basın.

> ⚠️ Bu dosyaya yalnızca **anon public** anahtar yazılır. `service_role` anahtarını asla buraya ya da repoya koymayın.

## 6. Dosyaları siteye yükle (5 dk)

1. `guncelleme-damga-4.zip` dosyasını bilgisayarınızda açın.
2. GitHub'da `yahyasogut.com` reposunda **Add file → Upload files** seçin.
3. Açtığınız klasördeki `public`, `supabase` ve `docs` klasörlerini sürükleyip bırakın. Klasör yapısı korunur.
4. **Commit changes** düğmesine basın.
5. **Actions** sekmesinde yayın 2–3 dakikada tamamlanır.

5. adımı 6. adımdan sonra yapacaksanız, `config.js`'i GitHub'da düzenlemeniz yeterli.

## 7. İlk kullanım (15 dk)

1. https://yahyasogut.com/damga/ adresine gidip 3. adımda açtığınız hesapla giriş yapın.
2. **Veri & ayarlar → Excel'den içe aktar:**
   - `2026 yılı için damga yeni.xlsx` dosyasını seçin, liste yılı 2026.
   - Önizlemede 3.016 cihaz ve 1.029 lokasyon görünmeli.
   - **İçe aktar** düğmesine basın (yaklaşık 1 dakika). Her cihaza otomatik olarak QR numarası verilir.
   - Ardından aynı yerden **Antalya Kalanlar.xlsx** (Migros/YMS listesi) dosyasını seçin. Biçim otomatik tanınır. Sistemde zaten olan cihazlar (marka + seri no) yeni kayıt açılmadan güncellenir. Önizlemede yaklaşık 298 yeni cihaz ve 396 güncelleme görünür.
3. **Veri & ayarlar → Google ile konum bul:**
   - Yaklaşık 1.000 adres 3–4 dakikada koordinata çevrilir.
   - Bulunamayanlar (çok kısa adresler) yaklaşık konumda kalır; saha ekibi cihaz kartından "Konumu kaydet" ile düzeltir.
4. **Planlar & ekip:**
   - Bölgeleri tanımlayın, örn. Merkez: Kepez, Muratpaşa, Konyaaltı.
   - **Yeni personel hesabı aç** bölümünden ad, telefon, e-posta, geçici şifre ve rol girin.
5. **Rota planla:**
   - Bölgeyi seçin, listeyi rotaya ekleyin, ekip sayısını belirleyin ve **Rotayı optimize et**'e basın.
   - Her ekibe personel seçin, **Google ile hesapla** ile gerçek yol süresini alın.
   - **Planla ve gönder** ile WhatsApp mesajını açın.
6. Personel WhatsApp'taki panel linkine tıklayıp kendi hesabıyla girer. Duraklarını sırayla tamamlar ya da eksik girer. Sonuçlar yönetici ekranına anlık düşer, cihazların damga yılı kendiliğinden güncellenir.

## 8. QR etiketleri

**Cihazlar & QR** sekmesinde cihazları süzüp seçin ve **QR etiketlerini indir** düğmesine basın.

- A4 sayfasında 3×7 etiket (63,5×38,1 mm, L7160 uyumlu) açılır ve yazdırma penceresi gelir. Ölçek **%100** seçilmeli.
- QR'ı okutan herkes giriş yapmadan cihazın periyodik muayene kartını görür: damga geçerli mi, sonraki damga, Max · e · sınıf.
- Kartta fiyat, telefon, adres ve TC gösterilmez.
- QR adresinde tahmin edilemeyen bir anahtar vardır; numaralar sırayla denenerek müşteri listesi taranamaz.

## Roller

| Rol | Ne yapar |
|---|---|
| Yönetici | Her şey: içe aktarma, plan, ekip, bölge, etiket, raporlar |
| Bölge yöneticisi | Yönetici ekranını kullanır; planlayıcı kendi bölgesiyle açılır |
| Saha | Yalnızca kendisine atanan planları görür; durak/cihaz tamamlar, eksik girer, konum ve hassasiyet düzeltir, cihaz arar |

Personeli silmek yerine **Pasifleştir** düğmesini kullanın. Pasif personel giriş yapsa da veri göremez; geçmiş kayıtları korunur.

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| "Kurulum tamamlanmadı" ekranı | `config.js`'de SUPABASE_URL ve SUPABASE_ANON_KEY boş ya da hatalı |
| Giriş sonrası "Hesabınız henüz etkin değil" | Planlar & ekip → Ekip listesinde kişinin yanındaki **Etkinleştir** düğmesine basın. Yönetici hesabınız için: Supabase → Table Editor → profiles → `aktif` = true |
| Personel hesabı açılamıyor | 3.1 adımındaki "Confirm email" kapalı mı kontrol edin |
| Harita veya "Google ile konum bul" çalışmıyor | Anahtarda 3 API açık mı, referans kısıtı `https://yahyasogut.com/damga/*` mı, faturalandırma bağlı mı |
| Değişiklik sitede görünmüyor | GitHub Actions bitti mi kontrol edin; tarayıcıda sayfayı yenileyin (Ctrl+F5) |

## Güvenlik notları

- Repoda müşteri verisi yoktur. Veriler yalnızca Supabase'de, giriş yapan yetkili kullanıcılara açıktır.
- `contacts` tablosundaki TC kimlik no ve doğum tarihini yalnızca yönetici görür.
- Kalivio deneme hesabının şifresi sohbette açık paylaşıldı; değiştirilmesi önerilir.
- Supabase'in ücretsiz planında proje 7 gün hiç kullanılmazsa duraklatılır. Düzenli kullanımda sorun olmaz; canlı kullanımda Pro plan önerilir (otomatik yedek dahil).
