/* 15-kavram-makale-pasaj.js — Kavram makalesinde seçilen metni, kütüphane kitabı pasajı gibi KAVRAMA ekler.
   • Makale okurken metni seç → 🧩 → kavram seç → "Kitaplar" sekmesinde "Kavrama eklenen makale alıntıları" altında kart olur.
   • Kart: makale adı + alıntı; "Makalede aç" (makaleyi açıp alıntıya kaydırır), "Çıkar".
   • Veri: kavram.makaleRefs = [{rid, id, b, k, sel, t}] — makale dosyalarına dokunulmaz.
   Gereken: 9d-kavram-tefsiri.js (KutKavram), 10-kavram-kutuphanesi.js (KavramKutuphanesi). */
(function () {
  'use strict';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const toast = (m) => { try { if (window.KutAra && KutAra.toast) return KutAra.toast(m); } catch (e) {} alert(m); };
  const kisalt = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n).trimEnd() + '…' : t; };
  const lsG = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const lsS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const yid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const KAYNAK_KISA = { kalkan: 'Kalkan', kavramlar: 'Kavramlar', ansiklopedi: 'Ansiklopedi', yeni: 'Yeni eklenenler' };

  const css = document.createElement('style');
  css.textContent =
    '.mp-md{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}' +
    '.mp-md>div{background:var(--paper,#fff);color:var(--ink,#222);width:100%;max-width:560px;border-radius:18px 18px 0 0;padding:16px;max-height:86vh;overflow:auto;box-sizing:border-box;font-family:"Source Serif 4",serif}' +
    '.mp-md h4{margin:0 0 8px;font-size:16px}.mp-md q{display:block;font-style:italic;font-size:14px;line-height:1.55;margin:0 0 12px;padding:8px 12px;border-left:3px solid var(--gold,#b8902f);background:rgba(184,144,47,.08);border-radius:0 10px 10px 0;quotes:none}' +
    '.mp-md button{font-family:inherit;font-size:15px;padding:10px 13px;margin:5px 6px 0 0;border-radius:10px;border:1px solid var(--border,#ccc);background:none;color:inherit;cursor:pointer}' +
    '.mp-md button.mp-sec{display:block;width:100%;text-align:left}.mp-md button.mp-sec.on{background:rgba(184,144,47,.16);border-color:var(--gold,#b8902f);font-weight:700}' +
    '.mp-md button.mp-ok{background:var(--ink,#222);color:#fff;border-color:transparent}.mp-md button:disabled{opacity:.45}' +
    '.mp-kart{border:1px solid var(--border,#ccc);border-radius:14px;margin:0 0 12px;background:var(--paper2,#f6f3ee);overflow:hidden}' +
    '.mp-ust{display:flex;gap:8px;align-items:baseline;padding:10px 14px 0;font-size:12.5px;color:var(--muted,#777);line-height:1.4}.mp-ust b{color:var(--gold,#b8902f);font-weight:700;font-size:13.5px}' +
    '.mp-q{margin:8px 14px 4px;padding:2px 0 2px 12px;border-left:3px solid var(--gold,#b8902f);font-size:15px;line-height:1.65;white-space:pre-wrap}' +
    '.mp-alt{display:flex;gap:8px;align-items:center;padding:6px 10px 10px 14px}.mp-alt .kv-link{font-size:13px;font-weight:600}.mp-alt .mp-cik{margin-left:auto;font-size:13px;border:1px solid var(--border,#ccc);background:none;color:inherit;border-radius:14px;padding:5px 11px;cursor:pointer}' +
    'mark.mp-fl{background:rgba(255,216,77,.6);transition:background 2s}';
  document.head.appendChild(css);

  const KK = () => window.KutKavram;
  const sonId = () => lsG('kv_son_kavram', '');

  /* ── kavrama ekleme penceresi ── */
  function ekle(g) {
    const kk = KK(); if (!kk || !kk.canli) { alert('Kavram Tefsiri henüz yüklenmedi.'); return; }
    const metin = String(g.metin || '').trim(); if (!metin) return;
    const ov = el('div', 'mp-md'); const k = el('div'); ov.appendChild(k);
    ov.style.pointerEvents = 'none'; setTimeout(() => { ov.style.pointerEvents = ''; }, 500);
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    k.appendChild(el('h4', null, '🧩 Kavrama ekle'));
    k.appendChild(el('div', null, 'Makale: ' + (g.baslik || ''))).style.cssText = 'font-size:12.5px;color:var(--muted);margin-bottom:6px';
    k.appendChild(el('q', null, kisalt(metin, 320)));
    const alan = el('div'); k.appendChild(alan);
    let secili = null, eklenen = null; const son = sonId();
    const ciz = () => {
      alan.innerHTML = '';
      if (eklenen) {
        alan.appendChild(el('h4', null, '✓ “' + eklenen.k.ad + '” kavramına eklendi'));
        alan.appendChild(el('div', null, 'Kavramın “Kitaplar” sekmesinde, makale alıntıları altında görünür.')).style.cssText = 'font-size:13px;color:var(--muted)';
        const gb = el('button', null, '↶ Geri al'); gb.onclick = () => { eklenen.k.makaleRefs = (eklenen.k.makaleRefs || []).filter((x) => x !== eklenen.r); kk.kaydet(eklenen.k); eklenen = null; secili = null; ciz(); };
        const tm = el('button', 'mp-ok', 'Tamam'); tm.onclick = () => ov.remove(); alan.appendChild(gb); alan.appendChild(tm); return;
      }
      alan.appendChild(el('h4', null, 'Hangi kavrama eklensin?'));
      const l = kk.canli().slice().sort((x, y) => (x.id === son ? -1 : y.id === son ? 1 : (y.g || 0) - (x.g || 0)));
      if (!l.length) alan.appendChild(el('div', null, 'Henüz kavram yok; aşağıdan oluşturun.')).style.cssText = 'font-size:13px;color:var(--muted)';
      l.forEach((kv) => { const b = el('button', 'mp-sec' + (secili === kv.id ? ' on' : ''), (secili === kv.id ? '● ' : '○ ') + (kv.emoji || '🧩') + ' ' + kv.ad + (kv.id === son ? '  · son kullanılan' : '')); b.onclick = () => { secili = kv.id; ciz(); }; alan.appendChild(b); });
      const ok = el('button', 'mp-ok', secili ? '✓ Ekle' : 'Önce bir kavram seçin'); ok.disabled = !secili;
      ok.onclick = () => {
        const kv = kk.canli().find((x) => x.id === secili); if (!kv) return;
        kv.makaleRefs = kv.makaleRefs || [];
        if (kv.makaleRefs.some((x) => x.id === g.id && x.sel === metin)) { toast('Bu alıntı zaten ekli'); return; }
        const r = { rid: yid(), id: g.id, b: g.baslik || '', k: g.kaynak || '', sel: metin, t: Date.now() };
        kv.makaleRefs.push(r); kk.kaydet(kv); lsS('kv_son_kavram', kv.id); eklenen = { k: kv, r }; ciz();
      };
      alan.appendChild(ok);
      const y = el('button', null, '＋ Yeni kavram oluştur'); y.onclick = () => { const a = prompt('Kavram adı:'); if (a && a.trim()) { const kv = kk.yeniKavram(a.trim()); kk.kaydet(kv); secili = kv.id; ciz(); } }; alan.appendChild(y);
      const ip = el('button', null, 'Vazgeç'); ip.onclick = () => ov.remove(); alan.appendChild(ip);
    };
    ciz(); document.body.appendChild(ov);
  }

  /* ── makaleyi açıp alıntıya git ── */
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  function alintiyaGit(sel) {
    const kok = document.querySelector('.kk-metin'); if (!kok) return;
    const parca = norm(String(sel).split(' … ')[0]).slice(0, 70); if (!parca) return;
    const adaylar = kok.querySelectorAll('p,div,summary');
    for (const e of adaylar) {
      if (e.children.length > 6 && e.tagName === 'DIV') continue;
      if (!norm(e.textContent).includes(parca)) continue;
      const d = e.closest('details'); if (d) d.open = true;
      // paragrafın tamamını işaretlemek yerine, ilk metin düğümünde alıntıyı bul
      const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) {
        const i = n.data.indexOf(parca.slice(0, 40));
        if (i >= 0) {
          const bit = Math.min(n.data.length, i + Math.max(40, Math.min(parca.length, n.data.length - i)));
          const sp = n.splitText(i); sp.splitText(bit - i);
          const m = document.createElement('mark'); m.className = 'mp-fl'; sp.parentNode.replaceChild(m, sp); m.appendChild(sp);
          m.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => { m.style.background = 'transparent'; }, 2500); return;
        }
      }
      e.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
    }
  }
  async function makaleAc(ref) {
    const KL = window.KavramKutuphanesi; if (!KL) { toast('Makale kütüphanesi yüklenmedi.'); return; }
    try {
      const d = await KL.indexYukle(); const m = d.maddeler.find((x) => x.i === ref.id);
      if (!m) { toast('Makale bulunamadı.'); return; }
      await KL.oku(m); setTimeout(() => alintiyaGit(ref.sel), 250);
    } catch (e) { toast('Makale açılamadı.'); }
  }

  /* ── Kavram › Kitaplar sekmesinde bölüm ── */
  function bolum(k, ctx, w) {
    const l = k.makaleRefs || []; if (!l.length) return;
    w.appendChild(el('div', 'kv-bolum', '📰 Kavrama eklenen makale alıntıları (' + l.length + ')'));
    l.forEach((r) => {
      const kart = el('div', 'mp-kart');
      const ust = el('div', 'mp-ust'); ust.appendChild(el('b', null, r.b || 'Makale')); if (r.k) ust.appendChild(el('span', null, '· ' + (KAYNAK_KISA[r.k] || r.k))); kart.appendChild(ust);
      const q = el('div', 'mp-q', kisalt(r.sel, 420)); kart.appendChild(q);
      const alt = el('div', 'mp-alt');
      if (String(r.sel).length > 420) { const t = el('button', 'kv-link', 'Tamamını göster'); t.onclick = () => { q.textContent = r.sel; t.remove(); }; alt.appendChild(t); }
      const a = el('button', 'kv-link', '📰 Makalede aç ›'); a.onclick = () => makaleAc(r); alt.appendChild(a);
      const c = el('button', 'mp-cik', '✕ Çıkar'); c.onclick = () => { k.makaleRefs = (k.makaleRefs || []).filter((x) => x !== r); KK().kaydet(k); ctx.yenile(); }; alt.appendChild(c);
      kart.appendChild(alt); w.appendChild(kart);
    });
  }

  window.KavramMakalePasaj = { ekle, bolum, makaleAc };
})();
