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
  location: { tr: "Antalya, Türkiye", en: "Antalya, Türkiye" },
  // Portre fotoğrafı: public/portrait.jpg yükleyip aşağıya "/portrait.jpg" yaz. Boşsa logo gösterilir.
  portrait: "/portrait.jpg",

  org: "Ankutsan A.Ş.",
  role: {
    tr: "Bilgi Teknolojileri Grup Müdürü",
    en: "IT Group Manager",
  },
  headline: {
    tr: "Teknolojiyi güvenli, ölçülebilir ve iş hedeflerine bağlı şekilde hayata geçiriyorum.",
    en: "I put technology to work in ways that are secure, measurable and tied to business goals.",
  },
  // Hakkımda sayfasının giriş paragrafı
  bio: {
    tr: [
      "2011'de sahada sistem teknisyeni olarak başladığım yolculuk, bugün Ankutsan Grubu'nda 5 şirket ve 10 lokasyonun bilgi teknolojilerinden sorumlu Grup Müdürlüğü ile devam ediyor. 15 yılı aşkın sürede bilgi teknolojileri, süreç geliştirme, saha otomasyonu ve yazılım tarafında birçok projenin kurulumunda ve yürütülmesinde yer aldım.",
    ],
    en: [
      "The journey I began in 2011 as a field system technician continues today as IT Group Manager at Ankutsan Group, responsible for IT across 5 companies and 10 locations. Over more than 15 years I have helped set up and run many projects across information technology, process improvement, shop-floor automation and software.",
    ],
  },
  // Hakkımda → rakamlarla
  stats: [
    { value: "15+", label: { tr: "yıl BT deneyimi", en: "years in IT" } },
    { value: "12+", label: { tr: "yıl Ankutsan Grubu", en: "years with Ankutsan Group" } },
    { value: "5", label: { tr: "grup şirketi", en: "group companies" } },
    { value: "10", label: { tr: "lokasyonda BT yönetimi", en: "locations under IT management" } },
    { value: "13+", label: { tr: "kurumsal proje", en: "enterprise projects" } },
  ],
  // Hakkımda → Sorumluluk alanı (grup şirketleri ve lokasyonlar)
  group: [
    { name: "Ankutsan A.Ş.", sites: { tr: "5 fabrika · 1 ofis", en: "5 plants · 1 office" }, count: 6 },
    { name: "Ankutsan Geri Dönüşüm", sites: { tr: "2 tesis", en: "2 facilities" }, count: 2 },
    { name: "Ankutsan Palet", sites: { tr: "1 tesis", en: "1 facility" }, count: 1 },
    { name: "Ankutsan Packaging", sites: { tr: "1 depo", en: "1 warehouse" }, count: 1 },
    { name: "MR Packaging", sites: { tr: "Grup şirketi", en: "Group company" }, count: 0 },
  ],
  // Hakkımda → Hikâyem (bölümler, eskiden yeniye)
  story: [
    {
      years: "2011 – 2013",
      title: { tr: "Sahada başlayan yol", en: "Starting in the field" },
      text: {
        tr: "İş hayatıma Netaş bünyesinde, BDH ve Probil projelerinde sistem teknisyeni olarak başladım. Sunucuların, ağların ve kullanıcıların arasında geçen bu yıllar bana önemli bir şey öğretti: teknoloji ancak sahada sorunsuz çalıştığında değer üretir.",
        en: "I started my career as a system technician at Netaş, working on BDH and Probil projects. Those years among servers, networks and users taught me something lasting: technology only creates value when it runs smoothly in the field.",
      },
    },
    {
      years: "2013 – 2015",
      title: { tr: "İlk ekip, ilk sorumluluk", en: "First team, first responsibility" },
      text: {
        tr: "AC Group'ta Teknik Servis Müdürü olarak ilk kez bir ekibin ve müşteri memnuniyetinin sorumluluğunu üstlendim. Eylül 2014'te sistem ve ağ uzmanı olarak dış kaynak modeliyle Ankutsan'da çalışmaya başladığımda, yolculuğumun ana durağını da bulmuş oldum.",
        en: "As Technical Service Manager at AC Group I took responsibility for a team and for customer satisfaction for the first time. In September 2014 I began working at Ankutsan as an outsourced system and network specialist, and found the main stop of my journey.",
      },
    },
    {
      years: "2015 – 2019",
      title: { tr: "Fabrikalar arası BT", en: "IT across plants" },
      text: {
        tr: "Ankutsan'ın Antalya, Mersin ve Ankara fabrikaları ile Kutay Kutu İstanbul fabrikasının BT altyapısında BT uzmanı olarak görev aldım. 2017'de üç fabrikanın BT yöneticiliğini üstlendim; farklı lokasyonları tek bir standartla yönetmeyi burada öğrendim.",
        en: "As IT Specialist I supported the IT infrastructure of Ankutsan's Antalya, Mersin and Ankara plants and Kutay Kutu's Istanbul plant. In 2017 I became IT manager for the three Ankutsan plants and learned to run different sites to one standard.",
      },
    },
    {
      years: "2019 – 2025",
      title: { tr: "Dijital dönüşüm yılları", en: "The digital transformation years" },
      text: {
        tr: "Bilgi Teknolojileri Müdürü olarak departmanı, bütçeyi ve proje portföyünü yönettim. SAP ERP'den bulut S/4HANA'ya geçiş, SAP Basis (SolMan) ve DigiMES (MII) projeleri; MES, RFID ve RTLS ile üretim sahasını dijitalleştiren çalışmalar; kalite, İK ve finans sistemleri bu dönemin öne çıkan işleri oldu.",
        en: "As IT Manager I ran the department, its budget and its project portfolio. Highlights include the move from SAP ERP to cloud S/4HANA, SAP Basis (SolMan) and DigiMES (MII) projects, digitising the shop floor with MES, RFID and RTLS, and quality, HR and finance systems.",
      },
    },
    {
      years: "2025 – ",
      title: { tr: "Grup ölçeğinde liderlik", en: "Leading at group scale" },
      text: {
        tr: "Şubat 2025'ten bu yana Bilgi Teknolojileri Grup Müdürü olarak Ankutsan A.Ş., Ankutsan Packaging, Ankutsan Geri Dönüşüm, MR Packaging ve Ankutsan Palet'ten oluşan 5 şirketin 10 lokasyondaki BT stratejisinden ve operasyonundan sorumluyum. Koç Üniversitesi Executive Development Program ile yönetim bakışımı güçlendirdim. Bugünkü odağım; yapay zekâ ve otomasyonu kurumun gerçek ihtiyaçlarıyla buluşturmak, bunu yaparken altyapıyı güvenli ve sürdürülebilir tutmak.",
        en: "Since February 2025 I have been IT Group Manager, responsible for IT strategy and operations across 10 locations of five companies: Ankutsan A.Ş., Ankutsan Packaging, Ankutsan Geri Dönüşüm, MR Packaging and Ankutsan Palet. The Koç University Executive Development Program sharpened my management perspective. My focus today is matching AI and automation to real business needs while keeping the infrastructure secure and sustainable.",
      },
    },
  ],
  // Ana sayfadaki "odak alanları"
  focus: {
    tr: ["Yapay zekâ", "BT yönetimi", "Otomasyon", "BT güvenliği", "Sistem altyapısı", "Proje yönetimi", "SAP S/4HANA & Cloud proje ve lisans yönetimi"],
    en: ["Artificial intelligence", "IT management", "Automation", "IT security", "Systems infrastructure", "Project management", "SAP S/4HANA & Cloud project and licence management"],
  },
  // Hakkımda → Kariyer (şirket bazında, en yeniden eskiye)
  career: [
    {
      org: "Ankutsan A.Ş.",
      span: { tr: "Eyl 2014 – bugün · dış kaynak dahil", en: "Sep 2014 – present · incl. outsourcing" },
      roles: [
        { period: { tr: "Şub 2025 – bugün", en: "Feb 2025 – present" }, title: { tr: "Bilgi Teknolojileri Grup Müdürü", en: "IT Group Manager" }, place: "Antalya", desc: { tr: "5 grup şirketi ve 10 lokasyonda BT stratejisi, altyapı, BT güvenliği ve kurumsal uygulamalar.", en: "IT strategy, infrastructure, IT security and enterprise applications across 5 group companies and 10 locations." } },
        { period: { tr: "Şub 2019 – Şub 2025", en: "Feb 2019 – Feb 2025" }, title: { tr: "Bilgi Teknolojileri Müdürü", en: "IT Manager" }, place: "", desc: { tr: "SAP ERP ve bulut S/4HANA proje yönetimi, BT departman ve bütçe yönetimi, proje takibi.", en: "SAP ERP and cloud S/4HANA project management, IT department and budget management, project tracking." } },
        { period: { tr: "Şub 2017 – Şub 2025", en: "Feb 2017 – Feb 2025" }, title: { tr: "BT Yöneticisi", en: "Manager of Information Technology" }, place: "", desc: { tr: "Ankara, Antalya ve Mersin fabrikalarının bilgi teknolojileri yönetimi.", en: "IT management for the Ankara, Antalya and Mersin plants." } },
        { period: { tr: "Nis 2015 – Şub 2017", en: "Apr 2015 – Feb 2017" }, title: { tr: "BT Uzmanı", en: "IT Specialist" }, place: "", desc: { tr: "Ankutsan Antalya, Mersin ve Ankara fabrikaları ile Kutay Kutu İstanbul fabrikası.", en: "Ankutsan's Antalya, Mersin and Ankara plants and Kutay Kutu's Istanbul plant." } },
      ],
    },
    {
      org: "AC Group (AC-YT Bilgisayar)",
      span: { tr: "2013 – 2015", en: "2013 – 2015" },
      roles: [
        { period: { tr: "Eyl 2014 – Nis 2015", en: "Sep 2014 – Apr 2015" }, title: { tr: "Sistem ve Ağ Uzmanı", en: "System and Network Specialist" }, place: "", desc: { tr: "Dış kaynak modeliyle Ankutsan A.Ş.'de görev.", en: "Outsourced to Ankutsan A.Ş." } },
        { period: { tr: "Nis 2013 – Eyl 2014", en: "Apr 2013 – Sep 2014" }, title: { tr: "Teknik Servis Müdürü", en: "Technical Service Manager" }, place: "", desc: { tr: "", en: "" } },
      ],
    },
    {
      org: "Netaş",
      span: { tr: "2011 – 2013", en: "2011 – 2013" },
      roles: [
        { period: { tr: "Eki 2011 – Nis 2013", en: "Oct 2011 – Apr 2013" }, title: { tr: "Sistem Teknisyeni", en: "System Technician" }, place: "", desc: { tr: "Netaş · Probil · BDH", en: "Netaş · Probil · BDH" } },
      ],
    },
  ],
  // Hakkımda → Öne çıkan projeler
  projects: [
    { group: { tr: "SAP ve ERP", en: "SAP & ERP" }, items: ["SAP S/4HANA Cloud", "SAP ERP", "SAP Basis (SolMan)", "SAP DigiMES (MII)", "NTN Üretim ERP", "Logo Finans"] },
    { group: { tr: "Üretim ve saha", en: "Production & shop floor" }, items: ["MES", "Digitor MES", "RFID", "Mesh / RTLS"] },
    { group: { tr: "Kurumsal sistemler", en: "Enterprise systems" }, items: ["QDMS Kalite", "Vizyon İK", "Turquality"] },
    { group: { tr: "Yönetim", en: "Management" }, items: ["BT departman yönetimi", "BT bütçe yönetimi", "Proje portföy yönetimi"] },
  ],
  // Hakkımda → Eğitim
  education: [
    { period: "2025 – 2026", school: "Koç Üniversitesi", degree: { tr: "Executive Development Program, İktisadi ve İdari Bilimler Fakültesi", en: "Executive Development Program, College of Administrative Sciences and Economics" } },
    { period: "2014 – 2016", school: "Anadolu Üniversitesi", degree: { tr: "İşletme ve Yönetim", en: "Business Administration and Management" } },
    { period: "2007 – 2009", school: "Mehmet Akif Ersoy Üniversitesi", degree: { tr: "Bilgisayar Teknolojileri ve Programlama", en: "Computer Technologies and Programming" } },
  ],
  certifications: ["Cloud Services Partner Training — Certificate of Attendance"],
  languages: [
    { name: { tr: "Türkçe", en: "Turkish" }, level: { tr: "Ana dil", en: "Native" } },
    { name: { tr: "İngilizce", en: "English" }, level: { tr: "Sınırlı çalışma yetkinliği", en: "Limited working proficiency" } },
  ],
} as const;

export type Site = typeof site;
