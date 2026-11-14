# Elmaslar Damga Takip — SMS kurulumu (Sanal Santral)

SMS iki yerde kullanılır:

1. **Saha ekibi girişi:** telefona gelen 6 haneli doğrulama kodu. Supabase Auth "Send SMS" kancası `sms-otp` fonksiyonunu çağırır.
2. **Müşteri bilgilendirme ve test SMS'i:** yönetici panelden gönderir; `sms-gonder` fonksiyonu kullanılır.

İki fonksiyon da Sanal Santral `POST /sms/create` servisine gider. Kullanıcı adı, API anahtarı ve gönderici başlığı **yalnızca Supabase'deki gizli değerlerde** durur. GitHub'a, config.js'e ya da sohbete yazılmaz.

## 0. Sanal Santral'dan teyit edilecekler
- API kullanıcı adı ve API anahtarı (geldi).
- Onaylı **gönderici başlığı**, yani SMS'te görünen ad. Birebir aynı yazılmalıdır.
- Servis adresi. Varsayılan `https://sms.sanalsantral.com.tr:9588/sms/create`; farklıysa `SS_API_URL` girilir.
- `X-Customer-Company-ID` ve `X-Entegrator-Company-ID` değerleri verildiyse onlar da girilir.
- **IP kısıtlaması varsa kaldırılmalı.** Supabase fonksiyonlarının sabit IP'si yoktur.

## 1. SQL
Supabase → SQL Editor'de `supabase/damga-sms.sql` çalıştırılır. Bu, SMS günlüğüne tür, mesaj, paket no ve hata alanlarını ekler.

## 2. Gizli değerler
Supabase → Edge Functions → **Secrets** → Add new secret:

| Ad | Değer |
|---|---|
| `SS_USERNAME` | Sanal Santral API kullanıcı adı |
| `SS_API_KEY` | Sanal Santral API anahtarı |
| `SS_SENDER` | Onaylı gönderici başlığı (örn. ELMASLAR) |
| `SS_CUSTOMER_ID` | (verildiyse) |
| `SS_ENTEGRATOR_ID` | (verildiyse) |
| `SS_API_URL` | (yalnızca farklı adres verildiyse) |
| `SS_AUTH_MODE` | Boş bırakın (`basic`). Test 401 verirse `bearer`, o da olmazsa `apikey` deneyin. |

## 3. `sms-gonder` fonksiyonu (yönetici SMS'i)
1. Edge Functions → **Deploy a new function → Via Editor**.
2. Ad: `sms-gonder`. `supabase/functions/sms-gonder/index.ts` içeriğini yapıştırıp **Deploy** deyin.
3. "Verify JWT / Enforce JWT verification" **açık** kalmalı.
4. Sitede Veri & ayarlar → **SMS · Sanal Santral** → kendi numaranızla **Test SMS gönder**. "Son gönderimleri göster" sonucu ve varsa hatayı gösterir.

## 4. `sms-otp` fonksiyonu (giriş kodu)
1. Aynı şekilde `sms-otp` adıyla `supabase/functions/sms-otp/index.ts` yüklenir.
2. Bu fonksiyonda **JWT doğrulaması KAPALI** olmalı. Çağrıyı Supabase'in imzalı kancası yapar.
3. Authentication → **Hooks** → Add hook → **Send SMS hook** → **HTTPS** seçilir.
   - URL: `https://qkmjttfwgnmfpwdkxrgx.supabase.co/functions/v1/sms-otp`
   - **Generate secret** ile üretilen `v1,whsec_…` değeri kopyalanır ve Secrets'a `SEND_SMS_HOOK_SECRET` adıyla eklenir.
   - Kanca kaydedilip etkinleştirilir.
4. Authentication → Sign In / Providers → **Phone** açılır. SMS sağlayıcı alanı zorunluysa herhangi biri seçilir; Send SMS kancası etkin olduğu sürece gönderimi kanca yapar. OTP süresi 300 sn, uzunluk 6 önerilir.

## 5. Saha ekibi
Planlar & ekip → **Telefonla giriş listesi** → toplu yapıştır:
```
Yasin YALÇIN 0507 220 71 07
Anıl GÜÇ 0553 966 03 01
Ali ERTÜRK 0533 817 39 12
Asım ELMASLAR 0533 275 76 53
Nurullah AKYOL 0541 581 73 06
Mustafa NEŞET 0539 248 45 07
```
Listede olan numara ilk girişte otomatik etkinleşir. Olmayan numara kod alsa bile pasif kalır.

## 6. Müşteri bilgilendirme
Müşteriler & gruplar → müşterileri seçin (grup ya da arama ile toplu) → **SMS gönder**.
- Mesaj şablonu `{firma}`, `{ilce}`, `{il}`, `{donem}`, `{cihaz}` değişkenleriyle kişiselleşir.
- Cep numarası firma telefonundan ya da yetkili cebinden alınır. Sabit hatlara gönderilmez.
- Önizlemede karakter ve SMS adedi görünür; tüm gönderimler SMS günlüğüne yazılır.
- Bilgilendirme mesajları içindir. Reklam / kampanya içeriği İYS onayı gerektirir.

## Sorun giderme
- **Test "401/403" dönüyor:** `SS_AUTH_MODE` değerini `bearer` yapın, sonra `apikey` deneyin. Kullanıcı adı ve anahtarı kontrol edin.
- **"SMS servisine ulaşılamadı":** `sms-gonder` yüklenmemiş ya da adı farklı.
- **Giriş kodu gelmiyor:** Authentication → Logs ve Edge Functions → sms-otp → Logs incelenir. SMS günlüğünde "otp" satırındaki hata Sanal Santral'ın yanıtıdır. Kodun kendisi hiçbir yere kaydedilmez.
