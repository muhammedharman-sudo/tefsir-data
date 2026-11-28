/* 11-vurgu.js — Tefsir ve Kavram makalelerinde metin vurgulama (renk + işaret). Metin dosyalarına DOKUNMAZ.
   Metni seç → alttaki çubuktan renk (sarı/mavi/yeşil/pembe) veya işaret (▶ ★ •) seç. Vurguya dokun → renk değiştir / sil.
   Kayıt: localStorage 'vurgular_v1' + GitHub'da data/vurgular.json (eşitlenir). */
(function () {
  'use strict';
  const LS = 'vurgular_v1';
  const RENK = { sari: '#ffd84d', mavi: '#6fb3ff', yesil: '#6fd69a', pembe: '#ff8fbd' };
  const ISARET = ['▶', '★', '•'];
  const css = document.createElement('style');
  css.textContent =
    'mark.vg{color:inherit;border-radius:3px;padding:0 1px;-webkit-box-decoration-break:clone;box-decoration-break:clone;}' +
    'mark.vg-sari{background:rgba(255,216,77,.5)}mark.vg-mavi{background:rgba(111,179,255,.42)}mark.vg-yesil{background:rgba(111,214,154,.45)}mark.vg-pembe{background:rgba(255,143,189,.42)}mark.vg-yok{background:transparent}' +
    'mark.vg[data-m]::before{content:attr(data-m) " ";color:var(--gold);font-weight:700;font-style:normal}' +
    '.vg-bar{position:fixed;left:50%;transform:translateX(-50%);bottom:84px;z-index:9998;display:none;gap:8px;align-items:center;padding:8px 10px;background:var(--ink,#222);border-radius:26px;box-shadow:0 4px 18px rgba(0,0,0,.35);max-width:96vw}' +
    '.vg-bar button{border:0;background:none;color:#fff;font-size:18px;line-height:1;min-width:34px;height:34px;border-radius:50%;cursor:pointer;padding:0}' +
    'mark.vg[data-n]::after{content:" 📝";font-size:.8em}.vg-bar{flex-wrap:wrap;justify-content:center;user-select:none;-webkit-user-select:none}.vg-nt{flex-basis:100%;color:#fff;font-size:13px;line-height:1.4;max-width:280px;padding:2px 6px 4px;opacity:.9;white-space:pre-wrap}' +
    '.vg-md{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}.vg-md>div{background:var(--paper,#fff);color:var(--ink,#222);width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:16px;max-height:80vh;overflow:auto}.vg-md textarea{width:100%;min-height:110px;font-size:16px;padding:10px;border:1px solid var(--border,#ccc);border-radius:10px;background:var(--paper2,#fff);color:inherit;box-sizing:border-box}.vg-md button{font-size:15px;padding:10px 14px;margin:8px 8px 0 0;border-radius:10px;border:1px solid var(--border,#ccc);background:none;color:inherit}.vg-md button.vg-ok{background:var(--ink,#222);color:#fff}.vg-md q{display:block;margin:0 0 10px;font-style:italic;opacity:.85}' +
    '.vg-bar .vg-r{border:2px solid rgba(255,255,255,.6)}.vg-bar .vg-sil{font-size:13px;width:auto;padding:0 10px;border-radius:17px;background:rgba(255,255,255,.15)}';
  document.head.appendChild(css);

  /* ── depolama ── */
  let VERI = {};
  try { VERI = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { VERI = {}; }
  const kaydet = () => { try { localStorage.setItem(LS, JSON.stringify(VERI)); } catch (e) {} esitleZamanla(); };
  const liste = (k) => (VERI[k] = VERI[k] || []);
  const canli = (k) => (VERI[k] || []).filter((r) => !r.d);

  /* ── GitHub eşitleme ── */
  let zE = null, esitleniyor = false;
  function birlestir(uzak) {
    let degisti = false;
    Object.keys(uzak || {}).forEach((k) => {
      const l = liste(k); const harita = {}; l.forEach((r) => (harita[r.id] = r));
      uzak[k].forEach((r) => { const y = harita[r.id]; if (!y) { l.push(r); degisti = true; } else if ((r.t || 0) > (y.t || 0)) { Object.assign(y, r); degisti = true; } });
    });
    return degisti;
  }
  async function cek() {
    try {
      const r = await fetch(_tazeUrl(_notlarGithubTabanUrlGetir() + 'data/vurgular.json'));
      if (!r.ok) return null; return await r.json();
    } catch (e) { return null; }
  }
  async function esitle() {
    if (esitleniyor) return; esitleniyor = true;
    try {
      if (typeof _githubHazirMi !== 'function' || !_githubHazirMi() || typeof _githubDosyaGuncelle !== 'function') return;
      const u = await cek(); if (u && birlestir(u)) { try { localStorage.setItem(LS, JSON.stringify(VERI)); } catch (e) {} uygulaHepsi(); }
      await _githubDosyaGuncelle('data/vurgular.json', JSON.stringify(VERI), 'Vurgular güncellendi');
    } catch (e) { console.warn('Vurgu eşitleme:', e && e.message); } finally { esitleniyor = false; }
  }
  function esitleZamanla() { clearTimeout(zE); zE = setTimeout(esitle, 2500); }
  (async () => { try { if (typeof _githubHazirMi === 'function' && _githubHazirMi()) { const u = await cek(); if (u && birlestir(u)) { try { localStorage.setItem(LS, JSON.stringify(VERI)); } catch (e) {} uygulaHepsi(); } } } catch (e) {} })();

  /* ── bağlam ── */
  const YOK = 'button,select,.tb-ok,.vg-bar,script,style,textarea,input';
  function kokler() {
    const o = [];
    document.querySelectorAll('.kk-metin[data-vk]').forEach((e) => o.push({ kok: e, key: 'K|' + e.dataset.vk }));
    document.querySelectorAll('.tk-kok[data-vk]').forEach((e) => o.push({ kok: e, key: 'T|' + e.getAttribute('data-vk') }));
    const t = document.getElementById('tefsirler-ic');
    try {
      if (t && !t.querySelector('.tk-kok') && t.offsetParent !== null && typeof _tefsirlerSecimi2 !== 'undefined' && _tefsirlerSecimi2.alim && _tefsirlerSecimi2.sureNo && _tefsirlerSecimi2.grup)
        o.push({ kok: t, key: 'T|' + _tefsirlerSecimi2.alim + '|' + _tefsirlerSecimi2.sureNo + '|' + _tefsirlerSecimi2.grup });
    } catch (e) {}
    return o;
  }
  const baglamBul = (n) => { const e = n && (n.nodeType === 1 ? n : n.parentElement); if (!e) return null; return kokler().find((k) => k.kok.contains(e)) || null; };

  function metinDugumleri(kok) {
    const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest(YOK)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const d = []; let pos = 0, n;
    while ((n = w.nextNode())) { d.push({ n, s: pos }); pos += n.data.length; }
    return { d, metin: d.map((x) => x.n.data).join('') };
  }

  /* ── uygulama ── */
  function sar(kok, r, bas, son) {
    const { d } = metinDugumleri(kok); let ilk = true;
    d.forEach((x) => {
      const a = Math.max(bas, x.s), b = Math.min(son, x.s + x.n.data.length);
      if (a >= b) return;
      let node = x.n; const la = a - x.s, lb = b - x.s;
      if (lb < node.data.length) node.splitText(lb);
      if (la > 0) node = node.splitText(la);
      const m = document.createElement('mark'); m.className = 'vg vg-' + (r.c || 'yok'); m.dataset.id = r.id; m.dataset.g = r.g;
      if (r.m && ilk) m.dataset.m = r.m; if (r.n && ilk) m.dataset.n = '1'; ilk = false;
      node.parentNode.replaceChild(m, node); m.appendChild(node);
    });
  }
  function uygula(kok, key) {
    canli(key).forEach((r) => {
      if (kok.querySelector('mark.vg[data-id="' + r.id + '"]')) return;
      const { metin } = metinDugumleri(kok); let bul = -1, i = -1;
      while ((i = metin.indexOf(r.q, i + 1)) >= 0) { if (!r.pre || metin.slice(Math.max(0, i - r.pre.length), i) === r.pre || (i < 30 && r.pre.endsWith(metin.slice(0, i)))) { bul = i; break; } }
      if (bul < 0) bul = metin.indexOf(r.q);
      if (bul >= 0) sar(kok, r, bul, bul + r.q.length);
    });
  }
  let zUyg = null;
  const gozle = new MutationObserver(() => { clearTimeout(zUyg); zUyg = setTimeout(uygulaHepsi, 120); });
  function uygulaHepsi() {
    gozle.disconnect();
    try { kokler().forEach((k) => uygula(k.kok, k.key)); } finally { gozle.observe(document.body, { childList: true, subtree: true }); }
  }
  const kaldir = (kok, g) => kok.querySelectorAll('mark.vg[data-g="' + g + '"]').forEach((m) => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });


  /* ── yardımcılar: not penceresi, kavrama ekleme ── */
  function pencere(ic) {
    const m = document.createElement('div'); m.className = 'vg-md'; const k = document.createElement('div'); m.appendChild(k);
    m.addEventListener('click', (e) => { if (e.target === m) m.remove(); }); ic(k, () => m.remove()); document.body.appendChild(m); return m;
  }
  function notSor(alinti, onceki, tamam) {
    pencere((k, kapat) => {
      const q = document.createElement('q'); q.textContent = alinti.length > 220 ? alinti.slice(0, 220) + '…' : alinti; k.appendChild(q);
      const ta = document.createElement('textarea'); ta.value = onceki || ''; ta.placeholder = 'Notunu yaz…'; k.appendChild(ta);
      const ok = document.createElement('button'); ok.className = 'vg-ok'; ok.textContent = 'Kaydet'; ok.onclick = () => { const v = ta.value.trim(); kapat(); tamam(v); };
      const ip = document.createElement('button'); ip.textContent = 'Vazgeç'; ip.onclick = kapat; k.appendChild(ok); k.appendChild(ip);
      setTimeout(() => ta.focus(), 50);
    });
  }
  function kaynakAdi(ctx) {
    if (ctx.key.slice(0, 2) === 'K|') return ctx.kok.dataset.vb || 'Kavram makalesi';
    const p = ctx.key.split('|'); let ad = p[1] === 'Tefsir' ? 'İslamoğlu' : p[1];
    let sure = p[2]; try { if (typeof SURELER !== 'undefined' && SURELER[sure - 1]) sure = SURELER[sure - 1].isim; } catch (e) {}
    const g = (p[3] || '').split(','); return ad + ' · ' + sure + ' ' + (g.length > 1 ? g[0] + '-' + g[g.length - 1] : g[0]);
  }
  function alintiKaynak(ctx) {
    if (ctx.key.slice(0, 2) === 'K|') return { tur: 'makale', id: ctx.key.slice(2), etiket: '🧩 ' + (ctx.kok.dataset.vb || 'Kavram makalesi') };
    const p = ctx.key.split('|'); return { tur: 'tefsir', alim: p[1], sure: +p[2], grup: p[3], etiket: '📖 ' + kaynakAdi(ctx) };
  }
  function kavramaEkle(metin, kaynak) {
    const KK = window.KutKavram;
    if (!KK || !KK.canli) { alert('Kavram Tefsiri henüz yüklenmedi.'); return; }
    pencere((k, kapat) => {
      const q = document.createElement('q'); q.textContent = metin.length > 220 ? metin.slice(0, 220) + '…' : metin; k.appendChild(q);
      const t = document.createElement('div'); t.textContent = 'Hangi kavrama eklensin?'; t.style.fontWeight = '700'; k.appendChild(t);
      const ekle = (kv) => {
        kv.metin = (kv.metin ? kv.metin.replace(/\s+$/, '') + '\n\n' : '') + '> ' + metin.replace(/\n+/g, ' ') + ' — *' + kaynak + '*\n';
        KK.kaydet(kv); kapat(); alert('✓ “' + kv.ad + '” kavramının metnine alıntı olarak eklendi.');
      };
      (KK.canli() || []).slice().sort((a, b) => (b.g || 0) - (a.g || 0)).forEach((kv) => { const b = document.createElement('button'); b.style.cssText = 'display:block;width:100%;text-align:left'; b.textContent = (kv.emoji || '🧩') + ' ' + kv.ad; b.onclick = () => ekle(kv); k.appendChild(b); });
      const y = document.createElement('button'); y.textContent = '＋ Yeni kavram oluştur'; y.onclick = () => { const a = prompt('Kavram adı:'); if (a && a.trim()) { const kv = KK.yeniKavram(a.trim()); ekle(kv); } }; k.appendChild(y);
      const ip = document.createElement('button'); ip.textContent = 'Vazgeç'; ip.onclick = kapat; k.appendChild(ip);
    });
  }

  /* ── çubuk ── */
  const bar = document.createElement('div'); bar.className = 'vg-bar';
  Object.keys(RENK).forEach((c) => { const b = document.createElement('button'); b.className = 'vg-r'; b.style.background = RENK[c]; b.dataset.c = c; b.setAttribute('aria-label', c); bar.appendChild(b); });
  ISARET.forEach((s) => { const b = document.createElement('button'); b.textContent = s; b.dataset.m = s; bar.appendChild(b); });
  const notB = document.createElement('button'); notB.textContent = '📝'; notB.dataset.a = 'not'; bar.appendChild(notB);
  const kavB = document.createElement('button'); kavB.textContent = '🧩'; kavB.dataset.a = 'kav'; kavB.setAttribute('aria-label', 'Kavrama ekle'); bar.appendChild(kavB);
  const ntEl = document.createElement('div'); ntEl.className = 'vg-nt'; ntEl.style.display = 'none'; bar.insertBefore(ntEl, bar.firstChild);
  const kmB = document.createElement('button'); kmB.textContent = '📂'; kmB.dataset.a = 'kume'; kmB.setAttribute('aria-label', 'Âyet atfını kümeye ekle'); kmB.title = 'Seçilen âyet atfını kümeye ekle'; bar.appendChild(kmB);
  const alB = document.createElement('button'); alB.textContent = '📥'; alB.dataset.a = 'alinti'; alB.setAttribute('aria-label', 'Nota alıntı ekle'); bar.appendChild(alB);
  const silB = document.createElement('button'); silB.className = 'vg-sil'; silB.textContent = '✕ Sil'; silB.style.display = 'none'; bar.appendChild(silB);
  const ekle = () => { if (!bar.parentNode) document.body.appendChild(bar); };
  let mod = null; // {tur:'yeni', ctx, parcalar} | {tur:'duzenle', ctx, g}
  const gizle = () => { bar.style.display = 'none'; mod = null; };
  const goster = (m) => {
    ekle(); mod = m; silB.style.display = m.tur === 'duzenle' ? '' : 'none';
    const n = m.tur === 'duzenle' ? (liste(m.ctx.key).find((r) => r.g === m.g && !r.d && r.n) || {}).n : '';
    ntEl.textContent = n || ''; ntEl.style.display = n ? '' : 'none'; bar.style.display = 'flex';
  };
  let barZaman = 0;
  ['pointerdown', 'mousedown'].forEach((o) => bar.addEventListener(o, (e) => { barZaman = Date.now(); if (e.cancelable) e.preventDefault(); }));
  bar.addEventListener('touchstart', () => { barZaman = Date.now(); }, { passive: true });

  function secimdenParcalar(ctx) {
    const sel = window.getSelection(); if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const rg = sel.getRangeAt(0); const { d, metin } = metinDugumleri(ctx.kok); const out = [];
    d.forEach((x) => {
      if (!rg.intersectsNode(x.n)) return;
      let a = 0, b = x.n.data.length;
      if (x.n === rg.startContainer) a = rg.startOffset; if (x.n === rg.endContainer) b = rg.endOffset;
      const q = x.n.data.slice(a, b); if (!q.trim()) return;
      const off = x.s + a; out.push({ q, pre: metin.slice(Math.max(0, off - 30), off) });
    });
    return out.length ? out : null;
  }
  const yeniId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || !mod) return;
    const ctx = mod.ctx, k = ctx.key;
    if (b.dataset.a === 'alinti') {
      const metin = mod.tur === 'yeni' ? mod.parcalar.map((p) => p.q).join('\n') : liste(k).filter((r) => r.g === mod.g && !r.d).map((r) => r.q).join('\n');
      const kay = alintiKaynak(ctx); gizle();
      if (window.AlintiNot) window.AlintiNot.ekle({ metin, kaynak: kay }); else alert('Alıntı modülü yüklenmedi.');
      return;
    }
    if (b.dataset.a === 'kume') { const metin = mod.tur === 'yeni' ? mod.parcalar.map((p) => p.q).join(' ') : liste(k).filter((r) => r.g === mod.g && !r.d).map((r) => r.q).join(' '); gizle(); if (window.KumeyeEkle) window.KumeyeEkle.metinleAc(metin); else alert('Kümeye ekleme modülü yüklenmedi.'); return; }
    if (b.dataset.a === 'kav') { const metin = mod.tur === 'yeni' ? mod.parcalar.map((p) => p.q).join(' … ') : liste(k).filter((r) => r.g === mod.g && !r.d).map((r) => r.q).join(' … '); const kay = kaynakAdi(ctx); gizle(); if (ctx.key.slice(0, 2) === 'K|' && window.KavramMakalePasaj) { const kok = ctx.kok; const kd = kok.dataset || {}; let kaynak = ''; try { const m0 = kok.parentElement && kok.parentElement.querySelector('.kk-meta'); kaynak = m0 ? ((/^(Kalkan|Kavramlar|Ansiklopedi|Yeni eklenenler)/.exec(m0.textContent) || [])[1] || '') : ''; } catch (e) {} window.KavramMakalePasaj.ekle({ metin, id: ctx.key.slice(2), baslik: kd.vb || '', kaynak: ({ 'Kalkan': 'kalkan', 'Kavramlar': 'kavramlar', 'Ansiklopedi': 'ansiklopedi', 'Yeni eklenenler': 'yeni' })[kaynak] || '' }); return; } kavramaEkle(metin, kay); return; }
    if (b.dataset.a === 'not') {
      const m0 = mod; const onc = m0.tur === 'duzenle' ? ((liste(k).find((r) => r.g === m0.g && !r.d && r.n) || {}).n || '') : '';
      const alinti = m0.tur === 'yeni' ? m0.parcalar.map((p) => p.q).join(' … ') : liste(k).filter((r) => r.g === m0.g && !r.d).map((r) => r.q).join(' … ');
      gizle();
      notSor(alinti, onc, (n) => {
        const t = Date.now();
        if (m0.tur === 'yeni') { const g = yeniId(); m0.parcalar.forEach((p, i) => liste(k).push({ id: g + '.' + i, g, q: p.q, pre: p.pre, c: 'yok', m: '', n: i === 0 ? n : '', t })); const sel = window.getSelection(); if (sel) sel.removeAllRanges(); }
        else { const h = liste(k).filter((r) => r.g === m0.g && !r.d); h.forEach((r) => { r.n = ''; r.t = t; }); if (h[0]) h[0].n = n; kaldir(m0.ctx.kok, m0.g); }
        kaydet(); uygulaHepsi();
      }); return;
    }
    if (mod.tur === 'yeni') {
      const c = b.dataset.c || 'yok', m = b.dataset.m || '';
      const g = yeniId(); const t = Date.now();
      mod.parcalar.forEach((p, i) => liste(k).push({ id: g + '.' + i, g, q: p.q, pre: p.pre, c, m: i === 0 ? m : '', t }));
      const sel = window.getSelection(); if (sel) sel.removeAllRanges();
      kaydet(); uygulaHepsi(); gizle(); return;
    }
    const g = mod.g; const hepsi = liste(k).filter((r) => r.g === g && !r.d); const t = Date.now();
    if (b === silB) { hepsi.forEach((r) => { r.d = 1; r.t = t; }); kaldir(ctx.kok, g); }
    else {
      if (b.dataset.c) hepsi.forEach((r) => { r.c = b.dataset.c; r.t = t; });
      else if (b.dataset.m) { const ilk = hepsi[0]; if (ilk) { ilk.m = ilk.m === b.dataset.m ? '' : b.dataset.m; ilk.t = t; } }
      kaldir(ctx.kok, g);
    }
    kaydet(); uygulaHepsi(); gizle();
  });

  let zS = null;
  document.addEventListener('selectionchange', () => {
    clearTimeout(zS);
    zS = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) { if (mod && mod.tur === 'yeni' && Date.now() - barZaman > 1500) gizle(); return; }
      const ctx = baglamBul(sel.anchorNode); if (!ctx || !baglamBul(sel.focusNode)) { if (mod && mod.tur === 'yeni') gizle(); return; }
      const parcalar = secimdenParcalar(ctx); if (!parcalar) return;
      goster({ tur: 'yeni', ctx, parcalar });
    }, 300);
  });
  document.addEventListener('click', (e) => {
    if (bar.contains(e.target)) return;
    const m = e.target.closest && e.target.closest('mark.vg');
    const sel = window.getSelection();
    if (m && (!sel || sel.isCollapsed)) { const ctx = baglamBul(m); if (ctx) { goster({ tur: 'duzenle', ctx, g: m.dataset.g }); return; } }
    if (mod && mod.tur === 'duzenle') gizle();
  });

  if (document.body) uygulaHepsi(); else document.addEventListener('DOMContentLoaded', uygulaHepsi);
})();
