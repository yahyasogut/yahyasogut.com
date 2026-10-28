---
title: Kurumsal BT Güvenliği Dönüşümü
date: 2026-09-14
summary: Güvenlik duvarlarından DLP'ye, Microsoft 365 MFA'dan OT güvenliğine kadar; 5 şirket ve 10 lokasyonu tek bir güvenlik standardında buluşturan çok katmanlı dönüşüm.
tags: [BT Güvenliği, OT Güvenliği, MFA, DLP, MDM, Kimlik Yönetimi]
role: Proje Lideri
status: Devam ediyor
linkedin: false  # LinkedIn'de paylaşmak istediğinde true yap
---
Ankutsan Grubu'nda 5 şirket ve 10 lokasyon; fabrikalar, geri dönüşüm ve palet tesisleri, depo ve ofis bulunuyor. Her lokasyonun kendi ağı, kullanıcıları ve üretim sistemleri var. Bu dağınık yapıyı **tek bir güvenlik standardı** altında toplamak için güvenliği tek bir ürün olarak değil, birbirini tamamlayan katmanlar olarak ele aldık.

## Neden?

Üretim hatları, ERP, e-posta ve mobil cihazlar artık birbirine bağlı. Bir lokasyondaki açık, tüm grubu etkileyebilir. Hedefimiz üçtü:

- Saldırı yüzeyini **her lokasyonda aynı seviyede** küçültmek
- Kritik veriyi kimin, nereden ve hangi cihazla eriştiğini **görünür** kılmak
- Üretimi durdurmadan **BT ve OT** tarafını birlikte korumak

## Kapsam: Güvenliğin katmanları

### 1. Ağ katmanı: Güvenlik duvarları
Tüm lokasyonlarda yeni nesil güvenlik duvarları ile merkezi olarak yönetilen ortak bir politika seti kurduk. Lokasyonlar arası trafik, internet çıkışı ve uzaktan erişim tek bir kural mantığıyla denetleniyor.

### 2. DNS güvenliği
Zararlı alan adlarına, oltalama sayfalarına ve komuta-kontrol sunucularına giden istekleri daha bağlantı kurulmadan DNS seviyesinde engelliyoruz. Bu katman, kullanıcı bir linke tıklasa bile ilk savunma hattı olarak çalışıyor.

### 3. Kimlik: Microsoft 365 MFA ve Authenticator
Tüm kullanıcılar için Microsoft 365'te çok faktörlü doğrulamayı **Microsoft Authenticator** ile zorunlu hale getirdik. Parola tek başına artık yeterli değil; şüpheli girişler oturum açılmadan durduruluyor.

### 4. Yetkilendirme
"Herkes her şeye erişebilir" yerine **rol bazlı ve en az yetki** prensibini uyguladık. Kullanıcı yetkileri görev tanımına göre veriliyor, işe giriş, görev değişikliği ve ayrılış süreçlerine bağlı olarak düzenli gözden geçiriliyor.

### 5. Veri: DLP (Veri Kaybı Önleme)
Hassas verilerin (finansal, ticari, kişisel) e-posta, bulut ve harici cihazlar üzerinden kontrolsüz şekilde dışarı çıkmasını önleyen DLP kuralları devreye alındı. Amaç kullanıcıyı engellemek değil, riskli davranışı anında fark edip yönlendirmek.

### 6. Mobil: MDM (Mobil Cihaz Yönetimi)
Kurumsal veriye erişen telefon ve tabletler merkezi olarak yönetiliyor: şifreleme, ekran kilidi, uygulama politikaları ve kaybolan cihazda uzaktan silme.

### 7. Üretim: OT ve IT güvenliği
Fabrikalardaki otomasyon (OT) ağlarını kurumsal (IT) ağdan katmanlı yapıyla ayırdık. Üretim sistemlerine erişim yalnızca tanımlı noktalardan, kontrollü ve kayıt altında yapılabiliyor. ERP ve MES entegrasyonları bu güvenli geçiş noktaları üzerinden çalışıyor.

## Yaklaşım

- **Tek standart, 10 lokasyon:** Her tesis için ayrı çözüm yerine, tüm grupta aynı politika ve aynı izleme yapısı
- **Aşamalı geçiş:** Önce pilot lokasyon, sonra yaygınlaştırma; üretimi durdurmadan
- **Görünürlük:** Güvenlik olayları ve erişim kayıtları merkezi olarak izleniyor
- **İnsan faktörü:** Teknik önlemleri, kullanıcı farkındalığı ve oltalama bilinciyle destekledik

> Güvenlik bir ürün değil, her gün sürdürülen bir alışkanlıktır.

## Sonuç

Bugün grubun tüm lokasyonları aynı güvenlik katmanlarıyla korunuyor. Kimlik doğrulama, ağ, veri, mobil cihaz ve üretim tarafı tek bir bütün olarak yönetiliyor. Güvenlik olayları daha erken fark ediliyor, denetimlere hazırlık kolaylaşıyor. En önemlisi, yeni bir lokasyon ya da sistem eklendiğinde uygulanacak standart artık hazır.
