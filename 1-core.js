// Bellek içi (RAM) cache — sayfa kapanınca silinir, telefon hafızasını doldurmaz.
// GitHub'dan çekilen tefsir/meal/arapça verileri burada tutulur (localStorage'a yazılmaz).
const _bellekCache = { tefsir: {}, ceviri: {}, arapca: {} };

// raw.githubusercontent.com (GitHub'ın CDN'i) bir dosyayı birkaç dakikalığına ÖNBELLEKTE tutabilir.
// Yani siz GitHub'a yeni bir sürüm yazsanız bile, hemen ardından okumaya çalıştığınızda
// CDN size ESKİ (önbellekteki) içeriği verebilir — "kaydedildi ama sayfa yenileyince eski haline
// dönüyor" hissi tam olarak budur. Çözüm: her okuma isteğine benzersiz bir sorgu parametresi
// ekleyip CDN'i "bu farklı bir istek" diye kandırmak (cache-busting).
function _tazeUrl(url) {
  if (!url) return url;
  const ayirici = url.includes('?') ? '&' : '?';
  return url + ayirici + '_cb=' + Date.now();
}

// ════════════════════════════════════════
//  SURE VERİSİ
// ════════════════════════════════════════

const SURELER = [
  {isim:"Fâtiha",    ar:"الفاتحة", ayet:7,   cuz:1,  tip:"Mekkî", inis:5},
  {isim:"Bakara",    ar:"البقرة",  ayet:286, cuz:1,  tip:"Medenî", inis:87},
  {isim:"Âl-i İmrân",ar:"آل عمران",ayet:200,cuz:3,  tip:"Medenî", inis:89},
  {isim:"Nisâ",      ar:"النساء",  ayet:176, cuz:4,  tip:"Medenî", inis:92},
  {isim:"Mâide",     ar:"المائدة", ayet:120, cuz:6,  tip:"Medenî", inis:112},
  {isim:"En'âm",     ar:"الأنعام", ayet:165, cuz:7,  tip:"Mekkî", inis:55},
  {isim:"A'râf",     ar:"الأعراف", ayet:206, cuz:8,  tip:"Mekkî", inis:39},
  {isim:"Enfâl",     ar:"الأنفال", ayet:75,  cuz:9,  tip:"Medenî", inis:88},
  {isim:"Tevbe",     ar:"التوبة",  ayet:129, cuz:10, tip:"Medenî", inis:113},
  {isim:"Yûnus",     ar:"يونس",    ayet:109, cuz:11, tip:"Mekkî", inis:51},
  {isim:"Hûd",       ar:"هود",     ayet:123, cuz:11, tip:"Mekkî", inis:52},
  {isim:"Yûsuf",     ar:"يوسف",    ayet:111, cuz:12, tip:"Mekkî", inis:53},
  {isim:"Ra'd",      ar:"الرعد",   ayet:43,  cuz:13, tip:"Medenî", inis:96},
  {isim:"İbrâhim",   ar:"إبراهيم", ayet:52,  cuz:13, tip:"Mekkî", inis:72},
  {isim:"Hicr",      ar:"الحجر",   ayet:99,  cuz:14, tip:"Mekkî", inis:54},
  {isim:"Nahl",      ar:"النحل",   ayet:128, cuz:14, tip:"Mekkî", inis:70},
  {isim:"İsrâ",      ar:"الإسراء", ayet:111, cuz:15, tip:"Mekkî", inis:50},
  {isim:"Kehf",      ar:"الكهف",   ayet:110, cuz:15, tip:"Mekkî", inis:69},
  {isim:"Meryem",    ar:"مريم",    ayet:98,  cuz:16, tip:"Mekkî", inis:44},
  {isim:"Tâhâ",      ar:"طه",      ayet:135, cuz:16, tip:"Mekkî", inis:45},
  {isim:"Enbiyâ",    ar:"الأنبياء",ayet:112, cuz:17, tip:"Mekkî", inis:73},
  {isim:"Hac",       ar:"الحج",    ayet:78,  cuz:17, tip:"Medenî", inis:103},
  {isim:"Mü'minûn",  ar:"المؤمنون",ayet:118, cuz:18, tip:"Mekkî", inis:74},
  {isim:"Nûr",       ar:"النور",   ayet:64,  cuz:18, tip:"Medenî", inis:102},
  {isim:"Furkân",    ar:"الفرقان", ayet:77,  cuz:18, tip:"Mekkî", inis:42},
  {isim:"Şuarâ",     ar:"الشعراء", ayet:227, cuz:19, tip:"Mekkî", inis:47},
  {isim:"Neml",      ar:"النمل",   ayet:93,  cuz:19, tip:"Mekkî", inis:48},
  {isim:"Kasas",     ar:"القصص",   ayet:88,  cuz:20, tip:"Mekkî", inis:49},
  {isim:"Ankebût",   ar:"العنكبوت",ayet:69,  cuz:20, tip:"Mekkî", inis:85},
  {isim:"Rûm",       ar:"الروم",   ayet:60,  cuz:21, tip:"Mekkî", inis:84},
  {isim:"Lokmân",    ar:"لقمان",   ayet:34,  cuz:21, tip:"Mekkî", inis:57},
  {isim:"Secde",     ar:"السجدة",  ayet:30,  cuz:21, tip:"Mekkî", inis:75},
  {isim:"Ahzâb",     ar:"الأحزاب", ayet:73,  cuz:21, tip:"Medenî", inis:90},
  {isim:"Sebe'",     ar:"سبأ",     ayet:54,  cuz:22, tip:"Mekkî", inis:58},
  {isim:"Fâtır",     ar:"فاطر",    ayet:45,  cuz:22, tip:"Mekkî", inis:43},
  {isim:"Yâsîn",     ar:"يس",      ayet:83,  cuz:22, tip:"Mekkî", inis:41},
  {isim:"Sâffât",    ar:"الصافات", ayet:182, cuz:23, tip:"Mekkî", inis:56},
  {isim:"Sâd",       ar:"ص",       ayet:88,  cuz:23, tip:"Mekkî", inis:38},
  {isim:"Zümer",     ar:"الزمر",   ayet:75,  cuz:23, tip:"Mekkî", inis:59},
  {isim:"Gâfir",     ar:"غافر",    ayet:85,  cuz:24, tip:"Mekkî", inis:60},
  {isim:"Fussilet",  ar:"فصلت",    ayet:54,  cuz:24, tip:"Mekkî", inis:61},
  {isim:"Şûrâ",      ar:"الشورى",  ayet:53,  cuz:25, tip:"Mekkî", inis:62},
  {isim:"Zuhruf",    ar:"الزخرف",  ayet:89,  cuz:25, tip:"Mekkî", inis:63},
  {isim:"Duhân",     ar:"الدخان",  ayet:59,  cuz:25, tip:"Mekkî", inis:97},
  {isim:"Câsiye",    ar:"الجاثية", ayet:37,  cuz:25, tip:"Mekkî", inis:65},
  {isim:"Ahkâf",     ar:"الأحقاف", ayet:35,  cuz:26, tip:"Mekkî", inis:66},
  {isim:"Muhammed",  ar:"محمد",    ayet:38,  cuz:26, tip:"Medenî", inis:95},
  {isim:"Fetih",     ar:"الفتح",   ayet:29,  cuz:26, tip:"Medenî", inis:111},
  {isim:"Hucurât",   ar:"الحجرات", ayet:18,  cuz:26, tip:"Medenî", inis:106},
  {isim:"Kâf",       ar:"ق",       ayet:45,  cuz:26, tip:"Mekkî", inis:34},
  {isim:"Zâriyât",   ar:"الذاريات",ayet:60,  cuz:26, tip:"Mekkî", inis:67},
  {isim:"Tûr",       ar:"الطور",   ayet:49,  cuz:27, tip:"Mekkî", inis:46},
  {isim:"Necm",      ar:"النجم",   ayet:62,  cuz:27, tip:"Mekkî", inis:23},
  {isim:"Kamer",     ar:"القمر",   ayet:55,  cuz:27, tip:"Mekkî", inis:54},
  {isim:"Rahmân",    ar:"الرحمن",  ayet:78,  cuz:27, tip:"Medenî", inis:97},
  {isim:"Vâkıa",     ar:"الواقعة", ayet:96,  cuz:27, tip:"Mekkî", inis:46},
  {isim:"Hadîd",     ar:"الحديد",  ayet:29,  cuz:27, tip:"Medenî", inis:94},
  {isim:"Mücâdele",  ar:"المجادلة",ayet:22,  cuz:28, tip:"Medenî", inis:105},
  {isim:"Haşr",      ar:"الحشر",   ayet:24,  cuz:28, tip:"Medenî", inis:101},
  {isim:"Mümtehine", ar:"الممتحنة",ayet:13,  cuz:28, tip:"Medenî", inis:110},
  {isim:"Saf",       ar:"الصف",    ayet:14,  cuz:28, tip:"Medenî", inis:109},
  {isim:"Cuma",      ar:"الجمعة",  ayet:11,  cuz:28, tip:"Medenî", inis:108},
  {isim:"Münâfikûn", ar:"المنافقون",ayet:11, cuz:28, tip:"Medenî", inis:104},
  {isim:"Teğâbun",   ar:"التغابن", ayet:18,  cuz:28, tip:"Medenî", inis:108},
  {isim:"Talâk",     ar:"الطلاق",  ayet:12,  cuz:28, tip:"Medenî", inis:99},
  {isim:"Tahrîm",    ar:"التحريم", ayet:12,  cuz:28, tip:"Medenî", inis:107},
  {isim:"Mülk",      ar:"الملك",   ayet:30,  cuz:29, tip:"Mekkî", inis:77},
  {isim:"Kalem",     ar:"القلم",   ayet:52,  cuz:29, tip:"Mekkî", inis:2},
  {isim:"Hâkka",     ar:"الحاقة",  ayet:52,  cuz:29, tip:"Mekkî", inis:78},
  {isim:"Meâric",    ar:"المعارج", ayet:44,  cuz:29, tip:"Mekkî", inis:79},
  {isim:"Nûh",       ar:"نوح",     ayet:28,  cuz:29, tip:"Mekkî", inis:71},
  {isim:"Cin",       ar:"الجن",    ayet:28,  cuz:29, tip:"Mekkî", inis:40},
  {isim:"Müzzemmil", ar:"المزمل",  ayet:20,  cuz:29, tip:"Mekkî", inis:3},
  {isim:"Müddessir", ar:"المدثر",  ayet:56,  cuz:29, tip:"Mekkî", inis:4},
  {isim:"Kıyâme",    ar:"القيامة", ayet:40,  cuz:29, tip:"Mekkî", inis:92},
  {isim:"İnsân",     ar:"الإنسان", ayet:31,  cuz:29, tip:"Medenî", inis:98},
  {isim:"Mürselât",  ar:"المرسلات",ayet:50,  cuz:29, tip:"Mekkî", inis:32},
  {isim:"Nebe'",     ar:"النبأ",   ayet:40,  cuz:30, tip:"Mekkî", inis:80},
  {isim:"Nâziât",    ar:"النازعات",ayet:46,  cuz:30, tip:"Mekkî", inis:81},
  {isim:"Abese",     ar:"عبس",     ayet:42,  cuz:30, tip:"Mekkî", inis:24},
  {isim:"Tekvîr",    ar:"التكوير", ayet:29,  cuz:30, tip:"Mekkî", inis:7},
  {isim:"İnfitâr",   ar:"الانفطار",ayet:19,  cuz:30, tip:"Mekkî", inis:82},
  {isim:"Mutaffifîn",ar:"المطففين",ayet:36,  cuz:30, tip:"Mekkî", inis:86},
  {isim:"İnşikâk",   ar:"الانشقاق",ayet:25,  cuz:30, tip:"Mekkî", inis:83},
  {isim:"Burûc",     ar:"البروج",  ayet:22,  cuz:30, tip:"Mekkî", inis:27},
  {isim:"Târık",     ar:"الطارق",  ayet:17,  cuz:30, tip:"Mekkî", inis:36},
  {isim:"A'lâ",      ar:"الأعلى",  ayet:19,  cuz:30, tip:"Mekkî", inis:8},
  {isim:"Gâşiye",    ar:"الغاشية", ayet:26,  cuz:30, tip:"Mekkî", inis:68},
  {isim:"Fecr",      ar:"الفجر",   ayet:30,  cuz:30, tip:"Mekkî", inis:10},
  {isim:"Beled",     ar:"البلد",   ayet:20,  cuz:30, tip:"Mekkî", inis:35},
  {isim:"Şems",      ar:"الشمس",   ayet:15,  cuz:30, tip:"Mekkî", inis:91},
  {isim:"Leyl",      ar:"الليل",   ayet:21,  cuz:30, tip:"Mekkî", inis:9},
  {isim:"Duhâ",      ar:"الضحى",   ayet:11,  cuz:30, tip:"Mekkî", inis:13},
  {isim:"İnşirâh",   ar:"الشرح",   ayet:8,   cuz:30, tip:"Mekkî", inis:12},
  {isim:"Tîn",       ar:"التين",   ayet:8,   cuz:30, tip:"Mekkî", inis:28},
  {isim:"Alak",      ar:"العلق",   ayet:19,  cuz:30, tip:"Mekkî", inis:1},
  {isim:"Kadr",      ar:"القدر",   ayet:5,   cuz:30, tip:"Mekkî", inis:25},
  {isim:"Beyyine",   ar:"البينة",  ayet:8,   cuz:30, tip:"Medenî", inis:100},
  {isim:"Zilzâl",    ar:"الزلزلة", ayet:8,   cuz:30, tip:"Medenî", inis:93},
  {isim:"Âdiyât",    ar:"العاديات",ayet:11,  cuz:30, tip:"Mekkî", inis:14},
  {isim:"Kâria",     ar:"القارعة", ayet:11,  cuz:30, tip:"Mekkî", inis:30},
  {isim:"Tekâsür",   ar:"التكاثر", ayet:8,   cuz:30, tip:"Mekkî", inis:16},
  {isim:"Asr",       ar:"العصر",   ayet:3,   cuz:30, tip:"Mekkî", inis:13},
  {isim:"Hümeze",    ar:"الهمزة",  ayet:9,   cuz:30, tip:"Mekkî", inis:32},
  {isim:"Fîl",       ar:"الفيل",   ayet:5,   cuz:30, tip:"Mekkî", inis:19},
  {isim:"Kureyş",    ar:"قريش",    ayet:4,   cuz:30, tip:"Mekkî", inis:29},
  {isim:"Mâûn",      ar:"الماعون", ayet:7,   cuz:30, tip:"Mekkî", inis:17},
  {isim:"Kevser",    ar:"الكوثر",  ayet:3,   cuz:30, tip:"Mekkî", inis:15},
  {isim:"Kâfirûn",   ar:"الكافرون",ayet:6,   cuz:30, tip:"Mekkî", inis:18},
  {isim:"Nasr",      ar:"النصر",   ayet:3,   cuz:30, tip:"Medenî", inis:114},
  {isim:"Mesed",     ar:"المسد",   ayet:5,   cuz:30, tip:"Mekkî", inis:6},
  {isim:"İhlâs",     ar:"الإخلاص", ayet:4,   cuz:30, tip:"Mekkî", inis:22},
  {isim:"Felak",     ar:"الفلق",   ayet:5,   cuz:30, tip:"Mekkî", inis:20},
  {isim:"Nâs",       ar:"الناس",   ayet:6,   cuz:30, tip:"Mekkî", inis:21}
];

// ════════════════════════════════════════
//  TEMATİK BÖLÜMLER
// ════════════════════════════════════════
const TEMATIK = {
  1: [
    { bas:1, bit:3, konu:"Hamd, Rahmân ve Rahîm" },
    { bas:4, bit:5, konu:"Hesap Günü'nün Sahibi ve İbadet-İstiâne" },
    { bas:6, bit:7, konu:"Sırat-ı Müstakim'e Hidayet Duası" }
  ],
  2: [
    { bas:1,  bit:5,  konu:"Müminlerin Beş Vasfı" },
    { bas:6,  bit:7,  konu:"Kâfirlerin Mühürlü Kalbi" },
    { bas:8,  bit:16, konu:"Münafıkların Aldatması" },
    { bas:17, bit:20, konu:"Münafıkların İki Temsili" },
    { bas:21, bit:25, konu:"İbadetin Gerekliliği ve İlk Sınav" },
    { bas:26, bit:29, konu:"Misaller ve Yaratılışın Delâleti" },
    { bas:30, bit:33, konu:"Âdem'in Yaratılışı ve Melekler" },
    { bas:34, bit:39, konu:"İblis'in Kibrı ve Cennetten Çıkış" },
    { bas:40, bit:48, konu:"İsrâiloğullarına Nimet Hatırlatması" },
    { bas:49, bit:61, konu:"Denizin Yarılması ve Çöl İmtihanı" },
    { bas:62, bit:74, konu:"Boğazlanan İnek ve Kalplerin Katılaşması" },
    { bas:75, bit:86, konu:"Ahdin Bozulması ve Kitabın Tahrifi" },
    { bas:87, bit:96, konu:"Peygamberlere Karşı Çıkma" },
    { bas:97, bit:103, konu:"Cebrâil ve Şeytanın Öğrettiği Sihir" },
    { bas:104, bit:112, konu:"Ehl-i Kitabın Kıskançlığı" },
    { bas:113, bit:121, konu:"Kıbleye Yönelme Tartışması" },
    { bas:122, bit:134, konu:"İbrâhim'in Mirası ve Kıblenin Temeli" },
    { bas:135, bit:141, konu:"Din Tartışması ve Milletin Geçmişi" },
    { bas:142, bit:152, konu:"Kıblenin Beytüllah'a Çevrilmesi" },
    { bas:153, bit:163, konu:"Sabır, Namaz ve Şehitlerin Diri Oluşu" },
    { bas:164, bit:167, konu:"Tevhid Delilleri ve Şefaatçisizlik" },
    { bas:168, bit:177, konu:"Helâl-Haram ve Hakiki İyilik" },
    { bas:178, bit:188, konu:"Kısas ve Oruç Hükümleri" },
    { bas:189, bit:203, konu:"Hilal, Hac ve Cihad Hükümleri" },
    { bas:204, bit:214, konu:"İki Tür İnsan: Münafık ve Mümin" },
    { bas:215, bit:228, konu:"İnfak, Savaş İzni ve Boşanma" },
    { bas:229, bit:242, konu:"Talâk, İddet ve Emzirme Hükümleri" },
    { bas:243, bit:252, konu:"Cihad ve Tâlût-Câlût Kıssası" },
    { bas:253, bit:260, konu:"Peygamberlerin Dereceleri ve Kursî Âyeti" },
    { bas:261, bit:274, konu:"İnfak Misalleri ve Sadaka Âdâbı" },
    { bas:275, bit:281, konu:"Faizin Kesin Haramlığı" },
    { bas:282, bit:286, konu:"Borç Akdi, Şâhitlik ve Son Dualar" }
  ],
  3: [
    { bas:1,  bit:9,  konu:"Kur'ân'ın Hak Kitap Olması" },
    { bas:10, bit:20, konu:"Müteşâbih Âyetler ve Sabit Kalpler" },
    { bas:21, bit:32, konu:"Allah'ın Seçtikleri ve Muhabbeti" },
    { bas:33, bit:41, konu:"Hz. Meryem'in Doğumu ve Hz. Zekeriyyâ" },
    { bas:42, bit:51, konu:"Hz. Meryem'e Müjde ve Hz. İsâ'nın Doğumu" },
    { bas:52, bit:63, konu:"Havârîler ve Mübâhele" },
    { bas:64, bit:80, konu:"Ehl-i Kitapla Ortak Kelimeye Çağrı" },
    { bas:81, bit:91, konu:"Peygamberlerin Ahdi ve Hz. İbrâhim" },
    { bas:92, bit:102, konu:"Gerçek İnfak ve İtaat" },
    { bas:103, bit:120, konu:"Ümmetin Birliği ve Ehl-i Kitabın Tutumu" },
    { bas:121, bit:138, konu:"Uhud'da Mevzi Alma ve Bozgun" },
    { bas:139, bit:155, konu:"Uhud'un Dersi: Tevekkül ve Sabır" },
    { bas:156, bit:175, konu:"Münafıklar ve Şeytan'ın Kışkırtması" },
    { bas:176, bit:189, konu:"Münafıkların Teşhiri ve İmtihanın Hikmeti" },
    { bas:190, bit:200, konu:"Ulü'l-Elbab'ın Tefekkürü ve Duası" }
  ],
  4: [
    { bas:1, bit:10, konu:"Yetim Hakları ve Miras Hükümleri" },
    { bas:11, bit:14, konu:"Miras Payları" },
    { bas:15, bit:25, konu:"Zina Cezası ve Nikâh Hükümleri" },
    { bas:26, bit:35, konu:"Kadın-Erkek Hakları ve Geçim Borcu" },
    { bas:36, bit:42, konu:"Şirk, Cimrilik ve Riya" },
    { bas:43, bit:57, konu:"Namaz Temizliği ve Emanet" },
    { bas:58, bit:70, konu:"Adalete Uyma ve Peygambere İtaat" },
    { bas:71, bit:84, konu:"Savaş Hükümleri ve Selâmlama" },
    { bas:85, bit:100, konu:"Şefaat ve Hicret Zorunluluğu" },
    { bas:101, bit:113, konu:"Sefer ve Korku Namazı" },
    { bas:114, bit:126, konu:"Münafıkların Planı ve Gizli Günah" },
    { bas:127, bit:134, konu:"Kadın ve Yetim Hakları" },
    { bas:135, bit:147, konu:"Adalet ve Tövbe Kapısı" },
    { bas:148, bit:162, konu:"Kötülüğü Açıklamak ve Ehl-i Kitap" },
    { bas:163, bit:176, konu:"Vahyin Sürekliliği ve Tevhid" }
  ],
  5: [
    { bas:1,  bit:5,  konu:"Akid Kutsallığı ve Helâl Yiyecekler" },
    { bas:6,  bit:11, konu:"Abdest, Teyemmüm ve Nimetin Tamamlanması" },
    { bas:12, bit:26, konu:"İsrâiloğullarının Ahdi Bozması" },
    { bas:27, bit:37, konu:"Hâbil-Kâbil Kıssası ve Kısas" },
    { bas:38, bit:50, konu:"Hırsızlık Cezası ve Ehl-i Kitap Hükmü" },
    { bas:51, bit:66, konu:"Dostluk Sınırları ve Dönekler" },
    { bas:67, bit:77, konu:"Tebliğ Emri ve Hz. İsâ'ya İftira" },
    { bas:78, bit:86, konu:"Hristiyanların Müslümanlara Yakınlığı" },
    { bas:87, bit:96, konu:"Helâl Nimetler ve İhramda Avlanma" },
    { bas:97, bit:108, konu:"Kâbe'nin Kutsallığı ve Şâhitlik" },
    { bas:109, bit:120, konu:"İsâ'nın Berâeti ve Allah'ın Hakimiyeti" }
  ],
  6: [
    { bas:1,  bit:11, konu:"Gökleri-Yeri Yaratan ve İnkârcılar" },
    { bas:12, bit:24, konu:"Göklerdekiler Allah'ın, Müşriklerin Tutumu" },
    { bas:25, bit:35, konu:"Kur'ân'a Kulak Tıkama ve Hidayet" },
    { bas:36, bit:55, konu:"Ölülerin Diriltilmesi ve Kıyâmet Delilleri" },
    { bas:56, bit:73, konu:"Gaybı Bilme ve Zulümdan Kaçış" },
    { bas:74, bit:83, konu:"İbrâhim'in Yıldız-Ay-Güneş Tefekkürü" },
    { bas:84, bit:90, konu:"Peygamberlere Verilen Hidayet" },
    { bas:91, bit:105, konu:"Allah'ı Hakkıyla Takdir Edememe" },
    { bas:106, bit:117, konu:"Vahye Uy ve Şirkin Temeli" },
    { bas:118, bit:135, konu:"Allah'ın Adıyla Kesilen ve Haramlar" },
    { bas:136, bit:150, konu:"Müşriklerin Uydurduğu Paylar" },
    { bas:151, bit:165, konu:"On Temel Emir ve Doğru Yol" }
  ],
  7: [
    { bas:1,  bit:9,  konu:"Kitaba Sıkıca Tutunma ve Kıyâmet Tartısı" },
    { bas:10, bit:25, konu:"İnsanın Yaratılışı ve İblis'in İsyanı" },
    { bas:26, bit:43, konu:"Şeytanın Düşmanlığı ve Cennet Kapıları" },
    { bas:44, bit:58, konu:"Cennet-Cehennem Diyaloğu ve A'râf" },
    { bas:59, bit:72, konu:"Nûh'un Kavmini Daveti ve Tufan" },
    { bas:73, bit:84, konu:"Sâlih, Devesi ve Semûd'un Helâki" },
    { bas:85, bit:102, konu:"Şuayb ve Medyen Halkı" },
    { bas:103, bit:126, konu:"Hz. Mûsâ ve Firavun'un İlk Karşılaşması" },
    { bas:127, bit:141, konu:"Sihirbazların İmana Gelmesi" },
    { bas:142, bit:156, konu:"Tûr'da Kırk Gece ve Altın Buzağı" },
    { bas:157, bit:171, konu:"Ümmî Peygamber ve Mîsak" },
    { bas:172, bit:188, konu:"Elest Mîsâkı ve Âlimin Kötü Örneği" },
    { bas:189, bit:206, konu:"Tek Candan Yaratılış ve Tefekkür Çağrısı" }
  ],
  // ... (diğer sureler aynı şekilde devam eder - orijinal koddan alınmıştır)
  8: [
    { bas:1,  bit:10, konu:"Ganimetler ve Gerçek İman" },
    { bas:11, bit:19, konu:"Bedir'de Melekler ve İlahi Yardım" },
    { bas:20, bit:29, konu:"İtaat ve Hıyanetten Kaçınma" },
    { bas:30, bit:40, konu:"Kâfirlerin Tuzağı ve Hicretin Önemi" },
    { bas:41, bit:54, konu:"Ganimetin Beşte Biri ve Savaş Etiği" },
    { bas:55, bit:66, konu:"Antlaşmalar ve Savaşa Hazırlık" },
    { bas:67, bit:75, konu:"Esir Hükmü ve Hicretin Değeri" }
  ],
  9: [
    { bas:1,  bit:12, konu:"Müşriklerle Antlaşmaların Feshi" },
    { bas:13, bit:24, konu:"Savaş İzni ve Mazeretsiz Geri Duranlar" },
    { bas:25, bit:37, konu:"Huneyn Zaferi ve Haram Aylar" },
    { bas:38, bit:48, konu:"Tebük'e Çıkmama Azabı" },
    { bas:49, bit:59, konu:"Münafıkların Bahaneleri ve Sadaka" },
    { bas:60, bit:72, konu:"Zekât Sınıfları ve Münafıkların Tehdidi" },
    { bas:73, bit:87, konu:"Münafıklara Namaz Kılmama" },
    { bas:88, bit:99, konu:"Cihad Edenler ve Bedevîlerin Tutumu" },
    { bas:100, bit:110, konu:"Öncüler, Tövbe Edenler ve Zararlı Mescid" },
    { bas:111, bit:122, konu:"Cennet Ticareti ve Tövbenin Kabulü" },
    { bas:123, bit:129, konu:"Kâfirlere Sertlik ve Tevekküle Çağrı" }
  ],
  10: [
    { bas:1,  bit:10, konu:"Kur'ân'ın Hak Oluşu ve Şefaat" },
    { bas:11, bit:25, konu:"İnsanın Aceleciliği ve Yaratılış Delilleri" },
    { bas:26, bit:40, konu:"İyilere Güzel Karşılık ve İnkârcılar" },
    { bas:41, bit:56, konu:"Peygamberin Sorumluluğu ve Ecelin Gerçekliği" },
    { bas:57, bit:70, konu:"Kur'ân: Şifâ ve Rahmet" },
    { bas:71, bit:93, konu:"Nûh Kıssası ve Firavun'un Pişmanlığı" },
    { bas:94, bit:109, konu:"Şüphedekilere Cevap ve Tevhid Çağrısı" }
  ],
  11: [
    { bas:1,  bit:8,  konu:"Kur'ân'ın Sağlamlığı ve Çağrı" },
    { bas:9,  bit:24, konu:"Nimetin Gidişi ve İnkârcının Pişmanlığı" },
    { bas:25, bit:49, konu:"Nûh Kıssası: Davet ve Gemi" },
    { bas:50, bit:60, konu:"Hûd ve Âd Kavmi" },
    { bas:61, bit:68, konu:"Sâlih ve Semûd'un Deveyi Boğazlaması" },
    { bas:69, bit:83, konu:"İbrâhim'e Müjde ve Lût'un Kavmi" },
    { bas:84, bit:95, konu:"Şuayb ve Medyen'in Helâki" },
    { bas:96, bit:109, konu:"Hz. Mûsâ ve Firavun'a Son Uyarı" },
    { bas:110, bit:123, konu:"Kıyâmet Sahnesi ve Sabır Çağrısı" }
  ],
  12: [
    { bas:1,  bit:6,  konu:"Ahsenü'l-Kasas ve Yûsuf'un Rüyası" },
    { bas:7,  bit:20, konu:"Kardeşlerin Kıskançlığı ve Kuyuya Atılış" },
    { bas:21, bit:35, konu:"Mısır'da Kölelik ve İftiraya Uğrama" },
    { bas:36, bit:53, konu:"Hapishane, Rüya Yorumu ve Aziz'in Eşi" },
    { bas:54, bit:68, konu:"Yûsuf'un Serbest Bırakılması" },
    { bas:69, bit:87, konu:"Kardeşlerin Mısır'a Gelişi ve İmtihan" },
    { bas:88, bit:101, konu:"Yakup ile Kavuşma Sevinci" },
    { bas:102, bit:111, konu:"Kıssadan Ders: Peygamberlik Hakikati" }
  ],
  13: [
    { bas:1,  bit:7,  konu:"Gök ve Yerin Yaratılışında Kudret" },
    { bas:8,  bit:18, konu:"Allah'ın Her Şeyi Bilmesi ve Misaller" },
    { bas:19, bit:31, konu:"Akl-ı Selim Sahipleri ve Tövbenin Önemi" },
    { bas:32, bit:43, konu:"Peygamberlere Eziyet ve Kader" }
  ],
  14: [
    { bas:1,  bit:8,  konu:"Karanlıktan Aydınlığa: Kurtuluş Yolu" },
    { bas:9,  bit:17, konu:"Helâk Edilen Kavimlerin Tutumu" },
    { bas:18, bit:27, konu:"Rüzgâra Savrulan Kül Misali ve Şeytanın İtirafı" },
    { bas:28, bit:41, konu:"Nimetin Nanköre Dönüşü ve Cehennem" },
    { bas:42, bit:52, konu:"İbrâhim'in Mekke Duası ve Kıyâmet" }
  ],
  15: [
    { bas:1,  bit:15, konu:"Kur'ân'ın Korunması ve İnkârcıların İsteği" },
    { bas:16, bit:44, konu:"Gökyüzünün Burçları ve İblis'in Kovulması" },
    { bas:45, bit:60, konu:"Cennet'in Tasviri ve İbrâhim'e Müjde" },
    { bas:61, bit:79, konu:"Lût'un Kavmine Meleklerin Gelişi" },
    { bas:80, bit:99, konu:"Hicr Halkının Helâki ve Sabra Çağrı" }
  ],
  16: [
    { bas:1,  bit:18, konu:"Hayvanlar, Bitkiler ve Denizden Nimetler" },
    { bas:19, bit:34, konu:"Allah Her Şeyi Biliyor, Putların Acizliği" },
    { bas:35, bit:50, konu:"Peygamberlere Meydan Okuma ve Arı" },
    { bas:51, bit:65, konu:"İki İlâh Olmaz ve Gökten Yağmur Delili" },
    { bas:66, bit:83, konu:"Süt, Bal ve Allah'ın Nimetlerine Nankörlük" },
    { bas:84, bit:100, konu:"Kıyâmette Şâhitler ve Şeytanın Velâyeti" },
    { bas:101, bit:119, konu:"Âyetlerin Değiştirilmesi ve Helâl-Haram" },
    { bas:120, bit:128, konu:"Hz. İbrâhim'in Hanifliği ve Sabır Emri" }
  ],
  17: [
    { bas:1,  bit:8,  konu:"İsrâ Mucizesi ve İsrâiloğullarına Uyarı" },
    { bas:9,  bit:21, konu:"Kur'ân Rehber, Âhiretin Önceliği" },
    { bas:22, bit:39, konu:"On Ahlâk Emri" },
    { bas:40, bit:55, konu:"Erkek Evlat İddiası ve Peygambere Eziyet" },
    { bas:56, bit:72, konu:"Şefaat Gerçeği ve İnsanın Nankörlüğü" },
    { bas:73, bit:93, konu:"Peygambere Baskı ve Kur'ân'a Meydan Okuma" },
    { bas:94, bit:111, konu:"Ruh Sorusu, Kur'ân Mucizesi ve Hamd" }
  ],
  18: [
    { bas:1,  bit:8,  konu:"Kur'ân Müjde ve Uyarıdır" },
    { bas:9,  bit:26, konu:"Ashâb-ı Kehf: Mağara Gençleri" },
    { bas:27, bit:31, konu:"Sabırlılarla Beraber Ol ve Doğru Söz" },
    { bas:32, bit:44, konu:"İki Bahçe Sahibi: Kibir ve Alçakgönüllülük" },
    { bas:45, bit:59, konu:"Dünyanın Geçiciliği ve Kıyâmet" },
    { bas:60, bit:70, konu:"Mûsâ ile Hızır: Yolculuğun Başlangıcı" },
    { bas:71, bit:82, konu:"Gemi, Çocuk ve Duvar: Üç Eylem" },
    { bas:83, bit:98, konu:"Zülkarneyn ve Ye'cüc-Me'cüc" },
    { bas:99, bit:110, konu:"Kıyâmet ve İman-Amel Şartı" }
  ],
  19: [
    { bas:1,  bit:15, konu:"Zekeriyyâ'nın Duası ve Yahyâ'nın Doğumu" },
    { bas:16, bit:40, konu:"Hz. Meryem ve Beşikte Konuşan İsâ" },
    { bas:41, bit:50, konu:"İbrâhim'in Babasına Tevhid Çağrısı" },
    { bas:51, bit:65, konu:"Mûsâ, İdrîs ve Peygamberler Silsilesi" },
    { bas:66, bit:82, konu:"İnkârcıların İtirazı ve Kıyâmet" },
    { bas:83, bit:98, konu:"Şeytanın Kışkırtması ve Tevhidin Zaferi" }
  ],
  20: [
    { bas:1,  bit:16, konu:"Tâhâ: Sıkmak İçin Değil, Hidayet İçin" },
    { bas:17, bit:36, konu:"Mûsâ'ya Asa ve Parlak El Verilmesi" },
    { bas:37, bit:55, konu:"Firavun'a Gönderilme ve İtirazlar" },
    { bas:56, bit:76, konu:"Büyücülerin Yenilgisi ve İmanı" },
    { bas:77, bit:98, konu:"Tîh Çölü ve Sâmirî'nin Altın Buzağısı" },
    { bas:99, bit:114, konu:"Kıssaların Özü ve Kıyâmet Korkusu" },
    { bas:115, bit:135, konu:"Âdem'in Unutması ve Sabır Emri" }
  ],
  21: [
    { bas:1,  bit:15, konu:"Kıyâmetin Yakınlığı ve İnkârcıların Oyunu" },
    { bas:16, bit:33, konu:"Göğün Direksiz Durması ve Tevhid" },
    { bas:34, bit:50, konu:"Ölümlülük, Fitnede İmtihan ve Zikir" },
    { bas:51, bit:73, konu:"İbrâhim Putları Kırıyor" },
    { bas:74, bit:91, konu:"Lût, Nûh, Dâvud, Süleyman ve Eyyûb" },
    { bas:92, bit:112, konu:"Tek Ümmet ve Diğer Peygamber Kıssaları" }
  ],
  22: [
    { bas:1,  bit:10, konu:"Kıyâmetin Sarsıntısı ve Cehennem" },
    { bas:11, bit:25, konu:"Kaybeden İbadet ve Hac'ın Farziyeti" },
    { bas:26, bit:38, konu:"Ka'be'nin İnşası ve Kurban" },
    { bas:39, bit:54, konu:"Cihad İzni ve Helâk Edilen Şehirler" },
    { bas:55, bit:78, konu:"Kıyâmette Secde Eden Her Şey ve Cihad" }
  ],
  23: [
    { bas:1,  bit:11, konu:"Kurtuluşa Eren Müminlerin Sekiz Vasfı" },
    { bas:12, bit:22, konu:"İnsanın Topraktan Yaratılışı ve Gemiler" },
    { bas:23, bit:50, konu:"Nûh, Mûsâ ve İsâ Kıssaları" },
    { bas:51, bit:74, konu:"Helâl Yiyin ve Peygamberlerin Çağrısı" },
    { bas:75, bit:92, konu:"Acımasızların Tutumu ve Tevhid" },
    { bas:93, bit:118, konu:"Kıyâmette Hesap ve Allah'a Sığınma" }
  ],
  24: [
    { bas:1,  bit:10, konu:"Zina Cezası ve Kazf Hükmü" },
    { bas:11, bit:26, konu:"Hz. Âişe İftirası ve Berâeti" },
    { bas:27, bit:34, konu:"İzin ve Örtünme Âdâbı" },
    { bas:35, bit:38, konu:"Nûr Âyeti" },
    { bas:39, bit:46, konu:"Çölde Serap ve Allah'ı Tesbih Eden Kâinat" },
    { bas:47, bit:57, konu:"İtaat İddiasının Sınanması" },
    { bas:58, bit:64, konu:"İzin Alma Zamanları ve Allah'ın Bilgisi" }
  ],
  25: [
    { bas:1,  bit:9,  konu:"Furkân'ın İnişi ve Müşriklerin İtirazları" },
    { bas:10, bit:20, konu:"Peygambere Hakaret ve Önceki Ümmetler" },
    { bas:21, bit:34, konu:"Kıyâmette Pişmanlık ve Kâfirlerin Durumu" },
    { bas:35, bit:50, konu:"Helâk Edilen Kavimler ve Kur'ân'ın Nüzulü" },
    { bas:51, bit:60, konu:"Kâfirlerle Büyük Cihad ve Tesbih" },
    { bas:61, bit:77, konu:"Rahmân'ın Kullarının On Vasfı" }
  ],
  26: [
    { bas:1,  bit:9,  konu:"Peygamberin Üzüntüsü ve Tevhid Delilleri" },
    { bas:10, bit:51, konu:"Mûsâ ve Firavun: Müzakere ve Meydan Okuma" },
    { bas:52, bit:68, konu:"Sihirbazların İmana Gelişi" },
    { bas:69, bit:89, konu:"İbrâhim'in Kavmiyle Tevhid Mücadelesi" },
    { bas:90, bit:104, konu:"Cennet-Cehennem ve İbrâhim'in Duası" },
    { bas:105, bit:122, konu:"Nûh'un Kavmini Daveti" },
    { bas:123, bit:140, konu:"Hûd ve Âd Kavmi" },
    { bas:141, bit:159, konu:"Sâlih ve Semûd Kıssası" },
    { bas:160, bit:175, konu:"Lût ve Sodom'un Helâki" },
    { bas:176, bit:191, konu:"Şuayb ve Eyke Halkı" },
    { bas:192, bit:227, konu:"Kur'ân Güvenilir Ruh'tan İner ve Şairler" }
  ],
  27: [
    { bas:1,  bit:14, konu:"Mûsâ'ya Ateş ve Peygamberlik" },
    { bas:15, bit:44, konu:"Süleyman, Hüdhüd ve Sebe Melikesi Belkîs" },
    { bas:45, bit:58, konu:"Sâlih ve Lût Kıssaları" },
    { bas:59, bit:75, konu:"Allah'ın Nimetleri ve Kıyâmet Delilleri" },
    { bas:76, bit:93, konu:"Kur'ân Anlaşmazlıkları Açıklar ve Kıyâmet" }
  ],
  28: [
    { bas:1,  bit:13, konu:"Mûsâ'nın Doğumu ve Firavun Sarayı" },
    { bas:14, bit:28, konu:"Adamı Öldürme ve Medyen'e Kaçış" },
    { bas:29, bit:43, konu:"Tûr'da Ateş ve Peygamberlik Verilmesi" },
    { bas:44, bit:60, konu:"Peygamber Orada Değildi: Vahiy Gerçeği" },
    { bas:61, bit:75, konu:"İki Yol: Cennet ve Cehennem" },
    { bas:76, bit:88, konu:"Kârûn'un Kibri ve Helâki" }
  ],
  29: [
    { bas:1,  bit:13, konu:"İmtihanın Zorunluluğu ve Ebeveyne Saygı" },
    { bas:14, bit:27, konu:"Nûh ve İbrâhim Kıssaları" },
    { bas:28, bit:40, konu:"Lût, Şuayb ve Kârûn Kıssaları" },
    { bas:41, bit:52, konu:"Örümcek Evi Misali ve Kur'ân" },
    { bas:53, bit:69, konu:"Ehl-i Kitapla Diyalog ve Allah'a Güven" }
  ],
  30: [
    { bas:1,  bit:10, konu:"Rûm'un Yenilgisi ve Müminlerin Sevinci" },
    { bas:11, bit:27, konu:"Yaratılış, Ölüm ve Diriliş Delilleri" },
    { bas:28, bit:45, konu:"Fıtrat Dini ve Toplumun Bozulması" },
    { bas:46, bit:60, konu:"Rüzgâr ve Yağmur Delilleri, Sabır" }
  ],
  31: [
    { bas:1,  bit:11, konu:"Hikmet Kitabı ve Müzikle Eğlenme" },
    { bas:12, bit:19, konu:"Lokmân'ın Oğluna Vasiyeti" },
    { bas:20, bit:34, konu:"Allah'ın Nimetleri ve Kıyâmet'in Gizliliği" }
  ],
  32: [
    { bas:1,  bit:9,  konu:"Kur'ân Hak ve İnsanın Yaratılışı" },
    { bas:10, bit:22, konu:"Diriliş İnkârı ve Mü'minin Uyanışı" },
    { bas:23, bit:30, konu:"Mûsâ'ya Kitap ve İman-Sabır İkilisi" }
  ],
  33: [
    { bas:1,  bit:8,  konu:"Takva ve Kâfirlere Boyun Eğmeme" },
    { bas:9,  bit:20, konu:"Hendek Savaşı ve Münafıkların Korkusu" },
    { bas:21, bit:27, konu:"Peygamber En Güzel Örnektir" },
    { bas:28, bit:34, konu:"Peygamberin Eşlerine Seçim Sunulması" },
    { bas:35, bit:48, konu:"Mü'min Erkek-Kadın Vasıfları ve Evlat Edinme" },
    { bas:49, bit:52, konu:"Peygamberin Evlilik Hükümleri" },
    { bas:53, bit:58, konu:"Peygamberin Evinde Edep Kuralları" },
    { bas:59, bit:68, konu:"Hicap, Münafıklar ve Kıyâmet" },
    { bas:69, bit:73, konu:"Emânetin Ağırlığı ve İnsanın Yüklenişi" }
  ],
  34: [
    { bas:1,  bit:9,  konu:"Gaybı Allah Bilir ve Kâfirlerin İnkârı" },
    { bas:10, bit:21, konu:"Dâvud ve Süleyman'a Verilen Nimetler" },
    { bas:22, bit:36, konu:"Sebe Halkının İbret Verici Sonu" },
    { bas:37, bit:54, konu:"Zenginlik İmtihan ve Kıyâmet" }
  ],
  35: [
    { bas:1,  bit:8,  konu:"Meleklerin Kanatları ve Allah'ın Rahmeti" },
    { bas:9,  bit:17, konu:"Rüzgâr-Yağmur Delili ve İnsanın Fakrı" },
    { bas:18, bit:28, konu:"Günahı Başkası Taşımaz ve Üç Zümre" },
    { bas:29, bit:45, konu:"Kitabı Okuyanların Umudu ve Kâinatın Tesbihi" }
  ],
  37: [
    { bas:1,  bit:21, konu:"Meleklerin Safları ve Şeytanların Kovulması" },
    { bas:22, bit:74, konu:"Cennet-Cehennem ve İnkârcıların Pişmanlığı" },
    { bas:75, bit:113, konu:"Nûh, İbrâhim ve İsmâil Kıssaları" },
    { bas:114, bit:138, konu:"Mûsâ, Hârûn ve İlyas Kıssaları" },
    { bas:139, bit:182, konu:"Yûnus Kıssası ve Müminlerin Zaferi" }
  ],
  38: [
    { bas:1,  bit:11, konu:"Şanlı Kur'ân ve Peygamberi Yalanlama" },
    { bas:12, bit:26, konu:"Hz. Dâvud'un İmtihanı ve Pişmanlığı" },
    { bas:27, bit:44, konu:"Süleyman'a Rüzgâr ve Eyyûb'a Şifa" },
    { bas:45, bit:64, konu:"Peygamberlere Övgü ve Cennet-Cehennem" },
    { bas:65, bit:88, konu:"İblis'in Kibri ve Âdemoğluna Yemin" }
  ],
  39: [
    { bas:1,  bit:9,  konu:"Hâlis Dinin Allah'a Ait Olması" },
    { bas:10, bit:21, konu:"Takva Ehlinin Sabrı ve Kur'ân'ın Eşsizliği" },
    { bas:22, bit:31, konu:"İslâm'a Açılan Göğüs ve Ölüm Hakikati" },
    { bas:32, bit:41, konu:"Kur'ân'daki Misaller ve Mübin Kitap" },
    { bas:42, bit:52, konu:"Uyku Sırasında Ruhların Alınması" },
    { bas:53, bit:63, konu:"Tövbe Kapısı: Allah'tan Ümidi Kesmeme" },
    { bas:64, bit:75, konu:"Yalnız Allah'a İbadet ve Kıyâmet Sahnesi" }
  ],
  40: [
    { bas:1,  bit:9,  konu:"Arşı Taşıyanlar ve Günahkârlar İçin Dua" },
    { bas:10, bit:20, konu:"İnkârcıların Pişmanlığı ve Dünya Sevgisi" },
    { bas:21, bit:35, konu:"Önceki Helâk Edilen Kavimler" },
    { bas:36, bit:50, konu:"Mü'min Firavun'un Kavmini Uyarması" },
    { bas:51, bit:68, konu:"Peygamberlere Yardım Vaadi" },
    { bas:69, bit:85, konu:"Putları Reddedenler ve Firavun'un Akibeti" }
  ],
  41: [
    { bas:1,  bit:12, konu:"Arap Kur'ân: Müjde ve Uyarı" },
    { bas:13, bit:25, konu:"Âd ve Semûd'a Peygamber Gönderme" },
    { bas:26, bit:36, konu:"Kur'ân'ı Dinlememe ve Sabır" },
    { bas:37, bit:46, konu:"Kâinat Âyetleri ve Organların Şâhitliği" },
    { bas:47, bit:54, konu:"Kıyâmeti Bilme ve Allah'a Geri Dönüş" }
  ],
  42: [
    { bas:1,  bit:12, konu:"Vahyin Kaynağı ve Ölçülü Rızık" },
    { bas:13, bit:26, konu:"Dinde Birlik Emri ve Anlaşmazlık" },
    { bas:27, bit:43, konu:"Rızkın Genişletilmesi ve Affetmenin Ecri" },
    { bas:44, bit:53, konu:"Zalimlerin Perişanlığı ve Vahyin Doğası" }
  ],
  43: [
    { bas:1,  bit:15, konu:"Ana Kitap'tan Arapça Kur'ân" },
    { bas:16, bit:35, konu:"Kız Evlat İstememe ve Altın Ev Hayali" },
    { bas:36, bit:56, konu:"Rahman'ı Anmaktan Uzaklaşma" },
    { bas:57, bit:73, konu:"Hz. İsâ ve Yaratılış Meselesi" },
    { bas:74, bit:89, konu:"Cennet Nimetleri ve Kâfirlerin Pişmanlığı" }
  ],
  44: [
    { bas:1,  bit:16, konu:"Mübârek Gecede İnen Kur'ân" },
    { bas:17, bit:33, konu:"Firavun'a Gönderme ve Denizde Boğulma" },
    { bas:34, bit:59, konu:"İnkârcıların Şüphesi ve Cennet-Cehennem" }
  ],
  45: [
    { bas:1,  bit:11, konu:"Kâinat Âyetleri ve İnkârcıların Tutumu" },
    { bas:12, bit:21, konu:"Denizin Emre Verilmesi ve Hesap Farkı" },
    { bas:22, bit:37, konu:"Her Ümmetin Diz Çökmesi ve Allah'ın Hükmü" }
  ],
  46: [
    { bas:1,  bit:10, konu:"Kur'ân Hak, Putlar Delilsiz" },
    { bas:11, bit:20, konu:"İnkârcıların Öncüleri ve Ana-Babaya İyilik" },
    { bas:21, bit:28, konu:"Âd Kavmi'nin Helâki" },
    { bas:29, bit:35, konu:"Cinlerin Kur'ân'ı Dinlemesi ve Sabır" }
  ],
  47: [
    { bas:1,  bit:11, konu:"İman Edenlerin ve Etmeyenlerin Akibeti" },
    { bas:12, bit:25, konu:"Cennet Nehirleri ve Münafıkların Teşhiri" },
    { bas:26, bit:38, konu:"Kur'ân'ı Engelleme ve Cömertliğe Çağrı" }
  ],
  48: [
    { bas:1,  bit:10, konu:"Mübîn Fetih ve Günahın Affı" },
    { bas:11, bit:17, konu:"Bedevîlerin Bahaneleri ve Özürler" },
    { bas:18, bit:26, konu:"Rıdvân Biati ve Hudeybiye Sakinliği" },
    { bas:27, bit:29, konu:"Rüyanın Gerçekleşmesi ve Müminlerin Vasfı" }
  ],
  49: [
    { bas:1,  bit:5,  konu:"Allah ve Peygambere Karşı Öne Geçmeme" },
    { bas:6,  bit:8,  konu:"Fasık'ın Haberini Araştırma" },
    { bas:9,  bit:10, konu:"Müminler Kardeştir: Aralarını Bulma" },
    { bas:11, bit:13, konu:"Alay, Gıybet ve Hakarete Yasak" },
    { bas:14, bit:18, konu:"Gerçek İman ve Allah'ın Bilgisi" }
  ],
  50: [
    { bas:1,  bit:11, konu:"Diriliş İnkârına Cevap" },
    { bas:12, bit:29, konu:"Helâk Edilen Kavimler ve Ölüm Anı" },
    { bas:30, bit:45, konu:"Cehennem'in Doluluğu ve Tefekkür Çağrısı" }
  ],
  51: [
    { bas:1,  bit:23, konu:"Dağıtıcı Rüzgârlar ve Takvalıların Mükâfatı" },
    { bas:24, bit:46, konu:"İbrâhim, Mûsâ ve Âd Kıssaları" },
    { bas:47, bit:60, konu:"Göğün Genişletilmesi ve Yaratılış Delili" }
  ],
  52: [
    { bas:1,  bit:16, konu:"Tûr Dağı Yemini ve Cehennem'in Gerçekliği" },
    { bas:17, bit:28, konu:"Cennet'te Müminlerin Sevinci" },
    { bas:29, bit:49, konu:"Peygambere Yönelik İtirazlar ve Sabır" }
  ],
  53: [
    { bas:1,  bit:18, konu:"Cebrâil'in Görülmesi ve Mirâc" },
    { bas:19, bit:32, konu:"Lât, Uzzâ, Menât: Şirkin Temelsizliği" },
    { bas:33, bit:62, konu:"Hakikati Gören Göz ve Kıyâmet Yakın" }
  ],
  54: [
    { bas:1,  bit:17, konu:"Ayın Yarılması ve Nûh Kavmi" },
    { bas:18, bit:32, konu:"Âd, Semûd ve Devenin Boğazlanması" },
    { bas:33, bit:55, konu:"Lût ve Firavun Kıssaları ile Kıyâmet" }
  ],
  56: [
    { bas:1,  bit:12, konu:"Büyük Çöküş: Üç Zümre" },
    { bas:13, bit:40, konu:"Öncülerin Cenneti ve Nimetleri" },
    { bas:41, bit:56, konu:"Solcuların Cehennemi ve Azabı" },
    { bas:57, bit:74, konu:"Yaratılış, Tohum ve Ateş Delili" },
    { bas:75, bit:96, konu:"Yıldızların Mevkii ve Kur'ân'ın Büyüklüğü" }
  ],
  57: [
    { bas:1,  bit:6,  konu:"Göklerin ve Yerin Tesbih Etmesi" },
    { bas:7,  bit:15, konu:"İnfaka Çağrı ve Münafıkların Nûrsuzluğu" },
    { bas:16, bit:24, konu:"Kalplerin Katılaşması ve Dünya Oyunu" },
    { bas:25, bit:29, konu:"Demir, Adalet ve Ruhbanlığın Eleştirisi" }
  ],
  58: [
    { bas:1,  bit:6,  konu:"Zıhâr Hükmü ve Kefâreti" },
    { bas:7,  bit:13, konu:"Gizli Konuşma Yasağı ve Sadaka" },
    { bas:14, bit:22, konu:"Münafıkların Yahudilerle Dostluğu" }
  ],
  59: [
    { bas:1,  bit:7,  konu:"Benû Nadîr'in Sürgünü" },
    { bas:8,  bit:17, konu:"Ganimet Hükmü ve Münafıkların İhaneti" },
    { bas:18, bit:24, konu:"Takva ve Esmâ-ül-Husnâ" }
  ],
  60: [
    { bas:1,  bit:6,  konu:"Düşmanı Dost Edinme Yasağı" },
    { bas:7,  bit:9,  konu:"Savaşmayanlara İyilik Yapılabilir" },
    { bas:10, bit:13, konu:"Hicret Eden Kadınların Sınanması" }
  ],
  61: [
    { bas:1,  bit:4,  konu:"Söz-Eylem Çelişkisi Yasağı" },
    { bas:5,  bit:9,  konu:"Mûsâ'nın Eziyeti ve İsâ'nın Ahmed Müjdesi" },
    { bas:10, bit:14, konu:"Kurtarıcı Ticaret ve Havârîler Gibi Ol" }
  ],
  62: [
    { bas:1,  bit:5,  konu:"Ümmîlere Peygamber Gönderilmesi" },
    { bas:6,  bit:8,  konu:"Yahudilerin Ölümden Kaçması" },
    { bas:9,  bit:11, konu:"Cuma Namazı Farziyeti ve Alışveriş Yasağı" }
  ],
  63: [
    { bas:1,  bit:8,  konu:"Münafıkların Yeminleri ve İçleri" },
    { bas:9,  bit:11, konu:"Malın Aldatması ve Ölmeden Önce İnfak" }
  ],
  64: [
    { bas:1,  bit:7,  konu:"Tesbih, Yaratılış ve Hesap Günü" },
    { bas:8,  bit:13, konu:"Allah'a ve Rasûle İman" },
    { bas:14, bit:18, konu:"Ailede Fitne ve Cömertliğe Teşvik" }
  ],
  65: [
    { bas:1,  bit:5,  konu:"Boşanma Adabı ve İddet Hükümleri" },
    { bas:6,  bit:7,  konu:"Nafaka ve Rızık Genişliği" },
    { bas:8,  bit:12, konu:"İsyan Eden Şehirlerin Cezası ve Yedi Gök" }
  ],
  66: [
    { bas:1,  bit:5,  konu:"Peygamberin Eşlerine Özel Uyarı" },
    { bas:6,  bit:8,  konu:"Kendinizi Ateşten Koruyun ve Tövbe" },
    { bas:9,  bit:12, konu:"Kötü ve İyi Eş Örnekleri" }
  ],
  68: [
    { bas:1,  bit:16, konu:"Kalem Yemini ve Peygamberin Ahlâkı" },
    { bas:17, bit:33, konu:"Bağ Sahibi Zalimler ve Helâk Edilen Bahçe" },
    { bas:34, bit:52, konu:"Mü'minin Mükâfatı ve Yûnus'tan Ders" }
  ],
  69: [
    { bas:1,  bit:12, konu:"Hâkka Nedir? Semûd ve Âd'ın Helâki" },
    { bas:13, bit:37, konu:"Sur'a Üfürülmesi ve Amellerin Karşılığı" },
    { bas:38, bit:52, konu:"Kur'ân Şair Sözü Değil, Hak Vahiy" }
  ],
  70: [
    { bas:1,  bit:14, konu:"Yükselen Basamaklar ve Azabın Gerçekliği" },
    { bas:15, bit:35, konu:"İnsanın Hırslılığı ve Namaz Ehlinin Kurtuluşu" },
    { bas:36, bit:44, konu:"Kâfirlerin Koşması ve Hesap" }
  ],
  71: [
    { bas:1,  bit:20, konu:"Nûh'un Gece-Gündüz Daveti" },
    { bas:21, bit:28, konu:"Kavmin Reddi ve Tufan Duası" }
  ],
  72: [
    { bas:1,  bit:15, konu:"Cinlerin Kur'ân'ı Dinleyip İman Etmesi" },
    { bas:16, bit:28, konu:"İstikamet, Allah'ın Bilgisi ve Tebliğ" }
  ],
  73: [
    { bas:1,  bit:9,  konu:"Gece İbadeti Emri ve Kur'ân Tilaveti" },
    { bas:10, bit:19, konu:"Kâfirlere Sabır ve Güzel Ayrılış" },
    { bas:20, bit:20, konu:"Gece İbadetinin Kolaylaştırılması" }
  ],
  74: [
    { bas:1,  bit:10, konu:"Müddessir: Uyar, Temizlen, Sabret" },
    { bas:11, bit:31, konu:"Tek Başına Bıraktığım ve Cehennem Sayıları" },
    { bas:32, bit:56, konu:"Ay Yemini ve Kıyâmetin Öğüdü" }
  ],
  75: [
    { bas:1,  bit:15, konu:"Kendi Nefsine Şahit Ruh" },
    { bas:16, bit:30, konu:"Aceleci Olma, Kıyâmet'te Yüzler" },
    { bas:31, bit:40, konu:"Namaz Kılmayan ve Diriliş Delili" }
  ],
  76: [
    { bas:1,  bit:11, konu:"İnsanın Yaratılışı ve Şükür Yolu" },
    { bas:12, bit:22, konu:"Cennet'te İbrîk ve Kâfur Nimetleri" },
    { bas:23, bit:31, konu:"Kur'ân'ın İnişi ve Sabır Çağrısı" }
  ],
  77: [
    { bas:1,  bit:28, konu:"Rüzgârlar Yemini ve Kıyâmet Sahnesi" },
    { bas:29, bit:50, konu:"Yalanlayanların Vay Hâline: On Tekrar" }
  ],
  78: [
    { bas:1,  bit:16, konu:"Büyük Haber ve Yaratılış Delilleri" },
    { bas:17, bit:30, konu:"Gözetleme Günü ve Cehennem Azabı" },
    { bas:31, bit:40, konu:"Cennet Nimetleri ve Hesap'ta İzin" }
  ],
  79: [
    { bas:1,  bit:14, konu:"Yeminin Ardından Kıyâmet Sahnesi" },
    { bas:15, bit:26, konu:"Hz. Mûsâ ve Firavun'a Son Uyarı" },
    { bas:27, bit:46, konu:"Gökyüzü ve Yerin Delâleti, Son Saat" }
  ],
  80: [
    { bas:1,  bit:16, konu:"Kör Sahabi ve Peygamberin Yüz Çevirmesi" },
    { bas:17, bit:32, konu:"İnsanın Nankörlüğü ve Yiyeceğinin Delili" },
    { bas:33, bit:42, konu:"Sur'a Üfürülmesi ve Hesap Günü" }
  ],
  81: [
    { bas:1,  bit:14, konu:"Güneş Dürüldüğünde: Kozmik Sarsıntılar" },
    { bas:15, bit:29, konu:"Sinerek Akıp Giden ve Vahyin Kaynağı" }
  ],
  82: [
    { bas:1,  bit:8,  konu:"Göğün Yarılması ve İnsanın Aldanması" },
    { bas:9,  bit:19, konu:"Yazıcı Melekler ve İyilerin-Kötülerin Yeri" }
  ],
  83: [
    { bas:1,  bit:6,  konu:"Ölçü-Tartıda Hile Yapanlar" },
    { bas:7,  bit:17, konu:"Siccîn Kitabı ve Yalanlayanların Azabı" },
    { bas:18, bit:36, konu:"İlliyyûn Kitabı ve İnkârcıların Gülmesi" }
  ],
  84: [
    { bas:1,  bit:6,  konu:"Göğün Yarılması ve Yer'in Gerilmesi" },
    { bas:7,  bit:15, konu:"Amel Defterini Sağdan ve Soldan Alanlar" },
    { bas:16, bit:25, konu:"Şafak Yemini ve Merhaleden Geçiş" }
  ],
  85: [
    { bas:1,  bit:11, konu:"Burçlar Yemini ve Hendek Ashabının Şehâdeti" },
    { bas:12, bit:22, konu:"Allah'ın İntikamı ve Levh-i Mahfûz" }
  ],
  86: [
    { bas:1,  bit:10, konu:"Târık Yıldızı ve İnsanın Yaratılışı" },
    { bas:11, bit:17, konu:"Yağmur Delili ve Kur'ân'ın Kesinliği" }
  ],
  87: [
    { bas:1,  bit:9,  konu:"Yüce Rabbin Adını Tesbih Et" },
    { bas:10, bit:19, konu:"Öğüt Al ve Âhiretin Kalıcılığı" }
  ],
  88: [
    { bas:1,  bit:7,  konu:"Bürüyen Kıyâmet: Yorgun Yüzler" },
    { bas:8,  bit:16, konu:"Mutlu Yüzler ve Cennet'in Güzellikleri" },
    { bas:17, bit:26, konu:"Deve, Gök, Dağ, Yer: Yaratılış Delilleri" }
  ],
  89: [
    { bas:1,  bit:14, konu:"Fecr Yemini ve Helâk Edilen Üç Kavim" },
    { bas:15, bit:26, konu:"İnsanın İmtihanda Yanılması" },
    { bas:27, bit:30, konu:"Mutmain Nefs'in Cennete Dönüşü" }
  ],
  90: [
    { bas:1,  bit:7,  konu:"Bu Belde Yemini ve İnsanın Yorgunluğu" },
    { bas:8,  bit:20, konu:"İki Yol: Sarp Yokuş ve İman" }
  ],
  91: [
    { bas:1,  bit:10, konu:"Güneş Yemini ve Nefsin Tezkiyesi" },
    { bas:11, bit:15, konu:"Semûd'un Deveyi Öldürmesi ve Helâk" }
  ],
  92: [
    { bas:1,  bit:11, konu:"Geceyle Gündüz: Veren ve Alan" },
    { bas:12, bit:21, konu:"Kolaylık Yolu ve Cömert Mü'minin Kurtuluşu" }
  ],
  93: [
    { bas:1,  bit:5,  konu:"Sabah Işığı Yemini ve Veda Etmedi" },
    { bas:6,  bit:11, konu:"Yetim-Yoksul Hatırlatması ve Şükür" }
  ],
  94: [
    { bas:1,  bit:4,  konu:"Göğüs Açılması ve Yükün Kaldırılması" },
    { bas:5,  bit:8,  konu:"Güçlükle Beraber Kolaylık: İki Kez" }
  ],
  95: [
    { bas:1,  bit:6,  konu:"İncir-Zeytin Yemini ve En Güzel Yaratılış" },
    { bas:7,  bit:8,  konu:"Aşağıların Aşağısı ve Allah'ın Hükmü" }
  ],
  96: [
    { bas:1,  bit:5,  konu:"İlk Vahiy: Oku, Yaratan Rabbinin Adıyla" },
    { bas:6,  bit:19, konu:"İnsanın Azgınlığı ve Secdeye Yaklaş" }
  ],
  97: [
    { bas:1,  bit:5,  konu:"Kadir Gecesi: Bin Aydan Hayırlı" }
  ],
  98: [
    { bas:1,  bit:5,  konu:"Beyyine ve Ehl-i Kitabın Ayrışması" },
    { bas:6,  bit:8,  konu:"Kâfirlerin Cehennemi ve Müminlerin Cenneti" }
  ],
  99: [
    { bas:1,  bit:5,  konu:"Yer Sarsıldığında ve Haberini Anlatacak" },
    { bas:6,  bit:8,  konu:"Zerre Kadar İyilik ve Kötülüğün Karşılığı" }
  ],
  100: [
    { bas:1,  bit:8,  konu:"Dört Nala Koşan Atlar ve İnsanın Nankörlüğü" },
    { bas:9,  bit:11, konu:"Kabirlerin Açılması ve Sırların Ortaya Çıkması" }
  ],
  101: [
    { bas:1,  bit:5,  konu:"Kâria: Tokuşturan Kıyâmet" },
    { bas:6,  bit:11, konu:"Terazinin Ağır veya Hafif Gelmesi" }
  ],
  102: [
    { bas:1,  bit:4,  konu:"Çoğalma Yarışı Sizi Oyalamasın" },
    { bas:5,  bit:8,  konu:"Kesin Bilgiyle Cehennem'i Görürsünüz" }
  ],
  103: [
    { bas:1,  bit:3,  konu:"Asra Yemin: Hüsrandan Kurtuluşun Dört Şartı" }
  ],
  104: [
    { bas:1,  bit:4,  konu:"Arkadan Çekiştiren ve Mal Biriktiren" },
    { bas:5,  bit:9,  konu:"Hutame Ateşi ve Kapatılan Kapılar" }
  ],
  105: [
    { bas:1,  bit:5,  konu:"Fil Ordusu'nun Ebâbil Kuşlarıyla Helâki" }
  ],
  106: [
    { bas:1,  bit:4,  konu:"Kureyş'in Yaz-Kış Yolculuğu ve Şükür" }
  ],
  107: [
    { bas:1,  bit:3,  konu:"Dini Yalanlayan ve Yetime Zulmeden" },
    { bas:4,  bit:7,  konu:"Riyakâr Namaz ve Yardımı Engelleme" }
  ],
  108: [
    { bas:1,  bit:3,  konu:"Kevser Havuzu ve Düşmanın Soyu Kesik" }
  ],
  109: [
    { bas:1,  bit:3,  konu:"Ben Sizin Taptıklarınıza Tapmam" },
    { bas:4,  bit:6,  konu:"Sizin Dininiz Size, Benim Dinim Bana" }
  ],
  110: [
    { bas:1,  bit:3,  konu:"Fetih, Zafer ve Tesbih ile Tövbe" }
  ],
  111: [
    { bas:1,  bit:5,  konu:"Ebû Leheb'in İki Eli Kurusun" }
  ],
  36: [
    { bas:1,  bit:12, konu:"Yâsîn: Kur'ân'ın Kalbi ve Ölüleri Uyarma" },
    { bas:13, bit:32, konu:"Üç Elçiyle Gelen Şehrin Kıssası" },
    { bas:33, bit:50, konu:"Diriliş Delili: Toprak, Su ve Ateş" },
    { bas:51, bit:68, konu:"Kıyâmet'te Sur ve Hesap" },
    { bas:69, bit:83, konu:"Kur'ân Şiir Değil, Canlı Vahiy" }
  ],
  55: [
    { bas:1,  bit:13, konu:"Rahmân'ın Öğrettiği Kur'ân ve İki Deniz" },
    { bas:14, bit:30, konu:"İnsanın Topraktan, Cinin Ateşten Yaratılışı" },
    { bas:31, bit:45, konu:"Hesap Günü: Cinlere ve İnsanlara" },
    { bas:46, bit:78, konu:"İki Cennet ve Sonsuz Nimetler" }
  ],
  67: [
    { bas:1,  bit:5,  konu:"Ölüm-Hayat İmtihanı ve Göğün Süslenmesi" },
    { bas:6,  bit:15, konu:"Cehennem'in Uğultusu ve Yerde Yürüme" },
    { bas:16, bit:24, konu:"Gökten Taş Yağması Korkusu" },
    { bas:25, bit:30, konu:"Kıyâmeti Sorma ve Su Kaynağı" }
  ],
  112: [
    { bas:1,  bit:2,  konu:"Allah Ehad'dır, Samed'dir" },
    { bas:3,  bit:4,  konu:"Doğurmadı, Doğurulmadı, Dengi Yoktur" }
  ],
  113: [
    { bas:1,  bit:3,  konu:"Sabah Aydınlığının Rabbine Sığınma" },
    { bas:4,  bit:5,  konu:"Düğümlere Üfleyenden ve Kıskançtan" }
  ],
  114: [
    { bas:1,  bit:3,  konu:"İnsanların Rabbi, Meliki, İlahına Sığınma" },
    { bas:4,  bit:6,  konu:"Sinsi Vesveseciden Korunma" }
  ]
};

// ════════════════════════════════════════
//  ATIF SİSTEMİ
// ════════════════════════════════════════

/**
 * Metindeki tüm atıf kalıplarını tıklanabilir linklere dönüştürür.
 * Desteklenen formatlar:
 *   [[2:255]]           → elle eklenen atıf
 *   [[2:255|Bakara]]    → etiketli atıf
 *   (bkz. 2:255)        → tefsir atfı
 *   (krş. 2:255)        → karşılaştırma atfı
 *   Nisa 4:60-90        → sure adı + no:ayet-aralık
 *   4:60-90             → no:ayet-aralık (tıklanabilir aralık)
 *   4:90                → S:A
 */
function atifMetniParsele(metin) {
  if (!metin) return document.createTextNode('');

  // Sıra önemli: önce aralık (S:A-B), sonra tekli (S:A)
  // Grup 1-3: [[S:A|Etiket]]
  // Grup 4-5: (bkz. S:A)
  // Grup 6-8: S:A-B (aralık) — sure adı opsiyonel önde
  // Grup 9-10: S:A tekli
  const regex = /\[\[(\d+):(\d+)(?:\|([^\]]+))?\]\]|\((?:bkz?\.?|krş\.?|cf\.?)\s*(\d+)[:/](\d+)\)|(?:[A-Za-zÀ-ÖØ-öø-ÿÇçĞğİıÖöŞşÜü''-]+\s+)?(\d+)[:/](\d+)[–-](\d+)|(\d+)[:/](\d+)[–-](\d+)|(\d+)[:/](\d+)(?=['a-züçşğıöü\s,;.:!?)\]]|$)/gi;

  const parcalar = [];
  let sonIdx = 0;
  let eslesme;

  while ((eslesme = regex.exec(metin)) !== null) {
    if (eslesme.index > sonIdx) {
      parcalar.push(document.createTextNode(metin.slice(sonIdx, eslesme.index)));
    }

    let sNo, aNo, aNo2, etiket, orijinal;

    if (eslesme[1]) {
      // [[S:A]] veya [[S:A|Etiket]]
      sNo = parseInt(eslesme[1]);
      aNo = parseInt(eslesme[2]);
      etiket = eslesme[3] || null;
      orijinal = eslesme[0];
    } else if (eslesme[4]) {
      // (bkz. S:A) veya (krş. S/A)
      sNo = parseInt(eslesme[4]);
      aNo = parseInt(eslesme[5]);
      orijinal = eslesme[0];
    } else if (eslesme[6] && eslesme[7] && eslesme[8]) {
      // SureAdı S:A-B — aralık (sure adı önde)
      sNo = parseInt(eslesme[6]);
      aNo = parseInt(eslesme[7]);
      aNo2 = parseInt(eslesme[8]);
      orijinal = eslesme[0];
      if (sNo < 1 || sNo > 114 || aNo < 1) {
        parcalar.push(document.createTextNode(orijinal));
        sonIdx = eslesme.index + orijinal.length;
        continue;
      }
    } else if (eslesme[9] && eslesme[10] && eslesme[11]) {
      // S:A-B — salt sayı aralığı (4:4-9 gibi)
      sNo = parseInt(eslesme[9]);
      aNo = parseInt(eslesme[10]);
      aNo2 = parseInt(eslesme[11]);
      orijinal = eslesme[0];
      if (sNo < 1 || sNo > 114 || aNo < 1) {
        parcalar.push(document.createTextNode(orijinal));
        sonIdx = eslesme.index + orijinal.length;
        continue;
      }
    } else if (eslesme[12]) {
      // S:A tekli
      sNo = parseInt(eslesme[12]);
      aNo = parseInt(eslesme[13]);
      orijinal = eslesme[0];
      if (sNo < 1 || sNo > 114 || aNo < 1) {
        parcalar.push(document.createTextNode(orijinal));
        sonIdx = eslesme.index + orijinal.length;
        continue;
      }
      const sureBilgi = SURELER[sNo - 1];
      if (sureBilgi && aNo > sureBilgi.ayet) {
        parcalar.push(document.createTextNode(orijinal));
        sonIdx = eslesme.index + orijinal.length;
        continue;
      }
    }

    if (!sNo || !aNo) {
      parcalar.push(document.createTextNode(eslesme[0]));
      sonIdx = eslesme.index + eslesme[0].length;
      continue;
    }

    const sure = SURELER[sNo - 1];
    if (aNo2) {
      const link = _atifAralikLinkOlustur(sNo, aNo, aNo2, sure, orijinal);
      parcalar.push(link);
    } else {
      const link = _atifLinkOlustur(sNo, aNo, etiket, sure, orijinal);
      parcalar.push(link);
    }
    sonIdx = eslesme.index + orijinal.length;
  }

  if (sonIdx < metin.length) {
    parcalar.push(document.createTextNode(metin.slice(sonIdx)));
  }

  const frag = document.createDocumentFragment();
  parcalar.forEach(p => frag.appendChild(p));
  return frag;
}

function _atifAralikLinkOlustur(sNo, aNo, aNo2, sure, orijinal) {
  const link = document.createElement('span');
  link.className = 'atif-link';
  const sureIsim = sure ? sure.isim : String(sNo);
  const ikon = document.createElement('span');
  ikon.className = 'atif-link-ikon';
  ikon.textContent = '🔗';
  const yazi = document.createElement('span');
  yazi.textContent = sureIsim + ' ' + sNo + ':' + aNo + '–' + aNo2;
  link.appendChild(ikon);
  link.appendChild(yazi);
  link.addEventListener('click', (e) => {
    e.stopPropagation();
    const ov = document.getElementById('not-okuma-overlay');
    if (ov && ov.style.display !== 'none') _atifMiniModalGoster(sNo, aNo, e);
    else ayetDetayAc(sNo, aNo);
  });
  return link;
}

function _atifLinkOlustur(sNo, aNo, etiket, sure, orijinal) {
  const link = document.createElement('span');
  link.className = 'atif-link';
  link.title = (sure ? sure.isim + ' ' + sNo + ':' + aNo : sNo + ':' + aNo) + ' — Tıkla, âyete git';
  link.setAttribute('data-sure', sNo);
  link.setAttribute('data-ayet', aNo);

  const ikonEl = document.createElement('span');
  ikonEl.className = 'atif-link-ikon';
  ikonEl.textContent = '🔗';

  const yaziEl = document.createElement('span');
  yaziEl.textContent = etiket || (sure ? sure.isim + ' ' + sNo + ':' + aNo : sNo + ':' + aNo);

  link.appendChild(ikonEl);
  link.appendChild(yaziEl);
  link.addEventListener('click', (e) => {
    e.stopPropagation();
    // Not okuma overlay açıksa overlay'i kapatmadan mini modal göster
    const overlay = document.getElementById('not-okuma-overlay');
    if (overlay && overlay.style.display !== 'none') {
      _atifMiniModalGoster(sNo, aNo, e);
    } else {
      ayetDetayAc(sNo, aNo);
    }
  });
  return link;
}

/**
 * Atıf zinciri — bu ayete başka notlarda/tefsirlerde kaç atıf var?
 */
function _atifZinciriGetir(hedefSNo, hedefANo) {
  const atiflar = [];
  const pattern = new RegExp('\\[\\[' + hedefSNo + ':' + hedefANo + '(?:\\|[^\\]]+)?\\]\\]|\\b' + hedefSNo + '[:/]' + hedefANo + '\\b', 'g');

  // Tüm notlarda tara
  for (const key in localStorage) {
    const m = key.match(/^an_(\d+)_(\d+)$/);
    if (!m) continue;
    const sNo = parseInt(m[1]), aNo = parseInt(m[2]);
    try {
      const notlar = JSON.parse(localStorage.getItem(key) || '[]');
      notlar.forEach(n => {
        if (n.icerik && pattern.test(n.icerik)) {
          atiflar.push({
            tip: 'not',
            kaynak: sNo + ':' + aNo,
            sNo, aNo,
            sure: SURELER[sNo-1] ? SURELER[sNo-1].isim : String(sNo),
            isim: n.isim || 'Not',
            ozet: n.icerik.substring(0, 80) + '…'
          });
        }
      });
    } catch(e) {}
  }

  // İlişkili ayetlerde de tara
  for (const key in localStorage) {
    const m = key.match(/^ia_(\d+)_(\d+)$/);
    if (!m) continue;
    const sNo = parseInt(m[1]), aNo = parseInt(m[2]);
    try {
      const liste = JSON.parse(localStorage.getItem(key) || '[]');
      if (liste.some(x => x.sNo === hedefSNo && x.aNo === hedefANo)) {
        atiflar.push({
          tip: 'iliskili',
          kaynak: sNo + ':' + aNo,
          sNo, aNo,
          sure: SURELER[sNo-1] ? SURELER[sNo-1].isim : String(sNo),
          isim: 'İlişkili Âyet',
          ozet: null
        });
      }
    } catch(e) {}
  }

  return atiflar;
}

/**
 * Atıf ekleme mini modalını oluşturur ve textarea'ya ekler.
 */
function atifAlanıOlustur(ta, onizlemeWrap) {
  const wrap = document.createDocumentFragment();

  // Yardım barı
  const yardimBar = document.createElement('div');
  yardimBar.className = 'atif-yardim-bar';

  const lbl = document.createElement('span');
  lbl.className = 'atif-yardim-lbl';
  lbl.textContent = 'ATIF:';

  const ekleBtn = document.createElement('button');
  ekleBtn.className = 'atif-ekle-btn';
  ekleBtn.textContent = '🔗 Âyet Ekle';

  const ipucu = document.createElement('span');
  ipucu.className = 'atif-ipucu';
  ipucu.textContent = 'veya [[2:255]] yazın';

  yardimBar.appendChild(lbl);
  yardimBar.appendChild(ekleBtn);
  yardimBar.appendChild(ipucu);

  // Mini modal
  const miniModal = document.createElement('div');
  miniModal.className = 'atif-mini-modal';

  const miniBaslik = document.createElement('div');
  miniBaslik.className = 'atif-mini-baslik';
  miniBaslik.textContent = 'Hangi âyeti eklemek istiyorsunuz?';

  const row = document.createElement('div');
  row.className = 'atif-mini-row';

  // Sure seçici
  const sureSec = document.createElement('select');
  SURELER.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = (i + 1) + '. ' + s.isim;
    sureSec.appendChild(opt);
  });

  // Âyet input
  const ayetInp = document.createElement('input');
  ayetInp.type = 'number';
  ayetInp.min = 1;
  ayetInp.placeholder = 'Âyet no';

  // Etiket input
  const etiketInp = document.createElement('input');
  etiketInp.type = 'text';
  etiketInp.placeholder = 'Etiket (opsiyonel)';

  row.appendChild(sureSec);
  row.appendChild(ayetInp);
  row.appendChild(etiketInp);

  const footer = document.createElement('div');
  footer.className = 'atif-mini-footer';

  const iptalBtn = document.createElement('button');
  iptalBtn.className = 'atif-iptal-btn';
  iptalBtn.textContent = 'İptal';
  iptalBtn.onclick = () => miniModal.classList.remove('open');

  const tamamBtn = document.createElement('button');
  tamamBtn.className = 'atif-ekle-tamam';
  tamamBtn.textContent = 'Ekle';

  tamamBtn.onclick = () => {
    const sNo = parseInt(sureSec.value);
    const aNo = parseInt(ayetInp.value);
    if (!aNo || aNo < 1) { ayetInp.style.borderColor = 'var(--rust)'; return; }
    ayetInp.style.borderColor = '';

    const etiket = etiketInp.value.trim();
    const atifStr = etiket ? '[[' + sNo + ':' + aNo + '|' + etiket + ']]' : '[[' + sNo + ':' + aNo + ']]';

    // Textarea'ya ekle (imleç konumuna)
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const mevcut = ta.value;
    ta.value = mevcut.slice(0, start) + atifStr + mevcut.slice(end);
    ta.selectionStart = ta.selectionEnd = start + atifStr.length;
    ta.focus();

    // Önizlemeyi güncelle
    if (onizlemeWrap) onizlemeGuncelle(ta.value, onizlemeWrap);

    miniModal.classList.remove('open');
    ayetInp.value = '';
    etiketInp.value = '';

    // textarea boyutunu güncelle
    ta.style.height = 'auto';
    ta.style.height = Math.max(80, ta.scrollHeight) + 'px';
  };

  footer.appendChild(iptalBtn);
  footer.appendChild(tamamBtn);
  miniModal.appendChild(miniBaslik);
  miniModal.appendChild(row);
  miniModal.appendChild(footer);

  ekleBtn.onclick = () => miniModal.classList.toggle('open');

  // Fragment'ı gerçek elementlere çevir
  const container = document.createElement('div');
  container.appendChild(yardimBar);
  container.appendChild(miniModal);
  return container;
}

function onizlemeGuncelle(metin, wrap) {
  if (!metin || !metin.trim()) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  const regex = /\[\[(\d+):(\d+)(?:\|([^\]]+))?\]\]/g;
  const atiflar = [];
  let m;
  while ((m = regex.exec(metin)) !== null) atiflar.push(m);
  if (atiflar.length === 0) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  wrap.style.display = 'block';
  wrap.innerHTML = '';
  const etiket = document.createElement('div');
  etiket.className = 'not-onizleme-etiket';
  etiket.textContent = 'Atıflar:';
  wrap.appendChild(etiket);
  const icerik = document.createElement('div');
  icerik.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding-top:2px;';
  atiflar.forEach(eslesme => {
    const sN = parseInt(eslesme[1]), aN = parseInt(eslesme[2]);
    const etiketMetni = eslesme[3];
    const sure = SURELER[sN - 1];
    const link = document.createElement('span');
    link.className = 'atif-link';
    link.title = sure ? sure.isim + ' ' + sN + ':' + aN : sN + ':' + aN;
    link.setAttribute('data-sure', sN);
    link.setAttribute('data-ayet', aN);
    const ikonEl = document.createElement('span');
    ikonEl.className = 'atif-link-ikon';
    ikonEl.textContent = '🔗';
    const yaziEl = document.createElement('span');
    yaziEl.textContent = etiketMetni ? etiketMetni : (sure ? sure.isim : sN) + ' ' + sN + ':' + aN;
    link.appendChild(ikonEl);
    link.appendChild(yaziEl);
    link.addEventListener('click', (e) => { e.stopPropagation(); ayetDetayAc(sN, aN); });
    icerik.appendChild(link);
  });
  wrap.appendChild(icerik);
}

// ════════════════════════════════════════
//  İLİŞKİLİ ÂYETLER SİSTEMİ
