// ─────────────────────────────────────────────────────────────
//  Sitedeki kişisel bilgilerin TAMAMI burada. Sadece bu dosyayı
//  düzenleyerek isim, unvan, biyografi ve linkleri değiştirebilirsin.
// ─────────────────────────────────────────────────────────────

export const site = {
  url: "https://yahyasogut.com",
  name: "Yahya Söğüt",
  initials: "YS",
  email: "yahyasogut@icloud.com",
  linkedin: "https://www.linkedin.com/in/yhysgt/",
  location: { tr: "İstanbul, Türkiye", en: "Istanbul, Türkiye" },

  role: {
    tr: "Bilgi Teknolojileri Grup Müdürü",
    en: "IT Group Manager",
  },
  headline: {
    tr: "Teknolojiyi güvenli, ölçülebilir ve iş hedeflerine bağlı şekilde hayata geçiriyorum.",
    en: "I put technology to work in ways that are secure, measurable and tied to business goals.",
  },
  bio: {
    tr: [
      "Bilgi Teknolojileri Grup Müdürü olarak BT yönetimi, sistem altyapısı, BT güvenliği ve kurumsal uygulamalardan sorumluyum. SAP S/4HANA ve bulut projelerinden lisans yönetimine, üretim sistemleri ile ERP entegrasyonundan kurum içi yapay zekâ çözümlerine kadar geniş bir alanda çalışıyorum.",
      "Odağım; yapay zekâ ve otomasyonu kurumun gerçek ihtiyaçlarıyla buluşturmak, bunu yaparken altyapıyı güvenli ve sürdürülebilir tutmak. Bu sitede projelerimi, yazılarımı ve LinkedIn'de paylaştığım kısa notları bir arada bulabilirsin.",
    ],
    en: [
      "As IT Group Manager I am responsible for IT management, systems infrastructure, IT security and enterprise applications. My work spans SAP S/4HANA and cloud projects, licence management, integrating production systems with ERP, and in-house AI solutions.",
      "My focus is matching AI and automation to an organisation's real needs while keeping the infrastructure secure and sustainable. Here you'll find my projects, my writing and the short notes I share on LinkedIn — all in one place.",
    ],
  },
  // Ana sayfadaki "odak alanları"
  focus: {
    tr: ["Yapay zekâ", "BT yönetimi", "Otomasyon", "BT güvenliği", "Sistem altyapısı", "Proje yönetimi", "SAP S/4HANA & Cloud proje ve lisans yönetimi"],
    en: ["Artificial intelligence", "IT management", "Automation", "IT security", "Systems infrastructure", "Project management", "SAP S/4HANA & Cloud project and licence management"],
  },
  // Hakkımda sayfasındaki zaman çizelgesi — TODO: kendi kariyerinle değiştir
  timeline: [
    { year: "2026", tr: "Bilgi Teknolojileri Grup Müdürü · Ankutsan", en: "IT Group Manager · Ankutsan" },
  ],
} as const;

export type Site = typeof site;
