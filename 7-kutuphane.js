// ════════════════════════════════════════
//  KÜTÜPHANEM — KİTAP OKUMA EKRANI (Aşama 1: sadece okuma)
//  Kitaplar GitHub'daki düz .txt dosyalarıdır. Bu dosyalara ASLA yazılmaz, metin değiştirilmez.
//  Ayrıştırma sonucu (başlıklar, dipnotlar, âyet atıfları) telefonda IndexedDB'de saklanır.
//  Gerekir: 7a-kutuphane-parser.js (KTP), SURELER, ayetDetayAc, _tazeUrl
// ════════════════════════════════════════
(function () {
  'use strict';

  const KAYNAK_ANAHTAR = 'kutuphane_kaynaklar';
  const FS_ANAHTAR = 'kut_fs';
  const KONUM_ONEK = 'kut_konum_';

  const K = {
    liste: [],          // [{ad, url}]
    meta: {},           // url -> meta kaydı
    acik: null,         // {url, ad, ayr, els:[], hedefAyet}
    kokAcik: false,
    gorunum: 'liste',   // 'liste' | 'okuma'
    metaYuklendi: false,
    durum: {}           // url -> 'indiriliyor' | hata metni
  };

  // ── Küçük yardımcılar ───────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function lsOku(k, v) { try { const x = localStorage.getItem(k); return x === null ? v : x; } catch (e) { return v; } }
  function lsYaz(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function sureAdi(n) { return (SURELER[n - 1] && SURELER[n - 1].isim) || String(n); }

  // ── IndexedDB (ayrı veritabanı; mevcut tefsir veritabanına dokunmaz) ─────
  let _db = null;
  function dbAc() {
    return new Promise((res, rej) => {
      if (_db) return res(_db);
      if (!window.indexedDB) return rej(new Error('Bu tarayıcı IndexedDB desteklemiyor.'));
      const r = indexedDB.open('kutuphaneDB', 1);
      r.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'url' });
        if (!db.objectStoreNames.contains('kitap')) db.createObjectStore('kitap', { keyPath: 'url' });
      };
      r.onsuccess = (e) => { _db = e.target.result; res(_db); };
      r.onerror = (e) => rej(e.target.error);
    });
  }
  async function dbIstek(store, mod, fn) {
    const db = await dbAc();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, mod);
      const istek = fn(tx.objectStore(store));
      tx.oncomplete = () => res(istek ? istek.result : undefined);
      tx.onerror = (e) => rej(e.target.error);
      tx.onabort = (e) => rej(e.target.error || new Error('İşlem iptal edildi'));
    });
  }
  const dbHepsi = (s) => dbIstek(s, 'readonly', (st) => st.getAll());
  const dbGet = (s, k) => dbIstek(s, 'readonly', (st) => st.get(k));
  const dbPut = (s, v) => dbIstek(s, 'readwrite', (st) => st.put(v));
  const dbSil = (s, k) => dbIstek(s, 'readwrite', (st) => st.delete(k));

  async function metaYukle() {
    if (K.metaYuklendi) return;
    try {
      (await dbHepsi('meta')).forEach((m) => { K.meta[m.url] = m; });
    } catch (e) { console.warn('Kütüphane meta okunamadı:', e.message); }
    K.metaYuklendi = true;
  }

  // ── Kaynak listesi ──────────────────────────────────────────
  function urlCozumle(s) {
    s = s.trim();
    if (/^https?:\/\//i.test(s)) {
      if (/^https?:\/\/github\.com\//i.test(s) && !/raw\.githubusercontent/i.test(s)) {
        s = s.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }
      return s;
    }
    const repo = lsOku('github_repo', '') || 'muhammedharman-sudo/tefsir-data';
    return 'https://raw.githubusercontent.com/' + repo + '/main/kitaplar/' + encodeURIComponent(s);
  }
  function adTuret(url) {
    let a = url.split('?')[0].split('/').pop() || url;
    try { a = decodeURIComponent(a); } catch (e) {}
    return a.replace(/\.txt$/i, '').replace(/[_]+/g, ' ').trim() || url;
  }
  function kaynakSatirlariniCozumle(metin) {
    const cikti = [];
    const gorulen = new Set();
    metin.split(/\r?\n/).forEach((satir) => {
      satir = satir.trim();
      if (!satir || satir.startsWith('#')) return;
      let ad = '', yol = satir;
      const bolum = satir.indexOf('|');
      if (bolum > 0) { ad = satir.slice(0, bolum).trim(); yol = satir.slice(bolum + 1).trim(); }
      if (!yol) return;
      const url = urlCozumle(yol);
      if (gorulen.has(url)) return;
      gorulen.add(url);
      cikti.push({ ad: ad || adTuret(url), url });
    });
    return cikti;
  }
  function kaynaklariOku() {
    try { const x = JSON.parse(lsOku(KAYNAK_ANAHTAR, '[]')); return Array.isArray(x) ? x : []; } catch (e) { return []; }
  }

  // ── Ayrıştırma (mümkünse arka plan işçisinde) ──────────────
  let _parserKod = null;
  async function ayristir(ham) {
    try {
      if (!window.Worker) throw new Error('worker yok');
      if (!_parserKod) {
        const sc = document.querySelector('script[src*="7a-kutuphane-parser"]');
        _parserKod = await (await fetch(sc.src)).text();
      }
      const kod = _parserKod + '\nself.onmessage=function(e){try{var r=KTP.ayristir(e.data.ham,e.data.sureler);self.postMessage({ok:r});}catch(x){self.postMessage({hata:String(x&&x.message||x)});}};';
      const blobUrl = URL.createObjectURL(new Blob([kod], { type: 'text/javascript' }));
      return await new Promise((res, rej) => {
        const w = new Worker(blobUrl);
        const bitir = () => { w.terminate(); URL.revokeObjectURL(blobUrl); };
        w.onmessage = (e) => { bitir(); e.data.ok ? res(e.data.ok) : rej(new Error(e.data.hata)); };
        w.onerror = () => { bitir(); rej(new Error('worker')); };
        w.postMessage({ ham, sureler: SURELER });
      });
    } catch (e) {
      await new Promise((r) => setTimeout(r, 50)); // ekran "hazırlanıyor" yazısını çizsin
      return KTP.ayristir(ham, SURELER);
    }
  }

  // ── Kitap indirme + kaydetme ────────────────────────────────
  async function kitapIndir(kayit) {
    const url = kayit.url;
    K.durum[url] = 'indiriliyor';
    listeCiz();
    try {
      let res;
      try { res = await fetch(_tazeUrl(url), { cache: 'no-store' }); }
      catch (e) { throw new Error('İnternet bağlantısı yok ya da GitHub\'a ulaşılamadı.'); }
      if (!res.ok) {
        throw new Error(res.status === 404
          ? 'Dosya bulunamadı (404). Dosya adı/yolu doğru mu? Depo özelse bu bağlantı çalışmaz.'
          : 'İndirilemedi (HTTP ' + res.status + ').');
      }
      let ham = await res.text();
      if (!ham.trim()) throw new Error('Dosya boş.');
      const bozuk = (ham.match(/�/g) || []).length;
      const t0 = Date.now();
      K.durum[url] = 'hazirlaniyor';
      listeCiz();
      const ayr = await ayristir(ham);
      const ters = {};
      const t = KTP.tersIndeks(ayr);
      Object.keys(t).forEach((k) => { ters[k] = t[k].map((x) => [x.pi, x.hid]); });
      const meta = {
        url, ad: kayit.ad, boyut: ham.length, guncellendi: Date.now(), ayristirmaMs: Date.now() - t0,
        baslikSay: ayr.heads.length, paraSay: ayr.paras.length, atifSay: ayr.atifler.length,
        rapor: ayr.rapor, bozuk, ters, surum: ayr.v
      };
      await dbPut('kitap', { url, ayr });
      await dbPut('meta', meta);
      K.meta[url] = meta;
      delete K.durum[url];
      ilgiliOnbellekTemizle();
      listeCiz();
      return true;
    } catch (e) {
      K.durum[url] = e.message || String(e);
      listeCiz();
      return false;
    }
  }

  // ── Yerleşim: ana kabuk ────────────────────────────────────
  function kabukKur() {
    if ($('kut-kok')) return;
    const kok = el('div'); kok.id = 'kut-kok';
    kok.innerHTML =
      '<div class="kut-ust">' +
        '<button class="kut-ikon" id="kut-geri" aria-label="Geri">←</button>' +
        '<div class="kut-baslik-kutu"><div class="kut-baslik" id="kut-baslik">📚 Kütüphanem</div>' +
        '<div class="kut-altbaslik" id="kut-altbaslik"></div></div>' +
        '<div class="kut-ust-sag" id="kut-ust-sag"></div>' +
      '</div>' +
      '<div class="kut-icerik" id="kut-liste"></div>' +
      '<div class="kut-okuma" id="kut-okuma" style="display:none;"></div>';
    document.body.appendChild(kok);
    $('kut-geri').onclick = geriTusu;
  }

  function ustSagKur(dugmeler) {
    const k = $('kut-ust-sag');
    k.innerHTML = '';
    dugmeler.forEach((d) => {
      const b = el('button', 'kut-ikon', d.t);
      b.title = d.ipucu || '';
      b.onclick = d.f;
      k.appendChild(b);
    });
  }

  // geri sistemi: mevcut _navPush/_navGeriGit ile uyumlu
  function navIt() { try { _navPush('kutuphane', null); } catch (e) {} }
  function geriTusu() {
    const son = (typeof _navGecmis !== 'undefined' && _navGecmis.length) ? _navGecmis[_navGecmis.length - 1] : null;
    if (son && son.tip === 'kutuphane') history.back(); else geriIc();
  }
  function geriIc() {
    if (!K.kokAcik) return;
    if (K.gorunum === 'okuma') { okumaKapat(); }
    else { $('kut-kok').style.display = 'none'; K.kokAcik = false; }
  }
  window.kutGeriIc = geriIc;

  // ── Kütüphane ana ekranı ───────────────────────────────────
  async function kutuphaneAc() {
    kabukKur();
    await metaYukle();
    if (!K.kokAcik) { K.kokAcik = true; navIt(); }
    $('kut-kok').style.display = 'flex';
    listeGoster();
    if (!K.liste.length) K.liste = kaynaklariOku();
    listeCiz();
  }
  window.kutuphaneAc = kutuphaneAc;

  function listeGoster() {
    K.gorunum = 'liste';
    $('kut-liste').style.display = 'block';
    $('kut-okuma').style.display = 'none';
    $('kut-baslik').textContent = '📚 Kütüphanem';
    $('kut-altbaslik').textContent = '';
    ustSagKur([
      { t: '⟳', ipucu: 'Hepsini güncelle', f: hepsiniGuncelle },
      { t: '⚙', ipucu: 'Kitap kaynakları', f: kaynakEkraniAc }
    ]);
  }

  async function hepsiniGuncelle() {
    for (const k of K.liste) { await kitapIndir(k); }
  }

  function boyutYaz(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }

  function listeCiz() {
    const kap = $('kut-liste');
    if (!kap) return;
    if (!K.liste.length) K.liste = kaynaklariOku();
    kap.innerHTML = '';
    if (!K.liste.length) {
      const bos = el('div', 'kut-bos');
      bos.appendChild(el('div', 'kut-bos-ikon', '📚'));
      bos.appendChild(el('div', 'kut-bos-baslik', 'Henüz kitap eklenmedi'));
      bos.appendChild(el('div', 'kut-bos-yazi', 'Kitaplarını GitHub\'a .txt olarak yükle, sonra ⚙ düğmesinden dosya adlarını veya bağlantılarını ekle.'));
      const b = el('button', 'kut-btn', 'Kitap kaynaklarını düzenle');
      b.onclick = kaynakEkraniAc;
      bos.appendChild(b);
      kap.appendChild(bos);
      return;
    }
    K.liste.forEach((k) => {
      const m = K.meta[k.url];
      const d = K.durum[k.url];
      const kart = el('div', 'kut-kart');
      const ana = el('div', 'kut-kart-ana');
      ana.appendChild(el('div', 'kut-kart-ad', k.ad));
      let alt = '';
      if (d === 'indiriliyor') alt = '⏳ İndiriliyor…';
      else if (d === 'hazirlaniyor') alt = '⚙ Hazırlanıyor (başlıklar ve âyetler çıkarılıyor)…';
      else if (d) alt = '⚠ ' + d;
      else if (m) {
        const konum = konumOku(k.url);
        const yuzde = konum && m.paraSay ? Math.min(100, Math.round((konum.pi / m.paraSay) * 100)) : 0;
        alt = m.baslikSay + ' başlık · ' + m.atifSay + ' âyet atfı · ' + boyutYaz(m.boyut) + (yuzde ? ' · %' + yuzde + ' okundu' : '');
      } else alt = 'Henüz indirilmedi — dokunarak indir';
      const altEl = el('div', 'kut-kart-alt' + (d && d !== 'indiriliyor' && d !== 'hazirlaniyor' ? ' kut-hata' : ''), alt);
      ana.appendChild(altEl);
      if (m && m.rapor) {
        const r = m.rapor;
        const sorun = (r.eslesmeyenBaslik || []).length + (r.supheli || []).length + (r.eksikDipnotTanimi || 0) + (m.bozuk || 0);
        if (sorun) ana.appendChild(el('div', 'kut-kart-uyari', '⚠ ' + sorun + ' dikkat edilecek nokta (ⓘ)'));
      }
      ana.onclick = () => { if (d === 'indiriliyor' || d === 'hazirlaniyor') return; kitapAc(k); };
      kart.appendChild(ana);
      const yan = el('div', 'kut-kart-yan');
      if (m) {
        const i = el('button', 'kut-mini', 'ⓘ'); i.title = 'Kitap sağlık raporu';
        i.onclick = (e) => { e.stopPropagation(); saglikAc(k); };
        yan.appendChild(i);
      }
      const g = el('button', 'kut-mini', '⟳'); g.title = m ? 'GitHub\'dan güncelle' : 'İndir';
      g.onclick = (e) => { e.stopPropagation(); kitapIndir(k); };
      yan.appendChild(g);
      kart.appendChild(yan);
      kap.appendChild(kart);
    });
  }

  // ── Kaynak ekranı ──────────────────────────────────────────
  function kaynakEkraniAc() {
    const ic = el('div', 'kut-form');
    ic.appendChild(el('div', 'kut-yardim',
      'Her satıra bir kitap yaz. Üç biçim de olur:\n' +
      '• dosya_adi.txt  (GitHub deponun "kitaplar" klasöründe aranır)\n' +
      '• Kitap Adı | dosya_adi.txt\n' +
      '• Kitap Adı | https://raw.githubusercontent.com/…/dosya.txt'));
    const ta = el('textarea', 'kut-ta');
    ta.rows = 9;
    ta.spellcheck = false;
    ta.value = K.liste.map((k) => k.ad + ' | ' + k.url).join('\n');
    ic.appendChild(ta);
    const b = el('button', 'kut-btn', 'Kaydet');
    b.onclick = async () => {
      const yeni = kaynakSatirlariniCozumle(ta.value);
      lsYaz(KAYNAK_ANAHTAR, JSON.stringify(yeni));
      K.liste = yeni;
      sheetKapat();
      listeCiz();
      // listede olmayan kitapların kaydını telefondan temizle (GitHub'a dokunulmaz)
      const kalan = new Set(yeni.map((x) => x.url));
      for (const url of Object.keys(K.meta)) {
        if (!kalan.has(url)) { try { await dbSil('meta', url); await dbSil('kitap', url); } catch (e) {} delete K.meta[url]; }
      }
      ilgiliOnbellekTemizle();
      listeCiz();
    };
    ic.appendChild(b);
    sheetAc('Kitap Kaynakları', ic);
  }

  // ── Sağlık raporu ──────────────────────────────────────────
  function saglikAc(k) {
    const m = K.meta[k.url];
    if (!m) return;
    const r = m.rapor || {};
    const ic = el('div', 'kut-form');
    const satir = (a, b, kotu) => {
      const s = el('div', 'kut-rapor-satir' + (kotu ? ' kut-hata' : ''));
      s.appendChild(el('span', '', a)); s.appendChild(el('b', '', String(b)));
      ic.appendChild(s);
    };
    const toplamBaslik = (r.icindekiGiris || 0);
    satir('İçindekiler girişi', toplamBaslik);
    satir('Metinde bulunan başlık', r.eslesenBaslik + ' / ' + toplamBaslik, (r.eslesmeyenBaslik || []).length > 0);
    satir('Paragraf', r.paragraf);
    satir('Dipnot (tanımlı / metinde kullanılan)', r.dipnotTanimli + ' / ' + r.dipnotKullanilan);
    satir('Tanımı eksik dipnot', r.eksikDipnotTanimi || 0, (r.eksikDipnotTanimi || 0) > 0);
    satir('Âyet atfı (metin / dipnot)', (r.atifGovde || 0) + ' / ' + (r.atifDipnot || 0));
    satir('Sûre adı yaklaşık eşleşen atıf', r.atifBulanik || 0);
    satir('Şüpheli atıf (bağlanmadı)', (r.supheli || []).length, (r.supheli || []).length > 0);
    satir('Bozuk karakter (�)', m.bozuk || 0, (m.bozuk || 0) > 0);
    satir('Ayrıştırma süresi', m.ayristirmaMs + ' ms');
    const liste = (baslik, dizi, f) => {
      if (!dizi || !dizi.length) return;
      ic.appendChild(el('div', 'kut-rapor-baslik', baslik));
      dizi.slice(0, 80).forEach((x) => ic.appendChild(el('div', 'kut-rapor-oge', f(x))));
      if (dizi.length > 80) ic.appendChild(el('div', 'kut-rapor-oge', '… ve ' + (dizi.length - 80) + ' tane daha'));
    };
    liste('İçindekilerde olup metinde bulunamayan başlıklar', r.eslesmeyenBaslik, (x) => x);
    liste('Şüpheli atıflar (yanlış bağlamamak için bağlanmadı)', r.supheli, (x) => '“' + x.metin + '” — ' + x.neden);
    ic.appendChild(el('div', 'kut-yardim', 'Not: Kitap metni hiçbir zaman değiştirilmez. Bu rapor yalnızca ayrıştırmanın neleri bulduğunu gösterir.'));
    sheetAc('ⓘ ' + k.ad, ic);
  }

  // ── Alt sayfa (sheet) ──────────────────────────────────────
  function sheetAc(baslik, icerik) {
    sheetKapat();
    const ov = el('div', 'kut-sheet-ov'); ov.id = 'kut-sheet';
    ov.onclick = (e) => { if (e.target === ov) sheetKapat(); };
    const sh = el('div', 'kut-sheet');
    const ust = el('div', 'kut-sheet-ust');
    ust.appendChild(el('div', 'kut-sheet-baslik', baslik));
    const x = el('button', 'kut-ikon', '✕'); x.onclick = sheetKapat;
    ust.appendChild(x);
    sh.appendChild(ust);
    const g = el('div', 'kut-sheet-govde');
    g.appendChild(icerik);
    sh.appendChild(g);
    ov.appendChild(sh);
    document.body.appendChild(ov);
    return g;
  }
  function sheetKapat() { const s = $('kut-sheet'); if (s) s.remove(); }

  // ── Okuma ekranı ───────────────────────────────────────────
  function konumOku(url) {
    try { return JSON.parse(lsOku(KONUM_ONEK + url, 'null')); } catch (e) { return null; }
  }
  function konumYaz(url, pi) { lsYaz(KONUM_ONEK + url, JSON.stringify({ pi, t: Date.now() })); }

  function fsOku() { const n = parseInt(lsOku(FS_ANAHTAR, '18'), 10); return n >= 13 && n <= 30 ? n : 18; }

  async function kitapAc(kayit, hedefPi, hedefAyet) {
    kabukKur();
    await metaYukle();
    if (!K.kokAcik) { K.kokAcik = true; navIt(); }
    $('kut-kok').style.display = 'flex';
    if (!K.meta[kayit.url]) {
      const tamam = await kitapIndir(kayit);
      if (!tamam) return;
    }
    let kayitDb = null;
    try { kayitDb = await dbGet('kitap', kayit.url); } catch (e) {}
    if (!kayitDb || !kayitDb.ayr || kayitDb.ayr.v !== 1) {
      const tamam = await kitapIndir(kayit);
      if (!tamam) return;
      kayitDb = await dbGet('kitap', kayit.url);
    }
    const ayr = kayitDb.ayr;
    navIt();
    K.gorunum = 'okuma';
    K.acik = { url: kayit.url, ad: kayit.ad, ayr, els: [], mevcutPi: 0 };
    $('kut-liste').style.display = 'none';
    const ok = $('kut-okuma');
    ok.style.display = 'flex';
    $('kut-baslik').textContent = kayit.ad;
    ustSagKur([
      { t: 'A−', ipucu: 'Yazıyı küçült', f: () => fsDegistir(-1) },
      { t: 'A+', ipucu: 'Yazıyı büyüt', f: () => fsDegistir(1) },
      { t: '☰', ipucu: 'İçindekiler', f: icindekilerAc }
    ]);
    okumaCiz(hedefPi, hedefAyet);
  }

  function okumaKapat() {
    if (K.acik) { konumuKaydet(); }
    K.acik = null;
    $('kut-okuma').innerHTML = '';
    listeGoster();
    listeCiz();
  }

  function fsDegistir(d) {
    const n = Math.max(13, Math.min(30, fsOku() + d * 2));
    lsYaz(FS_ANAHTAR, String(n));
    const g = $('kut-metin');
    if (!g || !K.acik) return;
    const pi = K.acik.mevcutPi;
    g.style.fontSize = n + 'px';
    konumaGit(pi, false);
  }

  // Metni; âyet atıfı ve dipnot işaretleriyle DOM parçalarına çevirir. Metin birebir korunur.
  function isaretli(t, atList, fnList, baglam) {
    const ev = [];
    (atList || []).forEach((a) => ev.push({ b: a.bas, e: a.bit, tip: 'a', v: a }));
    (fnList || []).forEach((f) => ev.push({ b: f.bas, e: f.bit, tip: 'f', v: f }));
    ev.sort((x, y) => x.b - y.b || y.e - x.e);
    const frag = document.createDocumentFragment();
    let son = 0;
    ev.forEach((o) => {
      if (o.b < son || o.e > t.length) return;
      if (o.b > son) frag.appendChild(document.createTextNode(t.slice(son, o.b)));
      const metin = t.slice(o.b, o.e);
      if (o.tip === 'a') {
        const s = el('span', 'kut-at' + (o.v.bulanik ? ' kut-bulanik' : ''), metin);
        s.dataset.s = o.v.s;
        s.dataset.p = JSON.stringify(o.v.parcalar);
        s.title = sureAdi(o.v.s) + ' ' + o.v.s + ':' + o.v.parcalar.map((p) => p[0] === p[1] ? p[0] : p[0] + '-' + p[1]).join(',');
        frag.appendChild(s);
      } else {
        const sup = el('sup', 'kut-fnsup');
        const b = el('span', 'kut-fn', metin);
        b.dataset.fk = o.v.anahtar;
        sup.appendChild(b);
        frag.appendChild(sup);
      }
      son = o.e;
    });
    if (son < t.length) frag.appendChild(document.createTextNode(t.slice(son)));
    return frag;
  }

  function okumaCiz(hedefPi, hedefAyet) {
    const ok = $('kut-okuma');
    ok.innerHTML = '';
    const ayr = K.acik.ayr;

    const bant = el('div', 'kut-bant'); bant.id = 'kut-bant';
    ok.appendChild(bant);

    const kaydir = el('div', 'kut-kaydir'); kaydir.id = 'kut-kaydir';
    const metin = el('div', 'kut-metin'); metin.id = 'kut-metin';
    metin.style.fontSize = fsOku() + 'px';
    const frag = document.createDocumentFragment();
    ayr.paras.forEach((p, pi) => {
      let d;
      if (p.k === 'h') {
        const hd = ayr.heads[p.hid];
        d = el('div', 'kut-h kut-h' + Math.min(5, Math.max(1, hd.lv)));
        d.textContent = p.t;
      } else {
        d = el('p', 'kut-p');
        d.appendChild(isaretli(p.t, p.at, p.fn));
      }
      d.dataset.pi = pi;
      d.id = 'kp-' + pi;
      K.acik.els[pi] = d;
      frag.appendChild(d);
    });
    metin.appendChild(frag);
    kaydir.appendChild(metin);
    ok.appendChild(kaydir);

    metin.addEventListener('click', metinTikla);
    let zaman = null;
    kaydir.addEventListener('scroll', () => {
      clearTimeout(zaman);
      zaman = setTimeout(konumuKaydet, 350);
    }, { passive: true });

    let pi = 0;
    if (hedefPi !== undefined && hedefPi !== null) pi = hedefPi;
    else { const kn = konumOku(K.acik.url); if (kn && kn.pi < ayr.paras.length) pi = kn.pi; }
    konumaGit(pi, hedefPi !== undefined && hedefPi !== null, hedefAyet);
  }

  function ilkGorunenPi() {
    const kaydir = $('kut-kaydir');
    const els = K.acik.els;
    const ust = kaydir.getBoundingClientRect().top + 4;
    let lo = 0, hi = els.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (els[mid].getBoundingClientRect().bottom > ust) hi = mid; else lo = mid + 1;
    }
    return lo;
  }

  function bantiGuncelle(pi) {
    const ayr = K.acik.ayr;
    const baslar = ayr.heads;
    let lo = 0, hi = baslar.length - 1, bul = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (baslar[mid].pi <= pi) { bul = mid; lo = mid + 1; } else hi = mid - 1; }
    const b = $('kut-bant');
    if (b) b.textContent = bul >= 0 ? baslar[bul].t : '';
  }

  function konumuKaydet() {
    if (!K.acik || !$('kut-kaydir')) return;
    const pi = ilkGorunenPi();
    K.acik.mevcutPi = pi;
    konumYaz(K.acik.url, pi);
    bantiGuncelle(pi);
  }

  function konumaGit(pi, vurgula, hedefAyet) {
    const kaydir = $('kut-kaydir');
    const e = K.acik && K.acik.els[pi];
    if (!kaydir || !e) return;
    const yap = () => {
      kaydir.scrollTop += e.getBoundingClientRect().top - kaydir.getBoundingClientRect().top - 8;
      K.acik.mevcutPi = pi;
      bantiGuncelle(pi);
    };
    yap();
    requestAnimationFrame(yap); // yerleşim oturduktan sonra bir kez daha
    if (vurgula) {
      e.classList.add('kut-flash');
      setTimeout(() => e.classList.remove('kut-flash'), 2600);
      if (hedefAyet) {
        const [s, a] = hedefAyet;
        e.querySelectorAll('.kut-at').forEach((x) => {
          if (+x.dataset.s !== s) return;
          if (JSON.parse(x.dataset.p).some((p) => a >= p[0] && a <= p[1])) x.classList.add('kut-hedef');
        });
      }
    }
  }

  // ── Tıklamalar ─────────────────────────────────────────────
  function metinTikla(ev) {
    const at = ev.target.closest('.kut-at');
    if (at) return atifTikla(at);
    const fn = ev.target.closest('.kut-fn');
    if (fn) return dipnotAc(fn.dataset.fk);
  }

  function atifTikla(x) {
    const s = parseInt(x.dataset.s, 10);
    const parcalar = JSON.parse(x.dataset.p);
    const ayetler = [];
    parcalar.forEach(([a, b]) => { for (let i = a; i <= Math.min(b, a + 60); i++) ayetler.push(i); });
    if (ayetler.length === 1) { sheetKapat(); ayetAc(s, ayetler[0]); return; }
    const ic = el('div', 'kut-form');
    ic.appendChild(el('div', 'kut-yardim', sureAdi(s) + ' sûresinde hangi âyeti açalım?'));
    const sar = el('div', 'kut-ayet-liste');
    ayetler.forEach((a) => {
      const b = el('button', 'kut-btn kut-btn-ince', sureAdi(s) + ' ' + s + ':' + a);
      b.onclick = () => { sheetKapat(); ayetAc(s, a); };
      sar.appendChild(b);
    });
    ic.appendChild(sar);
    sheetAc('Âyet seç', ic);
  }

  function ayetAc(s, a) {
    if (typeof ayetDetayAc === 'function') ayetDetayAc(s, a);
  }

  function dipnotAc(fk) {
    const f = K.acik && K.acik.ayr.fns[fk];
    if (!f) return;
    const no = fk.split(':')[1];
    const ic = el('div', 'kut-dipnot');
    ic.appendChild(el('b', 'kut-dipnot-no', '[' + no + '] '));
    ic.appendChild(isaretli(f.t, f.at, null));
    ic.addEventListener('click', (ev) => { const at = ev.target.closest('.kut-at'); if (at) atifTikla(at); });
    sheetAc('Dipnot ' + no, ic);
  }

  // ── İçindekiler ────────────────────────────────────────────
  function icindekilerAc() {
    if (!K.acik) return;
    const heads = K.acik.ayr.heads;
    const ic = el('div', 'kut-ic');
    const ara = el('input', 'kut-ara');
    ara.type = 'search'; ara.placeholder = 'Başlıklarda ara…';
    ic.appendChild(ara);
    const liste = el('div', 'kut-ic-liste');
    ic.appendChild(liste);
    const mevcutPi = K.acik.mevcutPi;
    let aktifId = -1;
    heads.forEach((h) => { if (h.pi <= mevcutPi) aktifId = h.id; });
    const N = typeof KTP !== 'undefined' ? KTP.norm : (s) => s.toLowerCase();
    const cizliste = (sorgu) => {
      liste.innerHTML = '';
      const q = sorgu ? N(sorgu) : '';
      heads.forEach((h) => {
        if (q && !N(h.t).includes(q)) return;
        const b = el('button', 'kut-ic-oge kut-ic-l' + Math.min(5, h.lv) + (h.id === aktifId ? ' kut-aktif' : ''), h.t);
        b.onclick = () => { sheetKapat(); konumaGit(h.pi, true); konumuKaydet(); };
        liste.appendChild(b);
      });
      if (!liste.children.length) liste.appendChild(el('div', 'kut-yardim', 'Eşleşen başlık yok.'));
    };
    ara.oninput = () => cizliste(ara.value);
    cizliste('');
    const g = sheetAc('İçindekiler (' + heads.length + ')', ic);
    setTimeout(() => { const a = liste.querySelector('.kut-aktif'); if (a) a.scrollIntoView({ block: 'center' }); }, 30);
  }

  // ── Âyet ekranındaki "İlgili Konular" ──────────────────────
  let _tersOnbellek = null; // [{kayit, ters}]
  function ilgiliOnbellekTemizle() { _tersOnbellek = null; }

  async function tersYukle() {
    if (_tersOnbellek) return _tersOnbellek;
    await metaYukle();
    const kaynak = K.liste.length ? K.liste : kaynaklariOku();
    const sirali = [];
    kaynak.forEach((k) => { const m = K.meta[k.url]; if (m && m.ters) sirali.push({ kayit: k, ters: m.ters }); });
    _tersOnbellek = sirali;
    return sirali;
  }

  async function ilgiliSayisi(s, a) {
    const t = await tersYukle();
    const anahtar = s + ':' + a;
    let n = 0;
    t.forEach((x) => { if (x.ters[anahtar]) n += x.ters[anahtar].length; });
    return n;
  }

  window.kutIlgiliButonuEkle = function (satir, sNo, aNo) {
    // Yalnızca ilgili konu varsa görünür; yoksa ekranda hiçbir şey eklemez.
    const hizli = lsOku(KAYNAK_ANAHTAR, '[]');
    if (!hizli || hizli === '[]') return;
    const b = el('button', 'ayet-ekstra-btn');
    b.dataset.goster = 'derinlik';
    b.style.display = 'none';
    b.onclick = () => ilgiliAc(sNo, aNo);
    satir.appendChild(b);
    ilgiliSayisi(sNo, aNo).then((n) => {
      if (n > 0) {
        b.textContent = '📚 İlgili Konular (' + n + ')';
        b.style.display = '';
        b.style.borderColor = 'var(--gold)';
        b.style.color = 'var(--gold)';
        b.style.borderStyle = 'solid';
      }
    }).catch(() => {});
  };

  function yol(ayr, hid) {
    const h = ayr.heads;
    if (hid === null || hid === undefined || !h[hid]) return [];
    const p = [h[hid].t];
    let lv = h[hid].lv;
    for (let j = hid - 1; j >= 0 && lv > 1; j--) {
      if (h[j].lv < lv) { p.unshift(h[j].t); lv = h[j].lv; }
    }
    return p.slice(-3);
  }

  async function ilgiliAc(s, a) {
    const t = await tersYukle();
    const anahtar = s + ':' + a;
    const ic = el('div', 'kut-form');
    const hedef = [];
    t.forEach((x) => { (x.ters[anahtar] || []).forEach(([pi, hid]) => hedef.push({ kayit: x.kayit, pi, hid })); });
    if (!hedef.length) { ic.appendChild(el('div', 'kut-yardim', 'Bu âyete bağlı konu bulunamadı.')); sheetAc('İlgili Konular', ic); return; }
    const kitaplar = {};
    for (const h of hedef) {
      if (!kitaplar[h.kayit.url]) {
        try { const r = await dbGet('kitap', h.kayit.url); kitaplar[h.kayit.url] = r ? r.ayr : null; } catch (e) { kitaplar[h.kayit.url] = null; }
      }
    }
    ic.appendChild(el('div', 'kut-yardim', sureAdi(s) + ' ' + s + ':' + a + ' âyetine atıf yapılan konular. Dokununca kitapta o yere gidilir.'));
    hedef.forEach((h) => {
      const ayr = kitaplar[h.kayit.url];
      if (!ayr) return;
      const p = ayr.paras[h.pi];
      const kart = el('button', 'kut-ilgili');
      kart.appendChild(el('div', 'kut-ilgili-kitap', h.kayit.ad));
      const y = yol(ayr, h.hid);
      kart.appendChild(el('div', 'kut-ilgili-yol', y.length ? y.join(' › ') : '(başlık öncesi)'));
      if (p && p.t) kart.appendChild(el('div', 'kut-ilgili-ozet', p.t.length > 160 ? p.t.slice(0, 160) + '…' : p.t));
      kart.onclick = () => {
        sheetKapat();
        try { modalKapat(); } catch (e) {}
        if (K.kokAcik && K.gorunum === 'okuma' && K.acik && K.acik.url === h.kayit.url) {
          konumaGit(h.pi, true, [s, a]);
        } else {
          kitapAc(h.kayit, h.pi, [s, a]);
        }
      };
      ic.appendChild(kart);
    });
    sheetAc('📚 İlgili Konular (' + hedef.length + ')', ic);
  }
  window.kutIlgiliAc = ilgiliAc;
})();
