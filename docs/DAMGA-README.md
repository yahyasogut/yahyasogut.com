# Elmaslar Damga Takip — teknik not (v10 · 14 Kasım 2026)

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
supabase/damga-donem.sql  v9 eki: dönemler (period_items) + müşteri grupları
supabase/damga-sira.sql   v10 eki: lokasyon ve cihaz sıra numaraları
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

- **v10 · 14.11.2026:**
  - **Sıra numaraları.** Her lokasyon (`businesses.sira`) ve cihaz (`devices.sira`) kalıcı bir numara alır. Mevcut kayıtlar il / ilçe / ad sırasıyla numaralandı; yeni kayıtlar otomatik numara alır. Numaralar raporlarda, CSV'de, cihaz listesinde, cihaz kartında ve Excel'de görünür.
  - **Kayıt düzenleyici** (Veri & ayarlar): dönem listesi tablo halinde.
    - Gösterilecek alanlar seçilir (lokasyon, cihaz ve dönem alanları; seçim hatırlanır). Hücreler yerinde düzenlenir, değişenler sarı işaretlenir.
    - Seçili satırlara toplu değer uygulanır; seçilenler dönemden çıkarılabilir. Tek tuşla kaydedilir.
    - Lokasyon alanları (⌂) o adresteki tüm cihazlara uygulanır. Arama, ilçe ve durum filtresi var; grup filtresine uyar.
  - **Dönem listesi kartı:** "Dönem şablonunu indir" (Cihazlar + Açıklamalar + Listeler sayfaları) ve "Mevcut verisini indir".
  - İndirilen liste Excel'de düzenlenip geri yüklenebilir. **CİHAZ NO** dolu satırlar o cihazı günceller (yalnızca değişen ve boş olmayan hücreler; önizlemede "eski → yeni" gösterilir). Numarasız satırlar yeni kayıt olur ve mükerrer kuralı uygulanır.
  - Yeni SQL eki: `supabase/damga-sira.sql` (damga.sql içinde de var). Önbellek sürümü ?v=10.

- **v9 · 14.11.2026:**
  - **Dönem (yıl) yapısı.** Sağ üstte "Dönem" seçici (2026, 2027…; seçim tarayıcıda hatırlanır). Cihaz, QR ve müşteri kayıtları ortaktır; her dönemin listesi ve durumu `period_items` tablosunda tutulur. Mevcut kayıtlar 2026 dönemine taşındı. Planlar dönemle kaydedilir (`plans.donem`); saha "tamamlandı" ve cihaz kartındaki damga kaydı, planın/dönemin listesini günceller.
  - Boş dönemde "son damgası (dönem − 2) olan cihazlarla dönemi oluştur" (`create_period`) ya da Excel'den içe aktarma.
  - **Dönem listesi içe aktarma** (Elmaslar / Migros / genel biçim): sistemde olan cihaz (marka + seri) yeni kayıt açılmadan seçili döneme bağlanır ve durumu güncellenir.
  - **Yeni müşteri ekle (toplu)** ayrı kart: her zaman sütun eşlemeli genel içe aktarma, kayıtlar seçili dönemin altına eklenir. Müşteri + adres + cihaz (marka) + seri no aynıysa **mükerrer**: "Yinelenenleri kaldır" (varsayılan) ya da "Ekle ve mükerrer olarak işaretle". Sistemde olup dönemde olmayan cihazlar döneme bağlanır. Excel'de DURUM ve GRUP sütunları da okunur.
  - **Dönem listesini Excel'e aktar**: içe aktarmayla aynı başlıklar (grup filtresine uyar).
  - **Müşteriler & gruplar** sekmesi: grup ekle / yeniden adlandır / sil; müşterileri filtreleyip toplu seçerek gruba atama veya gruptan çıkarma; satırdan tek tek atama.
  - Sağ üstte **Grup filtresi** (çoklu seçim + Grupsuz): özet, rota planlama, cihazlar ve raporların hepsini süzer. Raporlarda ve CSV'de Dönem ve Grup sütunları; mükerrer cihazlar listede ve kartta işaretli.
  - Cihaz kartında "Bu cihaz seçili dönem listesinde yok → döneme ekle".
  - Yeni SQL eki: `supabase/damga-donem.sql` (damga.sql içinde de var). Önbellek sürümü ?v=9.

- **v8 · 14.11.2026:**
  - **Türkiye il/ilçe listesi** (81 il, 973 ilçe) ve Antalya + Burdur mahalle → ilçe eşlemesi: `public/damga/tr-yer.js` (kaynak turkey-neighbourhoods 4.0.3, MIT).
  - İçe aktarmada il ve ilçe resmi adlara çevriliyor. Yazım farkları birleşiyor (KONYAALTİ/konyaalti → KONYAALTI); en yakın ad bulunuyor; ilçe boş ya da mahalle yazılmışsa adresten bulunuyor. Mevcut lokasyon anahtarları değişmediği için yeniden içe aktarmada çift kayıt oluşmuyor.
  - Veri & ayarlar → **İl / ilçe düzeltme**: kayıtlı verideki yazım düzeltmeleri otomatik uygulanıyor. Adresteki mahalle başka ilçedeyse öneri olarak listeleniyor ve seçilenler uygulanıyor. Tanınamayanlar ayrı listeleniyor. Yaklaşık konumlar yeni ilçeye taşınıyor.
  - Veri & ayarlar → **Mükerrer müşteri ve cihazlar**:
    - Aynı adresli ya da aynı ad + ilçedeki müşteriler tek kayıtta birleştirilebiliyor (cihazlar ana kayda taşınıyor).
    - Aynı marka + seri numaralı cihazlardan biri tutulup diğerleri "mükerrer kayıt" olarak pasife alınıyor; en yeni damga yılı ve en iyi durum tutulan kayda aktarılıyor.
    - "Mükerrer değil" denilen gruplar gizleniyor.
- **v7 · 14.11.2026:**
  - **Esnek içe aktarma.** Tanınmayan Excel biçimlerinde başlık satırı (ilk 15 satır içinde) ve sayfa otomatik bulunuyor. Sütunlar eş anlamlılarla sistem alanlarına eşleniyor (örn. "Mağaza İsmi" → firma, "Serial No" → seri no, "Kapasite" → max, "KOD" → mağaza kodu). Önizlemede "Sütun eşleştirme" ile elle düzeltilebiliyor.
  - Kural tüm yeni müşteri aktarımlarında geçerli: aynı firma + marka + seri no varsa satır eklenmiyor.
  - Seri no veya marka olmayan satırlar ("BILA") ayrı listeleniyor; varsayılan olarak eklenmiyor, istenirse işaretlenip ekleniyor.
  - **Raporlar sekmesi.** Müşteri bazlı ve cihaz bazlı çarşaf rapor; il, ilçe, durum ve arama filtresi; filtrelenmiş verinin tamamı CSV olarak (Excel uyumlu, ; ayraçlı) indiriliyor.
- **v6 · 14.11.2026:**
  - Yeni müşteri şablonu: `public/damga/elmaslar-yeni-musteri-sablonu.xlsx`. Panelde "Yeni müşteri şablonunu indir" düğmesi var.
  - Şablon içe aktarımında sistemde aynı firma + marka + seri no varsa satır eklenmiyor. Dosya içindeki tekrarlar ve zorunlu alanı eksik satırlar da eklenmiyor; önizlemede satır numarasıyla listeleniyor ve CSV rapor olarak indirilebiliyor.
  - Aynı marka + seri başka bir firmada kayıtlıysa (cihaz el değiştirmiş olabilir) varsayılan olarak atlanıyor; yönetici isterse işaretleyip ekleyebiliyor.
  - Firma sistemde aynı adresle zaten varsa yeni cihazlar o lokasyona ekleniyor. Yetkili kişi bilgisi `contacts` tablosuna yazılıyor.
  - Önbellek için dosya sürümleri ?v=6 oldu.
- **v5 · 14.11.2026:**
  - Telefonla giriş (SMS kodu). Yönetici, Planlar & ekip ekranındaki "Telefonla giriş listesi"ne ad ve numara ekler; toplu yapıştırma da var. Bu numarayla ilk kez kod alıp giren kişi otomatik etkin olur ve rolünü listeden alır. Listede olmayan numaralar pasif kalır.
  - Henüz giriş yapmamış kişiye de plan atanabiliyor; kişi ilk girişte planına otomatik bağlanıyor. WhatsApp mesajı yine o numaraya gidiyor.
  - Google rota hesabı Routes API'ye taşındı (eski Directions API yeni projelerde açılamıyor).
  - Supabase panelinden rol ve aktiflik değiştirilebiliyor; uygulama kullanıcıları için koruma sürüyor.
  - Yeni SQL eki: supabase/damga-telefon.sql (damga.sql içinde de var).
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
