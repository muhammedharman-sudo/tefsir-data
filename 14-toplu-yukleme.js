/* 14-toplu-yukleme.js — Tefsir Kaynakları'na "Toplu yükle" ekler.
 * Birden çok .txt dosyası tek seferde seçilir; eser adı dosya adından alınır (uzantısız),
 * her dosya ayrı bir tefsir kaynağı (Standart biçim, çok sûreli) olarak eklenir.
 * Dosyalar tarayıcıda (IndexedDB) kalıcı saklanır; uygulama açılışında yeniden ayrıştırılır.
 * Mevcut fonksiyonlar sarılır, değiştirilmez. Kaynak dosyalara dokunulmaz.
 */
(function () {
  'use strict';
  if (typeof _alimTefsirCokluYukle !== 'function' || typeof _alimTefsirKaynaklariGetir !== 'function') return;

  const DB_AD = 'toplu_tefsir_db', DEPO = 'eserler';
  function dbAc() {
    return new Promise((ok, hata) => {
      if (!window.indexedDB) { hata(new Error('IndexedDB yok')); return; }
      const r = indexedDB.open(DB_AD, 1);
      r.onupgradeneeded = e => { e.target.result.createObjectStore(DEPO, { keyPath: 'alim' }); };
      r.onsuccess = e => ok(e.target.result);
      r.onerror = e => hata(e.target.error);
    });
  }
  async function idbYaz(alim, metin) {
    const db = await dbAc();
    return new Promise((ok, hata) => {
      const tx = db.transaction(DEPO, 'readwrite');
      tx.objectStore(DEPO).put({ alim, metin, tarih: Date.now() });
      tx.oncomplete = () => ok(true); tx.onerror = e => hata(e.target.error);
    });
  }
  async function idbSil(alim) {
    try {
      const db = await dbAc();
      await new Promise(ok => { const tx = db.transaction(DEPO, 'readwrite'); tx.objectStore(DEPO).delete(alim); tx.oncomplete = ok; tx.onerror = ok; });
    } catch (e) {}
  }
  async function idbHepsi() {
    try {
      const db = await dbAc();
      return await new Promise(ok => {
        const r = db.transaction(DEPO, 'readonly').objectStore(DEPO).getAll();
        r.onsuccess = () => ok(r.result || []); r.onerror = () => ok([]);
      });
    } catch (e) { return []; }
  }

  function yerelKaynaklar() { return _alimTefsirKaynaklariGetir().filter(k => k.yerel); }

  // ---- Açılışta yerel eserleri yükle ----
  async function yerelleriYukle() {
    const kayitlar = await idbHepsi();
    const var_ = new Set(yerelKaynaklar().map(k => k.alim));
    kayitlar.forEach(k => {
      if (!var_.has(k.alim)) return; // kaynak listesinden silinmişse yükleme
      try { _alimTefsirCokluYukle(k.alim, k.metin); } catch (e) { console.warn('Yerel eser yüklenemedi:', k.alim, e); }
    });
  }
  const orijOnYukle = window._tumKaynaklariOnYukle;
  if (typeof orijOnYukle === 'function') {
    window._tumKaynaklariOnYukle = async function () {
      try { await yerelleriYukle(); } catch (e) {}
      return orijOnYukle.apply(this, arguments);
    };
  }

  // ---- Kaydet / Sil: yerel kayıtları koru ----
  const orijKaydet = window.alimTefsirKaynaklariniKaydet;
  if (typeof orijKaydet === 'function') {
    window.alimTefsirKaynaklariniKaydet = function () {
      const yerel = yerelKaynaklar();
      const r = orijKaydet.apply(this, arguments);
      const simdi = _alimTefsirKaynaklariGetir();
      yerel.forEach(y => { if (!simdi.some(k => k.alim === y.alim)) simdi.push(y); });
      _alimTefsirKaynaklariKaydet(simdi);
      return r;
    };
  }
  const orijSil = window._alimTefsirKaynakSil;
  if (typeof orijSil === 'function') {
    window._alimTefsirKaynakSil = function (idx) {
      const k = _alimTefsirKaynaklariGetir()[idx];
      if (k && k.yerel) idbSil(k.alim);
      return orijSil.apply(this, arguments);
    };
  }

  // ---- Liste görünümü: yerel satırların URL kutusunu bilgilendirici yap ----
  const orijRender = window._alimTefsirKaynakListeRender;
  if (typeof orijRender === 'function') {
    window._alimTefsirKaynakListeRender = function () {
      orijRender.apply(this, arguments);
      const liste = document.getElementById('alim-tefsir-kaynak-liste'); if (!liste) return;
      const kaynaklar = _alimTefsirKaynaklariGetir();
      Array.from(liste.children).forEach((satir, i) => {
        const k = kaynaklar[i]; if (!k || !k.yerel) return;
        const url = satir.querySelector('input[data-field="url"]');
        if (url) { url.placeholder = '📦 Yerel dosya (toplu yükleme) — tarayıcıda saklı'; url.disabled = true; }
        const dugme = satir.querySelector('button[onclick^="_tekAlimTefsirYukle"]');
        if (dugme) dugme.style.display = 'none';
      });
    };
  }

  // ---- Sonuç penceresi ----
  function sonucGoster(satirlar) {
    const eski = document.getElementById('toplu-sonuc-kaplama'); if (eski) eski.remove();
    const k = document.createElement('div');
    k.id = 'toplu-sonuc-kaplama';
    k.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
    const kutu = document.createElement('div');
    kutu.style.cssText = 'background:var(--paper);color:var(--ink);border-radius:14px;max-width:560px;width:100%;max-height:80vh;overflow:auto;padding:16px;font-family:\'Source Serif 4\',serif;font-size:13px;line-height:1.6;';
    const pre = document.createElement('pre'); pre.style.cssText = 'white-space:pre-wrap;margin:0 0 12px 0;font-family:inherit;'; pre.textContent = satirlar.join('\n');
    const kapat = document.createElement('button'); kapat.textContent = 'Kapat';
    kapat.style.cssText = 'width:100%;padding:9px;border:none;border-radius:9px;background:var(--ink);color:var(--gold2);font-weight:600;cursor:pointer;';
    kapat.onclick = () => k.remove();
    kutu.appendChild(pre); kutu.appendChild(kapat); k.appendChild(kutu);
    k.addEventListener('click', e => { if (e.target === k) k.remove(); });
    document.body.appendChild(k);
  }

  function eserAdi(dosyaAdi) {
    return dosyaAdi.replace(/\.(txt|text|md)$/i, '').replace(/\s+/g, ' ').trim();
  }

  // ---- Toplu yükleme işleyicisi ----
  window.tefsirTopluYukle = async function (dosyalar) {
    dosyalar = Array.from(dosyalar || []);
    if (!dosyalar.length) return;
    const rapor = [];
    let basarili = 0;
    const durum = document.getElementById('toplu-yukle-durum');
    for (let i = 0; i < dosyalar.length; i++) {
      const f = dosyalar[i];
      const alim = eserAdi(f.name);
      if (durum) durum.textContent = 'Yükleniyor ' + (i + 1) + '/' + dosyalar.length + ': ' + alim + '…';
      await new Promise(r => setTimeout(r, 20));
      if (!alim) { rapor.push('⚠️ ' + f.name + ' — eser adı çıkarılamadı, atlandı.'); continue; }
      let kaynaklar = _alimTefsirKaynaklariGetir();
      const mevcut = kaynaklar.find(k => k.alim === alim);
      if (mevcut && !mevcut.yerel) {
        rapor.push('⚠️ ' + alim + ' — aynı adlı bir URL kaynağı zaten var, atlandı (üzerine yazılmadı).');
        continue;
      }
      try {
        let metin = await f.text();
        if (metin.charCodeAt(0) === 0xFEFF) metin = metin.slice(1);
        metin = metin.replace(/\r\n?/g, '\n');
        const sonuc = _alimTefsirCokluYukle(alim, metin);
        if (!sonuc.length) { rapor.push('⚠️ ' + alim + ' — hiç sûre başlığı bulunamadı ("N- Sûre Adı Sûresi"), eklenmedi.'); continue; }
        await idbYaz(alim, metin);
        kaynaklar = _alimTefsirKaynaklariGetir();
        if (!kaynaklar.some(k => k.alim === alim)) kaynaklar.push({ alim, sureNo: '', url: '', yerel: true, bicim: '' });
        _alimTefsirKaynaklariKaydet(kaynaklar);
        const grup = sonuc.reduce((t, s) => t + s.ayetSayisi, 0);
        const nolar = sonuc.map(s => s.sureNo).sort((a, b) => a - b);
        rapor.push('✅ ' + alim + ' — ' + sonuc.length + ' sûre, ' + grup + ' âyet grubu' + (mevcut ? ' (güncellendi)' : ' (eklendi)'));
        rapor.push('    Sûre no: ' + nolar.join(', '));
        basarili++;
      } catch (e) { rapor.push('❌ ' + alim + ' — hata: ' + e.message); }
    }
    if (durum) durum.textContent = '';
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    rapor.unshift('Toplu yükleme: ' + basarili + '/' + dosyalar.length + ' eser eklendi.\n');
    try { _alimTefsirKaynakListeRender(); } catch (e) {}
    try { if (typeof tefsirlerEkraniRender === 'function' && document.getElementById('tefsirler-ic')) tefsirlerEkraniRender(); } catch (e) {}
    sonucGoster(rapor);
  };

  // ---- Modala buton ekle ----
  const orijAc = window.alimTefsirKaynaklariAc;
  if (typeof orijAc === 'function') {
    window.alimTefsirKaynaklariAc = function () {
      orijAc.apply(this, arguments);
      const modal = document.getElementById('alim-tefsir-kaynaklar-modal');
      if (!modal || modal.querySelector('#toplu-yukle-kap')) return;
      const liste = modal.querySelector('#alim-tefsir-kaynak-liste');
      const kap = document.createElement('div'); kap.id = 'toplu-yukle-kap'; kap.style.cssText = 'margin-bottom:12px;';
      kap.innerHTML =
        '<button id="toplu-yukle-btn" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--paper2);font-family:\'Source Serif 4\',serif;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;">📦 Toplu yükle (birden çok dosya)</button>' +
        '<div style="font-size:11px;color:var(--muted);margin-top:4px;line-height:1.5;">Birden çok .txt dosyasını birlikte seçin. Eser adı dosya adından alınır; her dosya ayrı bir tefsir kaynağı olur (çok sûreli, Standart biçim). Dosyalar bu cihazda saklanır.</div>' +
        '<div id="toplu-yukle-durum" style="font-size:12px;color:var(--muted);margin-top:4px;"></div>' +
        '<input id="toplu-yukle-input" type="file" multiple accept=".txt,text/plain" style="display:none;">';
      liste.parentNode.insertBefore(kap, liste);
      const inp = kap.querySelector('#toplu-yukle-input');
      kap.querySelector('#toplu-yukle-btn').onclick = () => inp.click();
      inp.onchange = () => { const d = Array.from(inp.files); inp.value = ''; window.tefsirTopluYukle(d); };
    };
  }
})();
