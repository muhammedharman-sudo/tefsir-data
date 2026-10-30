// ════════════════════════════════════════
//  İLGİLİ HADİSLER — her âyetin altında, Nâdirî (yalnız hadisler) kaynağından
//  Veri, Tefsir Kaynakları'ndaki "Nâdirî — yalnız hadisler" biçimiyle yüklenen kayıttır; metin değiştirilmez,
//  yalnız kayıt kayıt ayrılıp (giriş / Arapça / çeviri / dipnot) kartlara dizilir.
// ════════════════════════════════════════
(function () {
  'use strict';
  if (!window.KutAra) return;
  const A = () => window.KutAra;
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
  const HARF = /[A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
  const KAYNAK_RE = /Buh[âa]r[îi]|Müslim|Muslim|Tirmiz[îi]|Eb[ûu] D[âa]v[ûu]d|Nes[âa][îi]|[İI]bn M[âa]ce|Ahmed|D[âa]rim[îi]|Beyhak[îi]|Taber[âa]n[îi]|H[âa]kim|M[âa]lik|Muvatta|[İI]bn Hibb[âa]n|Ebû Ya|Ebu Ya|Süy[ûu]t[îi]|Deylem[îi]|Abdurrazz[âa]k|[İI]bn Ebî|Hat[îi]b|Sahih|Sünen|Müsned/i;
  const arapcaMi = (s) => { const a = (s.match(AR) || []).length, h = (s.match(HARF) || []).length; return h > 0 && a / h > 0.5; };

  function nadiriKaynaklari() {
    try { return [...new Set(_alimTefsirKaynaklariGetir().filter((k) => k.bicim === 'nadiri_hadis').map((k) => k.alim))]; } catch (e) { return []; }
  }
  function grupBul(alim, s, a) {
    let veri = {}; try { veri = _alimTefsirMetniGetir2(alim, s) || {}; } catch (e) {}
    for (const k of Object.keys(veri)) {
      if (k === '0') continue;
      if (k.split(',').map(Number).includes(a)) { const v = veri[k]; return typeof v === 'string' ? v : ((v && v.tefsir) || ''); }
    }
    return '';
  }
  // "giriş / Arapça / çeviri / [n] dipnot" satırlarından oluşan kayıtları ayırır
  function ayristir(metin) {
    const kayitlar = [];
    String(metin || '').split(/\n\s*\n/).forEach((blok) => {
      const satirlar = blok.split('\n').map((x) => x.trimEnd()).filter((x) => x.trim());
      if (!satirlar.length) return;
      const dip = {}; const govde = [];
      satirlar.forEach((l) => { const m = l.match(/^\[(\d+)\]\s(.*)$/); if (m) dip[m[1]] = m[2]; else govde.push(l); });
      if (!govde.length) return;
      const ar = govde.findIndex(arapcaMi);
      let giris = '', arapca = '', tr = '';
      if (ar >= 0) { giris = govde.slice(0, ar).join(' '); arapca = govde[ar]; tr = govde.slice(ar + 1).join(' '); }
      else if (govde.length > 1) { giris = govde[0]; tr = govde.slice(1).join(' '); }
      else tr = govde[0];
      const notNolar = []; (tr.match(/\[(\d+)\]/g) || []).forEach((x) => { const n = x.slice(1, -1); if (!notNolar.includes(n)) notNolar.push(n); });
      let kaynak = ''; const digerleri = [];
      Object.keys(dip).forEach((n) => { if (!kaynak && KAYNAK_RE.test(dip[n].slice(0, 120))) kaynak = dip[n]; else digerleri.push([n, dip[n]]); });
      kayitlar.push({ giris, arapca, tr, kaynak, dip: digerleri, notNolar });
    });
    return kayitlar;
  }
  function hadisler(s, a) {
    const cikti = [];
    nadiriKaynaklari().forEach((alim) => {
      const t = grupBul(alim, s, a); if (!t) return;
      const k = ayristir(t); if (k.length) cikti.push({ alim, kayitlar: k });
    });
    return cikti;
  }
  const toplam = (g) => g.reduce((n, x) => n + x.kayitlar.length, 0);

  // ── Hadis el Kitabı: data/hadis-el-kitabi-ayet.json (kaynak txt'den dönüştürüldü; metin aynen) ──
  const HEK_AD = 'Hadis el Kitabı';
  let hekVeri = null, hekSoz = null;
  function hekYukle() {
    if (hekVeri) return Promise.resolve(hekVeri);
    if (hekSoz) return hekSoz;
    hekSoz = fetch('data/hadis-el-kitabi-ayet.json?v=1').then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((j) => { hekVeri = (j && j.veri) || {}; return hekVeri; })
      .catch(async () => {
        try { const { icerik } = await _githubDosyaOku('data/hadis-el-kitabi-ayet.json'); hekVeri = icerik ? (JSON.parse(icerik).veri || {}) : {}; }
        catch (e) { hekSoz = null; hekVeri = null; }
        return hekVeri || {};
      });
    return hekSoz;
  }
  function hekBul(s, a) {
    const v = hekVeri && hekVeri[s]; if (!v) return [];
    const cikti = [];
    Object.keys(v).forEach((key) => {
      const p = key.split('-').map(Number), b = p[0], e = p[1] || p[0];
      if (a >= b && a <= e) v[key].forEach(([no, metin]) => cikti.push({ hek: true, no, metin, aralik: b === e ? '' : b + '–' + e }));
    });
    return cikti;
  }
  function hekKart(h, i, n) {
    const k = el('div', 'hd-kart hd-kart-hek');
    const ust = el('div', 'hd-ust');
    ust.appendChild(el('span', 'hd-rozet', 'Hadis ' + (i + 1) + '/' + n));
    if (h.aralik) ust.appendChild(el('span', 'hd-aralik', h.aralik + '. âyetler'));
    const kop = el('button', 'kb-mini', '📋 Kopyala');
    kop.onclick = () => { try { navigator.clipboard.writeText(h.metin + '\n(' + HEK_AD + ', Hadis ' + h.no + ')'); A().toast('Kopyalandı'); } catch (e) { A().toast('Kopyalanamadı'); } };
    ust.appendChild(kop); k.appendChild(ust);
    // Son cümle (kaynak) ayrı çip olarak gösterilir; metin aynen korunur
    let govde = h.metin, kaynak = '';
    const m = h.metin.match(/^(.*?\S)\s+([^.]{2,60}\.)$/);
    if (m && KAYNAK_RE.test(m[2])) { govde = m[1]; kaynak = m[2]; }
    k.appendChild(el('div', 'hd-tr', govde));
    k.appendChild(el('div', 'hd-kaynak', '📖 ' + (kaynak ? kaynak + ' · ' : '') + HEK_AD + ' · Hadis ' + h.no));
    return k;
  }

  function trYaz(kap, metin) { // [n] işaretlerini üst simge yapar, metni değiştirmez
    const re = /\[(\d+)\]/g; let son = 0, m;
    while ((m = re.exec(metin)) !== null) {
      if (m.index > son) kap.appendChild(document.createTextNode(metin.slice(son, m.index)));
      kap.appendChild(el('sup', 'hd-sup', m[1])); son = m.index + m[0].length;
    }
    if (son < metin.length) kap.appendChild(document.createTextNode(metin.slice(son)));
  }
  function kart(h, i, n, alim) {
    const k = el('div', 'hd-kart');
    const ust = el('div', 'hd-ust');
    ust.appendChild(el('span', 'hd-rozet', 'Hadis ' + (i + 1) + '/' + n));
    const kop = el('button', 'kb-mini', '📋 Kopyala');
    kop.onclick = () => { try { navigator.clipboard.writeText([h.giris, h.arapca, h.tr, h.kaynak].filter(Boolean).join('\n')); A().toast('Kopyalandı'); } catch (e) { A().toast('Kopyalanamadı'); } };
    ust.appendChild(kop); k.appendChild(ust);
    if (h.giris) k.appendChild(el('div', 'hd-giris', h.giris));
    if (h.arapca) { const ar = el('div', 'hd-ar', h.arapca); ar.dir = 'rtl'; ar.lang = 'ar'; k.appendChild(ar); }
    const tr = el('div', 'hd-tr'); trYaz(tr, h.tr); k.appendChild(tr);
    if (h.kaynak) k.appendChild(el('div', 'hd-kaynak', '📖 ' + h.kaynak));
    if (h.dip.length) {
      const d = el('details', 'hd-dip'); d.appendChild(el('summary', '', 'Dipnotlar (' + h.dip.length + ')'));
      h.dip.forEach(([no, t]) => d.appendChild(el('div', 'hd-dip-satir', '[' + no + '] ' + t)));
      k.appendChild(d);
    }
    return k;
  }
  function hadisAc(s, a) {
    const g = hadisler(s, a);
    const hek = hekBul(s, a);
    const sure = (typeof SURELER !== 'undefined' && SURELER[s - 1]) ? SURELER[s - 1].isim : String(s);
    const S = A().sayfa('🕌 İlgili Hadisler · ' + sure + ' ' + s + ':' + a);
    if (!g.length && !hek.length) { S.govde.appendChild(el('div', 'kut-yardim', 'Bu âyet için hadis bulunamadı.')); return; }
    g.forEach((x) => {
      const bas = el('div', 'hd-grup-baslik'); bas.appendChild(el('span', '', '📜 ' + x.alim)); bas.appendChild(el('span', 'hd-grup-sayi', x.kayitlar.length + ' hadis'));
      S.govde.appendChild(bas);
      x.kayitlar.forEach((h, i) => S.govde.appendChild(kart(h, i, x.kayitlar.length, x.alim)));
    });
    if (hek.length) {
      const bas = el('div', 'hd-grup-baslik'); bas.appendChild(el('span', '', '📘 ' + HEK_AD)); bas.appendChild(el('span', 'hd-grup-sayi', hek.length + ' hadis'));
      S.govde.appendChild(bas);
      hek.forEach((h, i) => S.govde.appendChild(hekKart(h, i, hek.length)));
    }
  }

  window.hadisButonuEkle = function (satir, s, a) {
    const yap = () => {
      const n = toplam(hadisler(s, a)) + hekBul(s, a).length; if (!n || satir.querySelector('.hd-btn')) return false;
      const b = el('button', 'ayet-ekstra-btn hd-btn', '🕌 İlgili Hadisler (' + n + ')'); b.dataset.goster = 'derinlik';
      b.style.borderColor = 'var(--gold)'; b.style.color = 'var(--gold)'; b.style.borderStyle = 'solid';
      b.onclick = () => hadisAc(s, a); satir.appendChild(b); return true;
    };
    const guncelle = () => { const b = satir.querySelector('.hd-btn'); if (b) b.remove(); yap(); };
    yap();
    if (!hekVeri) hekYukle().then(guncelle);
    setTimeout(guncelle, 1800); // tefsir verisi açılışta geç yüklenmiş olabilir
  };
  window.KutHadis = { hadisler, ac: hadisAc, ayristir };
})();
