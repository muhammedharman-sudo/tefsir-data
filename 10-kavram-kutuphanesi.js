/* 10-kavram-kutuphanesi.js — Kavram makaleleri kütüphanesi
   Kalkan / Kavramlar / Kur'ân Ansiklopedisi: index.json + madde başına txt (tembel yükleme, IndexedDB önbellek) */
(function () {
  'use strict';
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  const KA = () => window.KutAra;
  const ALF = 'A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z #'.split(' ');
  const KAYNAK_KISA = { kalkan: 'Kalkan', kavramlar: 'Kavramlar', ansiklopedi: 'Ansiklopedi' };
  const LIMIT = 150;
  let INDEX = null, yukleniyor = null;
  const durum = { q: '', harf: '', kaynak: '' };

  function taban() {
    try { return _notlarGithubTabanUrlGetir() + 'data/kavram/'; } catch (e) { return ''; }
  }
  const tr = (s) => (s || '').toLocaleLowerCase('tr');
  const fold = (s) => tr(s).replace(/[âäà]/g, 'a').replace(/[îïì]/g, 'i').replace(/[ûüù]/g, 'u').replace(/[ôöò]/g, 'o').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/[’'`ʿʾ]/g, '');

  // ── IndexedDB önbellek ──
  let dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise((res) => {
      try {
        const r = indexedDB.open('kavram_kutuphane_v1', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('m');
        r.onsuccess = () => res(r.result); r.onerror = () => res(null);
      } catch (e) { res(null); }
    });
    return dbP;
  }
  async function dbGet(k) { const d = await db(); if (!d) return null; return new Promise((res) => { try { const q = d.transaction('m').objectStore('m').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } }); }
  async function dbSet(k, v) { const d = await db(); if (!d) return; return new Promise((res) => { try { const t = d.transaction('m', 'readwrite'); t.objectStore('m').put(v, k); t.oncomplete = () => res(); t.onerror = () => res(); } catch (e) { res(); } }); }

  async function getir(dosya, json) {
    const r = await fetch(taban() + dosya, { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return json ? r.json() : r.text();
  }
  function indexYukle() {
    if (INDEX) return Promise.resolve(INDEX);
    if (yukleniyor) return yukleniyor;
    yukleniyor = (async () => {
      let d = null;
      try { d = await getir('index.json', true); await dbSet('index', d); }
      catch (e) { d = await dbGet('index'); if (!d) throw e; }
      d.maddeler.forEach((m) => { m._f = fold(m.b); });
      INDEX = d; return d;
    })();
    yukleniyor.catch(() => { yukleniyor = null; });
    return yukleniyor;
  }
  async function metinYukle(m) {
    let t = await dbGet('t:' + m.f);
    if (t) return t;
    t = await getir(m.f, false);
    await dbSet('t:' + m.f, t); return t;
  }

  function boyut(n) { return n >= 1000 ? Math.round(n / 1000) + ' bin harf' : n + ' harf'; }
  function ayetEtiket(m) {
    if (!m.s) return '';
    let sure = ''; try { const x = SURELER[m.s - 1]; sure = Array.isArray(x) ? x[0] : (x && x.ad) || ''; } catch (e) {}
    return (sure || ('Sûre ' + m.s)) + (m.a ? ' ' + m.a + (m.z && m.z !== m.a ? '-' + m.z : '') : '');
  }


  // ── Metin düzeni: satır kırıklarını birleştir, içindekileri tıklanabilir yap ──
  const sayiSonu = /\s\d{1,4}\s*$/;
  const bosHarf = (x) => fold(x).replace(/[^a-z0-9]/g, '');
  function bloklar(t) {
    return t.replace(/\r/g, '').split(/\n[ \t]*\n/).map((b) => b.split('\n').map((x) => x.trim()).filter(Boolean));
  }
  function metinCiz(kutu, t, baslik, kaydir) {
    const B = bloklar(t).filter((l) => l.length).map((l) => ({ l, s: l.join(' ').replace(/\s+/g, ' ').trim() }));
    const tb = bosHarf(baslik);
    // 1) içindekiler adayı: baştaki kısa bloklar
    let n = 0; while (n < B.length && B[n].s.length < 170) n++;
    const on = B.slice(0, n), govde = B.slice(n);
    const govAnahtar = govde.map((x) => bosHarf(x.s));
    // ön bloklardan, gövdede başlık olarak geçenleri bul
    const eslesen = []; // {metin, gi}
    const eslesmis = new Set(); let konum = 0;
    on.forEach((x, i) => {
      const ham = x.s.replace(sayiSonu, '').replace(/[.\s]+$/, '');
      const k = bosHarf(ham); if (!k || k === tb) return;
      for (let j = konum; j < govde.length; j++) { if (govAnahtar[j] === k) { eslesen.push({ metin: ham, gi: j }); eslesmis.add(i); konum = j + 1; break; } }
    });
    const icindeVar = eslesen.length >= 3;
    const bas = new Map(); // gövde index -> heading id
    if (icindeVar) eslesen.forEach((e, i) => bas.set(e.gi, 'kk-h' + i));
    const frag = document.createDocumentFragment();
    const baslikMi = (x) => x.length < 90 && !/[.!?;,”"’)»]$/.test(x) && !/^[•\-–(\d\[]/.test(x) && /[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]{3}/.test(x);
    const ekle = (x) => {
      const bul = x.l.length > 1 && x.l.every((q) => /^[•\-–]\s+/.test(q));
      if (bul) { x.l.forEach((q) => frag.appendChild(el('div', 'kk-madde', q.replace(/^[•\-–]\s+/, '')))); return; }
      if (/^[•\-–]\s+/.test(x.s)) { frag.appendChild(el('div', 'kk-madde', x.s.replace(/^[•\-–]\s+/, ''))); return; }
      frag.appendChild(el('p', 'kk-p', x.s));
    };
    let tocEl = null;
    if (icindeVar) {
      // eşleşmeyen ön bloklar (alt başlık/giriş) önce gelir; sonra içindekiler
      on.forEach((x, i) => { if (!eslesmis.has(i) && bosHarf(x.s.replace(sayiSonu, '')) !== tb) { frag.appendChild(el(baslikMi(x.s) ? 'div' : 'p', baslikMi(x.s) ? 'kk-alt-baslik' : 'kk-p', x.s)); } });
      const d = el('details', 'kk-toc'); d.open = true; d.appendChild(el('summary', null, '📑 İçindekiler (' + eslesen.length + ')'));
      eslesen.forEach((e, i) => { const b = el('button', 'kk-toc-b', e.metin); b.onclick = () => { const h = kutu.querySelector('#kk-h' + i); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; d.appendChild(b); });
      tocEl = d; frag.appendChild(d);
    } else { on.forEach(ekle); }
    govde.forEach((x, j) => {
      if (j < 3 && bosHarf(x.s) === tb) return;
      if (bas.has(j)) {
        const h = el('h3', 'kk-h', x.s); h.id = bas.get(j);
        if (tocEl) { const u = el('button', 'kk-yukari', '↑'); u.title = 'İçindekiler'; u.onclick = () => tocEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); h.appendChild(u); }
        frag.appendChild(h); return;
      }
      if (baslikMi(x.s) && x.l.length <= 2) { frag.appendChild(el('div', 'kk-alt-baslik', x.s)); return; }
      ekle(x);
    });
    kutu.appendChild(frag);
  }

  // ── Okuyucu ──
  async function oku(m) {
    const S = KA().sayfa(m.b, true);
    S.govde.innerHTML = '';
    const ust = el('div', 'kk-meta', (KAYNAK_KISA[m.k] || m.k) + (ayetEtiket(m) ? ' · ' + ayetEtiket(m) : '') + ' · ' + boyut(m.n));
    S.govde.appendChild(ust);
    const kutu = el('div', 'kk-metin'); S.govde.appendChild(kutu);
    kutu.appendChild(el('div', 'kut-yardim', 'Yükleniyor…'));
    try {
      const t = await metinYukle(m);
      kutu.innerHTML = '';
      metinCiz(kutu, t, m.b, S.govde);
    } catch (e) {
      kutu.innerHTML = '';
      kutu.appendChild(el('div', 'kut-yardim', 'Makale yüklenemedi. İnternet bağlantısını ve GitHub’da data/kavram klasörünün yüklü olduğunu kontrol et.'));
    }
  }

  // ── Liste ekranı ──
  async function ac() {
    const S = KA().sayfa('📚 Kavram makaleleri', true);
    const g = S.govde; g.innerHTML = '';
    const ara = el('input', 'kb-input'); ara.placeholder = '🔍 Başlıkta ara…'; ara.value = durum.q; g.appendChild(ara);
    const kay = el('div', 'kv-chip-satir'); g.appendChild(kay);
    const har = el('div', 'kv-chip-satir kk-harf'); g.appendChild(har);
    const say = el('div', 'kut-yardim'); g.appendChild(say);
    const liste = el('div', 'kk-liste'); g.appendChild(liste);
    liste.appendChild(el('div', 'kut-yardim', 'İndeks yükleniyor…'));
    let idx;
    try { idx = await indexYukle(); }
    catch (e) { liste.innerHTML = ''; liste.appendChild(el('div', 'kut-yardim', 'İndeks yüklenemedi. data/kavram/index.json GitHub’da var mı? (Ayarlardaki depo adını da kontrol et.)')); return; }

    const chip = (t, sec, fn) => { const b = el('button', 'kv-chip' + (sec ? ' sec' : ''), t); b.onclick = fn; return b; };
    let limit = LIMIT;
    function ciz() {
      kay.innerHTML = ''; har.innerHTML = '';
      kay.appendChild(chip('Hepsi', !durum.kaynak, () => { durum.kaynak = ''; limit = LIMIT; ciz(); }));
      idx.kaynaklar.forEach((k) => kay.appendChild(chip(KAYNAK_KISA[k.id] || k.ad, durum.kaynak === k.id, () => { durum.kaynak = k.id; limit = LIMIT; ciz(); })));
      har.appendChild(chip('Tümü', !durum.harf, () => { durum.harf = ''; limit = LIMIT; ciz(); }));
      ALF.forEach((h) => har.appendChild(chip(h, durum.harf === h, () => { durum.harf = h; limit = LIMIT; ciz(); })));
      const q = fold(durum.q.trim());
      const l = idx.maddeler.filter((m) => {
        if (durum.kaynak && m.k !== durum.kaynak) return false;
        if (durum.harf) { const h = (m.h || '#'); if (durum.harf === '#' ? ALF.includes(h) && h !== '#' : h !== durum.harf) return false; }
        if (q && !m._f.includes(q)) return false;
        return true;
      }).sort((a, b) => a.b.localeCompare(b.b, 'tr'));
      say.textContent = l.length + ' makale';
      liste.innerHTML = '';
      const frag = document.createDocumentFragment();
      l.slice(0, limit).forEach((m) => {
        const r = el('button', 'kk-satir');
        r.appendChild(el('div', 'kk-baslik', m.b));
        r.appendChild(el('div', 'kk-alt', (KAYNAK_KISA[m.k] || m.k) + (ayetEtiket(m) ? ' · ' + ayetEtiket(m) : '') + ' · ' + boyut(m.n)));
        r.onclick = () => oku(m); frag.appendChild(r);
      });
      liste.appendChild(frag);
      if (l.length > limit) { const b = el('button', 'kv-btn', 'Daha fazla göster (' + (l.length - limit) + ')'); b.onclick = () => { limit += LIMIT; ciz(); }; liste.appendChild(b); }
    }
    ara.oninput = () => { durum.q = ara.value; limit = LIMIT; ciz(); };
    ciz();
  }

  window.KavramKutuphanesi = { ac, indexYukle, oku };
})();
