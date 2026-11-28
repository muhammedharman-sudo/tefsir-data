/* 17-sure-kume-tefsirde.js — Kur'ân ekranı › Âyetler (sûre kümeleri) kartlarına "📖 Tefsirde" butonu.
   Basınca Tefsir › Karşılaştır, o kümenin âyetleriyle klasör modunda açılır. 2-ekranlar.js değişmez (sarmalanır). */
(function () {
  'use strict';
  const orij = window._skKumeKartiCiz;
  if (typeof orij !== 'function') return;
  const css = document.createElement('style');
  css.textContent = '.sk-kart-tefsir{margin-top:6px;padding:5px 10px;border-radius:12px;border:1px solid var(--border);background:var(--paper2);color:var(--ink);font:600 12px "Source Serif 4",serif;cursor:pointer}';
  document.head.appendChild(css);
  window._skKumeKartiCiz = function (sNo, k) {
    const kart = orij.apply(this, arguments);
    try {
      const alt = kart.querySelector('.sk-kart-metin');
      if (alt && window.TefsirKarsilastir && window.TefsirKarsilastir.klasorAc) {
        const b = document.createElement('button'); b.className = 'sk-kart-tefsir'; b.textContent = '📖 Tefsirde';
        b.onclick = (e) => { e.stopPropagation(); const items = []; for (let a = k.bas; a <= k.bit; a++) items.push({ s: sNo, a }); window.TefsirKarsilastir.klasorAc(items, k.konu); };
        alt.appendChild(b);
      }
    } catch (e) {}
    return kart;
  };
})();
