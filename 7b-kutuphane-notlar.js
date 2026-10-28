/* 7b-kutuphane-notlar.js — Kütüphane not defteri: vurgu, not, etiket, âyet bağı, otomatik GitHub yedeği.
 * İlke: kitap metnine (txt) ASLA yazılmaz. Not, kitap + paragraf sırası + seçilen metnin kendisini (alıntı) tutar;
 * metin değişirse alıntı yeniden aranır, bulunamazsa not "bağlantısı koptu" diye işaretlenir (silinmez).
 * Veri: localStorage 'kut_notlar_v1' + GitHub 'data/kutuphane-notlari.json' (otomatik, birleştirmeli).
 */
(function () {
  'use strict';
  const ANAHTAR = 'kut_notlar_v1';
  const KIRLI = 'kut_notlar_kirli';
  const DOSYA = 'data/kutuphane-notlari.json';
  const RENKLER = ['sari', 'yesil', 'mavi', 'pembe'];
  const RENK_AD = { sari: 'Sarı', yesil: 'Yeşil', mavi: 'Mavi', pembe: 'Pembe' };
  const $ = (id) => document.getElementById(id);
  const IC = () => window.KutIc;
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  function lsOku(k, v) { try { const x = localStorage.getItem(k); return x === null ? v : x; } catch (e) { return v; } }
  function lsYaz(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ── Veri ───────────────────────────────────────────────────
  let S = { v: 1, notlar: {} };
  try { const x = JSON.parse(lsOku(ANAHTAR, 'null')); if (x && x.notlar) S = x; } catch (e) {}
  let durum = lsOku(KIRLI, '') ? 'bekliyor' : 'hazir';
  let zamanSenk = null, senkCalisiyor = false;

  const yeniId = () => 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const canli = () => Object.values(S.notlar).filter((n) => !n.sil);
  function yerelYaz() { lsYaz(ANAHTAR, JSON.stringify(S)); }
  function degisti() {
    yerelYaz(); lsYaz(KIRLI, '1'); durum = 'bekliyor'; durumYaz();
    clearTimeout(zamanSenk); zamanSenk = setTimeout(senkron, 4000);
  }

  // ── GitHub'la birleştirmeli otomatik yedek ─────────────────
  function birlestir(a, b) { // id başına en yeni 'g' kazanır
    const s = { v: 1, notlar: {} };
    [a, b].forEach((kaynak) => Object.values((kaynak && kaynak.notlar) || {}).forEach((n) => {
      const m = s.notlar[n.id];
      if (!m || (n.g || 0) > (m.g || 0)) s.notlar[n.id] = n;
    }));
    return s;
  }
  async function senkron() {
    if (senkCalisiyor) return;
    if (typeof _githubHazirMi !== 'function' || !_githubHazirMi()) { durum = lsOku(KIRLI, '') ? 'bekliyor' : 'hazir'; durumYaz(); return; }
    senkCalisiyor = true; durum = 'yukleniyor'; durumYaz();
    try {
      const { icerik } = await _githubDosyaOku(DOSYA);
      let uzak = null;
      if (icerik) { try { uzak = JSON.parse(icerik); } catch (e) { uzak = null; } }
      const birlesik = birlestir(S, uzak);
      const uzakMetin = uzak ? JSON.stringify(birlestir(uzak, null)) : '';
      const yeniMetin = JSON.stringify(birlesik);
      S = birlesik; yerelYaz();
      if (yeniMetin !== uzakMetin) await _githubDosyaGuncelle(DOSYA, JSON.stringify(birlesik), 'Kütüphane notları güncellendi');
      lsYaz(KIRLI, ''); durum = 'hazir';
      if (window.KutIc && window.KutIc.K.acik && window.KutIc.K.gorunum === 'okuma') { /* açık kitabı tazelemeyiz; bir sonraki açılışta uygulanır */ }
    } catch (e) {
      console.warn('Not yedeği başarısız:', e); durum = 'hata';
      clearTimeout(zamanSenk); zamanSenk = setTimeout(senkron, 60000); // 1 dk sonra yeniden dene
    }
    senkCalisiyor = false; durumYaz();
  }
  function durumMetni() {
    if (typeof _githubHazirMi === 'function' && !_githubHazirMi()) return '⚠ GitHub ayarlı değil — notlar yalnız bu cihazda';
    return { hazir: '☁ Yedeklendi', bekliyor: '⏳ Yedek bekliyor…', yukleniyor: '⏳ Yedekleniyor…', hata: '⚠ Yedeklenemedi, yeniden denenecek' }[durum] || '';
  }
  function durumYaz() { document.querySelectorAll('.kutn-durum').forEach((e) => { e.textContent = durumMetni(); }); }
  window.addEventListener('online', () => { if (lsOku(KIRLI, '')) senkron(); });
  setTimeout(senkron, 3000); // açılışta uzak notları çek, birleştir

  // ── Yardımcılar ────────────────────────────────────────────
  function etiketTemizle(str) {
    const k = [];
    String(str || '').split(/[\s,;]+/).forEach((t) => {
      t = t.replace(/^#+/, '').replace(/\/+/g, '/').replace(/^\/|\/$/g, '').toLocaleLowerCase('tr');
      if (t && !k.includes(t)) k.push(t);
    });
    return k;
  }
  function ayetCoz(str) {
    const o = [];
    String(str || '').replace(/(\d{1,3})\s*[:.\/]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/g, (m, s, a, b) => {
      s = +s; a = +a; b = b ? +b : a;
      if (s >= 1 && s <= 114 && a >= 1 && b >= a) o.push([s, a, b]);
      return m;
    });
    return o;
  }
  const ayetYaz = (l) => (l || []).map(([s, a, b]) => s + ':' + (b && b !== a ? a + '-' + b : a)).join(', ');
  // Öneri: kitap alıntısındaki ve notundaki adlı atıflar (ör. "Bakara 2/255") + kullanıcının kendi notuna yazdığı açık "2:255" kalıpları
  function ayetOner(alintiMetni, notMetni) {
    const o = [];
    const ekle = (l) => l.forEach((x) => { if (!o.some((y) => y[0] === x[0] && y[1] === x[1] && y[2] === x[2])) o.push(x); });
    try {
      if (window.KTP && typeof SURELER !== 'undefined') {
        const r = window.KTP.atifBul((alintiMetni || '') + ' ' + (notMetni || ''), SURELER);
        ekle((r.atifler || []).flatMap((x) => (x.parcalar || []).map((p) => [x.s, p[0], p[1]])));
      }
    } catch (e) {}
    ekle(ayetCoz(notMetni || ''));
    return ayetYaz(o);
  }
  const kisalt = (t, n) => (t.length > n ? t.slice(0, n).trimEnd() + '…' : t);
  const tarih = (ts) => { try { return new Date(ts).toLocaleDateString('tr-TR'); } catch (e) { return ''; } };
  const alinti = (n) => n.seg.map((s) => s.q).join(' … ');
  const ayetAd = (s) => (typeof SURELER !== 'undefined' && SURELER[s - 1] && SURELER[s - 1].isim) || String(s);

  // ── Vurguların kitaba uygulanması ──────────────────────────
  function sar(elem, o, e, nid, renk, son) {
    const w = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT);
    let pos = 0, n; const isler = [];
    while ((n = w.nextNode())) {
      const len = n.nodeValue.length;
      const b = Math.max(o, pos), c = Math.min(e, pos + len);
      if (b < c) isler.push([n, b - pos, c - pos]);
      pos += len; if (pos >= e) break;
    }
    let sonMark = null;
    isler.forEach(([n, b, c]) => {
      let mid = n;
      if (b > 0) mid = n.splitText(b);
      if (c - b < mid.nodeValue.length) mid.splitText(c - b);
      const m = document.createElement('mark');
      m.className = 'kut-vur kut-vur-' + renk; m.dataset.nid = nid;
      mid.parentNode.replaceChild(m, mid); m.appendChild(mid); sonMark = m;
    });
    if (son && sonMark) sonMark.classList.add('kut-vur-not');
  }
  function kopar(nid) {
    document.querySelectorAll('mark.kut-vur[data-nid="' + nid + '"]').forEach((m) => {
      const ata = m.parentNode; while (m.firstChild) ata.insertBefore(m.firstChild, m); ata.removeChild(m); ata.normalize();
    });
  }
  function konumDogrula(n, ayr) { // seg'leri metne karşı doğrular; kayma varsa yeniden bulur
    const sonuc = []; let kopuk = false;
    n.seg.forEach((sg) => {
      let p = ayr.paras[sg.pi];
      if (p && p.t && p.t.slice(sg.o, sg.o + sg.q.length) === sg.q) { sonuc.push(sg); return; }
      let bul = null;
      for (let d = 0; d <= 40 && !bul; d++) {
        for (const pi of d ? [sg.pi - d, sg.pi + d] : [sg.pi]) {
          const pp = ayr.paras[pi];
          if (pp && pp.t) { const ix = pp.t.indexOf(sg.q); if (ix >= 0) { bul = { pi, o: ix, q: sg.q }; break; } }
        }
      }
      if (bul) sonuc.push(bul); else kopuk = true;
    });
    return { seg: sonuc, kopuk };
  }
  function notuUygula(n, ayr) {
    const k = IC().K; if (!k.acik) return;
    const d = ayr ? konumDogrula(n, ayr) : { seg: n.seg, kopuk: false };
    d.seg.forEach((sg, i) => {
      const e = k.acik.els[sg.pi]; if (!e) return;
      sar(e, sg.o, sg.o + sg.q.length, n.id, n.renk || 'sari', i === d.seg.length - 1 && !!n.metin);
    });
  }
  function okumaHazir() {
    const k = IC().K; if (!k.acik) return;
    canli().filter((n) => n.kitap === k.acik.url).forEach((n) => notuUygula(n, k.acik.ayr));
    barGizle();
  }

  // ── Seçim çubuğu ───────────────────────────────────────────
  let bekleyen = null, secZaman = null;
  function barKur() {
    if ($('kutn-bar')) return $('kutn-bar');
    const b = el('div'); b.id = 'kutn-bar'; b.style.display = 'none';
    const dugme = (t, ip, f) => { const x = el('button', 'kutn-bar-btn', t); x.title = ip; x.addEventListener('pointerdown', (ev) => { ev.preventDefault(); f(); }); b.appendChild(x); };
    dugme('🖍 Vurgula', 'Vurgula', () => { if (bekleyen) { const n = yeniNot(bekleyen); secimiTemizle(); n.metin = ''; notuUygula(n); degisti(); } });
    dugme('📝 Not', 'Not yaz', () => { if (bekleyen) { const seg = bekleyen; secimiTemizle(); notFormu(taslak(seg)); } });
    dugme('¶', 'Paragrafın tamamı', () => paragrafSec());
    dugme('✕', 'Kapat', () => secimiTemizle());
    document.body.appendChild(b); return b;
  }
  function barGizle() { const b = $('kutn-bar'); if (b) b.style.display = 'none'; bekleyen = null; }
  function secimiTemizle() { try { window.getSelection().removeAllRanges(); } catch (e) {} barGizle(); }
  function ofs(elem, node, off) { const r = document.createRange(); r.selectNodeContents(elem); r.setEnd(node, off); return r.toString().length; }
  function ustPara(node) { let x = node.nodeType === 1 ? node : node.parentElement; return x ? x.closest('[data-pi]') : null; }
  function segmentler(r) {
    const metin = $('kut-metin'); if (!metin) return [];
    const k = IC().K; const els = k.acik.els;
    let bas = ustPara(r.startContainer), bit = ustPara(r.endContainer);
    if (!bas && r.startContainer === metin) bas = els[Math.min(els.length - 1, r.startOffset)];
    if (!bit && r.endContainer === metin) bit = els[Math.max(0, r.endOffset - 1)];
    if (!bas || !bit) return [];
    const a = +bas.dataset.pi, b = +bit.dataset.pi;
    if (b - a > 40) return [];
    const seg = [];
    for (let pi = a; pi <= b; pi++) {
      const e = els[pi]; if (!e) continue;
      const tam = e.textContent;
      let o = pi === a && bas.contains(r.startContainer) ? ofs(e, r.startContainer, r.startOffset) : 0;
      let z = pi === b && bit.contains(r.endContainer) ? ofs(e, r.endContainer, r.endOffset) : tam.length;
      while (o < z && /\s/.test(tam[o])) o++;
      while (z > o && /\s/.test(tam[z - 1])) z--;
      if (z > o) seg.push({ pi, o, q: tam.slice(o, z) });
    }
    return seg;
  }
  function secimiOku() {
    const k = IC() && IC().K;
    if (!k || !k.kokAcik || k.gorunum !== 'okuma' || !k.acik || $('kut-sheet')) { barGizle(); return; }
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) { barGizle(); return; }
    const r = sel.getRangeAt(0), metin = $('kut-metin');
    if (!metin || !metin.contains(r.commonAncestorContainer)) { barGizle(); return; }
    const seg = segmentler(r);
    if (!seg.length) { barGizle(); return; }
    bekleyen = seg; barKur().style.display = 'flex';
  }
  function paragrafSec() {
    if (!bekleyen) return;
    const els = IC().K.acik.els;
    const a = els[bekleyen[0].pi], b = els[bekleyen[bekleyen.length - 1].pi];
    const r = document.createRange(); r.setStartBefore(a.firstChild || a); r.setEndAfter(b.lastChild || b);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
  document.addEventListener('selectionchange', () => { clearTimeout(secZaman); secZaman = setTimeout(secimiOku, 220); });

  // ── Not oluşturma / düzenleme ──────────────────────────────
  function taslak(seg) {
    const k = IC().K.acik;
    return { id: yeniId(), kitap: k.url, kad: k.ad, seg, renk: 'sari', metin: '', etiket: [], ayet: [], ts: Date.now(), g: Date.now(), yeni: true };
  }
  function yeniNot(seg) { const n = taslak(seg); delete n.yeni; S.notlar[n.id] = n; return n; }

  function notFormu(n) {
    const ic = IC(); barGizle();
    const f = el('div', 'kut-form');
    const q = el('div', 'kutn-alinti', kisalt(alinti(n), 400)); f.appendChild(q);
    // renk
    const rs = el('div', 'kutn-renkler'); let renk = n.renk || 'sari';
    RENKLER.forEach((r) => {
      const b = el('button', 'kutn-renk kut-vur-' + r); b.title = RENK_AD[r];
      if (r === renk) b.classList.add('kutn-secili');
      b.onclick = () => { renk = r; rs.querySelectorAll('.kutn-renk').forEach((x) => x.classList.remove('kutn-secili')); b.classList.add('kutn-secili'); };
      rs.appendChild(b);
    });
    f.appendChild(rs);
    const ta = el('textarea', 'kutn-input'); ta.rows = 5; ta.placeholder = 'Notunuz…'; ta.value = n.metin || ''; f.appendChild(ta);
    // etiket
    const et = el('input', 'kutn-input'); et.placeholder = 'Etiketler: #peygamberler/hz_meryem #huşu'; et.value = (n.etiket || []).map((t) => '#' + t).join(' ');
    const dl = el('datalist'); dl.id = 'kutn-etiket-dl';
    tumEtiketler().forEach(([t]) => { const o = el('option'); o.value = '#' + t; dl.appendChild(o); });
    et.setAttribute('list', 'kutn-etiket-dl'); f.appendChild(et); f.appendChild(dl);
    // âyet
    const ay = el('input', 'kutn-input'); ay.placeholder = 'Âyet bağı: 3:42-43, 19:16'; ay.value = ayetYaz(n.ayet);
    let ayDokunuldu = n.ayet.length > 0;
    if (!ayDokunuldu) ay.value = ayetOner(alinti(n), n.metin);
    ay.oninput = () => { ayDokunuldu = true; };
    ta.onblur = () => { if (!ayDokunuldu) ay.value = ayetOner(alinti(n), ta.value); };
    f.appendChild(ay);
    f.appendChild(el('div', 'kut-yardim', 'Âyet bağı, metindeki atıflardan önerildi; düzeltebilirsiniz. Bu not, o âyetin “📚 İlgili Konular” listesinde de görünür.'));
    const alt = el('div', 'kutn-butonlar');
    const kaydet = el('button', 'kut-btn', n.yeni ? 'Kaydet' : 'Güncelle');
    kaydet.onclick = () => {
      n.metin = ta.value.trim(); n.etiket = etiketTemizle(et.value); n.renk = renk;
      if (!ayDokunuldu && !ay.value) ay.value = ayetOner(alinti(n), ta.value);
      const yz = ayetCoz(ay.value); n.ayet = yz; n.g = Date.now();
      if (!n.metin && !n.etiket.length && !n.ayet.length && n.yeni) { /* boş taslak: yine de vurgu olarak kaydedilir */ }
      const yeniMi = !!n.yeni; delete n.yeni; S.notlar[n.id] = n;
      kopar(n.id); notuUygula(n, IC().K.acik && IC().K.acik.url === n.kitap ? IC().K.acik.ayr : null);
      degisti(); ic.sheetKapat(); if (yeniMi) secimiTemizle();
      listeleriTazele();
    };
    alt.appendChild(kaydet);
    if (!n.yeni) {
      const git = el('button', 'kut-btn kut-btn-ince', 'Kitapta göster');
      git.onclick = () => { ic.sheetKapat(); notaGit(n); };
      alt.appendChild(git);
      const sil = el('button', 'kut-btn kut-btn-ince', '🗑 Sil');
      sil.onclick = () => {
        if (!confirm('Bu not silinsin mi?')) return;
        n.sil = true; n.g = Date.now(); kopar(n.id); degisti(); ic.sheetKapat(); listeleriTazele();
      };
      alt.appendChild(sil);
    }
    f.appendChild(alt);
    const d = el('div', 'kutn-durum kut-yardim'); d.textContent = durumMetni(); f.appendChild(d);
    ic.sheetAc(n.yeni ? '📝 Yeni not' : '📝 Not', f);
  }
  function notAc(id) { const n = S.notlar[id]; if (n && !n.sil) notFormu(n); }

  function notaGit(n) {
    const ic = IC(); const sg = n.seg[0];
    const k = ic.K;
    if (k.kokAcik && k.gorunum === 'okuma' && k.acik && k.acik.url === n.kitap) { ic.konumaGit(sg.pi, true); return; }
    const kayit = (ic.kaynaklar().find((x) => x.url === n.kitap)) || { url: n.kitap, ad: n.kad };
    ic.kitapAc(kayit, sg.pi);
  }

  // ── Etiketler ──────────────────────────────────────────────
  function tumEtiketler() { // [[etiket, sayı]]: üst etiketler de sayılır ("a/b" → "a" ve "a/b")
    const m = {};
    canli().forEach((n) => { const gor = new Set(); (n.etiket || []).forEach((t) => { const p = t.split('/'); for (let i = 1; i <= p.length; i++) gor.add(p.slice(0, i).join('/')); }); gor.forEach((t) => { m[t] = (m[t] || 0) + 1; }); });
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0], 'tr'));
  }
  const etiketUyar = (n, t) => (n.etiket || []).some((x) => x === t || x.startsWith(t + '/'));

  // ── Kartlar ve listeler ────────────────────────────────────
  function notKarti(n, onGit) {
    const kart = el('div', 'kutn-kart');
    const ust = el('div', 'kutn-kart-ust');
    ust.appendChild(el('span', 'kutn-kart-kitap', n.kad));
    ust.appendChild(el('span', 'kutn-kart-tarih', tarih(n.ts)));
    kart.appendChild(ust);
    const q = el('div', 'kutn-alinti kut-vur-' + (n.renk || 'sari'), kisalt(alinti(n), 220)); kart.appendChild(q);
    if (n.metin) kart.appendChild(el('div', 'kutn-kart-metin', n.metin));
    const etk = el('div', 'kutn-chipler');
    (n.etiket || []).forEach((t) => etk.appendChild(el('span', 'kutn-chip', '#' + t)));
    (n.ayet || []).forEach(([s, a, b]) => {
      const c = el('button', 'kutn-chip kutn-chip-ayet', ayetAd(s) + ' ' + s + ':' + (b !== a ? a + '-' + b : a));
      c.onclick = (ev) => { ev.stopPropagation(); if (onGit) onGit(); if (IC()) IC().ayetAc(s, a); };
      etk.appendChild(c);
    });
    if (etk.children.length) kart.appendChild(etk);
    const islem = el('div', 'kutn-kart-islem');
    const git = el('button', 'kut-btn kut-btn-ince', 'Kitapta aç'); git.onclick = (ev) => { ev.stopPropagation(); if (onGit) onGit(); notaGit(n); };
    const duz = el('button', 'kut-btn kut-btn-ince', 'Düzenle'); duz.onclick = (ev) => { ev.stopPropagation(); notFormu(n); };
    islem.appendChild(git); islem.appendChild(duz); kart.appendChild(islem);
    return kart;
  }
  function ayetNotlari(s, a) {
    return canli().filter((n) => (n.ayet || []).some(([ss, a1, a2]) => ss === s && a >= a1 && a <= (a2 || a1))).sort((x, y) => y.ts - x.ts);
  }

  let tazele = null;
  function listeleriTazele() { if (tazele) tazele(); }

  function kitapNotlariAc() {
    const ic = IC(); const k = ic.K.acik; if (!k) return; barGizle();
    const kap = el('div', 'kut-form');
    const liste = el('div', 'kutn-liste');
    const ara = el('input', 'kutn-input'); ara.placeholder = 'Bu kitapta notlarda ara…';
    kap.appendChild(ara); kap.appendChild(liste);
    const d = el('div', 'kutn-durum kut-yardim'); d.textContent = durumMetni(); kap.appendChild(d);
    const ciz = () => {
      liste.innerHTML = '';
      const q = ara.value.trim().toLocaleLowerCase('tr');
      const ns = canli().filter((n) => n.kitap === k.url).filter((n) => !q || (alinti(n) + ' ' + (n.metin || '') + ' ' + (n.etiket || []).join(' ')).toLocaleLowerCase('tr').includes(q)).sort((a, b) => a.seg[0].pi - b.seg[0].pi || a.seg[0].o - b.seg[0].o);
      if (!ns.length) liste.appendChild(el('div', 'kut-yardim', 'Bu kitapta henüz not yok. Okurken bir metni seçip “🖍 Vurgula” veya “📝 Not”a dokunun.'));
      ns.forEach((n) => liste.appendChild(notKarti(n, () => ic.sheetKapat())));
    };
    ara.oninput = ciz; ciz(); tazele = () => { if ($('kut-sheet')) ciz(); };
    ic.sheetAc('📝 Bu kitabın notları (' + canli().filter((n) => n.kitap === k.url).length + ')', kap);
  }

  function defterAc() {
    const ic = IC(); barGizle();
    const kap = el('div', 'kut-form');
    const ara = el('input', 'kutn-input'); ara.placeholder = 'Tüm notlarda ara…'; kap.appendChild(ara);
    const chipKutu = el('div', 'kutn-chipler kutn-chipler-kaydir'); kap.appendChild(chipKutu);
    const kitapSec = el('select', 'kutn-input'); kap.appendChild(kitapSec);
    const ayetAra = el('input', 'kutn-input'); ayetAra.placeholder = 'Âyete göre süz: 3:42'; kap.appendChild(ayetAra);
    const liste = el('div', 'kutn-liste'); kap.appendChild(liste);
    const alt = el('div', 'kutn-butonlar');
    const md = el('button', 'kut-btn kut-btn-ince', '⬇ Markdown olarak indir'); alt.appendChild(md);
    const yd = el('button', 'kut-btn kut-btn-ince', '☁ Şimdi yedekle'); yd.onclick = () => senkron(); alt.appendChild(yd);
    kap.appendChild(alt);
    const d = el('div', 'kutn-durum kut-yardim'); d.textContent = durumMetni(); kap.appendChild(d);
    let etiket = null;

    const sureler = () => [...new Set(canli().map((n) => n.kitap))].map((u) => [u, (canli().find((n) => n.kitap === u) || {}).kad]);
    function suzulen() {
      const q = ara.value.trim().toLocaleLowerCase('tr'); const ky = kitapSec.value; const ay = ayetCoz(ayetAra.value)[0];
      return canli().filter((n) => (!etiket || etiketUyar(n, etiket)) && (!ky || n.kitap === ky) &&
        (!ay || (n.ayet || []).some(([s, a1, a2]) => s === ay[0] && ay[1] <= (a2 || a1) && a1 <= ay[2])) &&
        (!q || (alinti(n) + ' ' + (n.metin || '') + ' ' + (n.etiket || []).join(' ') + ' ' + n.kad).toLocaleLowerCase('tr').includes(q)))
        .sort((a, b) => b.ts - a.ts);
    }
    function ciz() {
      chipKutu.innerHTML = '';
      const tum = el('button', 'kutn-chip' + (!etiket ? ' kutn-chip-sec' : ''), 'Tümü (' + canli().length + ')'); tum.onclick = () => { etiket = null; ciz(); }; chipKutu.appendChild(tum);
      tumEtiketler().forEach(([t, c]) => { const b = el('button', 'kutn-chip' + (etiket === t ? ' kutn-chip-sec' : ''), '#' + t + ' ' + c); b.onclick = () => { etiket = etiket === t ? null : t; ciz(); }; chipKutu.appendChild(b); });
      const secili = kitapSec.value; kitapSec.innerHTML = '';
      const o0 = el('option', '', 'Tüm kitaplar'); o0.value = ''; kitapSec.appendChild(o0);
      sureler().forEach(([u, ad]) => { const o = el('option', '', ad); o.value = u; kitapSec.appendChild(o); });
      kitapSec.value = secili;
      liste.innerHTML = '';
      const ns = suzulen();
      if (!ns.length) liste.appendChild(el('div', 'kut-yardim', canli().length ? 'Bu süzgece uyan not yok.' : 'Henüz not yok. Kitap okurken bir metni seçip “🖍 Vurgula” veya “📝 Not”a dokunun.'));
      ns.slice(0, 150).forEach((n) => liste.appendChild(notKarti(n, () => ic.sheetKapat())));
      if (ns.length > 150) liste.appendChild(el('div', 'kut-yardim', 'İlk 150 not gösteriliyor; süzgeçle daraltın.'));
    }
    ara.oninput = ciz; kitapSec.onchange = ciz; ayetAra.oninput = ciz;
    md.onclick = () => markdownIndir(suzulen());
    ciz(); tazele = () => { if ($('kut-sheet')) ciz(); };
    ic.sheetAc('📝 Not Defterim', kap);
  }

  function markdownIndir(ns) {
    const kitaplar = {};
    ns.slice().sort((a, b) => a.seg[0].pi - b.seg[0].pi).forEach((n) => { (kitaplar[n.kad] = kitaplar[n.kad] || []).push(n); });
    let t = '# Kütüphane notlarım\n\n';
    Object.keys(kitaplar).forEach((ad) => {
      t += '## ' + ad + '\n\n';
      kitaplar[ad].forEach((n) => {
        t += n.seg.map((s) => '> ' + s.q.replace(/\n+/g, ' ')).join('\n>\n') + '\n\n';
        if (n.metin) t += n.metin + '\n\n';
        const bilgi = [];
        if ((n.etiket || []).length) bilgi.push(n.etiket.map((x) => '#' + x).join(' '));
        if ((n.ayet || []).length) bilgi.push('Âyet: ' + ayetYaz(n.ayet));
        if (bilgi.length) t += '*' + bilgi.join(' · ') + '*\n\n';
      });
    });
    const blob = new Blob([t], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'kutuphane-notlarim-' + new Date().toISOString().slice(0, 10) + '.md';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  window.KutNot = { okumaHazir, notAc, kitapNotlariAc, defterAc, ayetNotlari, notKarti, senkron, _durum: () => ({ S, durum }) };
})();
