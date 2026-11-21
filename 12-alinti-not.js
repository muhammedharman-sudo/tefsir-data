/* 12-alinti-not.js — Alıntıyı nota ekleme (Kavram makalesi, Kütüphane kitabı, Tefsir → küme / sûre klasörü / âyet notu)
   - window.AlintiNot.ekle({metin, kaynak}) → "Nota ekle" penceresi (alıntı düzenlenebilir, isteğe bağlı yorum, birden çok hedef)
   - window.AlintiNot.hedefBelirle({sNo,id,baslik}) → "alıntı modu": üstte hedef şeridi, okurken 📥 ile eklenir
   - Not Ekle düğmesine (küme/klasör ekranı) kaynak seçeneği menüsü eklenir (mevcut _skCiz sarılır).
   - Alıntı notundaki kaynak satırına dokununca kaynak açılır. */
(function () {
  'use strict';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = (m) => { try { if (window.KutAra && KutAra.toast) return KutAra.toast(m); } catch (e) {} alert(m); };
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  const css = document.createElement('style');
  css.textContent =
    'blockquote.aln-q{margin:.4em 0;padding:.3em 0 .3em 12px;border-left:3px solid var(--gold,#b8902f);font-style:italic}blockquote.aln-q p{margin:.35em 0}' +
    'p.aln-k{font-size:.85em;margin:.2em 0 .6em}p.aln-k a{color:var(--gold,#b8902f);text-decoration:underline}' +
    '.aln-md{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}' +
    '.aln-md>div{background:var(--paper,#fff);color:var(--ink,#222);width:100%;max-width:560px;border-radius:18px 18px 0 0;padding:16px;max-height:88vh;overflow:auto;box-sizing:border-box}' +
    '.aln-md h4{margin:12px 0 6px;font-size:14px}.aln-md textarea,.aln-md input[type=text],.aln-md input[type=number],.aln-md select{width:100%;box-sizing:border-box;font-size:16px;padding:9px;border:1px solid var(--border,#ccc);border-radius:10px;background:var(--paper2,#fff);color:inherit;font-family:inherit}' +
    '.aln-md textarea{min-height:90px}.aln-md button{font-size:15px;padding:9px 13px;margin:6px 6px 0 0;border-radius:10px;border:1px solid var(--border,#ccc);background:none;color:inherit}' +
    '.aln-md button.aln-ok{background:var(--ink,#222);color:#fff}.aln-md button.on{background:var(--gold,#b8902f);color:#fff;border-color:transparent}' +
    '.aln-satir{display:flex;align-items:flex-start;gap:8px;padding:7px 4px;border-top:1px solid var(--border,#ddd);font-size:15px;line-height:1.35}.aln-satir input{margin-top:3px;width:18px;height:18px;flex:none}' +
    '.aln-chip{display:inline-block;background:var(--paper2,#eee);border:1px solid var(--border,#ccc);border-radius:14px;padding:3px 9px;margin:3px 4px 0 0;font-size:13px}.aln-chip b{cursor:pointer;margin-left:6px}' +
    '.aln-serit{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9996;background:var(--gold,#b8902f);color:#fff;border-radius:20px;padding:7px 14px;font-size:13px;box-shadow:0 3px 12px rgba(0,0,0,.3);max-width:92vw;display:none;align-items:center;gap:10px}' +
    '.aln-serit button{background:rgba(255,255,255,.25);border:0;color:#fff;border-radius:12px;padding:3px 10px;font-size:13px}';
  document.head.appendChild(css);

  /* ── hedef şeridi (alıntı modu) ── */
  let HEDEF = null;
  const serit = el('div', 'aln-serit'); const seritMetin = el('span'); const seritKapat = el('button', null, '✕ Bitir');
  serit.appendChild(seritMetin); serit.appendChild(seritKapat); seritKapat.onclick = () => hedefBelirle(null);
  function hedefBelirle(h) {
    HEDEF = h; if (!serit.parentNode) document.body.appendChild(serit);
    if (h) { seritMetin.textContent = '📥 Alıntı hedefi: ' + (h.baslik || 'seçili not') + ' — metni seçip 📥’e bas'; serit.style.display = 'flex'; } else serit.style.display = 'none';
  }

  /* ── HTML üretimi ── */
  function notHtml(metin, kaynak, yorum) {
    const par = String(metin).split(/\n+/).map((s) => s.trim()).filter(Boolean).map((s) => '<p>' + esc(s) + '</p>').join('');
    const veri = encodeURIComponent(JSON.stringify(kaynak || {}));
    let h = '<blockquote class="aln-q">' + par + '</blockquote><p class="aln-k"><a href="#" data-aln="' + veri + '">' + esc(kaynak.etiket || 'Kaynak') + ' ↗</a></p>';
    if (yorum && yorum.trim()) h += yorum.trim().split(/\n+/).map((s) => '<p>' + esc(s) + '</p>').join('');
    return h;
  }

  /* ── kaynağı aç ── */
  async function kaynagiAc(k) {
    try {
      if (k.tur === 'kitap' && k.ref && window.KutAra) { await KutAra.refAc(k.ref); return; }
      if (k.tur === 'makale' && window.KavramKutuphanesi) {
        const d = await KavramKutuphanesi.indexYukle(); const m = d.maddeler.find((x) => x.i === k.id);
        if (m) { KavramKutuphanesi.oku(m); return; } toast('Makale bulunamadı.'); return;
      }
      if (k.tur === 'tefsir') {
        if (typeof tabGec === 'function') tabGec('tefsirler');
        setTimeout(() => { try { _alimTefsirSec(k.alim); setTimeout(() => { try { _alimTefsirSureSec(k.sure); setTimeout(() => { try { _alimTefsirGrupToggle(k.grup); } catch (e) {} }, 250); } catch (e) {} }, 250); } catch (e) {} }, 250);
        return;
      }
      toast('Kaynak açılamadı.');
    } catch (e) { toast('Kaynak açılamadı.'); }
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-aln]'); if (!a || a.closest('[contenteditable="true"]')) return;
    e.preventDefault(); e.stopPropagation();
    let k; try { k = JSON.parse(decodeURIComponent(a.getAttribute('data-aln'))); } catch (x) { return; }
    kaynagiAc(k);
  }, true);

  /* ── kaydetme ── */
  async function kaydet(hedefler, not) {
    const gruplar = {}; hedefler.filter((t) => t.tur !== 'ayet').forEach((t) => { (gruplar[t.sNo] = gruplar[t.sNo] || []).push(t); });
    for (const sNo of Object.keys(gruplar)) {
      _sbAktifSureNo = +sNo; if (!_sureBilgiCache) await _sureBilgiYukle();
      gruplar[sNo].forEach((t) => { if (t.kume) _kumeDugumuGaranti(+sNo, t.k); });
      const kokler = _sureBilgiGetir(+sNo).slice();
      for (const t of gruplar[sNo]) {
        let dugum;
        if (t.tur === 'yeni') { dugum = { id: _sbYeniId(), baslik: t.ad, renk: SB_VARSAYILAN_RENK, altlar: [], notlar: [] }; kokler.push(dugum); }
        else { const b = _sbDugumBul(kokler, t.id); if (!b) throw new Error('Hedef bulunamadı: ' + t.label); dugum = b.dugum; }
        dugum.notlar = dugum.notlar || []; dugum.notlar.push(Object.assign({}, not, { id: _sbYeniId() }));
      }
      await _sureBilgiKaydet(+sNo, kokler);
    }
    hedefler.filter((t) => t.tur === 'ayet').forEach((t) => {
      const key = 'an_' + t.sNo + '_' + t.aNo; let arr = []; try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { arr = []; }
      arr.push({ isim: not.baslik, icerik: not.html, tarih: new Date().toISOString().slice(0, 10) }); localStorage.setItem(key, JSON.stringify(arr));
    });
    if (hedefler.some((t) => t.tur === 'ayet') && typeof statGuncelle === 'function') { try { statGuncelle(); } catch (e) {} }
  }

  /* ── pencere ── */
  function ekleSor(g) {
    const ov = el('div', 'aln-md'); const k = el('div'); ov.appendChild(k);
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    k.appendChild(el('h4', null, '📥 Nota ekle — ' + (g.kaynak.etiket || '')));
    const q = el('textarea'); q.value = g.metin; k.appendChild(el('div', 'aln-et', 'Alıntı (düzenleyebilirsin)')); k.lastChild.style.cssText = 'font-size:12px;opacity:.7'; k.appendChild(q);
    k.appendChild(el('h4', null, 'Yorumun (isteğe bağlı)')); const y = el('textarea'); y.placeholder = 'İstersen kendi notunu yaz…'; y.style.minHeight = '60px'; k.appendChild(y);
    k.appendChild(el('h4', null, 'Nereye eklensin?'));
    const secili = new Map(); // anahtar → hedef
    const chipler = el('div');
    const chipCiz = () => { chipler.innerHTML = ''; secili.forEach((t, key) => { const c = el('span', 'aln-chip', t.label); const x = el('b', null, '×'); x.onclick = () => { secili.delete(key); chipCiz(); listeCiz(); }; c.appendChild(x); chipler.appendChild(c); }); if (!secili.size) chipler.appendChild(el('span', null, 'Henüz hedef seçilmedi.')); };
    const sel = el('select'); for (let n = 1; n <= 114; n++) { const o = el('option', null, n + '. ' + (typeof SURELER !== 'undefined' && SURELER[n - 1] ? SURELER[n - 1].isim : 'Sûre ' + n)); o.value = n; sel.appendChild(o); }
    sel.value = (HEDEF && HEDEF.sNo) || lsGet('aln_sure', '1');
    k.appendChild(sel);
    const sek = el('div'); const bK = el('button', 'on', '🗂 Küme / klasör'); const bA = el('button', null, '📍 Âyet notu'); sek.appendChild(bK); sek.appendChild(bA); k.appendChild(sek);
    const liste = el('div'); k.appendChild(liste);
    let mod = 'k';
    const ekleHedef = (key, t) => { secili.set(key, t); chipCiz(); };
    async function listeCiz() {
      liste.innerHTML = ''; const sNo = +sel.value; lsSet('aln_sure', String(sNo));
      if (mod === 'a') {
        const inp = el('input'); inp.type = 'number'; inp.min = 1; inp.placeholder = 'Âyet numarası'; inp.style.marginTop = '8px'; liste.appendChild(inp);
        const b = el('button', null, '＋ Bu âyetin notlarına ekle'); b.onclick = () => { const a = parseInt(inp.value); if (!a || a < 1) return; ekleHedef('a|' + sNo + '|' + a, { tur: 'ayet', sNo, aNo: a, label: '📍 ' + SURELER[sNo - 1].isim + ' ' + sNo + ':' + a }); inp.value = ''; }; liste.appendChild(b); return;
      }
      liste.appendChild(el('div', null, 'Yükleniyor…'));
      try { if (!_sureBilgiCache) await _sureBilgiYukle(); } catch (e) {}
      liste.innerHTML = '';
      const satir = (key, etiket, girinti, t) => {
        const r = el('label', 'aln-satir'); r.style.paddingLeft = (4 + girinti * 16) + 'px';
        const c = el('input'); c.type = 'checkbox'; c.checked = secili.has(key);
        c.onchange = () => { if (c.checked) ekleHedef(key, t); else { secili.delete(key); chipCiz(); } };
        r.appendChild(c); r.appendChild(el('span', null, etiket)); liste.appendChild(r);
      };
      const sureAd = SURELER[sNo - 1].isim;
      const kumeler = typeof _kumeListesiIdli === 'function' ? _kumeListesiIdli(sNo) : [];
      const kap = typeof _kumeKapGetir === 'function' ? _kumeKapGetir(sNo, false) : null;
      if (kumeler.length) liste.appendChild(Object.assign(el('h4', null, 'Âyet kümeleri'), {}));
      const altlar = (d, g) => (d.altlar || []).forEach((a) => { satir('d|' + sNo + '|' + a.id, '📁 ' + a.baslik, g, { tur: 'dugum', sNo, id: a.id, label: sureAd + ' › ' + a.baslik }); altlar(a, g + 1); });
      kumeler.forEach((km) => {
        const ad = km.bas === km.bit ? km.bas : km.bas + '–' + km.bit;
        satir('d|' + sNo + '|' + km.id, '📖 ' + ad + '. â. — ' + km.konu, 0, { tur: 'dugum', sNo, id: km.id, kume: true, k: km, label: sureAd + ' › ' + km.konu });
        const d = kap ? (kap.altlar || []).find((x) => x.id === km.id) : null; if (d) altlar(d, 1);
      });
      const koklar = (typeof _sureBilgiGetir === 'function' ? _sureBilgiGetir(sNo) : []).filter((d) => d.id !== KUME_KAP_ID && !(d.ayetBas && d.ayetBit && !d.kume && !(d.notlar || []).length && !(d.altlar || []).length));
      liste.appendChild(el('h4', null, sureAd + ' klasörleri'));
      koklar.forEach((d) => { satir('d|' + sNo + '|' + d.id, '📁 ' + d.baslik, 0, { tur: 'dugum', sNo, id: d.id, label: sureAd + ' › ' + d.baslik }); altlar(d, 1); });
      const yb = el('button', null, '＋ ' + sureAd + ' için yeni klasör'); yb.onclick = () => { const ad = prompt('Klasör adı:'); if (ad && ad.trim()) { ekleHedef('y|' + sNo + '|' + ad.trim(), { tur: 'yeni', sNo, ad: ad.trim(), label: sureAd + ' › 📁 ' + ad.trim() + ' (yeni)' }); } }; liste.appendChild(yb);
    }
    bK.onclick = () => { mod = 'k'; bK.classList.add('on'); bA.classList.remove('on'); listeCiz(); };
    bA.onclick = () => { mod = 'a'; bA.classList.add('on'); bK.classList.remove('on'); listeCiz(); };
    sel.onchange = listeCiz;
    k.appendChild(el('h4', null, 'Seçilen hedefler')); k.appendChild(chipler);
    const ok = el('button', 'aln-ok', '✓ Ekle'); const ip = el('button', null, 'Vazgeç'); ip.onclick = () => ov.remove();
    ok.onclick = async () => {
      const metin = q.value.trim(); if (!metin) { toast('Alıntı boş olamaz.'); return; }
      if (!secili.size) { toast('En az bir hedef seç.'); return; }
      ok.disabled = true; ok.textContent = 'Kaydediliyor…';
      const baslik = ('Alıntı · ' + (g.kaynak.etiket || '').replace(/^[^\p{L}\p{N}]+/u, '')).slice(0, 60);
      try { await kaydet(Array.from(secili.values()), { baslik, html: notHtml(metin, g.kaynak, y.value) }); ov.remove(); toast('✓ ' + secili.size + ' yere eklendi'); if (g.tamam) g.tamam(); }
      catch (e) { ok.disabled = false; ok.textContent = '✓ Ekle'; alert('Kaydedilemedi: ' + e.message); }
    };
    k.appendChild(ok); k.appendChild(ip);
    document.body.appendChild(ov);
    if (HEDEF) { const km = { tur: 'dugum', sNo: HEDEF.sNo, id: HEDEF.id, label: (HEDEF.baslik || 'seçili not') }; const kl = typeof _kumeListesiIdli === 'function' ? _kumeListesiIdli(HEDEF.sNo).find((x) => x.id === HEDEF.id) : null; if (kl) { km.kume = true; km.k = kl; } secili.set('d|' + HEDEF.sNo + '|' + HEDEF.id, km); }
    chipCiz(); listeCiz();
  }
  function ekle(g) { if (!g || !g.metin) return; ekleSor(g); }

  /* ── "Not Ekle" menüsü (küme/klasör ekranı) ── */
  const orijSkCiz = window._skCiz;
  function notMenusu(orijTikla) {
    const ov = el('div', 'aln-md'); const k = el('div'); ov.appendChild(k); ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    const sNo = _skYol[0]; const id = _skYol[_skYol.length - 1]; const d = typeof _skGuncelKlasor === 'function' ? _skGuncelKlasor() : null;
    const h = { sNo, id, baslik: d ? d.baslik : '' };
    k.appendChild(el('h4', null, '📝 Not ekle'));
    const dugme = (yazi, f) => { const b = el('button', null, yazi); b.style.cssText = 'display:block;width:100%;text-align:left'; b.onclick = () => { ov.remove(); f(); }; k.appendChild(b); };
    dugme('✍️ Yeni not yaz', orijTikla);
    dugme('🧩 Kavram makalesinden alıntı', () => { hedefBelirle(h); if (window.KavramKutuphanesi) KavramKutuphanesi.ac(); });
    dugme('📚 Kütüphane kitabından alıntı', () => { hedefBelirle(h); if (typeof kutuphaneAc === 'function') kutuphaneAc(); });
    dugme('📖 Tefsirden alıntı', () => { hedefBelirle(h); if (typeof tabGec === 'function') tabGec('tefsirler'); });
    const ip = el('button', null, 'Vazgeç'); ip.onclick = () => ov.remove(); k.appendChild(ip);
    document.body.appendChild(ov);
  }
  if (typeof orijSkCiz === 'function') {
    window._skCiz = function () {
      const r = orijSkCiz.apply(this, arguments);
      try {
        const b = document.querySelector('#sure-klasor-ic .sk-eylem-btn-vurgulu');
        if (b && !b.dataset.aln) { b.dataset.aln = '1'; const o = b.onclick; b.onclick = (e) => { e.preventDefault(); notMenusu(() => o && o.call(b, e)); }; }
      } catch (e) {}
      return r;
    };
  }

  window.AlintiNot = { ekle, hedefBelirle, notHtml, kaynagiAc, _kaydet: kaydet };
})();
