// ════════════════════════════════════════════════════════════════
//  KAVRAM TEFSİRİ — bir konuyu (sabır, namaz, hac…) âyet, hadis, tefsir, kitap pasajı ve notlarla toplayan çalışma sayfası.
//  Temalar & Motifler ile birleşti: eski temalar (kisitel_temalar) kavrama dönüşür, eski kayıt silinmez.
//  Veri: localStorage 'kavramlar_v1' + GitHub 'data/kavramlar.json' (id başına en yeni 'g' kazanır). Kaynak metinlere DOKUNMAZ.
//  Kök taraması: KELIME_MEALI_VERI içindeki her kelimenin Arapça kökü (rr) kullanılır.
// ════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  const ANAHTAR = 'kavramlar_v1', DOSYA = 'data/kavramlar.json';
  const EMOJILER = ['🧩', '🤲', '🕌', '⏳', '🌿', '⚖️', '🕋', '💡', '🔥', '🌙'];
  const BASLANGIC = [['Sabır', '🌿'], ['Namaz', '🕌'], ['Hac', '🕋'], ['Zekât', '💰'], ['Tevekkül', '🤲'], ['Şükür', '🌙']];
  const SEKMELER = [['ozet', '📋 Özet'], ['ayetler', '📖 Âyetler'], ['hadis', '🕌 Hadisler'], ['tefsir', '📜 Tefsirler'], ['kitap', '📚 Kitaplar'], ['not', '📝 Notlarım'], ['metin', '✍️ Metnim']];

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  const KA = () => window.KutAra;
  const toast = (m) => { try { KA().toast(m); } catch (e) {} };
  const kisalt = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n).trimEnd() + '…' : t; };
  const sureAd = (s) => (typeof SURELER !== 'undefined' && SURELER[s - 1]) ? SURELER[s - 1].isim : String(s);
  const lsOku = (k, v) => { try { const x = localStorage.getItem(k); return x === null ? v : JSON.parse(x); } catch (e) { return v; } };
  const lsYaz = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const slug = (s) => String(s || '').toLocaleLowerCase('tr').trim().replace(/\s+/g, '_').replace(/[^a-z0-9çğıöşüâîû_]/gi, '');
  const yeniId = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const parca = (key) => key.split(':').map(Number);
  const key2 = (s, a) => s + ':' + a;
  const sirala = (l) => l.slice().sort((x, y) => { const a = parca(x), b = parca(y); return a[0] - b[0] || a[1] - b[1]; });
  const nuzulSirala = (l) => l.slice().sort((x, y) => { const a = parca(x), b = parca(y); const ia = (SURELER[a[0] - 1] || {}).inis || 999, ib = (SURELER[b[0] - 1] || {}).inis || 999; return ia - ib || a[1] - b[1]; });

  // ── Depo ────────────────────────────────────────────────────
  let D = oku();
  function oku() { const v = lsOku(ANAHTAR, null); return v && v.v === 1 ? { v: 1, kavramlar: v.kavramlar || {} } : { v: 1, kavramlar: {} }; }
  let zaman = null, mesgul = false, durumYazisi = '';
  function yaz() { lsYaz(ANAHTAR, D); clearTimeout(zaman); zaman = setTimeout(() => senkron(true), 3000); }
  const canli = () => Object.values(D.kavramlar).filter((k) => !k.sil);
  const kavramBul = (id) => D.kavramlar[id] && !D.kavramlar[id].sil ? D.kavramlar[id] : null;
  function yeniKavram(ad, emoji) {
    return { id: yeniId('kv'), ad, emoji: emoji || '🧩', tanim: '', kokler: [], kelimeler: [], etiket: slug(ad), basliklar: [{ id: 'genel', ad: 'Genel', ayetler: [] }], kitapRefs: [], tefsirSabit: [], metin: '', okunan: [], baglantili: [], ts: Date.now(), g: Date.now() };
  }
  function kaydet(k) { k.g = Date.now(); D.kavramlar[k.id] = k; yaz(); }
  const tumAyetler = (k) => { const s = new Set(); k.basliklar.forEach((b) => b.ayetler.forEach((x) => s.add(x))); return [...s]; };

  // Eski Temalar & Motifler → kavram (yalnız kopyalar; eski kayıt dokunulmadan kalır)
  function gocEt() {
    let eski = []; try { eski = JSON.parse(localStorage.getItem('kisitel_temalar') || '[]'); } catch (e) {}
    let degisti = false;
    eski.forEach((t) => {
      if (!t || !t.isim) return; const id = 'tema-' + slug(t.isim);
      if (D.kavramlar[id]) return;
      const k = yeniKavram(t.isim, t.emoji || '🧩'); k.id = id; k.kelimeler = (t.anahtar || []).slice(); k.kitapRefs = (t.kaynaklar || []).slice(); k.gocKaynak = 'tema';
      D.kavramlar[id] = k; degisti = true;
    });
    if (degisti) yaz();
  }

  // ── Âyet verisi (yalnız kullanıcının yüklediği Arapça + seçili meal) ──
  const arCache = {};
  function ayetMetni(s, a) {
    let ar = '', meal = '';
    try {
      if (!arCache[s]) { const l = _ozelArapcaGetir(s) || []; const m = {}; l.forEach((x) => { m[x.verse] = x.arabic; }); arCache[s] = m; }
      ar = arCache[s][a] || '';
    } catch (e) {}
    try { const is = _seciliMealYazariGetir(); const v = is ? _ozelCeviriGetir(is, s, a) : null; meal = v ? v.text : ''; } catch (e) {}
    return { ar, meal };
  }
  const ayetAd = (key) => { const [s, a] = parca(key); return sureAd(s) + ' ' + s + ':' + a; };
  const ayetAc = (key) => { const [s, a] = parca(key); try { ayetDetayAc(s, a); } catch (e) {} };
  function ayetCoz(str) { // "2:153-157, 3:200" → ["2:153",…]
    const o = []; String(str || '').replace(/(\d{1,3})\s*[:.\/]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g, (m, s, a, b) => {
      s = +s; a = +a; b = b ? +b : a;
      if (s >= 1 && s <= 114 && a >= 1 && b >= a && SURELER[s - 1] && b <= SURELER[s - 1].ayet) for (let i = a; i <= Math.min(b, a + 300); i++) o.push(key2(s, i));
      return m;
    }); return o;
  }

  // ── Kök indeksi ─────────────────────────────────────────────
  let KOK = null;
  const arSade = (s) => String(s || '').replace(/[ً-ٰٟۖ-ۭـ]/g, '').trim();
  function kokIndeksi() {
    if (KOK) return KOK;
    const map = {};
    if (typeof KELIME_MEALI_VERI !== 'undefined') {
      Object.keys(KELIME_MEALI_VERI).forEach((key) => KELIME_MEALI_VERI[key].forEach((w) => {
        if (!w.rr) return; const r = map[w.rr] || (map[w.rr] = { kok: w.rr, rm: w.rm || '', ayet: {}, anlam: new Set() });
        (r.ayet[key] || (r.ayet[key] = [])).push({ a: w.a, m: w.m || '' }); if (w.m && r.anlam.size < 40) r.anlam.add(w.m.toLocaleLowerCase('tr'));
      }));
    }
    const liste = Object.values(map).map((r) => { r.say = Object.keys(r.ayet).length; r.anlamMetin = (r.rm + ' ' + [...r.anlam].join(' ')).toLocaleLowerCase('tr'); return r; });
    return (KOK = { map, liste });
  }
  function kokAra(q) {
    q = String(q || '').trim(); if (!q) return [];
    const I = kokIndeksi();
    if (/[؀-ۿ]/.test(q)) { const a = arSade(q).replace(/\s+/g, ''); return I.liste.filter((r) => r.kok === a || r.kok.startsWith(a)).sort((x, y) => y.say - x.say).slice(0, 12); }
    const t = q.toLocaleLowerCase('tr');
    return I.liste.filter((r) => r.anlamMetin.includes(t)).sort((x, y) => (y.rm.toLocaleLowerCase('tr').includes(t) ? 1 : 0) - (x.rm.toLocaleLowerCase('tr').includes(t) ? 1 : 0) || y.say - x.say).slice(0, 12);
  }
  const kokKelimeleri = (k, key) => { const w = (typeof KELIME_MEALI_VERI !== 'undefined' && KELIME_MEALI_VERI[key]) || []; return w.filter((x) => x.rr && k.kokler.includes(x.rr)); };

  // ── Küçük yardımcılar ───────────────────────────────────────
  function kapaninca(S, f) { const g = new MutationObserver(() => { if (!S.ov.isConnected) { g.disconnect(); try { f(); } catch (e) {} } }); g.observe(document.body, { childList: true }); }
  function chip(t, cls, f) { const b = el(f ? 'button' : 'span', 'kv-chip' + (cls ? ' ' + cls : ''), t); if (f) b.onclick = f; return b; }
  function ilerleme(k) { const t = tumAyetler(k), set = new Set(k.okunan || []); const n = t.filter((x) => set.has(x)).length; return { n, t: t.length, y: t.length ? Math.round(n * 100 / t.length) : 0 }; }
  function bar(y) { const w = el('div', 'kv-bar'); const d = el('div', 'kv-bar-dolu'); d.style.width = y + '%'; w.appendChild(d); return w; }
  function ayetChipleri(keys) { keys = [].concat(...keys.map((x) => ayetCoz(x))); const w = el('div', 'kv-chip-satir'); keys.slice(0, 12).forEach((x) => w.appendChild(chip(ayetAd(x), 'kv-chip-ayet', () => ayetAc(x)))); if (keys.length > 12) w.appendChild(chip('+' + (keys.length - 12), '')); return w; }

  // ════════════════════════════════════════════════════════════
  //  ANA EKRAN (Kavramlar sekmesi = eski Temalar ekranı)
  // ════════════════════════════════════════════════════════════
  let hubArama = '';
  function hub() {
    const wrap = document.getElementById('temalar-ic'); if (!wrap) return;
    gocEt(); wrap.innerHTML = '';
    const ust = el('div', 'kv-hub-ust');
    const bas = el('div'); bas.appendChild(el('div', 'kv-hub-baslik', '🧩 Kavram Tefsiri')); bas.appendChild(el('div', 'kv-hub-alt', 'Bir konuyu âyet, hadis, tefsir ve kitap pasajlarıyla topla; kendi tefsirini yaz.'));
    ust.appendChild(bas); const yeni = el('button', 'kv-btn kv-btn-vurgu', '＋ Yeni'); yeni.onclick = () => yeniKavramFormu(); ust.appendChild(yeni); wrap.appendChild(ust);
    const ara = el('input', 'kb-input'); ara.placeholder = '🔍 Kavramlarda ara…'; ara.value = hubArama; wrap.appendChild(ara);
    const kutu = el('div', 'kv-grid'); wrap.appendChild(kutu);
    const durum = el('div', 'kv-senkron', durumYazisi); durum.id = 'kv-senkron'; wrap.appendChild(durum);
    const ciz = () => {
      kutu.innerHTML = ''; const q = hubArama.trim().toLocaleLowerCase('tr');
      const l = canli().filter((k) => !q || (k.ad + ' ' + (k.kelimeler || []).join(' ')).toLocaleLowerCase('tr').includes(q)).sort((a, b) => (b.g || 0) - (a.g || 0));
      if (!canli().length) {
        const b = el('div', 'kv-bos'); b.appendChild(el('div', 'kv-bos-e', '🧩')); b.appendChild(el('div', 'kv-bos-t', 'İlk kavramını başlat'));
        b.appendChild(el('div', 'kut-yardim', 'Bir kavram seç; kökünden tüm âyetleri bulup toplayalım.'));
        const c = el('div', 'kv-chip-satir kv-merkez'); BASLANGIC.forEach(([ad, em]) => c.appendChild(chip(em + ' ' + ad, 'kv-chip-buyuk', () => hizliBaslat(ad, em)))); b.appendChild(c); kutu.appendChild(b); return;
      }
      if (!l.length) { kutu.appendChild(el('div', 'kut-yardim', 'Eşleşen kavram yok.')); return; }
      l.forEach((k) => {
        const p = ilerleme(k); const c = el('button', 'kv-kart');
        c.appendChild(el('div', 'kv-kart-e', k.emoji || '🧩')); c.appendChild(el('div', 'kv-kart-ad', k.ad));
        const kok = (k.kokler || []).join(' · ');
        c.appendChild(el('div', 'kv-kart-alt', tumAyetler(k).length + ' âyet' + (kok ? ' · ' + kok : '')));
        if (p.t) { c.appendChild(bar(p.y)); c.appendChild(el('div', 'kv-kart-alt', '%' + p.y + ' okundu')); }
        c.onclick = () => kavramAc(k.id); kutu.appendChild(c);
      });
    };
    ara.oninput = () => { hubArama = ara.value; ciz(); }; ciz();
  }
  function hizliBaslat(ad, em) { const k = yeniKavram(ad, em); kaydet(k); hub(); const c = kavramAc(k.id, 'ayetler'); setTimeout(() => kokTara(k, ad, () => c && c.yenile()), 350); }
  function yeniKavramFormu() {
    const S = KA().sayfa('🧩 Yeni kavram'); const g = S.govde;
    const ad = el('input', 'kb-input'); ad.placeholder = 'Kavram adı (ör. Sabır, Namaz, Hac)'; g.appendChild(ad);
    let em = '🧩'; const es = el('div', 'kv-chip-satir'); const ciz = () => { es.innerHTML = ''; EMOJILER.forEach((x) => es.appendChild(chip(x, 'kv-emoji' + (em === x ? ' sec' : ''), () => { em = x; ciz(); }))); }; ciz(); g.appendChild(es);
    const b = el('button', 'kv-btn kv-btn-vurgu', '✓ Oluştur ve kökünden âyet bul');
    b.onclick = () => { const a = ad.value.trim(); if (!a) return; S.kapat(); hizliBaslat(a, em); }; g.appendChild(b);
    ad.onkeydown = (e) => { if (e.key === 'Enter') b.click(); };
  }

  // ════════════════════════════════════════════════════════════
  //  KÖK TARAMASI
  // ════════════════════════════════════════════════════════════
  function kokTara(k, baslangic, bitince) {
    const S = KA().sayfa('🔎 Kökten âyet bul · ' + k.ad, true); const g = S.govde;
    const girdi = el('input', 'kb-input'); girdi.placeholder = 'Türkçe (sabır) ya da Arapça kök (صبر)…'; girdi.value = baslangic || k.ad; g.appendChild(girdi);
    const adaylar = el('div', 'kv-chip-satir'); g.appendChild(adaylar);
    const alan = el('div'); g.appendChild(alan);
    let secilenKok = null, secili = new Set(), hedef = 'genel', limit = 60;
    function adayCiz() {
      adaylar.innerHTML = ''; const l = kokAra(girdi.value);
      if (!l.length) adaylar.appendChild(el('div', 'kut-yardim', 'Eşleşen kök bulunamadı. Başka bir sözcük ya da Arapça kök dene.'));
      l.forEach((r) => adaylar.appendChild(chip(r.kok + ' · ' + kisalt(r.rm, 28) + ' · ' + r.say + ' âyet', 'kv-chip-kok' + (secilenKok === r.kok ? ' sec' : ''), () => { secilenKok = r.kok; secili = new Set(); limit = 60; adayCiz(); listeCiz(); })));
    }
    function listeCiz() {
      alan.innerHTML = ''; if (!secilenKok) return;
      const r = kokIndeksi().map[secilenKok]; const mevcut = new Set(tumAyetler(k));
      const keys = sirala(Object.keys(r.ayet)); const yeniler = keys.filter((x) => !mevcut.has(x));
      alan.appendChild(el('div', 'kv-bolum', 'Kök ' + r.kok + ' — ' + r.say + ' âyet' + (yeniler.length !== keys.length ? ' (' + (keys.length - yeniler.length) + ' tanesi zaten ekli)' : '')));
      const ctl = el('div', 'kv-form-satir');
      const sel = el('select', 'kv-sel'); k.basliklar.forEach((b) => { const o = el('option', '', b.ad); o.value = b.id; if (b.id === hedef) o.selected = true; sel.appendChild(o); }); const yo = el('option', '', '＋ Yeni başlık…'); yo.value = '__yeni'; sel.appendChild(yo);
      sel.onchange = () => { if (sel.value === '__yeni') { const a = prompt('Yeni başlık adı:'); if (a && a.trim()) { const b = { id: yeniId('b'), ad: a.trim(), ayetler: [] }; k.basliklar.push(b); kaydet(k); hedef = b.id; } listeCiz(); } else hedef = sel.value; };
      ctl.appendChild(el('span', 'kv-etk', 'Başlık:')); ctl.appendChild(sel); alan.appendChild(ctl);
      const tum = el('div', 'kv-form-satir');
      const hep = el('button', 'kv-btn', 'Hepsini seç'); hep.onclick = () => { yeniler.forEach((x) => secili.add(x)); listeCiz(); };
      const tem = el('button', 'kv-btn', 'Temizle'); tem.onclick = () => { secili = new Set(); listeCiz(); };
      tum.appendChild(hep); tum.appendChild(tem); alan.appendChild(tum);
      const liste = el('div', 'kv-kok-liste'); alan.appendChild(liste);
      keys.slice(0, limit).forEach((x) => {
        const ekli = mevcut.has(x); const s = el('label', 'kv-kok-satir' + (ekli ? ' ekli' : ''));
        const cb = el('input'); cb.type = 'checkbox'; cb.checked = ekli || secili.has(x); cb.disabled = ekli;
        cb.onchange = () => { if (cb.checked) secili.add(x); else secili.delete(x); say.textContent = 'Seçilenleri ekle (' + secili.size + ')'; };
        const ic = el('div', 'kv-kok-ic'); ic.appendChild(el('div', 'kv-kok-ad', ayetAd(x) + (ekli ? ' · ✓ ekli' : '')));
        const kw = el('div', 'kv-kok-kel'); r.ayet[x].forEach((w) => { const sp = el('span', 'kv-kelime'); sp.appendChild(el('span', 'kv-kelime-ar', w.a)); sp.appendChild(el('span', 'kv-kelime-tr', w.m)); kw.appendChild(sp); }); ic.appendChild(kw);
        const [ss, aa] = parca(x); const m = ayetMetni(ss, aa).meal; if (m) ic.appendChild(el('div', 'kv-kok-meal', kisalt(m, 170)));
        s.appendChild(cb); s.appendChild(ic); liste.appendChild(s);
      });
      if (keys.length > limit) { const d = el('button', 'kv-btn', 'Daha fazla göster (' + (keys.length - limit) + ')'); d.onclick = () => { limit += 80; listeCiz(); }; alan.appendChild(d); }
      const say = el('button', 'kv-btn kv-btn-vurgu kv-sabit', 'Seçilenleri ekle (' + secili.size + ')');
      say.onclick = () => {
        if (!secili.size) { toast('Önce âyet seçin.'); return; }
        const b = k.basliklar.find((x) => x.id === hedef) || k.basliklar[0]; const var_ = new Set(tumAyetler(k));
        sirala([...secili]).forEach((x) => { if (!var_.has(x)) b.ayetler.push(x); });
        if (!k.kokler.includes(secilenKok)) k.kokler.push(secilenKok);
        kaydet(k); toast(secili.size + ' âyet eklendi'); secili = new Set(); listeCiz(); if (bitince) bitince();
      };
      alan.appendChild(say);
    }
    girdi.oninput = () => { clearTimeout(girdi._t); girdi._t = setTimeout(adayCiz, 200); };
    adayCiz(); const ilk = kokAra(girdi.value)[0]; if (ilk) { secilenKok = ilk.kok; adayCiz(); listeCiz(); }
    kapaninca(S, () => { if (bitince) bitince(); });
  }

  // ════════════════════════════════════════════════════════════
  //  KAVRAM SAYFASI
  // ════════════════════════════════════════════════════════════
  function kavramAc(id, sekme) {
    const k = kavramBul(id); if (!k || !KA()) return;
    const S = KA().sayfa(k.emoji + ' ' + k.ad, true); S.ov.classList.add('kv-ov');
    const g = S.govde; let sek = sekme || 'ozet';
    const okuB = el('button', 'kb-mini', '📕 Kitap gibi oku'); okuB.onclick = () => okuAc(k); S.ek.appendChild(okuB);
    const tabs = el('div', 'kv-sekmeler'); g.appendChild(tabs); const govde = el('div', 'kv-govde'); g.appendChild(govde);
    const ctx = { k, S, yenile: () => ciz(), sekmeGit: (x) => { sek = x; ciz(); } };
    function ciz() {
      tabs.innerHTML = ''; SEKMELER.forEach(([kod, ad]) => { const b = el('button', 'kv-sekme' + (sek === kod ? ' sec' : ''), ad); b.onclick = () => { sek = kod; ciz(); }; tabs.appendChild(b); });
      const sk = govde.scrollTop; govde.innerHTML = '';
      ({ ozet: tabOzet, ayetler: tabAyetler, hadis: tabHadis, tefsir: tabTefsir, kitap: tabKitap, not: tabNot, metin: tabMetin })[sek](ctx, govde);
      govde.scrollTop = sk;
    }
    ciz(); kapaninca(S, () => { if (document.getElementById('temalar-ic') && document.getElementById('screen-temalar').classList.contains('active')) hub(); });
    return ctx;
  }

  // ── Özet ────────────────────────────────────────────────────
  function tabOzet(ctx, w) {
    const k = ctx.k; const keys = tumAyetler(k); const p = ilerleme(k);
    const ust = el('div', 'kv-ozet-ust');
    const ad = el('input', 'kb-input'); ad.value = k.ad; ad.onchange = () => { if (ad.value.trim()) { k.ad = ad.value.trim(); kaydet(k); ctx.S.baslikEl.textContent = k.emoji + ' ' + k.ad; } };
    ust.appendChild(ad); w.appendChild(ust);
    w.appendChild(el('div', 'kv-bolum', '📝 Tanım'));
    const t = el('textarea', 'kb-input kv-metin-kutu'); t.rows = 3; t.placeholder = 'Kavramı kendi cümlenle tanımla…'; t.value = k.tanim || ''; t.onchange = () => { k.tanim = t.value; kaydet(k); }; w.appendChild(t);

    w.appendChild(el('div', 'kv-bolum', '🌱 Kökler ve anahtar kelimeler'));
    const kc = el('div', 'kv-chip-satir');
    k.kokler.forEach((r) => { const rr = kokIndeksi().map[r]; kc.appendChild(chip(r + (rr ? ' · ' + kisalt(rr.rm, 20) : '') + ' ✕', 'kv-chip-kok', () => { k.kokler = k.kokler.filter((x) => x !== r); kaydet(k); ctx.yenile(); })); });
    (k.kelimeler || []).forEach((x) => kc.appendChild(chip(x + ' ✕', '', () => { k.kelimeler = k.kelimeler.filter((y) => y !== x); kaydet(k); ctx.yenile(); })));
    kc.appendChild(chip('＋ Kök tara', 'kv-chip-ekle', () => kokTara(k, k.ad, () => ctx.yenile())));
    kc.appendChild(chip('＋ Anahtar kelime', 'kv-chip-ekle', () => { const a = prompt('Anahtar kelime (kitap/hadis aramasında kullanılır):'); if (a && a.trim()) { k.kelimeler = (k.kelimeler || []).concat([a.trim().toLocaleLowerCase('tr')]); kaydet(k); ctx.yenile(); } }));
    w.appendChild(kc);

    w.appendChild(el('div', 'kv-bolum', '🏷 Not etiketi'));
    const et = el('input', 'kb-input'); et.value = k.etiket || ''; et.placeholder = 'Kitap notlarında bu etiketle toplanır (ör. sabır)'; et.onchange = () => { k.etiket = slug(et.value); kaydet(k); }; w.appendChild(et);

    w.appendChild(el('div', 'kv-bolum', '📊 İstatistik'));
    const st = el('div', 'kv-istat');
    if (!keys.length) st.appendChild(el('div', 'kut-yardim', 'Henüz âyet yok. “Âyetler” sekmesinden kök taraması yapın.'));
    else {
      const sureler = {}; let mekki = 0, medeni = 0; keys.forEach((x) => { const s = parca(x)[0]; sureler[s] = (sureler[s] || 0) + 1; });
      Object.keys(sureler).forEach((s) => { if ((SURELER[s - 1] || {}).tip === 'Mekkî') mekki += sureler[s]; else medeni += sureler[s]; });
      const tp = mekki + medeni;
      const kutular = el('div', 'kv-istat-kutu'); [[keys.length, 'âyet'], [Object.keys(sureler).length, 'sûre'], ['%' + Math.round(mekki * 100 / tp), 'Mekkî'], ['%' + Math.round(medeni * 100 / tp), 'Medenî']].forEach(([n, a]) => { const d = el('div', 'kv-istat-k'); d.appendChild(el('div', 'kv-istat-n', String(n))); d.appendChild(el('div', 'kv-istat-a', a)); kutular.appendChild(d); }); st.appendChild(kutular);
      const nz = nuzulSirala(keys); st.appendChild(el('div', 'kv-istat-satir', '⏳ İniş sırasına göre ilk: ' + ayetAd(nz[0]) + ' · son: ' + ayetAd(nz[nz.length - 1])));
      const top = Object.keys(sureler).sort((a, b) => sureler[b] - sureler[a]).slice(0, 6); const mx = sureler[top[0]];
      top.forEach((s) => { const r = el('div', 'kv-sure-bar'); r.appendChild(el('span', 'kv-sure-ad', sureAd(+s))); const b = el('div', 'kv-bar'); const d = el('div', 'kv-bar-dolu'); d.style.width = Math.round(sureler[s] * 100 / mx) + '%'; b.appendChild(d); r.appendChild(b); r.appendChild(el('span', 'kv-sure-n', String(sureler[s]))); st.appendChild(r); });
    }
    w.appendChild(st);
    if (keys.length) { w.appendChild(el('div', 'kv-bolum', '✅ Okuma ilerlemesi')); const pw = el('div'); pw.appendChild(bar(p.y)); pw.appendChild(el('div', 'kv-kart-alt', p.n + ' / ' + p.t + ' âyet okundu')); w.appendChild(pw); }

    w.appendChild(el('div', 'kv-bolum', '🔗 İlişkili kavramlar'));
    const diger = canli().filter((x) => x.id !== k.id); const ic = el('div', 'kv-chip-satir');
    if (!diger.length) ic.appendChild(el('div', 'kut-yardim', 'Başka kavram oluşturunca burada bağlayabilirsiniz (ör. Sabır ↔ Şükür).'));
    diger.forEach((x) => { const b = (k.baglantili || []).includes(x.id); ic.appendChild(chip((b ? '✓ ' : '') + x.emoji + ' ' + x.ad, b ? 'sec' : '', () => {
      const bagla = !b; const duz = (a, y, ekle) => { const s = new Set(a.baglantili || []); if (ekle) s.add(y); else s.delete(y); a.baglantili = [...s]; kaydet(a); };
      duz(k, x.id, bagla); duz(x, k.id, bagla); ctx.yenile(); })); });
    w.appendChild(ic);
    const ilkB = (k.baglantili || []).map(kavramBul).filter(Boolean); if (ilkB.length) { const gec = el('div', 'kv-chip-satir'); ilkB.forEach((x) => gec.appendChild(chip('→ ' + x.emoji + ' ' + x.ad, 'kv-chip-git', () => { ctx.S.kapat(); setTimeout(() => kavramAc(x.id), 60); }))); w.appendChild(gec); }

    const al = el('div', 'kv-alt-eylem');
    const yz = el('button', 'kv-btn kv-btn-vurgu', '🤖 Taslak çıkar'); yz.onclick = () => taslakAc(k, () => ctx.yenile()); al.appendChild(yz);
    const md = el('button', 'kv-btn', '⬇ Markdown'); md.onclick = async () => { const b = await belgeUret(k, okuSecenek()); indir(k.ad + '.md', b.md, 'text/markdown'); }; al.appendChild(md);
    const sil = el('button', 'kv-btn kv-sil', '🗑 Sil'); sil.onclick = () => { if (!confirm('“' + k.ad + '” kavramı silinsin mi? (Kaynak kitap ve notlara dokunulmaz.)')) return; k.sil = true; k.g = Date.now(); D.kavramlar[k.id] = k; yaz(); ctx.S.kapat(); hub(); }; al.appendChild(sil);
    w.appendChild(al);
  }

  // ── Âyetler ─────────────────────────────────────────────────
  function ayetKarti(ctx, b, x) {
    const k = ctx.k; const [s, a] = parca(x); const m = ayetMetni(s, a);
    const kart = el('div', 'kv-ayet'); const ust = el('div', 'kv-ayet-ust');
    const okundu = (k.okunan || []).includes(x);
    const ad = el('button', 'kv-ayet-ad', ayetAd(x)); ad.onclick = () => ayetAc(x); ust.appendChild(ad);
    const ok = el('button', 'kv-mini' + (okundu ? ' ok' : ''), okundu ? '✅' : '☑'); ok.title = 'Okundu';
    ok.onclick = () => { const l = new Set(k.okunan || []); if (l.has(x)) l.delete(x); else l.add(x); k.okunan = [...l]; kaydet(k); ctx.yenile(); }; ust.appendChild(ok); kart.appendChild(ust);
    const kw = kokKelimeleri(k, x); if (kw.length) { const kk = el('div', 'kv-kok-kel'); kw.forEach((w) => { const sp = el('span', 'kv-kelime'); sp.appendChild(el('span', 'kv-kelime-ar', w.a)); sp.appendChild(el('span', 'kv-kelime-tr', w.m)); kk.appendChild(sp); }); kart.appendChild(kk); }
    if (m.ar) { const ar = el('div', 'kv-ar', m.ar); ar.dir = 'rtl'; ar.lang = 'ar'; kart.appendChild(ar); }
    if (m.meal) kart.appendChild(el('div', 'kv-meal', m.meal)); else if (!m.ar) kart.appendChild(el('div', 'kut-yardim', 'Meal/Arapça yüklenmemiş; âyet ekranından açabilirsiniz.'));
    const alt = el('div', 'kv-ayet-alt');
    const sel = el('select', 'kv-sel'); k.basliklar.forEach((bb) => { const o = el('option', '', '📂 ' + bb.ad); o.value = bb.id; if (bb.id === b.id) o.selected = true; sel.appendChild(o); });
    sel.onchange = () => { b.ayetler = b.ayetler.filter((y) => y !== x); const h = k.basliklar.find((y) => y.id === sel.value); if (h) h.ayetler.push(x); kaydet(k); ctx.yenile(); };
    alt.appendChild(sel);
    const cik = el('button', 'kv-mini kv-sil', '✕'); cik.title = 'Kavramdan çıkar'; cik.onclick = () => { b.ayetler = b.ayetler.filter((y) => y !== x); kaydet(k); ctx.yenile(); }; alt.appendChild(cik);
    kart.appendChild(alt); return kart;
  }
  const gosterLimit = {};
  function tabAyetler(ctx, w) {
    const k = ctx.k; const siraKip = lsOku('kv_sira', 'mushaf');
    const ar = el('div', 'kv-form-satir');
    const kb = el('button', 'kv-btn kv-btn-vurgu', '🔎 Kök taraması'); kb.onclick = () => kokTara(k, k.ad, () => ctx.yenile()); ar.appendChild(kb);
    const eb = el('button', 'kv-btn', '＋ Âyet ekle'); eb.onclick = () => { const v = prompt('Âyet ekle (ör. 2:153-157, 3:200):'); if (!v) return; const l = ayetCoz(v); if (!l.length) { toast('Geçerli âyet bulunamadı.'); return; } const var_ = new Set(tumAyetler(k)); const b = k.basliklar[0]; let n = 0; l.forEach((x) => { if (!var_.has(x)) { b.ayetler.push(x); n++; } }); kaydet(k); toast(n + ' âyet eklendi'); ctx.yenile(); }; ar.appendChild(eb);
    const bb = el('button', 'kv-btn', '＋ Başlık'); bb.onclick = () => { const a = prompt('Yeni başlık adı (ör. Sabrın emri):'); if (a && a.trim()) { k.basliklar.push({ id: yeniId('b'), ad: a.trim(), ayetler: [] }); kaydet(k); ctx.yenile(); } }; ar.appendChild(bb);
    w.appendChild(ar);
    const sr = el('div', 'kv-form-satir'); sr.appendChild(el('span', 'kv-etk', 'Sıra:'));
    [['mushaf', 'Mushaf'], ['nuzul', 'İniş sırası']].forEach(([kod, ad]) => sr.appendChild(chip(ad, siraKip === kod ? 'sec' : '', () => { lsYaz('kv_sira', kod); ctx.yenile(); }))); w.appendChild(sr);
    if (!tumAyetler(k).length) { w.appendChild(el('div', 'kut-yardim', 'Henüz âyet yok. “Kök taraması” ile kavramın kökünden bütün âyetleri bulup seçebilir ya da “Âyet ekle” ile elle girebilirsiniz.')); return; }
    k.basliklar.forEach((b) => {
      if (!b.ayetler.length && b.id === 'genel' && k.basliklar.length > 1) return;
      const kap = el('div', 'kv-baslik-kutu'); const h = el('div', 'kv-baslik-ust');
      h.appendChild(el('div', 'kv-baslik-ad', b.ad)); h.appendChild(el('span', 'kv-baslik-say', String(b.ayetler.length)));
      if (b.id !== 'genel') { const m = el('button', 'kv-mini', '✎'); m.onclick = () => { const a = prompt('Başlık adı:', b.ad); if (a && a.trim()) { b.ad = a.trim(); kaydet(k); ctx.yenile(); } }; h.appendChild(m);
        const s = el('button', 'kv-mini kv-sil', '🗑'); s.onclick = () => { if (!confirm('Başlık silinsin mi? Âyetleri “Genel”e taşınır.')) return; k.basliklar[0].ayetler.push(...b.ayetler); k.basliklar = k.basliklar.filter((y) => y.id !== b.id); kaydet(k); ctx.yenile(); }; h.appendChild(s); }
      kap.appendChild(h);
      const keys = siraKip === 'nuzul' ? nuzulSirala(b.ayetler) : sirala(b.ayetler); const lim = gosterLimit[k.id + b.id] || 30;
      keys.slice(0, lim).forEach((x) => kap.appendChild(ayetKarti(ctx, b, x)));
      if (keys.length > lim) { const d = el('button', 'kv-btn', 'Daha fazla (' + (keys.length - lim) + ')'); d.onclick = () => { gosterLimit[k.id + b.id] = lim + 40; ctx.yenile(); }; kap.appendChild(d); }
      w.appendChild(kap);
    });
  }

  // ── Hadisler ────────────────────────────────────────────────
  function hadisToplaTum(k) {
    const keys = tumAyetler(k); const KH = window.KutHadis; const hek = new Map(), nad = new Map();
    if (!KH) return { hek: [], nad: [] };
    keys.slice(0, 300).forEach((x) => {
      const [s, a] = parca(x);
      KH.hekBul(s, a).forEach((h) => { if (!hek.has(h.no)) hek.set(h.no, { h, ayetler: [] }); hek.get(h.no).ayetler.push(x); });
      KH.hadisler(s, a).forEach((g) => g.kayitlar.forEach((r) => { const id = g.alim + '|' + r.tr; if (!nad.has(id)) nad.set(id, { r, alim: g.alim, ayetler: [] }); nad.get(id).ayetler.push(x); }));
    });
    return { hek: [...hek.values()], nad: [...nad.values()] };
  }
  function tabHadis(ctx, w) {
    const k = ctx.k; const KH = window.KutHadis; if (!KH) { w.appendChild(el('div', 'kut-yardim', 'Hadis modülü yüklenemedi.')); return; }
    const yuk = el('div', 'kut-yardim', '⏳ Hadisler toplanıyor…'); w.appendChild(yuk);
    KH.hekYukle().then(() => {
      yuk.remove();
      const t = hadisToplaTum(k); const lim = { hek: 25, nad: 25, kel: 25 };
      const kelime = [k.ad].concat(k.kelimeler || []); const var_ = new Set(t.hek.map((x) => x.h.no));
      const bulunan = KH.hekTara(kelime).filter((x) => !var_.has(x.no));
      const bolum = (ad, liste, kod, yap) => {
        if (!liste.length) return; const kap = el('div'); w.appendChild(kap);
        const ciz = () => { kap.innerHTML = ''; kap.appendChild(el('div', 'kv-bolum', ad + ' (' + liste.length + ')')); liste.slice(0, lim[kod]).forEach((x, i) => kap.appendChild(yap(x, i, liste.length)));
          if (liste.length > lim[kod]) { const d = el('button', 'kv-btn', 'Daha fazla (' + (liste.length - lim[kod]) + ')'); d.onclick = () => { lim[kod] += 30; ciz(); }; kap.appendChild(d); } };
        ciz();
      };
      if (!tumAyetler(k).length && !bulunan.length) w.appendChild(el('div', 'kut-yardim', 'Hadisler, kavrama eklediğiniz âyetlerden otomatik gelir. Önce “Âyetler” sekmesinden âyet ekleyin.'));
      bolum('📘 Hadis el Kitabı · âyetlere bağlı', t.hek, 'hek', (x, i, n) => { const c = KH.hekKart(x.h, i, n); c.appendChild(ayetChipleri(x.ayetler)); return c; });
      bolum('📜 Nâdirî · âyetlere bağlı', t.nad, 'nad', (x, i, n) => { const c = KH.kart(x.r, i, n, x.alim); c.appendChild(ayetChipleri(x.ayetler)); return c; });
      bolum('🔎 Hadis el Kitabı · anahtar kelimeyle bulunan', bulunan, 'kel', (x, i, n) => { const c = KH.hekKart(x, i, n); if (x.ayetler.length) c.appendChild(ayetChipleri(x.ayetler)); return c; });
    });
  }

  // Kitap bölümü: başlık olarak eklenmişse başlığın altındaki tüm metin (bir sonraki aynı/üst seviye başlığa kadar)
  function bolumMetni(ayr, pi, sinir) {
    const P = ayr.paras, p = P[pi]; if (!p) return { baslik: '', govde: '', kesildi: false, bolum: false };
    if (p.k !== 'h') return { baslik: p.t, govde: '', kesildi: false, bolum: false };
    const hs = ayr.heads || []; const h = hs.find((x) => x.pi === pi); let son = P.length;
    if (h) { const nx = hs.find((x) => x.pi > pi && x.lv <= h.lv); if (nx) son = nx.pi; } else { for (let i = pi + 1; i < P.length; i++) if (P[i].k === 'h') { son = i; break; } }
    const out = []; let n = 0, kesildi = false;
    for (let i = pi + 1; i < son; i++) { const t = (P[i].t || '').trim(); if (!t) continue; if (n + t.length > sinir) { kesildi = true; break; } n += t.length; out.push(t); }
    return { baslik: p.t, govde: out.join('\n\n'), kesildi, bolum: true };
  }

  // ── Tefsirler ───────────────────────────────────────────────
  function nadiriAlimleri() { try { return new Set(_alimTefsirKaynaklariGetir().filter((x) => x.bicim === 'nadiri_hadis').map((x) => x.alim)); } catch (e) { return new Set(); } }
  function tefsirMetinleri(s, a) { // [{alim, metin}] — hadis-biçimli (Nâdirî) kaynaklar hariç
    const cikti = []; const ha = nadiriAlimleri(); let l = []; try { l = _alimTefsirListesiGetir(); } catch (e) {}
    l.forEach((alim) => {
      if (ha.has(alim)) return; let veri = {}; try { veri = _alimTefsirMetniGetir2(alim, s) || {}; } catch (e) {}
      for (const kk of Object.keys(veri)) {
        if (kk === '0') continue; const set = new Set(); String(kk).split(',').forEach((p) => { const m = p.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/); if (!m) return; const x = +m[1], y = m[2] ? +m[2] : x; for (let i = x; i <= Math.min(y, x + 400); i++) set.add(i); });
        if (!set.has(a)) continue; const v = veri[kk]; let metin = (typeof v === 'string' ? v : (v && v.tefsir) || '').trim(); if (typeof tefsirGovdeSec === 'function') metin = tefsirGovdeSec(alim, metin).trim(); if (metin) { cikti.push({ alim, metin, grup: kk }); break; }
      }
    });
    return cikti;
  }
  const alimAd = (a) => { try { return typeof _notIsimGoster === 'function' ? _notIsimGoster(a) : a; } catch (e) { return a; } };
  async function tefsirHazirla(sureler) { for (const s of sureler) { try { if (typeof _bellekTefsirKaynakliMi === 'function' && _bellekTefsirKaynakliMi(s)) continue; await _bellekTefsirSureHazirla(s); } catch (e) {} } }
  const alimSuz = { v: null }; // null = hepsi; yoksa seçili müfessir adları
  async function kaynaklarBekle() { for (let i = 0; i < 100 && window._kaynaklarYukleniyor; i++) await new Promise((r) => setTimeout(r, 600)); }
  function tabTefsir(ctx, w) {
    const k = ctx.k; const keys = sirala(tumAyetler(k)); if (!keys.length) { w.appendChild(el('div', 'kut-yardim', 'Önce “Âyetler” sekmesinden âyet ekleyin; her âyetin tefsir görüşleri burada toplanır.')); return; }
    const sabitSet = () => new Set((k.tefsirSabit || []).map((x) => x.alim + '|' + x.s + ':' + x.a));
    const yuk = el('div', 'kut-yardim', window._kaynaklarYukleniyor ? '⏳ Tefsir kaynakları GitHub’dan yükleniyor, lütfen bekleyin…' : '⏳ Tefsir kaynakları hazırlanıyor…'); w.appendChild(yuk);
    kaynaklarBekle().then(() => tefsirHazirla([...new Set(keys.map((x) => parca(x)[0]))])).then(() => {
      if (!yuk.isConnected) return; yuk.remove(); let sadece = false;
      const sayac = {}; const tumu = {}; keys.forEach((x) => { const [s, a] = parca(x); tefsirMetinleri(s, a).forEach((y) => { sayac[y.alim] = (sayac[y.alim] || 0) + 1; }); });
      let alimler = []; try { alimler = _alimTefsirListesiGetir().filter((a) => !nadiriAlimleri().has(a)); } catch (e) {}
      const alimBar = el('div', 'kv-chip-satir'); w.appendChild(alimBar);
      const ust = el('div', 'kv-form-satir'); const f = chip('⭐ Yalnız sabitlenenler', '', () => { sadece = !sadece; f.classList.toggle('sec', sadece); ciz(); }); ust.appendChild(f); w.appendChild(ust);
      const kap = el('div'); w.appendChild(kap);
      const secili = (a) => !alimSuz.v || alimSuz.v.includes(a);
      const barCiz = () => { alimBar.innerHTML = ''; if (!alimler.length) { alimBar.appendChild(el('div', 'kut-yardim', 'Hiç tefsir kaynağı yüklü değil. Tefsir sekmesi → ⚙️ Kaynak Ekle ile ekleyin.')); return; }
        alimBar.appendChild(chip('Hepsi', !alimSuz.v ? 'sec' : '', () => { alimSuz.v = null; barCiz(); ciz(); }));
        alimler.forEach((a) => alimBar.appendChild(chip(alimAd(a) + ' · ' + (sayac[a] || 0), (alimSuz.v && alimSuz.v.includes(a)) ? 'sec' : '', () => { const l = new Set(alimSuz.v || []); if (l.has(a)) l.delete(a); else l.add(a); alimSuz.v = l.size ? [...l] : null; barCiz(); ciz(); }))); };
      const ciz = () => {
        kap.innerHTML = ''; const sb = sabitSet(); let gosterilen = 0;
        keys.forEach((x) => {
          const [s, a] = parca(x); const l = tefsirMetinleri(s, a); const lf = l.filter((y) => secili(y.alim) && (!sadece || sb.has(y.alim + '|' + x))); if (!lf.length) return; gosterilen++;
          const d = el('details', 'kv-tefsir'); d.appendChild(el('summary', '', ayetAd(x) + ' · ' + lf.length + ' kaynak')); let dolu = false;
          d.ontoggle = () => { if (!d.open || dolu) return; dolu = true;
            lf.forEach((y) => { const c = el('div', 'kv-tefsir-kart'); const h = el('div', 'kv-tefsir-ust'); h.appendChild(el('span', 'kv-tefsir-ad', alimAd(y.alim)));
              const p = sb.has(y.alim + '|' + x); const pb = el('button', 'kv-mini' + (p ? ' ok' : ''), p ? '⭐' : '☆'); pb.title = 'Kavram tefsirine sabitle';
              pb.onclick = () => { const id = y.alim + '|' + x; if (sabitSet().has(id)) k.tefsirSabit = k.tefsirSabit.filter((z) => z.alim + '|' + z.s + ':' + z.a !== id); else k.tefsirSabit.push({ alim: y.alim, s, a }); kaydet(k); ciz(); };
              h.appendChild(pb); c.appendChild(h); const t = el('div', 'kv-tefsir-metin', kisalt(y.metin, 1400));
              c.appendChild(t); if (y.metin.length > 1400) { const dd = el('button', 'kv-link', 'Tamamını göster'); dd.onclick = () => { t.textContent = y.metin; dd.remove(); }; c.appendChild(dd); } d.appendChild(c); });
          };
          kap.appendChild(d);
        });
        if (!gosterilen) kap.appendChild(el('div', 'kut-yardim', sadece ? 'Henüz sabitlediğiniz tefsir yok.' : 'Seçili kaynaklarda bu âyetler için tefsir bulunamadı.'));
      }; barCiz(); ciz();
    });
  }

  // ── Kitaplar ────────────────────────────────────────────────
  function tabKitap(ctx, w) {
    const k = ctx.k;
    const ar = el('div', 'kv-form-satir');
    const ekle = el('button', 'kv-btn kv-btn-vurgu', '🔍 Kitaplarda ara ve ekle');
    ekle.onclick = () => KA().konuSec({ baslik: '📚 ' + k.ad + ' — kitaptan pasaj ekle', baslangic: (k.kelimeler && k.kelimeler[0]) || k.ad, ekle: (ref) => { if ((k.kitapRefs || []).some((x) => x.url === ref.url && x.pi === ref.pi && (x.sel || '') === (ref.sel || ''))) return false; k.kitapRefs.push(ref); kaydet(k); setTimeout(() => ctx.yenile(), 50); return true; } });
    ar.appendChild(ekle); w.appendChild(ar);
    const kay = el('div'); w.appendChild(kay);
    w.appendChild(el('div', 'kv-bolum', '📌 Kavrama eklenen pasajlar (' + (k.kitapRefs || []).length + ')'));
    const l = el('div'); w.appendChild(l);
    if (!(k.kitapRefs || []).length) l.appendChild(el('div', 'kut-yardim', 'Henüz pasaj yok. Arama yapıp ekleyin ya da aşağıdan âyetlere atıf yapan pasajları görün.'));
    else KA().gruplu(l, k.kitapRefs.map((ref) => ({ ref, islemler: [{ t: '✕ Çıkar', f: () => { k.kitapRefs = k.kitapRefs.filter((x) => x !== ref); kaydet(k); ctx.yenile(); } }] })), true);
    w.appendChild(el('div', 'kv-bolum', '📍 Bu âyetlere atıf yapan pasajlar'));
    const at = el('div'); w.appendChild(at); const keys = tumAyetler(k);
    if (!keys.length) { at.appendChild(el('div', 'kut-yardim', 'Âyet ekledikçe, kitaplarınızda bu âyetlere atıf yapan paragraflar burada çıkar.')); return; }
    const yb = el('button', 'kv-btn', 'Atıf yapan pasajları bul'); at.appendChild(yb);
    yb.onclick = async () => {
      yb.textContent = '⏳ Taranıyor…'; yb.disabled = true; const toplam = new Map();
      keys.slice(0, 120).forEach((x) => { const [s, a] = parca(x); try { KA().tersBul(s, a, a).forEach((h) => { const an = h.url + '#' + h.pi; if (!toplam.has(an)) toplam.set(an, { url: h.url, kad: h.kad, pi: h.pi, say: 0 }); toplam.get(an).say++; }); } catch (e) {} });
      const sirali = [...toplam.values()].sort((a, b) => b.say - a.say).slice(0, 40); const ogeler = [];
      for (const h of sirali) { const v = await KA().kitapYukle(h.url); if (!v) continue; const ref = KA().refYap(h.url, h.kad, v.ayr, h.pi); const var_ = (k.kitapRefs || []).some((x) => x.url === ref.url && x.pi === ref.pi && (x.sel || '') === (ref.sel || ''));
        ogeler.push({ ref, rozet: h.say + ' âyet', islemler: [{ t: var_ ? '✓ Ekli' : '＋ Ekle', f: (b) => { if ((k.kitapRefs || []).some((x) => x.url === ref.url && x.pi === ref.pi && (x.sel || '') === (ref.sel || ''))) return; k.kitapRefs.push(ref); kaydet(k); b.textContent = '✓ Ekli'; } }] }); }
      at.innerHTML = ''; if (!ogeler.length) at.appendChild(el('div', 'kut-yardim', 'Kitaplarınızda bu âyetlere atıf yapan paragraf bulunamadı (kitaplar cihazda yüklü olmalı).')); else KA().gruplu(at, ogeler, false);
    };
  }

  // ── Notlarım ────────────────────────────────────────────────
  function tabNot(ctx, w) {
    const k = ctx.k; const N = window.KutNot; if (!N) { w.appendChild(el('div', 'kut-yardim', 'Not modülü yüklenemedi.')); return; }
    const harita = new Map(); if (k.etiket) N.etiketNotlari(k.etiket).forEach((n) => harita.set(n.id, n));
    tumAyetler(k).slice(0, 300).forEach((x) => { const [s, a] = parca(x); N.ayetNotlari(s, a).forEach((n) => harita.set(n.id, n)); });
    w.appendChild(el('div', 'kut-yardim', 'Kitap okurken bir nota #' + (k.etiket || 'etiket') + ' etiketi yazarsanız ya da notu bu kavramın âyetlerine bağlarsanız burada toplanır.'));
    const l = [...harita.values()].sort((a, b) => b.ts - a.ts);
    w.appendChild(el('div', 'kv-bolum', '📝 ' + l.length + ' not'));
    l.forEach((n) => w.appendChild(N.notKarti(n, () => KA().ovKaldir())));
  }

  // ── Metnim ──────────────────────────────────────────────────
  function mdKutu(kap, metin) { // basit markdown (başlık, madde, kalın, alıntı)
    String(metin || '').split('\n').forEach((s) => {
      if (/^#{1,3}\s/.test(s)) kap.appendChild(el('div', 'kv-md-h', s.replace(/^#+\s*/, '')));
      else if (/^[-*]\s/.test(s)) { const d = el('div', 'kv-md-m'); satirIci(d, s.replace(/^[-*]\s*/, '')); kap.appendChild(d); }
      else if (/^>\s?/.test(s)) kap.appendChild(el('blockquote', 'kv-md-q', s.replace(/^>\s?/, '')));
      else if (s.trim()) { const d = el('div', 'kv-md-p'); satirIci(d, s); kap.appendChild(d); }
    });
  }
  function satirIci(d, s) { const re = /\*\*(.+?)\*\*/g; let son = 0, m; while ((m = re.exec(s)) !== null) { if (m.index > son) d.appendChild(document.createTextNode(s.slice(son, m.index))); d.appendChild(el('strong', '', m[1])); son = m.index + m[0].length; } if (son < s.length) d.appendChild(document.createTextNode(s.slice(son))); }
  function tabMetin(ctx, w) {
    const k = ctx.k; let onizle = false;
    const tb = el('div', 'kv-form-satir');
    const ta = el('textarea', 'kb-input kv-yazi'); ta.rows = 14; ta.placeholder = 'Kendi tefsirini yaz…\n\n## Başlık\n- madde\n**kalın**\n> alıntı'; ta.value = k.metin || '';
    const ekle = (on, son) => { const a = ta.selectionStart, b = ta.selectionEnd; const secim = ta.value.slice(a, b); ta.value = ta.value.slice(0, a) + on + secim + (son || '') + ta.value.slice(b); ta.focus(); ta.dispatchEvent(new Event('input')); };
    [['## Başlık', () => ekle('\n## ')], ['• Madde', () => ekle('\n- ')], ['B', () => ekle('**', '**')], ['❝ Alıntı', () => ekle('\n> ')], ['📖 Âyet', () => { const v = prompt('Âyet (ör. 2:153):'); const l = v ? ayetCoz(v) : []; if (l.length) ekle('\n> ' + (ayetMetni(...parca(l[0])).meal || '') + ' (' + ayetAd(l[0]) + ')\n'); }]].forEach(([ad, f]) => { const b = el('button', 'kv-mini', ad); b.onclick = f; tb.appendChild(b); });
    const on = el('button', 'kv-mini', '👁 Önizle'); tb.appendChild(on); w.appendChild(tb);
    const prev = el('div', 'kv-md'); prev.style.display = 'none'; w.appendChild(ta); w.appendChild(prev);
    ta.oninput = () => { k.metin = ta.value; clearTimeout(ta._t); ta._t = setTimeout(() => kaydet(k), 600); };
    on.onclick = () => { onizle = !onizle; ta.style.display = onizle ? 'none' : ''; prev.style.display = onizle ? '' : 'none'; on.textContent = onizle ? '✎ Düzenle' : '👁 Önizle'; prev.innerHTML = ''; if (onizle) mdKutu(prev, ta.value); };
    w.appendChild(el('div', 'kut-yardim', 'Yazdıkların otomatik kaydedilir ve “Kitap gibi oku”da en sonda yer alır.'));
  }

  // ════════════════════════════════════════════════════════════
  //  KİTAP GİBİ OKU + DIŞA AKTARMA
  // ════════════════════════════════════════════════════════════
  const okuSecenek = () => Object.assign({ arapca: true, meal: true, hadis: true, tefsir: true, pasaj: true, metin: true }, lsOku('kv_oku_sec', {}));
  async function belgeUret(k, o) {
    const blok = []; const md = []; const keys = (lsOku('kv_sira', 'mushaf') === 'nuzul' ? nuzulSirala : sirala);
    blok.push({ t: 'h1', v: k.emoji + ' ' + k.ad }); md.push('# ' + k.ad + '\n');
    if (k.tanim) { blok.push({ t: 'p', v: k.tanim }); md.push(k.tanim + '\n'); }
    if (k.kokler.length) { const v = 'Kökler: ' + k.kokler.map((r) => r + (kokIndeksi().map[r] ? ' (' + kokIndeksi().map[r].rm + ')' : '')).join(' · '); blok.push({ t: 'not', v }); md.push('*' + v + '*\n'); }
    k.basliklar.forEach((b) => {
      if (!b.ayetler.length) return; blok.push({ t: 'h2', v: b.ad }); md.push('## ' + b.ad + '\n');
      keys(b.ayetler).forEach((x) => { const [s, a] = parca(x); const m = ayetMetni(s, a);
        if (o.arapca && m.ar) { blok.push({ t: 'ar', v: m.ar }); md.push(m.ar + '\n'); }
        if (o.meal && m.meal) { blok.push({ t: 'ayet', v: m.meal, k: ayetAd(x) }); md.push('> ' + m.meal + ' — *' + ayetAd(x) + '*\n'); }
        else if (!m.meal && !(o.arapca && m.ar)) { blok.push({ t: 'ayet', v: '', k: ayetAd(x) }); md.push('- ' + ayetAd(x) + '\n'); } });
    });
    if (o.hadis && window.KutHadis) { try { await window.KutHadis.hekYukle(); const t = hadisToplaTum(k); if (t.hek.length || t.nad.length) { blok.push({ t: 'h2', v: 'Hadisler' }); md.push('## Hadisler\n');
      t.hek.slice(0, 60).forEach((x) => { blok.push({ t: 'hadis', v: x.h.metin, k: 'Hadis el Kitabı · Hadis ' + x.h.no }); md.push('> ' + x.h.metin + ' — *Hadis el Kitabı, Hadis ' + x.h.no + '*\n'); });
      t.nad.slice(0, 40).forEach((x) => { const v = [x.r.tr].join(''); blok.push({ t: 'hadis', v, k: alimAd(x.alim) + (x.r.kaynak ? ' · ' + x.r.kaynak : '') }); md.push('> ' + v + ' — *' + alimAd(x.alim) + '*\n'); }); } } catch (e) {} }
    if (o.tefsir && (k.tefsirSabit || []).length) { await tefsirHazirla([...new Set(k.tefsirSabit.map((x) => x.s))]); blok.push({ t: 'h2', v: 'Müfessirlerden' }); md.push('## Müfessirlerden\n');
      k.tefsirSabit.forEach((x) => { const y = tefsirMetinleri(x.s, x.a).find((z) => z.alim === x.alim); if (!y) return; const ad = alimAd(x.alim) + ' · ' + ayetAd(key2(x.s, x.a)); blok.push({ t: 'alinti', v: kisalt(y.metin, 1500), k: ad }); md.push('> ' + kisalt(y.metin, 1500).replace(/\n+/g, ' ') + ' — *' + ad + '*\n'); }); }
    if (o.pasaj && (k.kitapRefs || []).length) { blok.push({ t: 'h2', v: 'Kitaplardan' }); md.push('## Kitaplardan\n');
      for (const ref of k.kitapRefs.slice(0, 60)) { try { const c = await KA().refCoz(ref); if (c.yok) continue; const ad = ref.kad + (ref.yol ? ' › ' + ref.yol : '');
        if (ref.sel) { blok.push({ t: 'bolum', b: kisalt(ref.sel, 80), v: ref.sel, k: ad, ref }); md.push('> ' + ref.sel.replace(/\n+/g, ' ') + ' — *' + ad + '*\n'); continue; }
        const bm = bolumMetni(c.ayr, c.pi, 20000); const v = bm.govde || (bm.baslik && bm.baslik.length > 80 ? bm.baslik : '');
        blok.push({ t: 'bolum', b: kisalt(bm.baslik, 120), v, k: ad, ref, kesildi: bm.kesildi });
        md.push('### ' + bm.baslik + '\n*' + ad + '*\n\n' + (v ? v.split(/\n\n+/).map((x) => '> ' + x).join('\n>\n') + (bm.kesildi ? '\n>\n> …(devamı kitapta)' : '') + '\n' : '')); } catch (e) {} } }
    if (o.metin && k.metin && k.metin.trim()) { blok.push({ t: 'h2', v: 'Benim tefsirim' }); blok.push({ t: 'md', v: k.metin }); md.push('## Benim tefsirim\n\n' + k.metin + '\n'); }
    return { blok, md: md.join('\n') };
  }
  function belgeCiz(kap, blok) {
    kap.innerHTML = '';
    blok.forEach((b) => {
      if (b.t === 'h1') kap.appendChild(el('h1', 'kv-d-h1', b.v)); else if (b.t === 'h2') kap.appendChild(el('h2', 'kv-d-h2', b.v));
      else if (b.t === 'p') kap.appendChild(el('p', 'kv-d-p', b.v)); else if (b.t === 'not') kap.appendChild(el('div', 'kv-d-not', b.v));
      else if (b.t === 'ar') { const d = el('div', 'kv-d-ar', b.v); d.dir = 'rtl'; d.lang = 'ar'; kap.appendChild(d); }
      else if (b.t === 'ayet') { const d = el('blockquote', 'kv-d-ayet'); if (b.v) d.appendChild(el('div', '', b.v)); d.appendChild(el('cite', '', b.k)); kap.appendChild(d); }
      else if (b.t === 'hadis' || b.t === 'alinti') { const d = el('blockquote', 'kv-d-' + b.t); d.appendChild(el('div', '', b.v)); d.appendChild(el('cite', '', b.k)); kap.appendChild(d); }
      else if (b.t === 'md') { const d = el('div', 'kv-md'); mdKutu(d, b.v); kap.appendChild(d); }
      else if (b.t === 'bolum') {
        const d = el('details', 'kv-d-bolum' + (b.v ? '' : ' bos')); const sm = el('summary'); sm.appendChild(el('span', 'kv-d-bolum-b', b.b || '(başlıksız)')); sm.appendChild(el('cite', '', b.k)); d.appendChild(sm);
        const gv = el('div', 'kv-d-bolum-g'); (b.v ? b.v.split(/\n\n+/) : []).forEach((p) => gv.appendChild(el('p', 'kv-d-p', p)));
        if (b.kesildi) gv.appendChild(el('div', 'kut-yardim', '… bölümün devamı kitapta'));
        if (b.ref && typeof document !== 'undefined' && !kap.dataset.disari) { const a = el('button', 'kv-link', '📖 Kitapta aç'); a.onclick = () => KA().refAc(b.ref); gv.appendChild(a); }
        d.appendChild(gv); kap.appendChild(d);
      }
    });
  }
  function indir(ad, icerik, tur) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([icerik], { type: (tur || 'text/plain') + ';charset=utf-8' })); a.download = ad.replace(/[^\w.çğıöşüÇĞİÖŞÜ-]+/g, '_'); document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  async function okuAc(k) {
    const S = KA().sayfa('📕 ' + k.ad, true); S.ov.classList.add('kv-ov'); const g = S.govde; const o = okuSecenek();
    const sc = el('div', 'kv-chip-satir');
    const belge = el('div', 'kv-belge'); let son = null;
    const uret = async () => { belge.innerHTML = '<div class="kut-yardim">⏳ Hazırlanıyor…</div>'; son = await belgeUret(k, o); belgeCiz(belge, son.blok); };
    [['arapca', 'Arapça'], ['meal', 'Meal'], ['hadis', 'Hadisler'], ['tefsir', 'Tefsir'], ['pasaj', 'Kitaplar'], ['metin', 'Metnim']].forEach(([kod, ad]) => sc.appendChild(chip(ad, o[kod] ? 'sec' : '', function () { o[kod] = !o[kod]; this.classList.toggle('sec', o[kod]); lsYaz('kv_oku_sec', o); uret(); })));
    g.appendChild(sc);
    const ac = el('div', 'kv-form-satir');
    const hep = el('button', 'kv-btn', '⇵ Hepsini aç/kapat'); hep.onclick = () => { const l = [...belge.querySelectorAll('details.kv-d-bolum')]; const ac1 = l.some((d) => !d.open); l.forEach((d) => { d.open = ac1; }); }; ac.appendChild(hep);
    const md = el('button', 'kv-btn', '⬇ Markdown'); md.onclick = () => son && indir(k.ad + '.md', son.md, 'text/markdown'); ac.appendChild(md);
    const ht = el('button', 'kv-btn', '⬇ HTML (yazdır/PDF)'); ht.onclick = () => { if (!son) return; const gecici = document.createElement('div'); gecici.dataset.disari = '1'; belgeCiz(gecici, son.blok); gecici.querySelectorAll('details').forEach((d) => d.setAttribute('open', '')); indir(k.ad + '.html', '<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + k.ad.replace(/</g, '&lt;') + '</title><style>body{font-family:Georgia,serif;max-width:720px;margin:24px auto;padding:0 16px;line-height:1.7;color:#222}h1{font-size:30px}h2{margin-top:28px;border-bottom:2px solid #a07830;padding-bottom:4px}.kv-d-ar{direction:rtl;text-align:right;font-size:26px;line-height:2.1;margin:18px 0 4px}blockquote{margin:6px 0 16px;padding:8px 14px;border-left:4px solid #a07830;background:#f6f0e4;border-radius:0 8px 8px 0}cite{display:block;font-size:12px;color:#777;margin-top:4px}.kv-d-not{color:#777;font-style:italic}details{border:1px solid #d8cdb4;border-radius:8px;padding:6px 12px;margin:8px 0}summary{font-weight:700;cursor:pointer}</style><body>' + gecici.innerHTML + '</body></html>', 'text/html'); }; ac.appendChild(ht);
    g.appendChild(ac); g.appendChild(belge); uret();
  }

  // ════════════════════════════════════════════════════════════
  //  YAPAY ZEKÂ TASLAĞI
  // ════════════════════════════════════════════════════════════
  const SISTEM_KAVRAM =
    'Sen, kullanıcının kütüphanesiyle çalışan bir Kur’ân kavram tefsiri asistanısın. Sana bir KAVRAM ve etiketli kaynaklar verilir: ' +
    '[M#] âyet ve meali, [T#] tefsir görüşü, [H#] hadis, [K#] kitap pasajı, [N#] kullanıcının notu.\n' +
    'KURALLAR:\n1) İddiaları YALNIZCA verilen kaynaklara dayandır; cümle sonuna etiket yaz, örn. [M2][T1].\n' +
    '2) Kaynaklarda olmayanı uydurma; âyet, hadis, rivayet, sayfa numarası üretme. Yetersizse “Verilen kaynaklarda bu konuda bilgi yok.” de.\n' +
    '3) Kaynak dışı bilgiyi “⚠️ Kaynak dışı:” ile başlat. 4) Uzun alıntı yapma; kendi cümlelerinle sentezle, görüş sahibini belirt.\n' +
    '5) Türkçe, sade, saygılı yaz. BİÇİM: bölümleri “## ” ile, her bölümde en çok 6 madde “- ” ile, önemli terimleri **kalın**; en sona “## Kısaca” ekle.';
  const GOREV_KAVRAM = {
    taslak: 'GÖREV: Bu kavram için bir tefsir taslağı yaz. Bölümler: “Tanım ve kök”, “Kur’ân’da kullanımı” (âyet gruplarına göre, [M#] etiketleriyle), “Hadislerde”, “Müfessirlere göre” (görüş sahiplerini ayır), “Kitaplardaki yorumlar”, “Notların”, “Kısaca”. Kaynağı olmayan bölümü atla.',
    karsilastir: 'GÖREV: Kaynaklar arasındaki ortak noktaları ve ayrışan yorumları karşılaştır: “Ortak noktalar”, “Ayrışanlar”, “Tek kaynakta geçenler”.',
    sina: 'GÖREV: Kavramı çalışan okuru sına: “Sorular” (5 numaralı soru), ardından “## Cevap anahtarı” (kaynak etiketiyle).',
    soru: 'GÖREV: Aşağıdaki soruyu verilen kaynaklara dayanarak cevapla.', ozet: 'GÖREV: Kavramı özetle: ana fikir, önemli noktalar, hatırlanacaklar.'
  };
  async function kavramBaglam(k, soru, sec) {
    const bloklar = [], atif = {}, uyari = [], ozet = { kitap: 0, not: 0 }; let nM = 0, nT = 0, nH = 0, nK = 0;
    const KH = window.KutHadis; const keys = sirala(tumAyetler(k));
    const baslik = 'KAVRAM: ' + k.ad + (k.tanim ? '\nTanım (kullanıcının): ' + k.tanim : '') + (k.kokler.length ? '\nKökler: ' + k.kokler.map((r) => r + ((kokIndeksi().map[r] || {}).rm ? ' (' + kokIndeksi().map[r].rm + ')' : '')).join(', ') : '') + '\nÂyet sayısı: ' + keys.length + '\n\n';
    const bAd = (x) => { const b = k.basliklar.find((y) => y.ayetler.includes(x)); return b && b.id !== 'genel' ? b.ad : ''; };
    if (sec.ayet && keys.length) {
      const adim = Math.max(1, Math.ceil(keys.length / 50)); let harf = 0; if (adim > 1) uyari.push('Âyetlerin bir kısmı örneklendi');
      for (let i = 0; i < keys.length; i += adim) { const x = keys[i]; const [s, a] = parca(x); const m = ayetMetni(s, a); if (!m.meal) continue; const t = kisalt(m.meal, 400); if (harf + t.length > 16000) break; harf += t.length; nM++; const id = 'M' + nM;
        bloklar.push('[' + id + '] ÂYET — ' + ayetAd(x) + (bAd(x) ? ' (' + bAd(x) + ')' : '') + '\n' + t); atif[id] = { tip: 'meal', etiket: ayetAd(x), metin: m.meal }; }
    }
    if (sec.tefsir && keys.length) {
      await tefsirHazirla([...new Set(keys.map((x) => parca(x)[0]))]); let harf = 0;
      const liste = (k.tefsirSabit || []).map((x) => ({ x: key2(x.s, x.a), alim: x.alim })).concat(keys.slice(0, 14).map((x) => ({ x, alim: null })));
      const gor = new Set();
      for (const it of liste) { const [s, a] = parca(it.x); const l = tefsirMetinleri(s, a); const y = it.alim ? l.find((z) => z.alim === it.alim) : l[0]; if (!y) continue; const an = alimAd(y.alim) + it.x; if (gor.has(an)) continue; gor.add(an);
        const t = kisalt(y.metin, 800); if (harf + t.length > 24000) break; harf += t.length; nT++; const id = 'T' + nT; bloklar.push('[' + id + '] TEFSİR — ' + alimAd(y.alim) + ' (' + ayetAd(it.x) + ')\n' + t); atif[id] = { tip: 'tefsir', etiket: alimAd(y.alim) + ' ' + ayetAd(it.x), metin: kisalt(y.metin, 1500) }; }
    }
    if (sec.hadis && KH && keys.length) {
      try { await KH.hekYukle(); const t = hadisToplaTum(k); let harf = 0;
        for (const x of t.hek.slice(0, 30)) { const m = kisalt(x.h.metin, 450); if (harf + m.length > 12000) break; harf += m.length; nH++; const id = 'H' + nH; bloklar.push('[' + id + '] HADİS — Hadis el Kitabı, Hadis ' + x.h.no + ' (' + x.ayetler.slice(0, 3).map(ayetAd).join(', ') + ')\n' + m); atif[id] = { tip: 'hadis', etiket: 'Hadis el Kitabı · Hadis ' + x.h.no, metin: x.h.metin }; }
        for (const x of t.nad.slice(0, 10)) { const m = kisalt(x.r.tr, 450); if (harf + m.length > 16000) break; harf += m.length; nH++; const id = 'H' + nH; bloklar.push('[' + id + '] HADİS — ' + alimAd(x.alim) + (x.r.kaynak ? ' · ' + kisalt(x.r.kaynak, 80) : '') + '\n' + m); atif[id] = { tip: 'hadis', etiket: alimAd(x.alim), metin: x.r.tr }; } } catch (e) {}
    }
    if (sec.kitap) {
      let harf = 0; const ekle = async (ref, kayr) => { const v = kayr || await KA().kitapYukle(ref.url); if (!v) return; const P = (v.ayr || v).paras; const c = await KA().refCoz(ref); if (c.yok) return; const bm = ref.sel ? null : bolumMetni(c.ayr, c.pi, 2600); const tam = ref.sel || (bm && bm.govde ? bm.baslik + '\n' + bm.govde : c.ayr.paras[c.pi].t); const t = kisalt(tam, bm && bm.govde ? 2600 : 1300); if (harf + t.length > 16000) return; harf += t.length; nK++; const id = 'K' + nK; bloklar.push('[' + id + '] KİTAP — ' + ref.kad + (ref.yol ? ' › ' + ref.yol : '') + '\n' + t); atif[id] = { tip: 'kitap', ref, etiket: ref.kad + (ref.yol ? ' › ' + ref.yol : ''), metin: kisalt(tam, 700) }; };
      for (const ref of (k.kitapRefs || []).slice(0, 14)) { try { await ekle(ref); } catch (e) {} }
      if (soru) { try { const r = await KA().kitapAra(soru, { kip: 'or', durakSuz: true, limit: 6 }); for (const h of r.hits) { const v = await KA().kitapYukle(h.url); if (!v) continue; await ekle(KA().refYap(h.url, h.kad, v.ayr, h.pi), v); } } catch (e) {} }
      ozet.kitap = nK;
    }
    if (sec.not && window.KutNot) { const N = window.KutNot; const hm = new Map(); if (k.etiket) N.etiketNotlari(k.etiket).forEach((n) => hm.set(n.id, n)); keys.slice(0, 200).forEach((x) => { const [s, a] = parca(x); N.ayetNotlari(s, a).forEach((n) => hm.set(n.id, n)); }); window.KutYZ.kitapNotBlogu([...hm.values()], bloklar, atif, ozet, uyari, 8000); }
    return { metin: baslik + (bloklar.length ? bloklar.join('\n\n') : '(Kaynak bulunamadı.)'), atif, ozet, uyari, bos: !bloklar.length };
  }
  function taslakAc(k, bitince) {
    window.KutYZ.yzPanel({
      baslik: k.ad, alt: '🧩 Kavram tefsiri · ' + tumAyetler(k).length + ' âyet', anahtar: 'kavram_' + k.id, prefKey: 'kv_yz_sec',
      chips: [['ayet', '📖 Âyetler'], ['tefsir', '📜 Tefsirler'], ['hadis', '🕌 Hadisler'], ['kitap', '📚 Kitaplar'], ['not', '📝 Notlarım']],
      varsayilan: { ayet: true, tefsir: true, hadis: true, kitap: true, not: true },
      eylemler: [['🧩 Taslak çıkar', 'Bu kavram için bir tefsir taslağı yaz.', 'taslak'], ['⚖️ Karşılaştır', 'Kaynaklar arasındaki ortak ve ayrışan noktalar neler?', 'karsilastir'], ['🎯 Beni sına', 'Bu kavramdan beni sına.', 'sina']],
      gorev: GOREV_KAVRAM, baglam: (soru, sec) => kavramBaglam(k, soru, sec), sistem: SISTEM_KAVRAM, placeholder: 'Bu kavram hakkında sor…',
      bos: 'Sayfadaki âyet, hadis, tefsir, kitap ve notlardan taslak çıkarılır. Bir hızlı eylem seç ya da soru yaz.',
      ipucu: 'Cevaplar seçili kaynaklara dayanır; 🧠 genel bilgi ve 🌐 internet isteğe bağlıdır. [M1], [H2] gibi etiketlere dokununca kaynak açılır.',
      kaydet: (metin) => { k.metin = (k.metin ? k.metin + '\n\n' : '') + '## 🤖 Taslak (' + new Date().toLocaleDateString('tr-TR') + ')\n' + metin; kaydet(k); toast('“Metnim” sekmesine eklendi'); if (bitince) bitince(); }
    });
  }

  // ════════════════════════════════════════════════════════════
  //  ÂYET ALTINDA 🧩 KAVRAMLAR ROZETİ
  // ════════════════════════════════════════════════════════════
  window.kavramButonuEkle = function (satir, s, a) {
    try {
      const key = key2(s, a); const l = canli().filter((k) => tumAyetler(k).includes(key));
      const b = el('button', 'ayet-ekstra-btn kv-ayet-btn', l.length ? '🧩 Kavramlar (' + l.length + ')' : '🧩 Kavram'); b.dataset.goster = 'derinlik';
      if (l.length) { b.style.borderColor = 'var(--teal)'; b.style.color = 'var(--teal)'; b.style.borderStyle = 'solid'; }
      b.onclick = () => ayetKavramlari(key); satir.appendChild(b);
    } catch (e) {}
  };
  function ayetKavramlari(key) {
    const S = KA().sayfa('🧩 ' + ayetAd(key)); const g = S.govde;
    const ciz = () => {
      g.innerHTML = ''; const tum = canli();
      if (!tum.length) g.appendChild(el('div', 'kut-yardim', 'Henüz kavram yok. Kavramlar sekmesinden oluşturabilirsiniz.'));
      tum.forEach((k) => { const var_ = tumAyetler(k).includes(key); const r = el('div', 'kv-ay-satir'); const ad = el('button', 'kv-ay-ad', k.emoji + ' ' + k.ad); ad.onclick = () => { S.kapat(); kavramAc(k.id, 'ayetler'); }; r.appendChild(ad);
        const b = el('button', 'kv-mini' + (var_ ? ' ok' : ''), var_ ? '✓ Ekli' : '＋ Ekle'); b.onclick = () => { if (var_) { k.basliklar.forEach((x) => { x.ayetler = x.ayetler.filter((y) => y !== key); }); } else k.basliklar[0].ayetler.push(key); kaydet(k); ciz(); }; r.appendChild(b); g.appendChild(r); });
      const y = el('button', 'kv-btn', '＋ Yeni kavram oluştur'); y.onclick = () => { const a = prompt('Kavram adı:'); if (a && a.trim()) { const k = yeniKavram(a.trim()); k.basliklar[0].ayetler.push(key); kaydet(k); ciz(); } }; g.appendChild(y);
    }; ciz();
  }

  // ════════════════════════════════════════════════════════════
  //  GitHub eşitleme
  // ════════════════════════════════════════════════════════════
  function birlestir(a, b) { const s = { v: 1, kavramlar: {} }; [a.kavramlar || {}, b.kavramlar || {}].forEach((src) => Object.keys(src).forEach((id) => { if (!s.kavramlar[id] || (src[id].g || 0) > (s.kavramlar[id].g || 0)) s.kavramlar[id] = src[id]; })); return s; }
  function durumYaz(t) { durumYazisi = t; const e = document.getElementById('kv-senkron'); if (e) e.textContent = t; }
  async function senkron(sessiz) {
    if (mesgul) return;
    if (typeof _githubHazirMi === 'function' && !_githubHazirMi()) { durumYaz('☁ GitHub ayarlı değil — kavramlar yalnız bu cihazda'); return; }
    mesgul = true; durumYaz('☁ Eşitleniyor…');
    try {
      const { icerik } = await _githubDosyaOku(DOSYA); let uzak = { v: 1, kavramlar: {} }; try { if (icerik) uzak = JSON.parse(icerik); } catch (e) {}
      const b = birlestir(D, uzak); const degisti = JSON.stringify(b) !== JSON.stringify(D); D = b; lsYaz(ANAHTAR, D);
      if (JSON.stringify(b) !== JSON.stringify(birlestir(uzak, uzak))) await _githubDosyaGuncelle(DOSYA, JSON.stringify(b), 'Kavram tefsiri güncellendi');
      durumYaz('☁ Eşitlendi ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      if (degisti && document.getElementById('screen-temalar') && document.getElementById('screen-temalar').classList.contains('active') && !document.querySelector('.kv-ov')) hub();
    } catch (e) { durumYaz('☁ Eşitlenemedi'); if (!sessiz) toast('Kavramlar eşitlenemedi: ' + e.message); }
    mesgul = false;
  }

  // Kütüphanede seçilen metni kavrama ekle.
  // Dokunuşla seç → "Ekle"ye bas (iki adım); açılış anında 0,5 sn dokunma kapalı (aynı parmak dokunuşu yanlış kavrama basmasın).
  function secimEkle(seg) {
    const K = window.KutIc && window.KutIc.K; if (!K || !K.acik || !seg || !seg.length) return;
    const acik = K.acik; const S = KA().sayfa('🧩 Kavrama ekle'); const g = S.govde;
    S.ov.style.pointerEvents = 'none'; setTimeout(() => { S.ov.style.pointerEvents = ''; }, 500);
    const metin = seg.map((x) => x.q).join(' … ');
    const r0 = KA().refYap(acik.url, acik.ad, acik.ayr, seg[0].pi); r0.sel = metin;
    g.appendChild(el('div', 'kv-bolum', 'Seçtiğiniz metin'));
    g.appendChild(el('blockquote', 'kv-d-alinti', kisalt(metin, 300)));
    const alan = el('div'); g.appendChild(alan);
    let secili = null; let eklenen = null; const sonId = lsOku('kv_son_kavram', '');
    const ekleRef = (k) => { const r = Object.assign({}, r0); if ((k.kitapRefs || []).some((x) => x.url === r.url && x.pi === r.pi && (x.sel || '') === r.sel)) return null; k.kitapRefs.push(r); kaydet(k); lsYaz('kv_son_kavram', k.id); return r; };
    const ciz = () => {
      alan.innerHTML = '';
      if (eklenen) {
        alan.appendChild(el('div', 'kv-bolum', '✓ “' + eklenen.k.ad + '” kavramına eklendi'));
        const gb = el('button', 'kv-btn', '↶ Geri al'); gb.onclick = () => { eklenen.k.kitapRefs = eklenen.k.kitapRefs.filter((x) => x !== eklenen.r); kaydet(eklenen.k); eklenen = null; secili = null; ciz(); };
        const kp = el('button', 'kv-btn kv-btn-vurgu', 'Tamam'); kp.onclick = () => S.kapat(); alan.appendChild(gb); alan.appendChild(kp); return;
      }
      alan.appendChild(el('div', 'kv-bolum', 'Hangi kavrama eklensin?'));
      const l = canli().sort((x, y) => (x.id === sonId ? -1 : y.id === sonId ? 1 : (y.g || 0) - (x.g || 0)));
      if (!l.length) alan.appendChild(el('div', 'kut-yardim', 'Henüz kavram yok; aşağıdan oluşturun.'));
      l.forEach((k) => { const b = el('button', 'kv-btn kv-sec-btn' + (secili === k.id ? ' sec' : ''), (secili === k.id ? '● ' : '○ ') + k.emoji + ' ' + k.ad + (k.id === sonId ? '  · son kullanılan' : '')); b.style.cssText = 'display:block;width:100%;text-align:left'; b.onclick = () => { secili = k.id; ciz(); }; alan.appendChild(b); });
      const ekle = el('button', 'kv-btn kv-btn-vurgu kv-sabit', secili ? '✓ Ekle' : 'Önce bir kavram seçin'); ekle.disabled = !secili;
      ekle.onclick = () => { const k = kavramBul(secili); if (!k) return; const r = ekleRef(k); if (!r) { toast('Bu metin zaten ekli'); return; } eklenen = { k, r }; ciz(); };
      alan.appendChild(ekle);
      const y = el('button', 'kv-btn', '＋ Yeni kavram oluştur'); y.onclick = () => { const a = prompt('Kavram adı:'); if (a && a.trim()) { const k = yeniKavram(a.trim()); kaydet(k); secili = k.id; ciz(); } }; alan.appendChild(y);
    };
    ciz();
  }

  // ── Bağlantılar ─────────────────────────────────────────────
  window.temalarEkraniRender = function () { hub(); senkron(true); };
  window.KutKavram = { secimEkle, hub, kavramAc, kokTara, kokAra, kokIndeksi, canli, yeniKavram, kaydet, senkron, tumAyetler, belgeUret, _durum: () => D };
  gocEt();
})();
