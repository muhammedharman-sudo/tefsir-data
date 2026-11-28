/* 13-tefsir-karsilastir.js — Tefsir ekranı: Tekli mod + Âyet karşılaştırma modu
   • Karşılaştır: sûre + âyet seç → o âyetin tefsirleri. Görünüm: "Sayfa" (sağa-sola kaydır) veya "Alt alta".
   • Tefsir şeridi: uzun basıp sürükleyerek sırala; 👥 Âlimler penceresinden ara / aç-kapat / git / sürükle.
   • Âyet için açıklaması olmayan tefsir hiç gösterilmez.
   Mevcut tefsir verisi/dosyaları değişmez; yalnız okur. */
(function () {
  'use strict';
  const orij = window.tefsirlerEkraniRender;
  if (typeof orij !== 'function') return;

  /* ── küçük yardımcılar ── */
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const lsG = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const lsS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const jG = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const ad = (a) => (a === 'Tefsir' ? (typeof TEFSIR_GORUNEN_AD !== 'undefined' ? TEFSIR_GORUNEN_AD : 'İslamoğlu') : a);
  const sureAdi = (n) => (typeof SURELER !== 'undefined' && SURELER[n - 1]) ? SURELER[n - 1].isim : 'Sûre ' + n;
  const ayetSayisi = (n) => (typeof SURELER !== 'undefined' && SURELER[n - 1] && SURELER[n - 1].ayet) || 300;

  const css = el('style');
  css.textContent =
    '.tk-mod{display:flex;gap:8px;margin:0 0 14px}.tk-mod button{flex:1;padding:10px;border-radius:12px;border:1px solid var(--border);background:none;color:var(--ink);font-family:"Source Serif 4",serif;font-size:14px;font-weight:600;cursor:pointer}' +
    '.tk-mod button.on{background:var(--ink);color:var(--gold2);border-color:var(--ink)}' +
    '.tk-sec{display:flex;gap:8px;align-items:center;margin-bottom:10px}.tk-sec select{flex:1;min-width:0;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--paper2);color:var(--ink);font-size:14px}' +
    '.tk-ay{display:flex;align-items:center;gap:6px}.tk-ay button{width:40px;height:40px;border-radius:50%;border:1px solid var(--border);background:none;color:var(--ink);font-size:18px;cursor:pointer}.tk-ay input{width:56px;text-align:center;padding:9px 4px;border:1px solid var(--border);border-radius:10px;background:var(--paper2);color:var(--ink);font-size:15px}' +
    '.tk-ara{display:flex;gap:8px;align-items:center;margin:10px 0 8px}.tk-ara button{padding:8px 12px;border-radius:18px;border:1px solid var(--border);background:none;color:var(--ink);font-size:13px;font-weight:600;cursor:pointer}.tk-ara button.on{background:var(--gold);color:#fff;border-color:transparent}.tk-ara .tk-bosluk{flex:1}' +
    '.tk-serit{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.tk-serit::-webkit-scrollbar{display:none}' +
    '.tk-chip{flex:none;padding:8px 14px;border-radius:20px;border:1px solid var(--border);background:none;color:var(--ink);font-family:"Source Serif 4",serif;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;user-select:none;-webkit-user-select:none}' +
    '.tk-chip.on{background:var(--ink);color:var(--gold2);border-color:var(--ink)}.tk-chip.tk-tut{opacity:.8;transform:scale(1.06);box-shadow:0 3px 10px rgba(0,0,0,.25)}' +
    '.tk-nokta{display:flex;justify-content:center;gap:6px;margin:0 0 8px}.tk-nokta i{width:7px;height:7px;border-radius:50%;background:var(--border)}.tk-nokta i.on{background:var(--gold)}' +
    '.tk-pager{display:flex;align-items:flex-start;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none}.tk-pager::-webkit-scrollbar{display:none}' +
    '.tk-sf{flex:0 0 100%;scroll-snap-align:start;scroll-snap-stop:always;box-sizing:border-box;min-width:0}' +
    '.tk-kutu{border:1px solid var(--border);border-radius:14px;background:var(--paper2);padding:14px 14px 6px;margin:0 2px}' +
    '.tk-bas{font-family:"Source Serif 4",serif;font-size:13px;font-weight:700;color:var(--gold);margin:0 0 10px;line-height:1.4}.tk-bas span{color:var(--muted);font-weight:400}' +
    '.tk-meal{font-family:"Source Serif 4",serif;font-size:15px;line-height:1.8;color:var(--ink);white-space:pre-wrap;margin-bottom:12px;font-style:italic;opacity:.9}' +
    '.tk-metin{font-family:"Source Serif 4",serif;font-size:15px;line-height:1.95;color:var(--ink)}.tk-metin p{margin:0 0 14px 0}' +
    '.tk-kart{border:1px solid var(--border);border-radius:14px;margin:0 0 12px;background:var(--paper2);overflow:hidden}.tk-kart>summary{cursor:pointer;list-style:none;padding:12px 14px;font-family:"Source Serif 4",serif;font-weight:700;color:var(--gold);display:flex;justify-content:space-between;gap:8px}.tk-kart>summary::-webkit-details-marker{display:none}.tk-kart .tk-ic{padding:0 14px 6px}' +
    '.tk-bos{text-align:center;padding:26px 14px;color:var(--muted);font-family:"Source Serif 4",serif;font-size:14px;line-height:1.7}' +
    '.tk-md{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}.tk-md>div{background:var(--paper,#fff);color:var(--ink);width:100%;max-width:560px;border-radius:18px 18px 0 0;padding:16px;max-height:86vh;overflow:auto;box-sizing:border-box}' +
    '.tk-ks{display:flex;align-items:center;gap:10px;padding:10px 4px;border-top:1px solid var(--border);font-size:15px;background:var(--paper,#fff)}.tk-ks input{width:20px;height:20px;flex:none}.tk-ks .tk-h{font-size:22px;color:var(--muted);touch-action:none;cursor:grab;padding:0 8px;user-select:none}.tk-ks.tk-tut{box-shadow:0 3px 12px rgba(0,0,0,.25);opacity:.9}' +
    '.tk-md button.tk-tamam{margin-top:12px;width:100%;padding:12px;border-radius:12px;border:0;background:var(--ink);color:#fff;font-size:15px}' +
    '.tk-ara button.tk-alimbtn{background:var(--ink);color:var(--gold2);border-color:var(--ink);padding:9px 14px;font-size:14px}' +
    '.tk-kl{display:flex;align-items:center;gap:8px;background:rgba(184,144,47,.14);border:1px solid rgba(184,144,47,.4);border-radius:14px;padding:8px 10px 8px 12px;margin:0 0 10px;font-size:14px}.tk-kl .ad{flex:1;min-width:0;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tk-kl .say{font-weight:700;color:var(--gold);white-space:nowrap}.tk-kl button{border:0;background:none;color:var(--ink);font-size:16px;padding:4px 8px;cursor:pointer}' +
    '.tk-ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.tk-pb{font-family:"Playfair Display","Source Serif 4",serif;font-size:17px;font-weight:700}.tk-px{border:0;background:none;color:var(--muted);font-size:20px;padding:4px 8px;cursor:pointer}' +
    '.tk-parama{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:var(--paper2);color:var(--ink);font-size:16px;margin-bottom:8px}' +
    '.tk-peylem{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}.tk-peylem button{padding:7px 11px;border-radius:16px;border:1px solid var(--border);background:none;color:var(--ink);font-size:13px;cursor:pointer}' +
    '.tk-pipucu{font-size:11.5px;color:var(--muted);margin:2px 0 6px;line-height:1.5}' +
    '.tk-isim{flex:1;min-width:0;text-align:left;background:none;border:0;color:var(--ink);font-family:"Source Serif 4",serif;font-size:16px;padding:6px 0;cursor:pointer;display:flex;flex-direction:column;gap:1px}' +
    '.tk-isim .tk-var{font-size:11.5px;color:#2f7d4f}.tk-isim .tk-yok{font-size:11.5px;color:var(--muted)}';
  document.head.appendChild(css);

  /* ── durum ── */
  const S = { sNo: +lsG('tk_sure', 0) || 0, aNo: +lsG('tk_ayet', 1) || 1, aktifAlim: null, bekleyen: {}, klasor: jG('tk_klasor', null) };
  const klasorKaydet = () => { lsS('tk_klasor', JSON.stringify(S.klasor)); };
  const klasorCik = () => { S.klasor = null; try { localStorage.removeItem('tk_klasor'); } catch (e) {} };
  const klasorGit = (i) => { const K = S.klasor; if (!K) return; K.i = Math.max(0, Math.min(K.items.length - 1, i)); S.sNo = K.items[K.i].s; S.aNo = K.items[K.i].a; kaydetDurum(); klasorKaydet(); tefsirlerEkraniRender(); };
  const mod = () => lsG('tk_mod', 'tekli');
  const gorunum = () => lsG('tk_gorunum', 'sayfa');

  /* ── kaynak sırası / açık-kapalı ── */
  function varsayilanAcik(a) {
    const t = jG('tefsir_chip_grup_v1', {})[a];
    if (t === 'tefsir') return true; if (t === 'not') return false;
    return a === 'Tefsir' || _alimKaynagiTuru(a) === 'github';
  }
  const acikMi = (a) => { const m = jG('tk_acik', {}); return a in m ? !!m[a] : varsayilanAcik(a); };
  function sirali() {
    const hepsi = _alimTefsirListesiGetir(); const kayitli = jG('tk_sira', []);
    const out = kayitli.filter((a) => hepsi.indexOf(a) >= 0);
    hepsi.forEach((a) => { if (out.indexOf(a) < 0) out.push(a); });
    return out;
  }
  const siraKaydet = (liste) => lsS('tk_sira', JSON.stringify(liste));

  /* ── âyetin tefsiri ── */
  function girdi(alim, sNo, a) {
    if (alim === 'Tefsir' && typeof _bellekTefsirKaynakliMi === 'function' && !_bellekTefsirKaynakliMi(sNo) && typeof _bellekTefsirSureHazirla === 'function') {
      if (!S.bekleyen[sNo]) { S.bekleyen[sNo] = true; _bellekTefsirSureHazirla(sNo, () => { try { if (mod() === 'karsi') tefsirlerEkraniRender(); } catch (e) {} }); }
      return null;
    }
    const v = _alimTefsirMetniGetir2(alim, sNo) || {};
    const tur = _alimKaynagiTuru(alim);
    if (tur === 'notlar') { const t = v[a]; return t ? { grup: String(a), meal: String(t), tefsir: '', duz: true } : null; }
    const keys = Object.keys(v);
    for (const k of keys) {
      const nums = k.split(',').map(Number);
      if (nums.indexOf(a) >= 0) { const x = v[k]; return (x && typeof x === 'object') ? { grup: k, meal: x.meal || '', tefsir: x.tefsir || '' } : { grup: k, meal: String(x || ''), tefsir: '', duz: true }; }
    }
    return null;
  }
  const GENEL = /^(izah[ıi]?|giri[şs]|genel\s+tespitler?|âyetin\s+izah[ıi]|ayetin\s+izah[ıi]|tefsir[i]?|meal|a[çc][ıi]klama(s[ıi])?|not(lar)?|dipnotlar?)$/i;
  function konular(t) {
    const o = [];
    String(t || '').split(/\n+/).forEach((s) => { if (s.slice(0, 3) !== '## ') return; let k = s.slice(3).replace(/^\s*\d+\s*[.)\-–]\s*/, '').replace(/[\s:.\-–—]+$/, '').trim(); if (k && window.tefsirBaslikDuzelt) k = window.tefsirBaslikDuzelt(k); if (k && !GENEL.test(k.toLocaleLowerCase('tr')) && o.indexOf(k) < 0) o.push(k); });
    return o;
  }
  const grupEtiket = (g) => { const p = g.split(','); return (p.length > 1 ? p[0] + '–' + p[p.length - 1] + '. âyetler' : p[0] + '. âyet'); };

  function govde(alim, sNo, e) {
    const k = el('div', 'tk-sayfa tk-kok'); k.setAttribute('data-vk', alim + '|' + sNo + '|' + e.grup);
    let meal = e.meal;
    if (e.duz) {
      const gb = (alim === 'Tefsir' && typeof tefsirGirisBol === 'function') ? tefsirGirisBol(meal) : null;
      const mh = (x) => esc(x).replace(/^(\d+)\.\s/gm, '<span style="color:var(--gold);font-weight:600;">$1.</span> ');
      if (gb) {
        const d = el('details'); d.style.cssText = 'margin-bottom:12px;border:1px dashed var(--gold);border-radius:12px;padding:8px 12px;';
        const s = el('summary', null, 'Giriş (okunuş · meal · alıntı)'); s.style.cssText = 'cursor:pointer;color:var(--gold);font-weight:600;font-size:14px;'; d.appendChild(s);
        const g = el('div', 'tk-meal'); g.innerHTML = mh(gb.giris); d.appendChild(g); k.appendChild(d);
        const m = el('div', 'tk-meal'); m.style.fontStyle = 'normal'; m.innerHTML = mh(gb.govde); k.appendChild(m);
      } else { const m = el('div', 'tk-meal'); m.style.fontStyle = 'normal'; m.innerHTML = mh(meal); k.appendChild(m); }
      return k;
    }
    if (meal) { const m = el('div', 'tk-meal'); m.textContent = meal; k.appendChild(m); }
    if (e.tefsir) {
      const t = el('div', 'tk-metin');
      t.innerHTML = e.tefsir.split(/\n+/).filter((p) => p.trim()).map((p) => '<p>' + esc(p.trim()).replace(/(\([^)]+\))/g, '<span style="color:var(--gold);font-weight:600;">$1</span>') + '</p>').join('');
      k.appendChild(t);
    }
    return k;
  }

  /* ── sürükleyerek sıralama ── */
  function surukle(kap, itemSel, bitti, handleSel, yatay) {
    let tut = null, zaman = null, bx = 0, by = 0, surukluyor = false;
    kap.addEventListener('touchmove', (ev) => { if (surukluyor && ev.cancelable) ev.preventDefault(); }, { passive: false });
    kap.addEventListener('pointerdown', (ev) => {
      const it = ev.target.closest(itemSel); if (!it || !kap.contains(it)) return;
      if (handleSel && !ev.target.closest(handleSel)) return;
      bx = ev.clientX; by = ev.clientY;
      const basla = () => { surukluyor = true; tut = it; it.classList.add('tk-tut'); try { it.setPointerCapture(ev.pointerId); } catch (e) {} if (navigator.vibrate) navigator.vibrate(15); };
      if (handleSel) basla(); else zaman = setTimeout(basla, 380);
    });
    kap.addEventListener('pointermove', (ev) => {
      if (!tut) { if (zaman && (Math.abs(ev.clientX - bx) > 8 || Math.abs(ev.clientY - by) > 8)) { clearTimeout(zaman); zaman = null; } return; }
      Array.from(kap.querySelectorAll(itemSel)).forEach((s) => {
        if (s === tut) return; const r = s.getBoundingClientRect();
        const icinde = yatay ? (ev.clientX >= r.left && ev.clientX <= r.right) : (ev.clientY >= r.top && ev.clientY <= r.bottom);
        if (!icinde) return;
        const once = !!(tut.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING);
        kap.insertBefore(tut, once ? s : s.nextSibling);
      });
      if (yatay && kap.scrollWidth > kap.clientWidth) { const r = kap.getBoundingClientRect(); if (ev.clientX > r.right - 30) kap.scrollLeft += 8; else if (ev.clientX < r.left + 30) kap.scrollLeft -= 8; }
    });
    const bit = () => { clearTimeout(zaman); zaman = null; if (tut) { tut.classList.remove('tk-tut'); const t = tut; tut = null; surukluyor = false; kap.dataset.surukle = '1'; setTimeout(() => { delete kap.dataset.surukle; }, 350); bitti(Array.from(kap.querySelectorAll(itemSel)).map((x) => x.getAttribute('data-alim'))); } };
    ['pointerup', 'pointercancel'].forEach((o) => kap.addEventListener(o, bit));
  }
  function siraBirlestir(altKume) {
    const tam = sirali(); const yer = []; tam.forEach((a, i) => { if (altKume.indexOf(a) >= 0) yer.push(i); });
    altKume.forEach((a, j) => { tam[yer[j]] = a; }); siraKaydet(tam);
  }

  /* ── âlim seçim penceresi (alttan açılan liste: arama + onay kutusu + tümü/hiçbiri + sürükle + "git") ── */
  function varMi(a) {
    try {
      if (a === 'Tefsir' && typeof _bellekTefsirKaynakliMi === 'function' && !_bellekTefsirKaynakliMi(S.sNo)) return null;
      return !!girdi(a, S.sNo, S.aNo);
    } catch (e) { return null; }
  }
  const foldTr = (x) => String(x || '').toLocaleLowerCase('tr').replace(/[âäà]/g, 'a').replace(/[îïì]/g, 'i').replace(/[ûüù]/g, 'u').replace(/[ôöò]/g, 'o').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/[’'`]/g, '');
  function kaynaklarPenceresi() {
    const ov = el('div', 'tk-md'); const k = el('div'); ov.appendChild(k);
    const kapat = () => { ov.remove(); tefsirlerEkraniRender(); };
    ov.addEventListener('click', (e) => { if (e.target === ov) kapat(); });
    const bas = el('div', 'tk-ph'); const baslik = el('div', 'tk-pb'); bas.appendChild(baslik);
    const x = el('button', 'tk-px', '✕'); x.onclick = kapat; bas.appendChild(x); k.appendChild(bas);
    const ara = el('input', 'tk-parama'); ara.type = 'search'; ara.placeholder = '🔍 Âlim ara…'; k.appendChild(ara);
    const eylem = el('div', 'tk-peylem');
    const bT = el('button', null, '✓ Tümünü aç'); const bH = el('button', null, '○ Hiçbiri'); const bV = el('button', null, '● Bu âyette olanlar');
    eylem.appendChild(bT); eylem.appendChild(bH); eylem.appendChild(bV); k.appendChild(eylem);
    k.appendChild(el('div', 'tk-pipucu', 'Adına dokun: o âlime git · kutu: göster/gizle · ≡: sürükleyip sırala'));
    const l = el('div'); k.appendChild(l);
    const sayac = () => { const hepsi = sirali(); baslik.textContent = '👥 Âlimler (' + hepsi.filter(acikMi).length + '/' + hepsi.length + ' açık)'; };
    const kutular = {};
    const hepsiniYaz = (fn) => { const m = jG('tk_acik', {}); sirali().forEach((a) => { m[a] = fn(a); }); lsS('tk_acik', JSON.stringify(m)); Object.keys(kutular).forEach((a) => { kutular[a].checked = acikMi(a); }); sayac(); };
    bT.onclick = () => hepsiniYaz(() => true);
    bH.onclick = () => hepsiniYaz(() => false);
    bV.onclick = () => hepsiniYaz((a) => varMi(a) === true);
    sirali().forEach((a) => {
      const r = el('div', 'tk-ks'); r.setAttribute('data-alim', a); r.setAttribute('data-ara', foldTr(ad(a)));
      const c = el('input'); c.type = 'checkbox'; c.checked = acikMi(a); kutular[a] = c;
      c.onchange = () => { const m = jG('tk_acik', {}); m[a] = c.checked; lsS('tk_acik', JSON.stringify(m)); sayac(); };
      const isim = el('button', 'tk-isim'); isim.type = 'button';
      const v = varMi(a);
      isim.appendChild(el('span', 'tk-ad', (_alimKaynagiTuru(a) === 'notlar' && a !== 'Tefsir' ? '🔗 ' : '') + ad(a)));
      if (v === true) isim.appendChild(el('span', 'tk-var', 'bu âyette var')); else if (v === false) isim.appendChild(el('span', 'tk-yok', 'bu âyette yok'));
      isim.onclick = () => { const m = jG('tk_acik', {}); m[a] = true; lsS('tk_acik', JSON.stringify(m)); S.aktifAlim = a; kapat(); };
      r.appendChild(c); r.appendChild(isim); r.appendChild(el('span', 'tk-h', '≡'));
      l.appendChild(r);
    });
    ara.oninput = () => { const q = foldTr(ara.value.trim()); Array.from(l.children).forEach((r) => { r.style.display = (!q || r.getAttribute('data-ara').indexOf(q) >= 0) ? '' : 'none'; }); };
    surukle(l, '.tk-ks', (sira) => siraKaydet(sira), '.tk-h', false);
    const t = el('button', 'tk-tamam', 'Tamam'); t.onclick = kapat; k.appendChild(t);
    sayac(); document.body.appendChild(ov);
  }

  function klasorListesi() {
    const K = S.klasor; if (!K) return;
    const ov = el('div', 'tk-md'); const k = el('div'); ov.appendChild(k);
    const kapat = () => ov.remove(); ov.addEventListener('click', (e) => { if (e.target === ov) kapat(); });
    const bas = el('div', 'tk-ph'); bas.appendChild(el('div', 'tk-pb', '📂 ' + K.ad)); const x = el('button', 'tk-px', '✕'); x.onclick = kapat; bas.appendChild(x); k.appendChild(bas);
    K.items.forEach((it, i) => { const b = el('button', 'tk-ks', null); b.style.cssText = 'display:block;width:100%;text-align:left;padding:11px 12px;margin:4px 0;border-radius:11px;border:1px solid var(--border);background:' + (i === K.i ? 'rgba(184,144,47,.16)' : 'none') + ';color:var(--ink);font-family:inherit;font-size:15px;cursor:pointer'; b.textContent = (i === K.i ? '● ' : '') + (i + 1) + '. ' + sureAdi(it.s) + ' ' + it.s + ':' + it.a; b.onclick = () => { kapat(); klasorGit(i); }; k.appendChild(b); });
    document.body.appendChild(ov);
  }

  /* ── karşılaştırma ekranı ── */
  function karsiCiz(ic) {
    ic.innerHTML = ''; ic.appendChild(modCubugu());
    if (!S.sNo) S.sNo = (typeof _tefsirlerSecimi2 !== 'undefined' && _tefsirlerSecimi2.sureNo) || 1;
    S.aNo = Math.max(1, Math.min(S.aNo, ayetSayisi(S.sNo)));
    if (S.klasor) { // klasör modu: konumu senkronla
      const K = S.klasor; let ix = K.items.findIndex((x) => x.s === S.sNo && x.a === S.aNo);
      if (ix < 0) { S.sNo = K.items[K.i || 0].s; S.aNo = K.items[K.i || 0].a; ix = K.i || 0; }
      K.i = ix; klasorKaydet();
      const sr = el('div', 'tk-kl'); sr.appendChild(el('span', null, '📂'));
      sr.appendChild(el('span', 'ad', K.ad)); sr.appendChild(el('span', 'say', (ix + 1) + ' / ' + K.items.length));
      const lb = el('button', null, '☰'); lb.title = 'Listeden seç'; lb.onclick = klasorListesi; sr.appendChild(lb);
      const xb = el('button', null, '✕'); xb.title = 'Klasör modundan çık'; xb.onclick = () => { klasorCik(); tefsirlerEkraniRender(); }; sr.appendChild(xb);
      ic.appendChild(sr);
    }
    const kok = el('div', 'tk-ana'); ic.appendChild(kok);

    const sec = el('div', 'tk-sec'); const sel = el('select');
    for (let n = 1; n <= 114; n++) { const o = el('option', null, n + '. ' + sureAdi(n)); o.value = n; sel.appendChild(o); }
    sel.value = S.sNo; sel.onchange = () => { klasorCik(); S.sNo = +sel.value; S.aNo = 1; kaydetDurum(); tefsirlerEkraniRender(); };
    const ay = el('div', 'tk-ay'); const geri = el('button', null, '◀'); const ileri = el('button', null, '▶'); const inp = el('input'); inp.type = 'number'; inp.min = 1; inp.max = ayetSayisi(S.sNo); inp.value = S.aNo;
    geri.onclick = () => { if (S.klasor) { klasorGit(S.klasor.i - 1); return; } if (S.aNo > 1) S.aNo--; else if (S.sNo > 1) { S.sNo--; S.aNo = ayetSayisi(S.sNo); } kaydetDurum(); tefsirlerEkraniRender(); };
    ileri.onclick = () => { if (S.klasor) { klasorGit(S.klasor.i + 1); return; } if (S.aNo < ayetSayisi(S.sNo)) S.aNo++; else if (S.sNo < 114) { S.sNo++; S.aNo = 1; } kaydetDurum(); tefsirlerEkraniRender(); };
    inp.onchange = () => { const v = parseInt(inp.value); if (v >= 1 && S.klasor) klasorCik(); if (v >= 1 && v <= ayetSayisi(S.sNo)) { S.aNo = v; kaydetDurum(); tefsirlerEkraniRender(); } };
    ay.appendChild(geri); ay.appendChild(inp); ay.appendChild(ileri); sec.appendChild(sel); sec.appendChild(ay); kok.appendChild(sec);
    if (window.KayitliAyet) kok.appendChild(window.KayitliAyet.cubuk(S.sNo, S.aNo));

    const ayetKutu = el('div'); kok.appendChild(ayetKutu);
    if (typeof _ayetEmbedGetir === 'function') {
      _ayetEmbedGetir(S.sNo, S.aNo).then((r) => { ayetKutu.innerHTML = ''; ayetKutu.appendChild(_ayetEmbedKutuOlustur(S.sNo, S.aNo, r.ar, r.meal)); }).catch(() => {});
    }

    const ara = el('div', 'tk-ara');
    const bS = el('button', gorunum() === 'sayfa' ? 'on' : '', '↔ Sayfa'); const bA = el('button', gorunum() === 'alt' ? 'on' : '', '≡ Alt alta');
    bS.onclick = () => { lsS('tk_gorunum', 'sayfa'); tefsirlerEkraniRender(); }; bA.onclick = () => { lsS('tk_gorunum', 'alt'); tefsirlerEkraniRender(); };
    const hepsi = sirali(); const bK = el('button', 'tk-alimbtn', '👥 Âlimler ' + hepsi.filter(acikMi).length + '/' + hepsi.length); bK.onclick = kaynaklarPenceresi;
    ara.appendChild(bS); ara.appendChild(bA); ara.appendChild(el('span', 'tk-bosluk')); ara.appendChild(bK); kok.appendChild(ara);

    const girdiler = []; let yukleniyor = false;
    sirali().forEach((a) => { if (!acikMi(a)) return; const e = girdi(a, S.sNo, S.aNo); if (e) girdiler.push({ alim: a, e }); else if (a === 'Tefsir' && S.bekleyen[S.sNo] && typeof _bellekTefsirKaynakliMi === 'function' && !_bellekTefsirKaynakliMi(S.sNo)) yukleniyor = true; });
    if (!girdiler.length) { kok.appendChild(el('div', 'tk-bos', yukleniyor ? 'Yükleniyor…' : 'Bu âyet için seçili tefsirlerde açıklama bulunamadı. 👥 Âlimler’den başka kaynak açabilirsin.')); return; }
    if (!girdiler.some((g) => g.alim === S.aktifAlim)) S.aktifAlim = girdiler[0].alim;

    if (gorunum() === 'alt') {
      girdiler.forEach((g, i) => {
        const d = el('details', 'tk-kart'); d.open = i < 2;
        const s = el('summary'); s.appendChild(el('span', null, ad(g.alim))); const ge = el('span', null, grupEtiket(g.e.grup)); ge.style.cssText = 'font-weight:400;color:var(--muted);font-size:12px;'; s.appendChild(ge); d.appendChild(s);
        const kt = konular(g.e.tefsir); if (kt.length) { const h = el('div', 'tk-bas', ''); h.style.padding = '0 14px'; h.innerHTML = '<span>' + esc(kt.slice(0, 3).join(' · ')) + '</span>'; d.appendChild(h); }
        const ic2 = el('div', 'tk-ic'); ic2.appendChild(govde(g.alim, S.sNo, g.e)); d.appendChild(ic2); kok.appendChild(d);
      });
      return;
    }

    /* sayfa modu */
    const serit = el('div', 'tk-serit'); const noktalar = el('div', 'tk-nokta'); const pager = el('div', 'tk-pager');
    const sayfalar = []; const chipler = [];
    girdiler.forEach((g, i) => {
      const c = el('button', 'tk-chip', ad(g.alim)); c.setAttribute('data-alim', g.alim); c.onclick = () => { if (serit.dataset.surukle) return; pager.scrollTo({ left: i * pager.clientWidth, behavior: 'smooth' }); };
      serit.appendChild(c); chipler.push(c); noktalar.appendChild(el('i'));
      const p = el('div', 'tk-sf'); const kutu = el('div', 'tk-kutu');
      const kt = konular(g.e.tefsir); const bas = el('div', 'tk-bas', ad(g.alim) + ' · ' + grupEtiket(g.e.grup)); if (kt.length) { const sp = el('span', null, '  (' + kt.slice(0, 2).join(' · ') + (kt.length > 2 ? ' +' + (kt.length - 2) : '') + ')'); bas.appendChild(sp); }
      kutu.appendChild(bas); kutu.appendChild(govde(g.alim, S.sNo, g.e)); p.appendChild(kutu); pager.appendChild(p); sayfalar.push(p);
    });
    kok.appendChild(serit); if (girdiler.length > 1) kok.appendChild(noktalar); kok.appendChild(pager);
    surukle(serit, '.tk-chip', (sira) => siraBirlestir(sira), null, true);

    const aktifIsaretle = (i) => { chipler.forEach((c, j) => c.classList.toggle('on', j === i)); Array.from(noktalar.children).forEach((n, j) => n.classList.toggle('on', j === i)); const c = chipler[i]; if (c && c.scrollIntoView) { try { c.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch (e) {} } };
    let aktifIdx = Math.max(0, girdiler.findIndex((g) => g.alim === S.aktifAlim));
    const esitle = () => {
      const w = pager.clientWidth || 1; const f = pager.scrollLeft / w; const i = Math.max(0, Math.min(sayfalar.length - 1, Math.floor(f))); const t = f - i;
      const h0 = sayfalar[i].offsetHeight, h1 = (sayfalar[i + 1] ? sayfalar[i + 1].offsetHeight : h0);
      pager.style.height = (h0 + (h1 - h0) * t) + 'px';
      const idx = Math.max(0, Math.min(sayfalar.length - 1, Math.round(f)));
      if (idx !== aktifIdx) { aktifIdx = idx; S.aktifAlim = girdiler[idx].alim; aktifIsaretle(idx); }
    };
    pager.addEventListener('scroll', () => requestAnimationFrame(esitle), { passive: true });
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => esitle()); sayfalar.forEach((p) => ro.observe(p)); }
    document.addEventListener('selectionchange', function secKontrol() {
      if (!document.body.contains(pager)) { document.removeEventListener('selectionchange', secKontrol); return; }
      const s = window.getSelection(); pager.style.overflowX = (s && !s.isCollapsed && pager.contains(s.anchorNode)) ? 'hidden' : 'auto';
    });
    aktifIsaretle(aktifIdx);
    requestAnimationFrame(() => { pager.scrollLeft = aktifIdx * pager.clientWidth; esitle(); setTimeout(esitle, 120); });
  }

  const kaydetDurum = () => { lsS('tk_sure', S.sNo); lsS('tk_ayet', S.aNo); };

  /* ── mod çubuğu ── */
  function modCubugu() {
    const b = el('div', 'tk-mod'); const m = mod();
    const t = el('button', m === 'tekli' ? 'on' : '', '📖 Tekli'); const k = el('button', m === 'karsi' ? 'on' : '', '↔ Karşılaştır');
    t.onclick = () => { lsS('tk_mod', 'tekli'); tefsirlerEkraniRender(); }; k.onclick = () => { lsS('tk_mod', 'karsi'); tefsirlerEkraniRender(); };
    b.appendChild(t); b.appendChild(k); return b;
  }

  window.tefsirlerEkraniRender = function () {
    const ic = document.getElementById('tefsirler-ic'); if (!ic) return orij.apply(this, arguments);
    if (mod() === 'karsi' && !window._kaynaklarYukleniyor && _alimTefsirListesiGetir().length) {
      karsiCiz(ic); return;
    }
    const r = orij.apply(this, arguments);
    try { if (!ic.querySelector(':scope > .tk-mod')) ic.insertBefore(modCubugu(), ic.firstChild); } catch (e) {}
    return r;
  };

  window.TefsirKarsilastir = { klasorAc: (items, ad, i0) => { const g = []; const gor = {}; (items || []).forEach((x) => { const a = x.s + ':' + x.a; if (!gor[a] && x.s >= 1 && x.s <= 114 && x.a >= 1) { gor[a] = 1; g.push({ s: x.s, a: x.a }); } }); if (!g.length) return false; S.klasor = { ad: ad || 'Klasör', items: g, i: Math.max(0, Math.min(g.length - 1, i0 || 0)) }; S.sNo = g[S.klasor.i].s; S.aNo = g[S.klasor.i].a; kaydetDurum(); klasorKaydet(); lsS('tk_mod', 'karsi'); if (typeof tabGec === 'function') tabGec('tefsirler'); else tefsirlerEkraniRender(); return true; }, klasorCik: () => { klasorCik(); }, ac: (sNo, aNo) => { klasorCik(); S.sNo = sNo; S.aNo = aNo || 1; kaydetDurum(); lsS('tk_mod', 'karsi'); if (typeof tabGec === 'function') tabGec('tefsirler'); else tefsirlerEkraniRender(); } };
})();
