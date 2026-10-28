---
title: Üretim–ERP ve Otomasyon Entegrasyonu
date: 2026-08-05
summary: SAP S/4HANA, SAP MII ve PCO üzerinden Modbus ile kurulan veri mimarisiyle tüm fabrikalardaki makina sayaçlarını, parametreleri ve enerji verisini ERP ile gerçek zamanlı konuşturduk.
tags: [SAP S/4HANA, SAP MII, SAP PCO, Modbus, Otomasyon, Enerji Yönetimi, OEE]
role: Proje Yöneticisi
status: Canlıda · Tüm fabrikalar
linkedin: false  # LinkedIn'de paylaşmak istediğinde true yap
---
Bir fabrikada en değerli veri, makinanın kendisinde üretilir: kaç adet üretildiği, ne kadar durduğu, hangi hızda çalıştığı, ne kadar enerji harcadığı. Bu projede o veriyi **makinadan ERP'ye kadar kesintisiz ve otomatik** akan bir mimariyle tüm fabrikalarda canlıya aldık.

## Neden?

Makina tarafında üretilen veriler otomasyon sistemlerinde kalıyor, ERP'ye elle ve gecikmeli giriliyordu. Bu durum üç soruna yol açıyordu:

- Üretim, stok ve maliyet raporlarında **sahayla ERP arasında farklar**
- Duruş ve verimlilik kayıplarının **geç fark edilmesi**
- Enerji tüketiminin ürün, hat ve fabrika bazında **izlenememesi**

## Mimari: Makinadan ERP'ye veri akışı

Mimariyi beş katmanlı, her katmanın sorumluluğu net olan bir yapı olarak kurguladık:

1. **Saha (makina ve PLC):** Makina sayaçları, proses parametreleri ve enerji analizörleri veri kaynağı.
2. **Haberleşme (Modbus):** Otomasyon yazılımı ile saha cihazları arasında standart, endüstriyel Modbus haberleşmesi.
3. **Toplama (SAP PCO):** SAP Plant Connectivity, Modbus üzerinden gelen etiketleri (tag) okuyup normalize ediyor ve olay bazlı olarak üst katmana iletiyor.
4. **İş mantığı (SAP MII):** Manufacturing Integration and Intelligence, ham makina verisini iş olayına çeviriyor: üretim teyidi, duruş kaydı, sarf ve enerji tüketimi.
5. **ERP (SAP S/4HANA):** Teyitler, mal hareketleri, duruşlar ve enerji verisi doğrudan iş emirlerine ve iş yerlerine işleniyor.

> Veri sahada bir kez üretilir, bir daha elle girilmez.

## Kapsam: Hangi veriler entegre?

- **Makina sayaçları:** Üretim adetleri ve metrajlar, iş emri bazında otomatik teyit
- **Makina parametreleri:** Hız, sıcaklık, basınç gibi kalite ve verimliliği etkileyen proses değerleri
- **Duruşlar:** Planlı ve plansız duruşların süresi ve nedeni
- **Enerji verileri:** Elektrik ve diğer enerji tüketimlerinin makina, hat ve fabrika bazında izlenmesi
- **Verimlilik (OEE):** Kullanılabilirlik, performans ve kalite bileşenleriyle verimliliği etkileyen tüm göstergeler

## Tüm fabrikalarda tek standart

Proje tek bir pilot hatta kalmadı; **tüm fabrikalarda aktif** çalışacak şekilde tasarlandı. Bunun için:

- **Ortak veri sözlüğü ve etiket standardı:** Her fabrikada aynı veri aynı isimle ve aynı birimle tanımlandı.
- **Ana veri eşleştirmesi:** Sahadaki her makina, S/4HANA'daki iş yeri (work center) ve kaynak tanımıyla eşleştirildi.
- **Şablon yaklaşımı:** Bir fabrikada kurgulanan PCO ve MII yapısı, diğer fabrikalara şablon olarak taşındı.

## Güvenilirlik ve güvenlik

- **Kesintiye dayanıklılık:** Bağlantı koptuğunda veri kaybolmuyor; ara katmanda tamponlanıp bağlantı geldiğinde sırayla aktarılıyor.
- **Zaman senkronizasyonu:** Saha ve ERP aynı zaman referansını kullanıyor; olaylar doğru vardiyaya ve iş emrine yazılıyor.
- **İzleme ve uyarı:** Haberleşme hataları ve tutarsız veriler merkezi olarak izleniyor, ilgili ekibe anında bildiriliyor.
- **OT / IT ayrımı:** Üretim ağları kurumsal ağdan ayrıştırıldı; ERP ile haberleşme yalnızca tanımlı ve güvenli geçiş noktalarından yapılıyor.

## Sonuç

- Üretim teyitleri ve tüketimler **elle giriş olmadan** ERP'ye aktarılıyor.
- Stok, üretim ve maliyet verisi gün sonunu beklemeden, **saha ile aynı anda** ERP'de görünüyor.
- Duruşlar ve verimlilik kayıpları daha **erken fark ediliyor**, kök neden analizi veriyle yapılıyor.
- Enerji tüketimi ürün ve hat bazında izlenebildiği için **birim enerji maliyeti** görünür hale geldi.
- Kurulan altyapı; MES, kestirimci bakım ve yapay zekâ destekli analizler için **sağlam bir veri temeli** oluşturuyor.
