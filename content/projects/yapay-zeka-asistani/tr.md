---
title: ANKAGPT — Kurum İçi Yapay Zekâ Asistanı
date: 2026-07-02
summary: Ankutsan'ın ihtiyaçlarına göre ayağa kaldırdığımız, yerel sistemde çalışan ve kurumun bilgi hafızasını yetki bazlı erişilebilir kılan, ISO 27001 ve veri güvenliği odaklı GPT platformu.
tags: [Yapay Zekâ, Kurumsal GPT, Bilgi Yönetimi, ISO 27001, Veri Güvenliği, WhatsApp Bot]
role: Ürün Sahibi
status: Canlıda · Geliştirme sürüyor
linkedin: false  # LinkedIn'de paylaşmak istediğinde true yap
---
Yapay zekâ araçları hızla iş hayatına girerken kurumların önünde iki seçenek var: çalışanların kurum verisini kontrolsüz şekilde dış servislere taşımasını izlemek ya da bu ihtiyacı **güvenli, kuruma ait bir platformla** karşılamak. **ANKAGPT**, ikinci yolu seçtiğimiz projedir.

## Neden?

- Çalışanların GPT tabanlı araçlara olan ihtiyacı gerçek ve büyüyordu.
- Prosedürler, teknik dokümanlar, kalite kayıtları ve süreç bilgisi farklı sistemlere dağılmıştı; doğru bilgiye ulaşmak zaman alıyordu.
- Kurum verisinin dış servislere gönderilmesi **veri güvenliği ve gizlilik** açısından kabul edilebilir değildi.

Hedef netti: Kurumun GPT ihtiyacını karşılamak ve **kurumun veri hafızasını**, herkesin yalnızca yetkili olduğu kadarıyla erişebileceği şekilde tek bir asistanda toplamak.

## ANKAGPT nedir?

Ankutsan'ın ihtiyaçları doğrultusunda kurum içinde inşa edilen, **yerel sistemde (on-premise) çalışan** bir yapay zekâ asistanı. Kullanıcı sorusunu doğal dilde soruyor; ANKAGPT yanıtı kurumun kendi dokümanlarına dayanarak, kaynağını göstererek veriyor.

> Kurumun bilgisi kurumda kalır; erişim ise yetkiye göre herkese açılır.

## Mimari

1. **Kullanıcı kanalları:** Web arayüzü ve yol haritasında yer alan WhatsApp robotu
2. **Kimlik ve yetki:** Her kullanıcı kurumsal kimliğiyle giriş yapıyor; rolü ve departmanı hangi bilgiye erişebileceğini belirliyor.
3. **Kurumsal bilgi katmanı:** Prosedürler, talimatlar, teknik dokümanlar ve kılavuzlar işlenip aranabilir bir bilgi tabanına dönüştürülüyor.
4. **Yapay zekâ katmanı:** Dil modeli yerel sunucularda çalışıyor; soruyu, yalnızca kullanıcının yetkili olduğu kaynaklardan bulunan içerikle yanıtlıyor.
5. **Güvenlik ve kayıt:** Erişimler ve kullanım kayıt altında; tüm veri işleme kurum sınırları içinde.

## Güvenlik ve uyum

- **Yerel çalışma:** Veri ve model kurum altyapısında; hiçbir içerik dış servislere gönderilmiyor.
- **ISO 27001 uyumlu tasarım:** Bilgi güvenliği yönetim sistemi gereklilikleri ve veri güvenliği politikaları baştan mimariye dahil edildi.
- **Yetki bazlı erişim:** Asistan, kullanıcının sistemlerde göremediği bir belgeyi yanıtında da kullanmıyor.
- **İzlenebilirlik:** Kim, ne zaman, hangi kaynağa eriştiği kayıt altında; yanıtlar kaynak gösterilerek veriliyor.

## Kullanım alanları

- **BT destek:** Sık sorulan sorular, şifre ve erişim süreçleri, cihaz ve yazılım kullanımı
- **Prosedür ve talimatlar:** Kalite, İSG ve operasyon dokümanlarına hızlı erişim
- **Kurumsal sistemler:** SAP ve diğer uygulamalar için kullanım kılavuzları ve adım adım rehberlik
- **Yazışma ve özetleme:** E-posta, rapor ve toplantı notlarının hazırlanması, uzun dokümanların özetlenmesi

## Yol haritası: WhatsApp robotu

Aynı mimari, çalışanlara **WhatsApp robotu** üzerinden de hizmet verecek. Özellikle sahada, vardiyada ya da masa başında olmayan çalışanlar bilgisayara ihtiyaç duymadan:

- Prosedür ve talimatlara anında ulaşabilecek,
- BT destek talebi oluşturup takip edebilecek,
- Kurumsal duyuru ve bilgilere erişebilecek.

Robot da web arayüzüyle aynı **yetki ve güvenlik kurallarına** tabi olacak.

## Sonuç ve devam eden çalışmalar

ANKAGPT, kurumun GPT ihtiyacını güvenli bir şekilde karşılayarak hem **verimliliğe** hem de **bilgiye erişime** katkı sağladı. Doğru bilgiye ulaşma süresi kısaldı, dağınık bilgi tek bir noktadan erişilebilir hale geldi ve kurum verisi kontrol altında kaldı.

Platform yaşayan bir ürün olarak geliştirilmeye devam ediyor:

- Bilgi tabanına yeni departman ve doküman setlerinin eklenmesi
- Kullanıcı geri bildirimleriyle yanıt kalitesinin sürekli iyileştirilmesi
- WhatsApp robotunun devreye alınması
- Kurumsal sistemlerle (ERP, BT destek, İK) entegrasyonların genişletilmesi
