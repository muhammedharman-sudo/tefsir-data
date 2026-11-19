/* 8d-tefsir-liste.js — Tefsir ekranı düzenlemeleri (mevcut fonksiyonları sarar; kaynak metin ve veri dosyaları değişmez)
   1) Çipler iki grup: 📚 Tefsirler ve 📝 Notlarım. Çipe UZUN BASARAK kaynak gruplar arasında taşınır (kalıcı).
   2) İslamoğlu ("Tefsir" iç adı) varsayılan olarak Tefsirler'de, adı "İslamoğlu", 114 sûrenin tamamı listelenir; seçilince yüklenir.
   3) Meal satırı boş olan (yalnız "N." veya "N. âyet") satırlar gösterilmez.
   4) Âyet grubu başlığına "## " başlıklarından konu adı eklenir: "4. âyet (gayba iman)". */
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
  const GENEL = /^(izah[ıi]?|giri[şs]|genel\s+tespitler?|âyetin\s+izah[ıi]|ayetin\s+izah[ıi]|tefsir[i]?|meal|a[çc][ıi]klama|not(lar)?|dipnotlar?)$/i;
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

  /* ── 4) grup başlığına konu ── */
  function baslikKonulari() {
    if (typeof _tefsirlerSecimi2 === 'undefined' || !_tefsirlerSecimi2.alim || !_tefsirlerSecimi2.sureNo) return;
    document.querySelectorAll('#tefsirler-ic button[onclick^="_alimTefsirGrupToggle"]').forEach((b) => {
      if (b.dataset.konulu) return; b.dataset.konulu = '1';
      const m = /_alimTefsirGrupToggle\('([^']*)'\)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
      const metin = konuMetni(konular[_tefsirlerSecimi2.alim + '|' + _tefsirlerSecimi2.sureNo + '|' + m[1]]);
      if (!metin) return;
      const sp = b.querySelector('span'); if (!sp) return;
      sp.textContent += ' (' + metin + ')';
      sp.style.cssText += 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;';
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
