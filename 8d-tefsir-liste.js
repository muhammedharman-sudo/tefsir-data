/* 8d-tefsir-liste.js — Tefsir ekranı düzenlemeleri (mevcut fonksiyonları sarar; kaynak metin ve veri dosyaları değişmez)
   1) Çipler iki grup: 📚 Tefsirler ve 📝 Notlarım. Çipe UZUN BASARAK kaynak gruplar arasında taşınır (kalıcı).
   2) İslamoğlu ("Tefsir" iç adı) varsayılan olarak Tefsirler'de, adı "İslamoğlu", 114 sûrenin tamamı listelenir; seçilince yüklenir.
   3) Meal satırı boş olan (yalnız "N." veya "N. âyet") satırlar gösterilmez.
   4) Âyet grubu başlığı kart olur: âyet aralığı rozeti + "## " başlığından okunaklı konu adı (yalnız görünüm; metin değişmez). */
(function () {
  'use strict';
  const orij = window.tefsirlerEkraniRender;
  if (typeof orij !== 'function') return;
  const GORUNEN = { 'Tefsir': (typeof TEFSIR_GORUNEN_AD !== 'undefined' ? TEFSIR_GORUNEN_AD : 'İslamoğlu') };
  const LS = 'tefsir_chip_grup_v1';
  const tercih = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } };
  const tercihYaz = (t) => { try { localStorage.setItem(LS, JSON.stringify(t)); } catch (e) {} };
  const adOf = (b) => { const m = /_alimTefsirSec\('((?:[^'\\]|\\.)*)'\)/.exec(b.getAttribute('onclick') || ''); return m ? m[1].replace(/\\'/g, "'") : ''; };
  // Varsayılan grup: not klasörü (🔗) → Notlarım, İslamoğlu → Tefsirler; kullanıcı tercihi önceliklidir.
  const grupOf = (b, ad) => { const t = tercih()[ad]; if (t) return t; if (ad === 'Tefsir') return 'tefsir'; return b.textContent.trim().startsWith('🔗') ? 'not' : 'tefsir'; };

  /* ── 3) boş meal satırları ── */
  const BOS_MEAL = /^\d+\s*[.\-)]*\s*(?:\(?\s*[âaÂA]yet(?:ler)?\s*\)?)?[\s.:]*$/i;
  const bosMu = (s) => BOS_MEAL.test(String(s).trim());

  /* ── 4) konu adları ── */
  const GENEL = /^(izah[ıi]?|giri[şs]|genel\s+tespitler?|âyetin\s+izah[ıi]|ayetin\s+izah[ıi]|tefsir[i]?|meal[iîi]?|a[çc][ıi]klama(s[ıi])?|not(lar)?|dipnotlar?|dirayet\s+ve\s+rivayet\s+tefsiri|[âa]yetler\s+aras[ıi]nda\s+ba[ğg]lant[ıi]|ilgili\s+had[iîı]s(?:ler)?|(?:ini[şs]|n[üu]zul|ayetlerin\s+n[üu]zul)\s+sebebi)$/i;
  const konular = {}; // "sure|grup" -> [konu...]
  const tmiz = (s) => s.replace(/^#+\s*/, '').replace(/^\s*[\d]+\s*[.)\-–]\s*/, '').replace(/[\s:.\-–—]+$/, '').trim();
  function konuCikar(tefsir) {
    const out = [];
    String(tefsir || '').split(/\n+/).forEach((s) => {
      if (s.slice(0, 3) !== '## ') return;
      const k = tmiz(s); if (k && !GENEL.test(k.toLocaleLowerCase('tr')) && out.indexOf(k) < 0) out.push(k);
    });
    return out;
  }
  const kucult = (k) => k.charAt(0).toLocaleLowerCase('tr') + k.slice(1);
  function konuMetni(l) {
    if (!l || !l.length) return '';
    if (l.length === 1) return kucult(l[0]);
    if (l.length === 2) return l.map(kucult).join(' · ');
    return l.slice(0, 2).map(kucult).join(' · ') + ' +' + (l.length - 2);
  }

  const orijVeri = window._alimTefsirMetniGetir2;
  if (typeof orijVeri === 'function') {
    window._alimTefsirMetniGetir2 = function (alim, sureNo) {
      const v = orijVeri.apply(this, arguments);
      if (!v || typeof v !== 'object') return v;
      const sonuc = {};
      Object.keys(v).forEach((g) => {
        const x = v[g];
        if (x && typeof x === 'object') {
          const meal = String(x.meal || '').split('\n').filter((s) => !bosMu(s)).join('\n');
          sonuc[g] = Object.assign({}, x, { meal });
          konular[alim + '|' + sureNo + '|' + g] = konuCikar(x.tefsir);
        } else { sonuc[g] = x; }
      });
      return sonuc;
    };
  }

  /* ── 2) İslamoğlu: 114 sûre + yükleme ── */
  const orijSureSec = window._alimTefsirSureSec;
  if (typeof orijSureSec === 'function') {
    window._alimTefsirSureSec = function (no) {
      const n = parseInt(no);
      const alim = _tefsirlerSecimi2.alim;
      if (alim === 'Tefsir' && n && typeof _bellekTefsirSureHazirla === 'function' && !_bellekTefsirKaynakliMi(n)) {
        orijSureSec.call(this, no);
        _bellekTefsirSureHazirla(n, () => { try { tefsirlerEkraniRender(); } catch (e) {} });
        return;
      }
      return orijSureSec.apply(this, arguments);
    };
  }
  function sureListesiTamamla() {
    if (typeof _tefsirlerSecimi2 === 'undefined' || _tefsirlerSecimi2.alim !== 'Tefsir') return;
    const sel = document.querySelector('#tefsirler-ic select[onchange^="_alimTefsirSureSec"]'); if (!sel) return;
    const var_ = new Set(Array.from(sel.options).map((o) => o.value));
    let eklendi = false;
    for (let n = 1; n <= 114; n++) {
      if (var_.has(String(n))) continue;
      const o = document.createElement('option'); o.value = String(n);
      o.textContent = n + '. ' + ((typeof SURELER !== 'undefined' && SURELER[n - 1]) ? SURELER[n - 1].isim : 'Sure ' + n);
      if (_tefsirlerSecimi2.sureNo == n) o.selected = true;
      sel.appendChild(o); eklendi = true;
    }
    if (eklendi) Array.from(sel.options).slice(1).sort((a, b) => a.value - b.value).forEach((o) => sel.appendChild(o));
  }

  /* ── çipleri gruplama ── */
  const etiket = (metin, bosluk) => {
    const d = document.createElement('div');
    d.textContent = metin;
    d.style.cssText = 'font-family:\'Source Serif 4\',serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:' + (bosluk ? '14px' : '0') + ' 0 8px;';
    return d;
  };
  function uzunBasma(b, ad, simdiki) {
    let z = null, basti = false;
    const iptal = () => { clearTimeout(z); z = null; };
    b.addEventListener('touchstart', () => { basti = false; z = setTimeout(() => { basti = true; tasi(ad, simdiki); }, 650); }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach((o) => b.addEventListener(o, iptal, { passive: true }));
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); tasi(ad, simdiki); });
    b.addEventListener('click', (e) => { if (basti) { e.stopImmediatePropagation(); e.preventDefault(); basti = false; } }, true);
  }
  function tasi(ad, simdiki) {
    const hedef = simdiki === 'tefsir' ? 'not' : 'tefsir';
    const gad = GORUNEN[ad] || ad;
    if (!confirm('"' + gad + '" ' + (hedef === 'tefsir' ? '📚 Tefsirler' : '📝 Notlarım') + ' grubuna taşınsın mı?')) return;
    const t = tercih(); t[ad] = hedef; tercihYaz(t);
    try { tefsirlerEkraniRender(); } catch (e) {}
  }
  function grupla() {
    const ic = document.getElementById('tefsirler-ic'); if (!ic) return;
    const kap = Array.from(ic.children).find((e) => e.tagName === 'DIV' && e.querySelector(':scope > button[onclick^="_alimTefsirSec"]'));
    if (!kap || kap.dataset.gruplu) return;
    kap.dataset.gruplu = '1';
    const dugmeler = Array.from(kap.querySelectorAll(':scope > button'));
    const tefsirler = [], notlar = [];
    dugmeler.forEach((b) => {
      const ad = adOf(b), g = grupOf(b, ad);
      if (GORUNEN[ad]) b.textContent = GORUNEN[ad];
      else if (g === 'tefsir') b.textContent = b.textContent.replace(/^🔗\s*/, '');
      else if (!b.textContent.trim().startsWith('🔗')) b.textContent = '🔗 ' + b.textContent;
      uzunBasma(b, ad, g);
      (g === 'not' ? notlar : tefsirler).push(b);
    });
    const yeni = (liste) => { const d = document.createElement('div'); d.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;'; liste.forEach((b) => d.appendChild(b)); return d; };
    kap.innerHTML = ''; kap.style.display = 'block';
    if (tefsirler.length) { kap.appendChild(etiket('📚 Tefsirler (' + tefsirler.length + ')', false)); kap.appendChild(yeni(tefsirler)); }
    if (notlar.length) { kap.appendChild(etiket('📝 Notlarım — âyet altına eklediklerim (' + notlar.length + ')', tefsirler.length > 0)); kap.appendChild(yeni(notlar)); }
    const ipucu = document.createElement('div');
    ipucu.textContent = 'İpucu: bir kaynağı diğer gruba taşımak için adına uzun bas.';
    ipucu.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;opacity:.8;';
    kap.appendChild(ipucu);
  }

  /* ── 4) grup başlığı: kart görünümü (rozet + okunaklı başlık) ── */
  const css = document.createElement('style');
  css.textContent =
    'button.tg-kart{width:100%;text-align:left;display:flex;align-items:center;gap:12px;padding:13px 14px;border:none;cursor:pointer;font-family:"Source Serif 4",serif;color:var(--ink)}' +
    'button.tg-kart .tg-roz{flex:none;min-width:58px;text-align:center;padding:7px 8px 6px;border-radius:12px;background:rgba(184,144,47,.14);border:1px solid rgba(184,144,47,.35);color:var(--gold);line-height:1.1}' +
    'button.tg-kart .tg-roz b{display:block;font-size:17px;font-weight:700;letter-spacing:.2px}' +
    'button.tg-kart .tg-roz i{display:block;font-style:normal;font-size:10px;letter-spacing:.08em;text-transform:uppercase;opacity:.8;margin-top:2px}' +
    'button.tg-kart .tg-met{flex:1;min-width:0}' +
    'button.tg-kart .tg-bas{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;font-size:16px;font-weight:600;line-height:1.35;color:var(--ink)}' +
    'button.tg-kart .tg-alt{margin-top:3px;font-size:12.5px;line-height:1.35;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    'button.tg-kart .tg-ok{flex:none;font-size:13px;color:var(--muted);opacity:.75}' +
    'button.tg-kart.tg-bossa .tg-bas{font-weight:500;color:var(--muted);font-size:14px}';
  document.head.appendChild(css);

  const TEMIZ_BOSLUK = /[​-‍⁠﻿]/g;
  const KUCUK_BAG = { 've': 1, 'ile': 1, 'de': 1, 'da': 1, 'ki': 1, 'mi': 1, 'mı': 1, 'mu': 1, 'mü': 1 };
  const GENEL_KELIME = /^(a[çc][ıi]klama\w*|izah\w*|tefsir\w*|meal\w*|giri[şs]|not\w*)$/i;
  const bUp = (c) => c.toLocaleUpperCase('tr');
  function baslikDuzelt(k) {
    let t = String(k).replace(TEMIZ_BOSLUK, '').replace(/\s+/g, ' ').trim();
    t = t.replace(/^[\s\-–—(\[]*\d+\s*[-–—.)\]]+\s*/, '').replace(/^[\s\-–—·•]+/, '').replace(/[\s:;,\-–—·]+$/, '').trim();
    // Her sözcük büyük harfle başlıyorsa (Başlık Yazımı) bağlaçları küçült
    const kel = t.split(' ');
    const harfli = kel.filter((w) => /^[(\["'“‘]*\p{L}/u.test(w) && w.replace(/[^\p{L}]/gu, '').length > 2);
    const buyuk = harfli.filter((w) => { const m = w.match(/\p{L}/u); return m && m[0] === bUp(m[0]); });
    if (harfli.length >= 3 && buyuk.length / harfli.length >= 0.6) {
      for (let i = 1; i < kel.length; i++) { const bare = kel[i].toLocaleLowerCase('tr'); if (KUCUK_BAG[bare] && kel[i] !== bare) kel[i] = bare; }
      t = kel.join(' ');
    }
    // İlk harf büyük ("hz. Nuh" → "Hz. Nuh")
    t = t.replace(/^([("'“‘\[]*)(\p{L})/u, (m, a, c) => a + bUp(c));
    return t;
  }
  window.tefsirBaslikDuzelt = baslikDuzelt;
  function baslikKonulari() {
    if (typeof _tefsirlerSecimi2 === 'undefined' || !_tefsirlerSecimi2.alim || !_tefsirlerSecimi2.sureNo) return;
    document.querySelectorAll('#tefsirler-ic button[onclick^="_alimTefsirGrupToggle"]').forEach((b) => {
      if (b.dataset.konulu) return; b.dataset.konulu = '1';
      const m = /_alimTefsirGrupToggle\('([^']*)'\)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
      const parca = m[1].split(',');
      const etk = parca.length > 1 ? (parca[0] + '–' + parca[parca.length - 1]) : parca[0];
      const acikMi = /▲/.test(b.textContent);
      const konu = (konular[_tefsirlerSecimi2.alim + '|' + _tefsirlerSecimi2.sureNo + '|' + m[1]] || [])
        .map(baslikDuzelt).filter((x) => x && !GENEL_KELIME.test(x) && x.length > 1);
      const tekil = [...new Set(konu)];
      b.className = 'tg-kart' + (tekil.length ? '' : ' tg-bossa');
      b.removeAttribute('style'); b.style.background = acikMi ? 'var(--paper2)' : 'var(--paper)';
      b.innerHTML = '';
      const roz = document.createElement('span'); roz.className = 'tg-roz';
      const bb = document.createElement('b'); bb.textContent = etk; const ii = document.createElement('i'); ii.textContent = parca.length > 1 ? 'âyetler' : 'âyet';
      roz.appendChild(bb); roz.appendChild(ii);
      const met = document.createElement('span'); met.className = 'tg-met';
      const bas = document.createElement('span'); bas.className = 'tg-bas'; bas.style.display = '';
      bas.textContent = tekil.length ? tekil[0] : (parca.length > 1 ? etk + '. âyetler' : etk + '. âyet');
      met.appendChild(bas);
      if (tekil.length > 1) { const alt = document.createElement('span'); alt.className = 'tg-alt'; alt.style.display = ''; alt.textContent = tekil.slice(1).join(' · '); met.appendChild(alt); }
      const ok = document.createElement('span'); ok.className = 'tg-ok'; ok.textContent = acikMi ? '▲' : '▼';
      b.appendChild(roz); b.appendChild(met); b.appendChild(ok);
    });
  }

  window.tefsirlerEkraniRender = function () {
    const r = orij.apply(this, arguments);
    try { grupla(); } catch (e) {}
    try { sureListesiTamamla(); } catch (e) {}
    try { baslikKonulari(); } catch (e) {}
    return r;
  };
})();
