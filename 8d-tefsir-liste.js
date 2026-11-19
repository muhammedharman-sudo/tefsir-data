/* 8d-tefsir-liste.js — Tefsir ekranında çipleri iki gruba ayırır:
   📚 Tefsirler (Kaynak Ekle ile eklenenler) ve 📝 Notlarım (âyet altındaki "Not ekle" klasörleri, 🔗 ile işaretli).
   Mevcut tefsirlerEkraniRender'ı sarar; veri ve diğer davranışlar değişmez. */
(function () {
  'use strict';
  const orij = window.tefsirlerEkraniRender;
  if (typeof orij !== 'function') return;
  const etiket = (metin, bosluk) => {
    const d = document.createElement('div');
    d.textContent = metin;
    d.style.cssText = 'font-family:\'Source Serif 4\',serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:' + (bosluk ? '14px' : '0') + ' 0 8px;';
    return d;
  };
  function grupla() {
    const ic = document.getElementById('tefsirler-ic'); if (!ic) return;
    const kap = Array.from(ic.children).find((e) => e.tagName === 'DIV' && e.querySelector(':scope > button[onclick^="_alimTefsirSec"]'));
    if (!kap || kap.dataset.gruplu) return;
    kap.dataset.gruplu = '1';
    const dugmeler = Array.from(kap.querySelectorAll(':scope > button'));
    const notlar = dugmeler.filter((b) => b.textContent.trim().startsWith('🔗'));
    const tefsirler = dugmeler.filter((b) => !notlar.includes(b));
    const yeni = (liste) => { const d = document.createElement('div'); d.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;'; liste.forEach((b) => d.appendChild(b)); return d; };
    kap.innerHTML = ''; kap.style.display = 'block';
    if (tefsirler.length) { kap.appendChild(etiket('📚 Tefsirler (' + tefsirler.length + ')', false)); kap.appendChild(yeni(tefsirler)); }
    if (notlar.length) { kap.appendChild(etiket('📝 Notlarım — âyet altına eklediklerim (' + notlar.length + ')', tefsirler.length > 0)); kap.appendChild(yeni(notlar)); }
  }
  window.tefsirlerEkraniRender = function () { const r = orij.apply(this, arguments); try { grupla(); } catch (e) {} return r; };
})();
