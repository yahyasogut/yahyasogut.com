# Elmaslar Damga Takip — teknik not (v4 · 14 Kasım 2026)

Ayrı proje olarak yahyasogut.com reposunun içinde, kendi klasörlerinde yaşar. Next.js sitesinden bağımsızdır; `public/damga/` statik olarak `/damga/` adresine kopyalanır.

```
public/damga/
  index.html        giriş + uygulama kabuğu
  app.css           tasarım (Elmaslar laciverti, Saira + Figtree + JetBrains Mono)
  app.js            uygulama (vanilla JS, derleme yok)
  config.js         Supabase URL + anon anahtar + Google anahtarı (herkese açık değerler)
  mah.js            Antalya mahalle merkezleri (yaklaşık konum için)
  c/index.html      herkese açık QR muayene kartı
  manifest.webmanifest, mark.png, wordmark.png
supabase/damga.sql  tablolar, RLS, fonksiyonlar (tekrar çalıştırılabilir)
docs/DAMGA-KURULUM.md   adım adım kurulum
```

## Kütüphaneler (CDN, sürüm sabit)

- `@supabase/supabase-js@2.45.4`: giriş, veri, canlı güncelleme
- `qrcode-generator@1.4.4`: QR üretimi
- `xlsx@0.18.5`: Excel içe aktarma, yalnızca Veri sekmesinde yüklenir
- Google Maps JavaScript API: Geocoder, DirectionsService, harita; anahtar varsa yüklenir

## Faz 1'de yapılanlar

- Supabase giriş; roller admin / bölge / saha; personel hesabını panelden açma; pasifleştirme
- Excel içe aktarma: durum eşleme (41 yazım → 7 grup), seri no kontrolü, kapasite normalizasyonu, yaklaşık konum, QR numarası
- Yönetici özeti, canlı verilerden hesaplanır
- Rota planlama:
  - bölge filtresi, çoklu ilçe ve müşteri filtresi
  - liste veya Google harita görünümü; haritadan seçim
  - en yakın komşu + 2-opt, çok ekip bölme ve dengeleme
  - Google ile gerçek yol süresi ve sıra (`optimizeWaypoints`, en fazla 25 durak)
- WhatsApp iş atama: panel linki + zincirlenmiş Google Maps linkleri
- Saha ekranı:
  - yalnızca kendi planları (RLS)
  - cihaz bazında tamamlandı / eksik
  - tamamlanan cihazların damga yılı tetikleyiciyle güncellenir
- Google Geocoding ile toplu konum bulma; sahadan elle konum düzeltme
- Cihaz kartı: yaşam döngüsü durumu, hassasiyet girişi, damga ve eksik kaydı, geçmiş
- Metrolojik alan değişiklikleri `audit_log`'a yazılır
- QR etiket: A4 L7160 baskı. Herkese açık kart `public_device()` fonksiyonundan yalnızca izinli alanları döner.

## Sonraki fazlar (şema hazır, arayüz yok)

`applications` (başvuru), `inspections` (muayene formu), `payments` + `price_list` (tahsilat), `qr_labels` (ön basılı QR), `sms_log`, `contacts` (KVKK). Ayrıntı: proje dokümanı v4, Bölüm 15.

## Bilinen sınırlar

- Google Directions bir rotada en fazla 25 ara durak kabul eder. Daha büyük rotalarda kendi optimizasyonumuz ve kuş uçuşu tahmini kullanılır.
- Ücretsiz Supabase planında 7 gün kullanılmayan proje duraklatılır.
- Ön basılı QR (sahada cihaza bağlama) Faz 3'te. Şimdilik QR numarası içe aktarımda cihaza verilir.

## Sürüm geçmişi

- **v4 · 14.11.2026:**
  - Migros/YMS "kalanlar" Excel biçimi içe aktarılıyor (MAĞAZA ADI, DURUM, İŞLEM TARİHİ, MUAYENE KARTI NO + YORUM sayfası); biçim otomatik tanınıyor.
  - Aynı cihaz iki listede varsa (marka + seri no) yeni kayıt açılmıyor, durumu güncelleniyor; tamamlanmış cihaz geri "bekliyor"a düşmüyor. Aynı mağaza normalize adresle eşleniyor.
  - Yeni durum grubu "Yapıldı · sisteme işlenecek": sahada yapılmış ama sistemde açık görünen cihazlar.
  - Rota planlayıcıda her durak için "Haritada kontrol et" ve "Konumu sabitle". Paylaşım kartında doğrulanmamış durak uyarısı.
  - Yönetici özetindeki "öne çıkanlar" artık veriye göre hesaplanıyor.
- **v3 · 14.11.2026:** Konumu doğrulanmamış duraklar için adres normalize ediliyor: "MAH.BARIŞ" gibi yapışık yazımlar ayrılıyor, "NO:247-247/1" ve blok/daire ekleri temizleniyor, kısaltmalar açılıyor. Böylece Google Maps rota linkleri tek bir adres yüzünden bozulmuyor. Mesaja "rota açılmazsa durak bazlı yol tarifi" notu eklendi.
- **v2 · 14.11.2026:**
  - Yeni hesaplar pasif başlıyor; okuma politikaları `is_active()` istiyor. Böylece anon anahtarla kendi kendine kayıt olan biri veri göremiyor; yerel Postgres'te test edildi.
  - Panelden açılan personel otomatik etkinleşiyor.
  - Cihaz kartındaki alan tablosu ile saha cihaz satırındaki stil çakışması giderildi.
  - Herkese açık QR kartında promise zinciri sağlamlaştırıldı.
  - "31.12.YYYY tarihine kadar" ifadesi düzeltildi.
- **v1 · 02.11.2026:** İlk paket (Faz 1 rota + temel cihaz/QR).
