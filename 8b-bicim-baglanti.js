/* 8b-bicim-baglanti.js — Tefsir Kaynakları'na "Biçim" seçimi ekler ve yüklemeyi biçime özel ayrıştırıcıya yönlendirir.
 * Gereken: 5-tefsir-github-sync.js ve 8-tefsir-bicimleri.js önce yüklenmiş olmalı.
 * Kaynak dosya (GitHub) asla değiştirilmez; yalnız okunur, RAM'de ayrıştırılır.
 */
(function () {
  'use strict';
  const TB = window.TefsirBicimleri;
  if (!TB || typeof _alimTefsirCokluYukle !== 'function') return;

  const BICIMLER = [
    ['', 'Standart (numaralı âyet grupları)'],
    ['kesf', 'Keşfu’l-Hakâyık (a/b- işaretli)'],
    ['nadiri_hadis', 'Nâdirî — yalnız hadisler']
  ];
  window._bicimRaporlari = window._bicimRaporlari || {};

  function kaynakBicimi(alim) {
    const k = _alimTefsirKaynaklariGetir().find(x => x.alim === alim);
    return (k && k.bicim) || '';
  }
  function cozumle(bicim, metin) {
    return bicim === 'kesf' ? TB.kesfAyristir(metin) : TB.nadiriAyristir(metin);
  }
  function yaz(alim, sonuc, yalnizSure) {
    const donen = [];
    Object.keys(sonuc.sureler).forEach(no => {
      if (yalnizSure && +no !== +yalnizSure) return;
      const s = sonuc.sureler[no];
      const adet = Object.keys(s.gruplar).length;
      if (!adet) return;
      _bellekCache.tefsir[_alimTefsirAnahtari(alim, +no)] = s.gruplar;
      donen.push({ sureNo: +no, ayetSayisi: adet });
    });
    return donen;
  }

  // ---- Yükleyicileri sar ----
  const orijCokluYukle = window._alimTefsirCokluYukle;
  window._alimTefsirCokluYukle = function (alim, metin) {
    const b = kaynakBicimi(alim);
    if (!b) return orijCokluYukle(alim, metin);
    const sonuc = cozumle(b, metin);
    window._bicimRaporlari[alim] = { bicim: b, sonuc: sonuc };
    return yaz(alim, sonuc);
  };
  const orijYukle = window._alimTefsirYukle;
  window._alimTefsirYukle = function (alim, sureNo, metin) {
    const b = kaynakBicimi(alim);
    if (!b) return orijYukle(alim, sureNo, metin);
    const sonuc = cozumle(b, metin);
    window._bicimRaporlari[alim] = { bicim: b, sonuc: sonuc };
    const d = yaz(alim, sonuc, sureNo);
    return d.length ? d[0].ayetSayisi : 0;
  };

  // ---- Rapor metni ----
  function raporMetni(alim) {
    const r = window._bicimRaporlari[alim];
    if (!r) return 'Bu kaynak için henüz yükleme raporu yok. Önce “⬇ Bu Tefsiri Yükle”ye basın.';
    const s = r.sonuc, rp = s.rapor, satir = [];
    const nolar = Object.keys(s.sureler).map(Number).sort((a, b) => a - b);
    let toplamAyet = 0, toplamGrup = 0; const eksikAyetli = [];
    nolar.forEach(n => { const x = s.sureler[n]; toplamAyet += x.bulunan; toplamGrup += Object.keys(x.gruplar).length; if (x.eksikAyet.length) eksikAyetli.push(n + '. sûre: ' + x.eksikAyet.join(',') + ' bulunamadı'); });
    satir.push(alim + ' — ' + (r.bicim === 'kesf' ? 'Keşfu’l-Hakâyık' : 'Nâdirî (hadisler)'));
    satir.push('Bulunan sûre: ' + nolar.length + '/114 · Bulunan âyet: ' + toplamAyet + '/6236 · Yüklenen grup: ' + toplamGrup);
    if (rp.eksikSureler.length) satir.push('Kaynakta olmayan sûre: ' + rp.eksikSureler.join(', '));
    if (eksikAyetli.length) satir.push('Eksik âyetler: ' + eksikAyetli.join(' · '));
    if (r.bicim === 'nadiri_hadis') {
      satir.push('Hadis kaydı: ' + rp.hadisSayisi + ' (tahmini sınırlı: ' + rp.tahminiSinir.length + ')');
      satir.push('Alınmayan: ' + rp.kapsanmayanDipnot.length + ' anlatım biçimli hadis dipnotu, ' + rp.belirsizArapca.length + ' sınırı belirsiz Arapça, ' + rp.haricArapca.length + ' hadis olmayan Arapça');
    } else {
      satir.push('Uyarı: ' + (rp.uyari.length || 0) + ' · Dipnot kusuru: ' + (rp.dipnotKusur.length || 0));
      rp.uyari.slice(0, 12).forEach(u => satir.push(' • ' + u));
      rp.dipnotKusur.slice(0, 12).forEach(u => satir.push(' • ' + u));
    }
    return satir.join('\n');
  }
  window.bicimRaporuGoster = function (alim) {
    const eski = document.getElementById('bicim-rapor-kaplama'); if (eski) eski.remove();
    const k = document.createElement('div');
    k.id = 'bicim-rapor-kaplama';
    k.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
    const kutu = document.createElement('div');
    kutu.style.cssText = 'background:var(--paper);color:var(--ink);border-radius:14px;max-width:560px;width:100%;max-height:80vh;overflow:auto;padding:16px;font-family:\'Source Serif 4\',serif;font-size:13px;line-height:1.6;';
    const pre = document.createElement('pre'); pre.style.cssText = 'white-space:pre-wrap;margin:0 0 12px 0;font-family:inherit;'; pre.textContent = raporMetni(alim);
    const kapat = document.createElement('button'); kapat.textContent = 'Kapat';
    kapat.style.cssText = 'width:100%;padding:9px;border:none;border-radius:9px;background:var(--ink);color:var(--gold2);font-weight:600;cursor:pointer;';
    kapat.onclick = () => k.remove();
    kutu.appendChild(pre); kutu.appendChild(kapat); k.appendChild(kutu);
    k.addEventListener('click', e => { if (e.target === k) k.remove(); });
    document.body.appendChild(k);
  };
  window._bicimKaydet = function (idx, deger) {
    const kaynaklar = _alimTefsirKaynaklariGetir();
    if (kaynaklar[idx]) { kaynaklar[idx].bicim = deger; _alimTefsirKaynaklariKaydet(kaynaklar); }
  };

  // ---- Kaynak listesine "Biçim" seçimi ekle ----
  const orijRender = window._alimTefsirKaynakListeRender;
  window._alimTefsirKaynakListeRender = function () {
    orijRender.apply(this, arguments);
    const liste = document.getElementById('alim-tefsir-kaynak-liste'); if (!liste) return;
    const kaynaklar = _alimTefsirKaynaklariGetir();
    Array.from(liste.children).forEach((satir, i) => {
      const k = kaynaklar[i]; if (!k || satir.querySelector('.bicim-sec')) return;
      const kap = document.createElement('div'); kap.className = 'bicim-sec'; kap.style.cssText = 'margin-bottom:8px;';
      const sel = document.createElement('select');
      sel.style.cssText = 'width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:\'Source Serif 4\',serif;font-size:12px;color:var(--ink);box-sizing:border-box;';
      BICIMLER.forEach(([v, ad]) => { const o = document.createElement('option'); o.value = v; o.textContent = 'Biçim: ' + ad; if ((k.bicim || '') === v) o.selected = true; sel.appendChild(o); });
      sel.onchange = () => window._bicimKaydet(i, sel.value);
      kap.appendChild(sel);
      if (window._bicimRaporlari[k.alim]) {
        const b = document.createElement('button'); b.textContent = '📋 Yükleme raporu';
        b.style.cssText = 'width:100%;margin-top:6px;padding:7px;border:1px solid var(--border);border-radius:8px;background:none;font-family:\'Source Serif 4\',serif;font-size:12px;color:var(--muted);cursor:pointer;';
        b.onclick = () => window.bicimRaporuGoster(k.alim);
        kap.appendChild(b);
      }
      const dugme = satir.lastElementChild; satir.insertBefore(kap, dugme);
    });
  };
})();
