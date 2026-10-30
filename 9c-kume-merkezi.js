// ════════════════════════════════════════
//  KÜME MERKEZİ — "Kümeler" sekmesi + sûre içindeki ayet kümeleri için
//  renk · işaret · etiket · tekrar sayacı · okuma ilerlemesi · konu klasörleri
//  Veri: localStorage 'kume_merkezi_v1' ve GitHub 'data/kume-merkezi.json' (en yeni değişiklik kazanır).
//  Âyet metinlerine, notlara ve kaynak dosyalara DOKUNMAZ; yalnız küme üst-verisi tutar.
// ════════════════════════════════════════
(function () {
  'use strict';
  const ANAHTAR = 'kume_merkezi_v1', DOSYA = 'data/kume-merkezi.json';
  const RENKLER = ['#2c4870', '#2e7d5b', '#b8862b', '#a8433c', '#7a4e9c', '#2a8aa0', '#c2679a', '#6b6f7a'];
  const ISARETLER = ['📌', '⭐', '❗', '❓', '🔥', '💎', '🌙', '🕋', '📿', '⚖️'];
  const KONU_EMOJI = ['📁', '⏳', '📖', '🕌', '🤲', '⚖️', '🌿', '🌙', '🔥', '💡'];
  const DURUM_AD = { okunmadi: 'Okunmadı', okunuyor: 'Okunuyor', okundu: 'Okundu' };

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  function toast(m) { try { window.KutAra ? window.KutAra.toast(m) : null; } catch (e) {} }
  const simdi = () => Date.now();
  const yeniId = (p) => p + simdi().toString(36) + Math.random().toString(36).slice(2, 5);

  // ── Depo ────────────────────────────────────────────────────
  let D = oku();
  function oku() {
    try { const v = JSON.parse(localStorage.getItem(ANAHTAR)); if (v && v.v === 1) return { v: 1, konular: v.konular || [], meta: v.meta || {}, tanim: v.tanim || {} }; } catch (e) {}
    return { v: 1, konular: [], meta: {}, tanim: {} };
  }
  let zamanlayici = null;
  function yaz() { try { localStorage.setItem(ANAHTAR, JSON.stringify(D)); } catch (e) {} clearTimeout(zamanlayici); zamanlayici = setTimeout(() => senkron(true), 2500); }
  function meta(key) { return D.meta[key] || {}; }
  function metaYaz(key, yama) { const m = Object.assign({}, D.meta[key] || {}, yama, { g: simdi() }); D.meta[key] = m; yaz(); }
  function konular() { return D.konular.filter((k) => !k.sil); }
  function konuYaz(k) { k.g = simdi(); const i = D.konular.findIndex((x) => x.id === k.id); if (i >= 0) D.konular[i] = k; else D.konular.push(k); yaz(); }

  // ── Kullanıcı kümeleri (localStorage 'kumeler' dizisi) ──────
  function yerelKumeler() { try { return JSON.parse(localStorage.getItem('kumeler') || '[]'); } catch (e) { return []; } }
  function yerelKumelerYaz(l) { localStorage.setItem('kumeler', JSON.stringify(l)); }
  function idAta() { // kimliği olmayan kümelere kalıcı kimlik ver (yalnız 'id' alanı eklenir)
    const l = yerelKumeler(); let degisti = false;
    l.forEach((k) => {
      if (!k.id) { k.id = yeniId('u'); degisti = true; }
      if (!D.tanim[k.id]) { D.tanim[k.id] = { k: JSON.parse(JSON.stringify(k)), g: simdi() }; degisti = true; }
    });
    if (degisti) { yerelKumelerYaz(l); yaz(); }
    return l;
  }
  function araliklar(k) { return (k.ayetler && k.ayetler.length) ? k.ayetler : [{ sure: k.sure, bas: k.bas, bit: k.bit }]; }
  function toplamAyet(k) { return araliklar(k).reduce((n, r) => n + Math.max(0, r.bit - r.bas + 1), 0); }
  function sureAd(n) { return (typeof SURELER !== 'undefined' && SURELER[n - 1]) ? SURELER[n - 1].isim : String(n); }
  function refMetni(k) {
    const r = araliklar(k);
    if (r.length > 1) return r.length + ' aralık';
    return sureAd(r[0].sure) + ' ' + r[0].sure + ':' + r[0].bas + (r[0].bit !== r[0].bas ? '–' + r[0].bit : '');
  }
  // Tüm kümeler: kullanıcı kümeleri + üst-verisi olan sûre kümeleri
  function tumKumeler() {
    const cikti = [];
    idAta().forEach((k) => cikti.push({ key: 'u:' + k.id, tur: 'u', baslik: k.konu, ham: k, ayetler: araliklar(k), kaynakKume: k }));
    Object.keys(D.meta).forEach((key) => {
      if (key.indexOf('s:') !== 0) return;
      const p = key.split(':'), sNo = +p[1], id = p.slice(2).join(':');
      let k = null; try { k = _kumeListesiIdli(sNo).find((x) => x.id === id); } catch (e) {}
      if (!k) return;
      cikti.push({ key, tur: 's', baslik: k.konu, ham: k, ayetler: [{ sure: sNo, bas: k.bas, bit: k.bit }], kaynakKume: { konu: k.konu, sure: sNo, bas: k.bas, bit: k.bit } });
    });
    return cikti;
  }
  function toplamOf(c) { return c.ayetler.reduce((n, r) => n + Math.max(0, r.bit - r.bas + 1), 0); }
  function ilerleme(c) {
    const m = meta(c.key), tp = toplamOf(c);
    const gecerli = new Set(); c.ayetler.forEach((r) => { for (let a = r.bas; a <= r.bit; a++) gecerli.add(r.sure + ':' + a); });
    const n = (m.okunan || []).filter((x) => gecerli.has(x)).length;
    const durum = n === 0 ? 'okunmadi' : (tp > 0 && n >= tp ? 'okundu' : 'okunuyor');
    return { n, tp, durum, yuzde: tp ? Math.round(n * 100 / tp) : 0 };
  }
  function sureKumeDesc(sNo, k) { return { key: 's:' + sNo + ':' + k.id, tur: 's', baslik: k.konu, ham: k, ayetler: [{ sure: sNo, bas: k.bas, bit: k.bit }], kaynakKume: { konu: k.konu, sure: sNo, bas: k.bas, bit: k.bit } }; }

  // ── Küçük yardımcı bileşenler ───────────────────────────────
  function etiketSatiri(m) {
    const w = el('div', 'km-etiketler');
    (m.etiket || []).forEach((t) => w.appendChild(el('span', 'km-etiket', '#' + t)));
    return w;
  }
  function ilerlemeCubugu(p, renk) {
    const w = el('div', 'km-ilerleme');
    const c = el('div', 'km-ilerleme-cubuk'); const d = el('div', 'km-ilerleme-dolu'); d.style.width = p.yuzde + '%'; if (renk) d.style.background = renk; c.appendChild(d);
    w.appendChild(c); w.appendChild(el('span', 'km-ilerleme-yazi', p.tp ? (p.n + '/' + p.tp + ' · ' + DURUM_AD[p.durum]) : ''));
    return w;
  }
  function oku_(c) { try { kumeOkuDirekt(c.kaynakKume); } catch (e) { toast('Açılamadı'); } }

  // ── Ayrıntı sayfası (renk/işaret/etiket/konu/sayaç/ilerleme) ──
  function duzenle(c, kapaninca) {
    if (!window.KutAra) return;
    const S = window.KutAra.sayfa('⚙ ' + c.baslik);
    const g = S.govde;
    const cizim = () => {
      g.innerHTML = '';
      const m = meta(c.key), p = ilerleme(c);
      g.appendChild(ilerlemeCubugu(p, m.renk));

      g.appendChild(el('div', 'km-bolum', '🎨 Renk'));
      const rs = el('div', 'km-sec-satir');
      const yok = el('button', 'km-renk km-renk-yok' + (!m.renk ? ' sec' : ''), '∅'); yok.onclick = () => { metaYaz(c.key, { renk: '' }); cizim(); }; rs.appendChild(yok);
      RENKLER.forEach((r) => { const b = el('button', 'km-renk' + (m.renk === r ? ' sec' : '')); b.style.background = r; b.onclick = () => { metaYaz(c.key, { renk: r }); cizim(); }; rs.appendChild(b); });
      g.appendChild(rs);

      g.appendChild(el('div', 'km-bolum', '🔖 İşaret'));
      const is = el('div', 'km-sec-satir');
      const isYok = el('button', 'km-isaret' + (!m.isaret ? ' sec' : ''), '∅'); isYok.onclick = () => { metaYaz(c.key, { isaret: '' }); cizim(); }; is.appendChild(isYok);
      ISARETLER.forEach((x) => { const b = el('button', 'km-isaret' + (m.isaret === x ? ' sec' : ''), x); b.onclick = () => { metaYaz(c.key, { isaret: x }); cizim(); }; is.appendChild(b); });
      g.appendChild(is);

      g.appendChild(el('div', 'km-bolum', '🏷 Etiketler'));
      const ew = el('div', 'km-etiketler');
      (m.etiket || []).forEach((t) => { const b = el('button', 'km-etiket km-etiket-sil', '#' + t + ' ✕'); b.onclick = () => { metaYaz(c.key, { etiket: (m.etiket || []).filter((x) => x !== t) }); cizim(); }; ew.appendChild(b); });
      g.appendChild(ew);
      const ef = el('div', 'km-form-satir'); const ei = el('input', 'kb-input'); ei.placeholder = 'Yeni etiket (ör. ahiret, sabır)';
      const eb = el('button', 'kb-mini', '+ Ekle');
      const ekle = (t) => { t = String(t || '').trim().replace(/^#/, ''); if (!t) return; const l = m.etiket || []; if (l.some((x) => x.toLowerCase() === t.toLowerCase())) return; metaYaz(c.key, { etiket: l.concat([t]) }); cizim(); };
      eb.onclick = () => ekle(ei.value); ei.onkeydown = (e) => { if (e.key === 'Enter') ekle(ei.value); };
      ef.appendChild(ei); ef.appendChild(eb); g.appendChild(ef);
      const mevcut = tumEtiketler().filter((t) => !(m.etiket || []).includes(t));
      if (mevcut.length) { const o = el('div', 'km-etiketler'); mevcut.slice(0, 14).forEach((t) => { const b = el('button', 'km-etiket km-etiket-oner', '+ ' + t); b.onclick = () => ekle(t); o.appendChild(b); }); g.appendChild(o); }

      g.appendChild(el('div', 'km-bolum', '📁 Konu klasörleri'));
      const kl = konular();
      if (!kl.length) g.appendChild(el('div', 'kut-yardim', 'Henüz konu klasörü yok. Aşağıdan oluşturabilirsin (ör. Kıyamet, Kıssalar, Namaz).'));
      kl.forEach((k) => {
        const uye = (k.uyeler || []).includes(c.key);
        const b = el('button', 'km-konu-sec' + (uye ? ' sec' : ''), (uye ? '✓ ' : '') + (k.emoji || '📁') + ' ' + k.ad);
        b.onclick = () => { const u = new Set(k.uyeler || []); if (uye) u.delete(c.key); else u.add(c.key); konuYaz(Object.assign({}, k, { uyeler: [...u] })); cizim(); };
        g.appendChild(b);
      });
      const yf = el('div', 'km-form-satir'); const yi = el('input', 'kb-input'); yi.placeholder = 'Yeni konu klasörü adı'; const yb = el('button', 'kb-mini', '📁+ Oluştur');
      yb.onclick = () => { const ad = yi.value.trim(); if (!ad) return; konuYaz({ id: yeniId('c'), ad, emoji: '📁', renk: '', uyeler: [c.key] }); cizim(); };
      yf.appendChild(yi); yf.appendChild(yb); g.appendChild(yf);

      g.appendChild(el('div', 'km-bolum', '🔁 Tekrar sayacı'));
      const sw = el('div', 'km-sayac');
      const eks = el('button', 'km-sayac-b', '−'); const say = el('span', 'km-sayac-n', String(m.sayac || 0)); const art = el('button', 'km-sayac-b', '+');
      eks.onclick = () => { metaYaz(c.key, { sayac: Math.max(0, (m.sayac || 0) - 1) }); cizim(); };
      art.onclick = () => { metaYaz(c.key, { sayac: (m.sayac || 0) + 1, sonTekrar: new Date().toISOString().slice(0, 10) }); cizim(); };
      sw.appendChild(eks); sw.appendChild(say); sw.appendChild(art);
      if (m.sonTekrar) sw.appendChild(el('span', 'km-sayac-son', 'Son: ' + m.sonTekrar.split('-').reverse().join('.')));
      g.appendChild(sw);

      g.appendChild(el('div', 'km-bolum', '✅ Okuma ilerlemesi'));
      const tp = toplamOf(c);
      const okunan = new Set(m.okunan || []);
      const topluB = el('div', 'km-form-satir');
      const hepsi = el('button', 'kb-mini', '✓ Hepsini okundu yap'); const sifir = el('button', 'kb-mini', '↺ Sıfırla');
      hepsi.onclick = () => { const l = new Set(m.okunan || []); c.ayetler.forEach((r) => { for (let a = r.bas; a <= r.bit; a++) l.add(r.sure + ':' + a); }); metaYaz(c.key, { okunan: [...l] }); cizim(); };
      sifir.onclick = () => { metaYaz(c.key, { okunan: [] }); cizim(); };
      topluB.appendChild(hepsi); topluB.appendChild(sifir); g.appendChild(topluB);
      if (tp <= 400) {
        c.ayetler.forEach((r) => {
          if (c.ayetler.length > 1) g.appendChild(el('div', 'km-ay-baslik', sureAd(r.sure) + ' ' + r.sure + ':' + r.bas + '–' + r.bit));
          const gr = el('div', 'km-ay-grid');
          for (let a = r.bas; a <= r.bit; a++) {
            const kk = r.sure + ':' + a; const b = el('button', 'km-ay' + (okunan.has(kk) ? ' sec' : ''), String(a));
            b.onclick = () => { const l = new Set(meta(c.key).okunan || []); if (l.has(kk)) l.delete(kk); else l.add(kk); metaYaz(c.key, { okunan: [...l] }); cizim(); };
            gr.appendChild(b);
          }
          g.appendChild(gr);
        });
      } else g.appendChild(el('div', 'kut-yardim', 'Bu küme çok geniş (' + tp + ' âyet); tek tek işaretleme yerine yukarıdaki toplu düğmeleri kullan.'));

      const alt = el('div', 'km-alt-eylem');
      const git = el('button', 'kb-mini', '▶ Oku'); git.onclick = () => { S.kapat(); oku_(c); };
      alt.appendChild(git);
      if (c.tur === 'u') { const sil = el('button', 'kb-mini km-sil', '🗑 Kümeyi sil'); sil.onclick = () => { if (!confirm('Bu küme silinsin mi?')) return; S.kapat(); kumeSilId(c.ham.id); }; alt.appendChild(sil); }
      g.appendChild(alt);
    };
    cizim();
    const gozle = new MutationObserver(() => { if (!S.ov.isConnected) { gozle.disconnect(); yenile(); if (kapaninca) kapaninca(); } });
    gozle.observe(document.body, { childList: true });
  }
  function tumEtiketler() {
    const s = {}; Object.keys(D.meta).forEach((k) => (D.meta[k].etiket || []).forEach((t) => { s[t] = (s[t] || 0) + 1; }));
    return Object.keys(s).sort((a, b) => s[b] - s[a]);
  }
  function kumeSilId(id) {
    const l = yerelKumeler(); const i = l.findIndex((k) => k.id === id); if (i < 0) return;
    l.splice(i, 1); yerelKumelerYaz(l);
    D.tanim[id] = { sil: true, g: simdi() }; yaz();
    yenile(); try { statGuncelle(); } catch (e) {}
  }

  // ── Ana sekme: hub ──────────────────────────────────────────
  const durumF = { ara: '', durum: 'hepsi', renk: '', etiket: '', konu: '', sira: 'ekleme' };
  let ustKurulduMu = false;
  function ustKur() {
    const wrap = document.getElementById('kume-listesi'); if (!wrap || ustKurulduMu) return;
    const ekran = wrap.parentNode; const form = ekran.querySelector('.kume-form');
    const yeniBtn = el('button', 'km-yeni-btn', '＋ Yeni küme oluştur');
    if (form) { form.classList.add('km-gizli'); yeniBtn.onclick = () => { form.classList.toggle('km-gizli'); yeniBtn.textContent = form.classList.contains('km-gizli') ? '＋ Yeni küme oluştur' : '✕ Formu kapat'; }; ekran.insertBefore(yeniBtn, form); }
    const hub = el('div', 'km-hub'); hub.id = 'km-hub'; ekran.insertBefore(hub, wrap);
    ustKurulduMu = true;
  }
  function suzulmus(liste) {
    const q = durumF.ara.trim().toLowerCase();
    let konuUye = null; if (durumF.konu) { const k = konular().find((x) => x.id === durumF.konu); konuUye = new Set(k ? k.uyeler || [] : []); }
    const sonuc = liste.filter((c) => {
      const m = meta(c.key), p = ilerleme(c);
      if (konuUye && !konuUye.has(c.key)) return false;
      if (durumF.durum !== 'hepsi' && p.durum !== durumF.durum) return false;
      if (durumF.renk && m.renk !== durumF.renk) return false;
      if (durumF.etiket && !(m.etiket || []).includes(durumF.etiket)) return false;
      if (q && (c.baslik + ' ' + (m.etiket || []).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    const s = durumF.sira;
    if (s === 'az') sonuc.sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr'));
    else if (s === 'tekrar') sonuc.sort((a, b) => (meta(b.key).sayac || 0) - (meta(a.key).sayac || 0));
    else if (s === 'ilerleme') sonuc.sort((a, b) => ilerleme(b).yuzde - ilerleme(a).yuzde);
    return sonuc;
  }
  function kartYap(c) {
    const m = meta(c.key), p = ilerleme(c);
    const k = el('div', 'km-kart'); k.style.setProperty('--km-renk', m.renk || 'var(--border)');
    const ust = el('div', 'km-kart-ust');
    ust.appendChild(el('span', 'km-kart-isaret', m.isaret || '📂'));
    const bilgi = el('div', 'km-kart-bilgi'); bilgi.appendChild(el('div', 'km-kart-baslik', c.baslik));
    bilgi.appendChild(el('div', 'km-kart-ref', refMetni(c.kaynakKume) + ' · ' + toplamOf(c) + ' âyet' + (c.tur === 's' ? ' · sûre kümesi' : '')));
    ust.appendChild(bilgi);
    const dm = el('button', 'km-kart-menu', '⋯'); dm.onclick = (e) => { e.stopPropagation(); duzenle(c); }; ust.appendChild(dm);
    k.appendChild(ust);
    if ((m.etiket || []).length) k.appendChild(etiketSatiri(m));
    k.appendChild(ilerlemeCubugu(p, m.renk));
    const alt = el('div', 'km-kart-alt');
    const o = el('button', 'km-kart-btn km-oku', '▶ Oku'); o.onclick = (e) => { e.stopPropagation(); oku_(c); };
    const t = el('button', 'km-kart-btn', '🔁 ' + (m.sayac || 0)); t.title = 'Tekrar say (+1)';
    t.onclick = (e) => { e.stopPropagation(); metaYaz(c.key, { sayac: (m.sayac || 0) + 1, sonTekrar: new Date().toISOString().slice(0, 10) }); yenile(); };
    const ok = el('button', 'km-kart-btn' + (p.durum === 'okundu' ? ' km-ok' : ''), p.durum === 'okundu' ? '✅ Okundu' : '☑ Okundu yap');
    ok.onclick = (e) => {
      e.stopPropagation();
      if (p.durum === 'okundu') metaYaz(c.key, { okunan: [] });
      else { const l = new Set(m.okunan || []); c.ayetler.forEach((r) => { for (let a = r.bas; a <= r.bit; a++) l.add(r.sure + ':' + a); }); metaYaz(c.key, { okunan: [...l] }); }
      yenile();
    };
    alt.appendChild(o); alt.appendChild(t); alt.appendChild(ok); k.appendChild(alt);
    k.onclick = () => duzenle(c);
    return k;
  }
  function konuKartlari(hub, tum) {
    const bas = el('div', 'km-baslik-satir'); bas.appendChild(el('div', 'km-baslik', '📁 Konu klasörleri'));
    const yeni = el('button', 'kb-mini', '＋ Konu'); yeni.onclick = () => konuFormu(null); bas.appendChild(yeni); hub.appendChild(bas);
    const kl = konular();
    if (!kl.length) { hub.appendChild(el('div', 'kut-yardim', 'Aynı konudaki kümeleri (Kıyamet, Kıssalar, Namaz…) bir klasörde topla. Bir kümenin ⋯ menüsünden “Konu klasörleri”ne ekleyebilirsin.')); return; }
    const gr = el('div', 'km-konu-grid');
    kl.forEach((k) => {
      const uyeler = tum.filter((c) => (k.uyeler || []).includes(c.key));
      const ort = uyeler.length ? Math.round(uyeler.reduce((n, c) => n + ilerleme(c).yuzde, 0) / uyeler.length) : 0;
      const kt = el('div', 'km-konu' + (durumF.konu === k.id ? ' aktif' : '')); if (k.renk) kt.style.setProperty('--km-renk', k.renk);
      kt.appendChild(el('div', 'km-konu-ikon', k.emoji || '📁'));
      kt.appendChild(el('div', 'km-konu-ad', k.ad));
      kt.appendChild(el('div', 'km-konu-alt', uyeler.length + ' küme · %' + ort));
      const m = el('button', 'km-konu-menu', '⋯'); m.onclick = (e) => { e.stopPropagation(); konuFormu(k); }; kt.appendChild(m);
      kt.onclick = () => { durumF.konu = durumF.konu === k.id ? '' : k.id; yenile(); };
      gr.appendChild(kt);
    });
    hub.appendChild(gr);
  }
  function konuFormu(k) {
    if (!window.KutAra) return;
    const S = window.KutAra.sayfa(k ? '📁 Konuyu düzenle' : '📁 Yeni konu klasörü'); const g = S.govde;
    const ad = el('input', 'kb-input'); ad.placeholder = 'Konu adı (ör. Kıyamet)'; ad.value = k ? k.ad : ''; g.appendChild(ad);
    let emoji = k ? k.emoji : '📁', renk = k ? k.renk : '';
    g.appendChild(el('div', 'km-bolum', 'Simge')); const es = el('div', 'km-sec-satir');
    const ciz = () => { es.innerHTML = ''; KONU_EMOJI.forEach((x) => { const b = el('button', 'km-isaret' + (emoji === x ? ' sec' : ''), x); b.onclick = () => { emoji = x; ciz(); }; es.appendChild(b); }); };
    ciz(); g.appendChild(es);
    g.appendChild(el('div', 'km-bolum', 'Renk')); const rs = el('div', 'km-sec-satir');
    const rciz = () => { rs.innerHTML = ''; ['', ...RENKLER].forEach((r) => { const b = el('button', 'km-renk' + (renk === r ? ' sec' : ''), r ? '' : '∅'); if (r) b.style.background = r; b.onclick = () => { renk = r; rciz(); }; rs.appendChild(b); }); };
    rciz(); g.appendChild(rs);
    const al = el('div', 'km-alt-eylem');
    const kay = el('button', 'kb-mini', '✓ Kaydet'); kay.onclick = () => { const a = ad.value.trim(); if (!a) return; konuYaz(Object.assign({ id: yeniId('c'), uyeler: [] }, k || {}, { ad: a, emoji, renk })); S.kapat(); yenile(); };
    al.appendChild(kay);
    if (k) { const sil = el('button', 'kb-mini km-sil', '🗑 Klasörü sil'); sil.onclick = () => { if (!confirm('Konu klasörü silinsin mi? (İçindeki kümeler silinmez)')) return; konuYaz(Object.assign({}, k, { sil: true, uyeler: [] })); if (durumF.konu === k.id) durumF.konu = ''; S.kapat(); yenile(); }; al.appendChild(sil); }
    g.appendChild(al);
  }
  function yenile() {
    ustKur();
    const hub = document.getElementById('km-hub'); const liste = document.getElementById('kume-listesi'); if (!hub || !liste) return;
    const tum = tumKumeler();
    const odak = document.activeElement && document.activeElement.id === 'km-ara' ? document.activeElement.selectionStart : null;
    hub.innerHTML = '';
    konuKartlari(hub, tum);

    const ara = el('input', 'kb-input'); ara.id = 'km-ara'; ara.placeholder = '🔍 Kümelerde ve etiketlerde ara…'; ara.value = durumF.ara;
    ara.oninput = () => { durumF.ara = ara.value; listeCiz(); }; hub.appendChild(ara);
    const f = el('div', 'km-filtre');
    [['hepsi', 'Tümü'], ['okunmadi', 'Okunmadı'], ['okunuyor', 'Okunuyor'], ['okundu', 'Okundu']].forEach(([d, ad]) => {
      const b = el('button', 'km-chip' + (durumF.durum === d ? ' sec' : ''), ad); b.onclick = () => { durumF.durum = d; yenile(); }; f.appendChild(b);
    });
    RENKLER.forEach((r) => { if (!Object.keys(D.meta).some((k) => D.meta[k].renk === r)) return; const b = el('button', 'km-chip km-chip-renk' + (durumF.renk === r ? ' sec' : '')); b.style.background = r; b.onclick = () => { durumF.renk = durumF.renk === r ? '' : r; yenile(); }; f.appendChild(b); });
    hub.appendChild(f);
    const et = tumEtiketler();
    if (et.length) { const ef = el('div', 'km-filtre'); et.slice(0, 20).forEach((t) => { const b = el('button', 'km-chip' + (durumF.etiket === t ? ' sec' : ''), '#' + t); b.onclick = () => { durumF.etiket = durumF.etiket === t ? '' : t; yenile(); }; ef.appendChild(b); }); hub.appendChild(ef); }
    const sr = el('div', 'km-sira'); sr.appendChild(el('span', '', 'Sırala:'));
    const sel = el('select', 'km-sel'); [['ekleme', 'Eklenme'], ['az', 'A–Z'], ['tekrar', 'En çok tekrar'], ['ilerleme', 'İlerleme']].forEach(([v, a]) => { const o = el('option', '', a); o.value = v; if (durumF.sira === v) o.selected = true; sel.appendChild(o); });
    sel.onchange = () => { durumF.sira = sel.value; listeCiz(); }; sr.appendChild(sel);
    const durum = el('span', 'km-senkron', senkronYazi); durum.id = 'km-senkron'; sr.appendChild(durum);
    hub.appendChild(sr);
    listeCiz();
    if (odak !== null) { const a = document.getElementById('km-ara'); if (a) { a.focus(); try { a.setSelectionRange(odak, odak); } catch (e) {} } }
    function listeCiz() {
      liste.innerHTML = '';
      const s = suzulmus(tum);
      if (!tum.length) { liste.innerHTML = '<div class="bos-durum"><div class="ic">📂</div>Henüz küme oluşturmadınız.</div>'; return; }
      if (!s.length) { liste.appendChild(el('div', 'kut-yardim', 'Bu filtreyle eşleşen küme yok.')); return; }
      if (durumF.konu) { const k = konular().find((x) => x.id === durumF.konu); if (k) liste.appendChild(el('div', 'km-baslik km-konu-baslik', (k.emoji || '📁') + ' ' + k.ad + ' — ' + s.length + ' küme')); }
      const gr = el('div', 'km-liste'); s.forEach((c) => gr.appendChild(kartYap(c))); liste.appendChild(gr);
    }
  }

  // ── Sûre içindeki "Ayetler" ekranındaki küme kartlarına üst-veri ekle ──
  const orijKart = window._skKumeKartiCiz;
  if (typeof orijKart === 'function') {
    window._skKumeKartiCiz = function (sNo, k) {
      const kart = orijKart.apply(this, arguments);
      try {
        const c = sureKumeDesc(sNo, k), m = meta(c.key), p = ilerleme(c);
        if (m.renk) kart.style.setProperty('--sk-renk', m.renk);
        const ikon = kart.querySelector('.sk-kart-ikon'); if (ikon && m.isaret) ikon.textContent = m.isaret;
        const metin = kart.querySelector('.sk-kart-metin');
        if (metin) {
          if ((m.etiket || []).length) metin.appendChild(etiketSatiri(m));
          const ek = []; if (p.tp && p.n) ek.push((p.durum === 'okundu' ? '✅ ' : '') + p.n + '/' + p.tp + ' okundu'); if (m.sayac) ek.push('🔁 ' + m.sayac);
          if (ek.length) metin.appendChild(el('div', 'km-sk-ozet', ek.join(' · ')));
        }
        const b = el('button', 'sk-kart-km', '⚙'); b.title = 'Renk, etiket, sayaç, ilerleme';
        b.onclick = (e) => { e.stopPropagation(); try { _kumeDugumuGaranti(sNo, k); } catch (x) {} duzenle(c, () => { if (typeof _skCiz === 'function') _skCiz(); }); };
        kart.appendChild(b);
      } catch (e) {}
      return kart;
    };
  }

  // ── GitHub senkronu (en yeni 'g' kazanır) ───────────────────
  let senkronYazi = '', senkronMesgul = false;
  function durumYaz(t) { senkronYazi = t; const e = document.getElementById('km-senkron'); if (e) e.textContent = t; }
  function birlestir(a, b) {
    const s = { v: 1, konular: [], meta: {}, tanim: {} };
    const idMap = {}; [].concat(a.konular || [], b.konular || []).forEach((k) => { if (!idMap[k.id] || (k.g || 0) > (idMap[k.id].g || 0)) idMap[k.id] = k; }); s.konular = Object.values(idMap);
    ['meta', 'tanim'].forEach((ad) => {
      const o = {}; [a[ad] || {}, b[ad] || {}].forEach((src) => Object.keys(src).forEach((key) => { if (!o[key] || (src[key].g || 0) > (o[key].g || 0)) o[key] = src[key]; })); s[ad] = o;
    });
    return s;
  }
  function tanimlariUygula() { // uzaktan gelen/silinen kullanıcı kümelerini yerel listeye yansıt
    const l = yerelKumeler(); let degisti = false;
    Object.keys(D.tanim).forEach((id) => {
      const t = D.tanim[id], i = l.findIndex((k) => k.id === id);
      if (t.sil) { if (i >= 0) { l.splice(i, 1); degisti = true; } }
      else if (i < 0 && t.k) { l.push(Object.assign({}, t.k, { id })); degisti = true; }
    });
    if (degisti) yerelKumelerYaz(l);
    return degisti;
  }
  async function senkron(sessiz) {
    if (senkronMesgul) return;
    if (typeof _githubHazirMi === 'function' && !_githubHazirMi()) { durumYaz('☁ GitHub ayarlı değil'); return; }
    senkronMesgul = true; durumYaz('☁ Eşitleniyor…');
    try {
      idAta();
      const { icerik } = await _githubDosyaOku(DOSYA);
      let uzak = { v: 1, konular: [], meta: {}, tanim: {} }; try { if (icerik) uzak = JSON.parse(icerik); } catch (e) {}
      const birlesik = birlestir(D, uzak);
      const degisti = JSON.stringify(birlesik) !== JSON.stringify(D);
      D = birlesik; try { localStorage.setItem(ANAHTAR, JSON.stringify(D)); } catch (e) {}
      const yerelDegisti = tanimlariUygula();
      const yeniMetin = JSON.stringify(D);
      if (yeniMetin !== JSON.stringify(birlestir(uzak, uzak))) await _githubDosyaGuncelle(DOSYA, yeniMetin, 'Küme merkezi güncellendi');
      durumYaz('☁ Eşitlendi ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      if (degisti || yerelDegisti) yenile();
    } catch (e) { durumYaz('☁ Eşitlenemedi'); if (!sessiz) toast('Küme merkezi eşitlenemedi: ' + e.message); }
    senkronMesgul = false;
  }

  // ── Bağlantılar ─────────────────────────────────────────────
  window.kumeListesiRender = function () { yenile(); };
  window.kumeSil = function (i) {
    const l = idAta(); const k = l[i]; if (!k) return;
    if (!confirm('Bu küme silinsin mi?')) return; kumeSilId(k.id);
  };
  const orijTab = window.tabGec;
  if (typeof orijTab === 'function') {
    window.tabGec = function (ad) { const r = orijTab.apply(this, arguments); if (ad === 'kumeler') { yenile(); senkron(true); } return r; };
  }
  window.KutKume = { meta, metaYaz, tumKumeler, senkron, duzenle, _durum: () => D };
  yenile();
})();
