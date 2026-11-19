/* 8c-tefsir-baslik.js — Tefsir metninde "## Başlık" satırlarını açılır başlık yapar.
   Metin dosyada değişmez. Başlığın altındaki paragraflar, bir sonraki başlığa kadar, başlığa dokununca açılır. */
(function () {
  'use strict';
  const OZET = 'cursor:pointer;margin:14px 0 6px 0;font-weight:700;font-size:1.02em;color:var(--gold);border-left:3px solid var(--gold);padding:4px 10px;line-height:1.4;list-style:none;';
  const bs = (p) => p.tagName === 'P' && p.textContent.slice(0, 3) === '## ';
  function tara(kok) {
    if (!kok || !kok.querySelectorAll) return;
    const ebeveynler = new Set();
    kok.querySelectorAll('p').forEach((p) => { if (bs(p) && p.parentNode) ebeveynler.add(p.parentNode); });
    ebeveynler.forEach((ata) => {
      const cocuklar = Array.from(ata.childNodes); let det = null;
      cocuklar.forEach((n) => {
        if (n.nodeType === 1 && bs(n)) {
          det = document.createElement('details'); det.className = 'tb-baslik'; det.style.cssText = 'margin:0 0 6px 0;';
          const o = document.createElement('summary'); o.style.cssText = OZET;
          const ok = document.createElement('span'); ok.textContent = '▸ '; ok.className = 'tb-ok';
          o.appendChild(ok); o.appendChild(document.createTextNode(n.textContent.slice(3).trim()));
          det.addEventListener('toggle', () => { ok.textContent = det.open ? '▾ ' : '▸ '; });
          det.appendChild(o); ata.replaceChild(det, n);
        } else if (det) { det.appendChild(n); }
      });
    });
  }
  let zaman = null;
  const gozle = new MutationObserver(() => {
    clearTimeout(zaman);
    zaman = setTimeout(() => { gozle.disconnect(); try { tara(document.body); } finally { gozle.observe(document.body, { childList: true, subtree: true }); } }, 60);
  });
  function basla() { gozle.observe(document.body, { childList: true, subtree: true }); tara(document.body); }
  if (document.body) basla(); else document.addEventListener('DOMContentLoaded', basla);
})();
