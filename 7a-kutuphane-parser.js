// ════════════════════════════════════════
//  KÜTÜPHANEM — KİTAP AYRIŞTIRICI
//  Düz txt kitabı okur; başlık ağacı, paragraflar, dipnotlar ve ayet atıflarını çıkarır.
//  ÖNEMLİ: Metni ASLA değiştirmez. Çıktıdaki her paragraf, kaynak satırların birebir birleşimidir
//  (yalnızca görünmez "yumuşak tire" U+00AD ekranda gizlenir). Hangi satırın nereye gittiği
//  `li` alanında tutulur ve test ile doğrulanır.
//  Hem tarayıcıda (window.KTP) hem Node'da (module.exports) çalışır.
// ════════════════════════════════════════
(function (root) {
  'use strict';

  const SHY = /­/g;

  // ── Yardımcılar ──────────────────────────────────────────────
  function norm(s) {
    s = String(s).replace(SHY, '');
    try { s = s.toLocaleLowerCase('tr'); } catch (e) { s = s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase(); }
    s = s.replace(/[âä]/g, 'a').replace(/[îı]/g, 'i').replace(/û/g, 'u').replace(/ö/g, 'o')
         .replace(/ü/g, 'u').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g');
    return s.replace(/[^a-z0-9]+/g, '');
  }

  function lev(a, b, maks) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > maks) return maks + 1;
    let onceki = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) onceki[j] = j;
    for (let i = 1; i <= a.length; i++) {
      const simdiki = [i];
      let enKucuk = i;
      for (let j = 1; j <= b.length; j++) {
        const m = Math.min(onceki[j] + 1, simdiki[j - 1] + 1, onceki[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        simdiki[j] = m;
        if (m < enKucuk) enKucuk = m;
      }
      if (enKucuk > maks) return maks + 1;
      onceki = simdiki;
    }
    return onceki[b.length];
  }

  function baslikEsles(adayNorm, girisNorm) {
    if (!adayNorm || !girisNorm) return false;
    if (adayNorm === girisNorm) return true;
    if (girisNorm.length >= 10) {
      const maks = Math.max(1, Math.floor(girisNorm.length * 0.12));
      return lev(adayNorm, girisNorm, maks) <= maks;
    }
    return false;
  }

  // Görünen metin: yumuşak tireyi gizle; satır sonundaki yumuşak tireden sonra boşluksuz birleştir.
  function gorunenMetin(satirlar) {
    let s = '';
    for (let i = 0; i < satirlar.length; i++) {
      const l = satirlar[i];
      if (i === 0) { s = l; continue; }
      if (s.endsWith('­')) s = s.slice(0, -1) + l;
      else s = s + ' ' + l;
    }
    return s.replace(SHY, '').replace(/[ \t]+/g, ' ').trim();
  }

  // ── Sûre adı çözümleme ────────────────────────────────────
  const EK_ADLAR = {
    'mumin': 40, 'gafir': 40, 'imran': 3, 'aliimran': 3, 'benisrail': 17, 'hacc': 22, 'berae': 9,
    'hamimsecde': 41, 'secde': 32, 'sajda': 32, 'dehr': 76, 'tatfif': 83, 'serh': 94, 'tebbet': 111,
    'mulk': 67, 'tebareke': 67, 'furkan': 25, 'kehf': 18, 'musa': null
  };
  let _adHaritasi = null, _adListesi = null, _sureRef = null;

  function sureHazirla(sureler) {
    if (_sureRef === sureler && _adHaritasi) return;
    _sureRef = sureler;
    _adHaritasi = new Map();
    _adListesi = [];
    sureler.forEach((s, i) => {
      const n = norm(s.isim);
      _adHaritasi.set(n, i + 1);
      _adListesi.push([n, i + 1]);
    });
    Object.keys(EK_ADLAR).forEach(k => {
      if (EK_ADLAR[k] && !_adHaritasi.has(k)) { _adHaritasi.set(k, EK_ADLAR[k]); _adListesi.push([k, EK_ADLAR[k]]); }
    });
  }

  // Dönüş: {no, bulanik} veya null
  function sureCoz(adham) {
    let n = norm(adham).replace(/(suresinin|suresi|sure)$/, '');
    if (!n || n.length < 2) return null;
    if (_adHaritasi.has(n)) return { no: _adHaritasi.get(n), bulanik: false };
    if (n.length >= 5) {
      let en = null, enMesafe = 3;
      for (const [ad, no] of _adListesi) {
        if (ad.length < 4) continue;
        const d = lev(n, ad, 1);
        if (d <= 1 && d < enMesafe) { en = no; enMesafe = d; }
      }
      if (en) return { no: en, bulanik: true };
    }
    return null;
  }

  // Sayıdan hemen önceki metinden sûre adını bul (1–3 kelime, "sûresi" gibi ekler atlanır)
  function oncekiAdiBul(metin, konum) {
    let onc = metin.slice(Math.max(0, konum - 48), konum);
    onc = onc.replace(/[\s,:.;()\[\]\-–—'"“”‘’«»]+$/g, '');
    onc = onc.replace(/\s+(?:s[uû]resi(?:nin)?|s[uû]re)$/i, '');
    onc = onc.replace(/[\s,:.;()\[\]\-–—'"“”‘’]+$/g, '');
    const kelimeler = onc.split(/\s+/).filter(Boolean);
    for (let k = Math.min(3, kelimeler.length); k >= 1; k--) {
      const aday = kelimeler.slice(-k).join(' ').replace(/^[(\["“'‘]+/, '');
      const c = sureCoz(aday);
      if (c) return { ...c, ad: aday };
    }
    return null;
  }

  // ── Ayet atıfı bulma ───────────────────────────────────────
  // Dönüş: { atifler:[{bas,bit,s,parcalar:[[a1,a2]],bulanik}], supheli:[{metin,neden}] }
  function atifBul(metin, sureler) {
    sureHazirla(sureler);
    const atifler = [], supheli = [];
    const doluAralik = [];
    function cakisir(b, e) { return doluAralik.some(r => b < r[1] && e > r[0]); }

    // 1) "S/A" ve "S:A" kalıpları (+ ", 17" "-27" ";104" devamları)
    const rx = /(\d{1,3})\s*[\/:]\s*(\d{1,3})((?:\s*[-–]\s*\d{1,3})?)((?:\s*[,;]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?(?!\s*[\/:\d]))*)/g;
    let m;
    while ((m = rx.exec(metin)) !== null) {
      const bas = m.index, sNo = parseInt(m[1], 10);
      const onceki = oncekiAdiBul(metin, bas);
      if (!onceki) continue; // isimsiz N/M (cilt/sayfa, vefat tarihi, kaynak...) — atıf sayılmaz
      if (sNo < 1 || sNo > 114) continue;
      if (onceki.no !== sNo) {
        supheli.push({ metin: metin.slice(Math.max(0, bas - 20), bas + m[0].length + 5), neden: 'Sûre adı (' + sureler[onceki.no - 1].isim + ' ' + onceki.no + ') ile numara (' + sNo + ') çelişiyor' });
        continue;
      }
      const sayi = sureler[sNo - 1].ayet;
      const parcalar = [];
      const a1 = parseInt(m[2], 10);
      let a2 = m[3] ? parseInt(m[3].replace(/[^\d]/g, ''), 10) : null;
      if (a1 < 1 || a1 > sayi) {
        supheli.push({ metin: metin.slice(Math.max(0, bas - 20), bas + m[0].length + 5), neden: sureler[sNo - 1].isim + ' sûresinde ' + a1 + '. âyet yok (' + sayi + ' âyet)' });
        continue;
      }
      if (a2 && (a2 < a1 || a2 > sayi)) a2 = null;
      parcalar.push([a1, a2 || a1]);
      let bit = bas + m[1].length; // varsayılan; sonra gerçek uzunluk
      bit = bas + m[0].length;
      if (m[4]) {
        const ek = m[4].match(/\d{1,3}(?:\s*[-–]\s*\d{1,3})?/g) || [];
        let toplamEk = '';
        for (const e of ek) {
          const [x, y] = e.split(/[-–]/).map(t => parseInt(t.trim(), 10));
          if (x >= 1 && x <= sayi && (!y || (y >= x && y <= sayi))) parcalar.push([x, y || x]);
          else break;
        }
        // devamın tamamı sayı olarak kabul edildiyse bit kalır; yoksa devam atıfın dışında bırakılır
        if (parcalar.length - 1 < ek.length) {
          // geçersiz bir devam bulundu: yalnızca geçerli kısmı kapsa
          let uzun = m[0].length - m[4].length;
          let kalan = m[4], gecerli = 0;
          const re2 = /\s*[,;]\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?/g; let mm, pos = 0;
          while ((mm = re2.exec(kalan)) !== null && gecerli < parcalar.length - 1) { pos = mm.index + mm[0].length; gecerli++; }
          bit = bas + uzun + pos;
        }
      }
      if (cakisir(bas, bit)) continue;
      doluAralik.push([bas, bit]);
      atifler.push({ bas, bit, s: sNo, parcalar, bulanik: !!onceki.bulanik });
    }

    // 2) "(Cuma, 5)", "(Zümer: 42)", "(Nisa:31)" — yalnızca parantez içinde, yalnızca ayet numarası
    const rxP = /\(\s*(?:bkz\.?\s*)?([A-Za-zÂÎÛâîûÇŞĞÖÜİçşğöüı'’\- ]{2,28}?)\s*[:,.]\s*(?:s[uû]resi\s*)?(\d{1,3})((?:\s*[-–]\s*\d{1,3})?)\s*\)/g;
    while ((m = rxP.exec(metin)) !== null) {
      const c = sureCoz(m[1]);
      if (!c) continue;
      const sayi = sureler[c.no - 1].ayet;
      const a1 = parseInt(m[2], 10);
      let a2 = m[3] ? parseInt(m[3].replace(/[^\d]/g, ''), 10) : a1;
      if (a1 < 1 || a1 > sayi) { supheli.push({ metin: m[0], neden: sureler[c.no - 1].isim + ' sûresinde ' + a1 + '. âyet yok' }); continue; }
      if (a2 < a1 || a2 > sayi) a2 = a1;
      const bas = m.index, bit = m.index + m[0].length;
      if (cakisir(bas, bit)) continue;
      doluAralik.push([bas, bit]);
      atifler.push({ bas: bas, bit: bit, s: c.no, parcalar: [[a1, a2]], bulanik: !!c.bulanik });
    }

    // 3) "Nisa Suresi 31'inci ayette", "A'râf sûresinin 172. âyet"
    const rxS = /([A-Za-zÂÎÛâîûÇŞĞÖÜİçşğöüı'’\-]+(?:\s+[A-Za-zÂÎÛâîûÇŞĞÖÜİçşğöüı'’\-]+)?)\s+s[uû]resi(?:nin)?\s*,?\s*(\d{1,3})(?:\s*['’]?\s*(?:inci|ıncı|uncu|üncü|nci|ncı)|\s*\.)?\s*[âa]yet/gi;
    while ((m = rxS.exec(metin)) !== null) {
      const adham = m[1].split(/\s+/);
      let c = null;
      for (let k = Math.min(2, adham.length); k >= 1 && !c; k--) c = sureCoz(adham.slice(-k).join(' '));
      if (!c) continue;
      const sayi = sureler[c.no - 1].ayet;
      const a1 = parseInt(m[2], 10);
      if (a1 < 1 || a1 > sayi) { supheli.push({ metin: m[0], neden: sureler[c.no - 1].isim + ' sûresinde ' + a1 + '. âyet yok' }); continue; }
      const bas = m.index, bit = m.index + m[0].length;
      if (cakisir(bas, bit)) continue;
      doluAralik.push([bas, bit]);
      atifler.push({ bas, bit, s: c.no, parcalar: [[a1, a1]], bulanik: !!c.bulanik });
    }

    atifler.sort((a, b) => a.bas - b.bas);
    return { atifler, supheli };
  }

  // ── İçindekiler ────────────────────────────────────────────
  const PN = /^(.{2,}?)(?:\s*\.{2,}\s*|\s*…+\s*|\s+)(\d{1,4})\s*$/;
  const PN_NOKTALI = /^(.{2,}?)\s*\.{4,}\s*(\d{1,4})?\s*$/;   // "Başlık.........  12"  (numara olmayabilir)
  const FN_TANIM = /^\[\d{1,4}\]/;
  function tocSatiri(l) {
    if (l.length > 220 || FN_TANIM.test(l)) return null;
    return PN.exec(l) || PN_NOKTALI.exec(l);
  }

  function icindekilerBul(L, ustSinir) {
    const ust = Math.min(L.length, 2500, ustSinir);
    const adaylar = [];
    for (let i = 0; i < ust; i++) if (tocSatiri(L[i])) adaylar.push(i);
    if (adaylar.length < 6) return null;
    const gruplar = [];
    let g = [adaylar[0]];
    for (let k = 1; k < adaylar.length; k++) {
      if (adaylar[k] - adaylar[k - 1] <= 5) g.push(adaylar[k]);
      else { gruplar.push(g); g = [adaylar[k]]; }
    }
    gruplar.push(g);
    gruplar.sort((a, b) => b.length - a.length);
    const en = gruplar[0];
    if (en.length < 6) return null;
    return { bas: en[0], bit: en[en.length - 1] };
  }

  function girisleriCikar(L, aralik) {
    const girisler = [];
    let bekleyen = [];
    for (let i = aralik.bas; i <= aralik.bit; i++) {
      const l = L[i];
      const m = tocSatiri(l);
      if (m) {
        let baslik = m[1].replace(/[\s.…]+$/, '').trim();
        if (!baslik) { bekleyen = []; continue; }
        const onek = bekleyen.length ? bekleyen.join(' ') : '';
        girisler.push({ baslik, sayfa: m[2] ? parseInt(m[2], 10) : null, onek, satir: i });
        bekleyen = [];
      } else if (l.length < 160) bekleyen.push(l.replace(/[\s.…]+$/, ''));
    }
    return girisler.filter(g => norm(g.baslik).length >= 2 && norm(g.baslik) !== 'icindekiler');
  }

  function turBul(baslik) {
    const t = baslik.trim();
    const harf = t.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]/g, '');
    const buyuk = harf.length >= 3 && harf === harf.toLocaleUpperCase('tr');
    if (buyuk) return 'BUYUK';
    if (/^\d+(?:\.\d+){1,}\.?\s/.test(t)) return 'n' + (t.match(/^\d+(?:\.\d+)*/)[0].split('.').length);
    if (/^[IVXLC]+[.)\-]\s/.test(t)) return 'roman';
    if (/^\d+\s*[-–]\s*[A-Z]\.\s/.test(t)) return 'numharf';
    if (/^[A-ZÇĞİÖŞÜ][.)]\s/.test(t)) return 'harf';
    if (/^\d+[.\-)]\s/.test(t)) return 'sayi';
    if (/^[a-zçğıöşü]\)\s/.test(t)) return 'kharf';
    return 'duz';
  }

  function seviyeleriAta(girisler) {
    const sira = [];
    girisler.forEach(g => {
      const tur = turBul(g.baslik);
      if (tur === 'BUYUK') { g.seviye = 1; return; }
      let i = sira.indexOf(tur);
      if (i < 0) { sira.push(tur); i = sira.length - 1; }
      g.seviye = Math.min(5, i + 2);
    });
  }

  // ── Ana ayrıştırıcı ────────────────────────────────────────
  function ayristir(hamMetin, sureler, secenek) {
    secenek = secenek || {};
    sureHazirla(sureler);
    const tumSatirlar = String(hamMetin).replace(/\r\n?/g, '\n').split('\n');
    const bosSay = tumSatirlar.filter(l => !l.trim()).length;
    const L = [];                       // boş olmayan satırlar (sağ boşluk atılmış)
    tumSatirlar.forEach(l => { if (l.trim()) L.push(l.replace(/\s+$/, '')); });
    const rapor = { satir: L.length, uyarilar: [] };

    // Sert satır sonu (hard-wrap) mı?
    const bosOran = bosSay / Math.max(1, L.length);
    const uzSirali = L.map(l => l.length).sort((x, y) => x - y);
    const p95 = uzSirali.length ? uzSirali[Math.floor(uzSirali.length * 0.95)] : 0;
    const sertSatir = bosOran < 0.3 && p95 < 140;
    rapor.sertSatir = sertSatir;

    // Dipnot blokları
    const ayrac = [];
    for (let i = 0; i < L.length - 1; i++) {
      if (/^-{10,}\s*$/.test(L[i]) && /^\[1\]/.test(L[i + 1])) ayrac.push(i);
    }

    // İçindekiler (ilk dipnot ayracından önce aranır)
    const tocAralik = icindekilerBul(L, ayrac.length ? ayrac[0] : L.length);
    let girisler = [];
    if (tocAralik) { girisler = girisleriCikar(L, tocAralik); seviyeleriAta(girisler); }
    rapor.icindekiGiris = girisler.length;

    // Satır rollerini belirle: 'toc', 'fnblok'(ayraç+tanımlar), 'govde'
    const rol = new Array(L.length).fill('govde');
    if (tocAralik) for (let i = tocAralik.bas; i <= tocAralik.bit; i++) rol[i] = 'toc';
    const fnTanim = {};              // 'seg:n' -> {t, satirlar:[idx]}
    const segBas = [0];              // her gövde segmentinin başlangıç satırı
    const fnBloklar = [];
    let imlec = 0;
    ayrac.forEach((sepIdx, k) => {
      // bu ayraçtan önceki gövde segmentindeki en büyük [n]
      let maksN = 0;
      for (let i = imlec; i < sepIdx; i++) {
        if (rol[i] !== 'govde') continue;
        const re = /\[(\d{1,4})\]/g; let mm;
        while ((mm = re.exec(L[i])) !== null) { const n = parseInt(mm[1], 10); if (n > maksN) maksN = n; }
      }
      rol[sepIdx] = 'ayrac';
      const sonBlok = (k === ayrac.length - 1);
      let i = sepIdx + 1, son = L.length - 1;
      if (!sonBlok) son = ayrac[k + 1] - 1;
      let simdiki = null, bitis = son;
      for (; i <= son; i++) {
        const dm = /^\[(\d{1,4})\]\s*(.*)$/.exec(L[i]);
        if (dm) {
          const n = parseInt(dm[1], 10);
          if (!sonBlok && simdiki && simdiki.n === maksN) { bitis = i - 1; break; }
          simdiki = { n, satirlar: [i], metin: [dm[2]] };
          fnTanim[k + ':' + n] = simdiki;
          rol[i] = 'fn';
        } else if (simdiki) {
          if (!sonBlok && simdiki.n === maksN) { bitis = i - 1; break; }
          simdiki.satirlar.push(i); simdiki.metin.push(L[i]); rol[i] = 'fn';
        } else { rol[i] = 'fn'; }
        bitis = i;
      }
      fnBloklar.push({ ayrac: sepIdx, bitis, maksN });
      imlec = bitis + 1;
      segBas.push(imlec);
    });
    // Her satırın hangi gövde segmentine ait olduğu
    const segOf = new Array(L.length).fill(0);
    { let s = 0; for (let i = 0; i < L.length; i++) {
        while (s < fnBloklar.length && i > fnBloklar[s].bitis) s++;
        segOf[i] = s;
    } }

    // Başlık eşleme: tüm aday satırları bul, sıraya uyan EN ÇOK eşleşmeyi seç (en uzun artan zincir).
    // Böylece girişteki bir liste gibi sahte benzerlikler gerçek başlıkları atlatmaz.
    const girisN = girisler.map(g => ({ a: norm(g.baslik), b: g.onek ? norm(g.onek + ' ' + g.baslik) : null }));
    const bslk = new Map();         // satır idx -> {g: girisIdx, n: satirSayisi}
    if (girisler.length) {
      // aday birleşimleri (1, 2, 3 satır) uzunluğa göre kovalanır
      const kova = new Map();
      const kovaEkle = (pos, n, str) => {
        if (str.length < 2) return;
        let a = kova.get(str.length); if (!a) kova.set(str.length, a = []);
        a.push({ pos, n, s: str });
      };
      for (let i = 0; i < L.length; i++) {
        if (rol[i] !== 'govde' || L[i].length > 240) continue;
        kovaEkle(i, 1, norm(L[i]));
        if (L[i].length <= 140 && i + 1 < L.length && rol[i + 1] === 'govde' && L[i + 1].length <= 240) {
          kovaEkle(i, 2, norm(L[i] + ' ' + L[i + 1]));
          if (L[i + 1].length <= 140 && i + 2 < L.length && rol[i + 2] === 'govde' && L[i + 2].length <= 240)
            kovaEkle(i, 3, norm(L[i] + ' ' + L[i + 1] + ' ' + L[i + 2]));
        }
      }
      const adaylar = [];
      const gorulen = new Set();
      girisN.forEach((g, k) => {
        [g.a, g.b].forEach(form => {
          if (!form) return;
          const maks = form.length >= 10 ? Math.max(1, Math.floor(form.length * 0.12)) : 0;
          // Güvercin yuvası süzgeci: en fazla `maks` düzenleme varsa, formun (maks+1) parçasından en az biri aynen kalır.
          const parcalar = [];
          if (maks > 0) { const pl = Math.ceil(form.length / (maks + 1)); for (let q = 0; q < form.length; q += pl) parcalar.push(form.slice(q, q + pl)); }
          for (let u = form.length - maks; u <= form.length + maks; u++) {
            const liste = kova.get(u); if (!liste) continue;
            for (const c of liste) {
              if (c.s === form || (maks > 0 && parcalar.some(q => c.s.includes(q)) && lev(c.s, form, maks) <= maks)) {
                const anahtar = k + '|' + c.pos + '|' + c.n;
                if (!gorulen.has(anahtar)) { gorulen.add(anahtar); adaylar.push({ k, pos: c.pos, n: c.n, end: c.pos + c.n, dp: 0, prev: -1 }); }
              }
            }
          }
        });
      });
      // en uzun artan zincir (başlangıç sırasına göre; giriş indeksi artmalı; satırlar çakışmamalı)
      adaylar.sort((x, y) => x.pos - y.pos || y.k - x.k);
      const E = girisler.length;
      const bit = new Array(E + 2).fill(null);          // [değer, aday no]
      const bitGuncelle = (k, v, id) => { for (let i = k + 1; i <= E + 1; i += i & -i) if (!bit[i] || v >= bit[i][0]) bit[i] = [v, id]; };
      const bitSorgu = (k) => { let en = [0, -1]; for (let i = k; i > 0; i -= i & -i) if (bit[i] && bit[i][0] > en[0]) en = bit[i]; return en; };
      const bitenler = adaylar.map((_, i) => i).sort((x, y) => adaylar[x].end - adaylar[y].end);
      let bp = 0;
      adaylar.forEach((c, id) => {
        while (bp < bitenler.length && adaylar[bitenler[bp]].end <= c.pos) {
          const d = adaylar[bitenler[bp]];
          if (d.dp > 0) bitGuncelle(d.k, d.dp, bitenler[bp]);
          bp++;
        }
        const [v, onceki] = bitSorgu(c.k);                // yalnızca k' < c.k olanlar (sorgu indeksi k)
        c.dp = v + 1; c.prev = onceki;
      });
      let enIyi = -1;
      adaylar.forEach((c, id) => { if (enIyi < 0 || c.dp > adaylar[enIyi].dp || (c.dp === adaylar[enIyi].dp && c.pos > adaylar[enIyi].pos)) enIyi = id; });
      for (let id = enIyi; id >= 0; id = adaylar[id].prev) bslk.set(adaylar[id].pos, { g: adaylar[id].k, n: adaylar[id].n });
    }
    const eslenen = new Set([...bslk.values()].map(v => v.g));
    rapor.eslesenBaslik = eslenen.size;
    rapor.eslesmeyenBaslik = girisler.filter((g, k) => !eslenen.has(k)).map(g => g.baslik);

    // Paragraf kurma
    const paras = [];
    const heads = [];
    const sayfaImleri = [];
    let birik = null;
    function birikiBitir() {
      if (!birik) return;
      paras.push({ t: gorunenMetin(birik.satirlar.map(i => L[i])), k: 'p', li: [birik.satirlar[0], birik.satirlar[birik.satirlar.length - 1]], sg: birik.sg });
      birik = null;
    }
    for (let i = 0; i < L.length; i++) {
      if (rol[i] !== 'govde') continue;
      const b = bslk.get(i);
      if (b) {
        birikiBitir();
        const sat = b.n === 2 ? [i, i + 1] : [i];
        const g = girisler[b.g];
        const hid = heads.length;
        heads.push({ id: hid, pi: paras.length, lv: g.seviye, t: gorunenMetin(sat.map(x => L[x])), sayfa: g.sayfa });
        paras.push({ t: gorunenMetin(sat.map(x => L[x])), k: 'h', hid, li: [sat[0], sat[sat.length - 1]], sg: segOf[i] });
        if (b.n === 2) i++;
        continue;
      }
      if (sertSatir) {
        if (/^\d{1,4}$/.test(L[i].trim())) { birikiBitir(); sayfaImleri.push(i); continue; }
        if (!birik) birik = { satirlar: [i], sg: segOf[i] };
        else birik.satirlar.push(i);
        // paragraf biter mi?
        const l = L[i];
        const sonrakiVar = i + 1 < L.length && rol[i + 1] === 'govde' && !bslk.has(i + 1);
        const tamGenislik = l.length >= 68;
        if (!sonrakiVar || !tamGenislik) birikiBitir();
      } else {
        paras.push({ t: gorunenMetin([L[i]]), k: 'p', li: [i, i], sg: segOf[i] });
      }
    }
    birikiBitir();
    rapor.paragraf = paras.length;
    rapor.sayfaIsareti = sayfaImleri.length;

    // Dipnot işaretleri + ayet atıfları (gövde)
    const fnKullanilan = new Set();
    const fnIlkPara = {};
    const atifler = [];
    const supheli = [];
    let eksikTanim = 0;
    paras.forEach((pr, pi) => {
      const re = /\[(\d{1,4})\]/g; let mm;
      const fnler = [];
      while ((mm = re.exec(pr.t)) !== null) {
        const anahtar = pr.sg + ':' + parseInt(mm[1], 10);
        fnler.push({ bas: mm.index, bit: mm.index + mm[0].length, anahtar, no: parseInt(mm[1], 10) });
        fnKullanilan.add(anahtar);
        if (fnTanim[anahtar]) { if (fnIlkPara[anahtar] === undefined) fnIlkPara[anahtar] = pi; } else eksikTanim++;
      }
      pr.fn = fnler;
      // atıfları, dipnot işaretleriyle çakışmasın diye işaretleri boşlukla maskeleyerek ara
      let maskeli = pr.t;
      fnler.forEach(f => { maskeli = maskeli.slice(0, f.bas) + ' '.repeat(f.bit - f.bas) + maskeli.slice(f.bit); });
      const sonuc = atifBul(maskeli, sureler);
      pr.at = sonuc.atifler;
      sonuc.supheli.forEach(s => supheli.push({ yer: 'g', pi, ...s }));
      sonuc.atifler.forEach(a => atifler.push({ pi, kaynak: 'g', s: a.s, parcalar: a.parcalar, bulanik: a.bulanik }));
    });
    rapor.eksikDipnotTanimi = eksikTanim;

    // Dipnot tanımları
    const fns = {};
    let fnAtifSay = 0;
    Object.keys(fnTanim).forEach(anahtar => {
      const d = fnTanim[anahtar];
      const t = gorunenMetin(d.metin);
      const sonuc = atifBul(t, sureler);
      sonuc.supheli.forEach(s => supheli.push({ yer: 'f', fk: anahtar, ...s }));
      fns[anahtar] = { t, at: sonuc.atifler, li: [d.satirlar[0], d.satirlar[d.satirlar.length - 1]] };
      const pi = fnIlkPara[anahtar];
      sonuc.atifler.forEach(a => { fnAtifSay++; atifler.push({ pi: pi === undefined ? null : pi, kaynak: 'f', fk: anahtar, s: a.s, parcalar: a.parcalar, bulanik: a.bulanik }); });
    });
    rapor.dipnotTanimli = Object.keys(fnTanim).length;
    rapor.dipnotKullanilan = fnKullanilan.size;
    rapor.kullanilmayanTanim = Object.keys(fnTanim).filter(k => !fnKullanilan.has(k)).length;
    rapor.atifGovde = atifler.filter(a => a.kaynak === 'g').length;
    rapor.atifDipnot = fnAtifSay;
    rapor.atifBulanik = atifler.filter(a => a.bulanik).length;
    rapor.supheli = supheli;

    // Doğrulama: her boş olmayan satır tam bir kez hesaplandı mı?
    const sayac = new Array(L.length).fill(0);
    paras.forEach(pr => { for (let i = pr.li[0]; i <= pr.li[1]; i++) sayac[i]++; });
    // sert satırda paragraf li aralığı içindeki sayfa imleri paragrafa girmez; ayrıca say
    sayfaImleri.forEach(i => { sayac[i] = 1; });
    for (let i = 0; i < L.length; i++) if (rol[i] !== 'govde') sayac[i] = 1;
    // sert satırda paragraf aralığı sayfa imi satırını da kapsayabilir → düzelt
    let hatali = 0;
    for (let i = 0; i < L.length; i++) if (sayac[i] !== 1) hatali++;
    rapor.satirHatasi = hatali;

    return { v: 1, paras, heads, fns, atifler, rapor, toc: tocAralik ? { bas: tocAralik.bas, bit: tocAralik.bit } : null, satirSayisi: L.length };
  }

  // Ters indeks: "s:a" -> [{pi, hid}] (tek kitap için)
  function tersIndeks(ayr) {
    const idx = {};
    const bulBaslik = (pi) => {
      for (let i = Math.min(pi, ayr.paras.length - 1); i >= 0; i--) {
        if (ayr.paras[i].k === 'h') return ayr.paras[i].hid;
      }
      return null;
    };
    ayr.atifler.forEach(a => {
      if (a.pi === null || a.pi === undefined) return;
      a.parcalar.forEach(([x, y]) => {
        for (let ay = x; ay <= Math.min(y, x + 300); ay++) {
          const key = a.s + ':' + ay;
          (idx[key] = idx[key] || []);
          if (!idx[key].some(e => e.pi === a.pi)) idx[key].push({ pi: a.pi, hid: bulBaslik(a.pi) });
        }
      });
    });
    return idx;
  }

  const KTP = { ayristir, tersIndeks, atifBul, norm, gorunenMetin, sureCoz };
  if (typeof module !== 'undefined' && module.exports) module.exports = KTP;
  else root.KTP = KTP;
})(typeof window !== 'undefined' ? window : globalThis);
