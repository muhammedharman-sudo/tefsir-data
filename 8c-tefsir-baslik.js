/* 8c-tefsir-baslik.js — Tefsir metninde "## Başlık" satırlarını konu başlığı olarak gösterir.
   Metin dosyada değişmez; yalnız ekranda "## " işareti kalkar ve satır başlık biçimi alır. */
(function () {
  'use strict';
  const STIL = 'margin:18px 0 8px 0;font-weight:700;font-size:1.02em;color:var(--gold);border-left:3px solid var(--gold);padding-left:10px;line-height:1.4;';
  function tara(kok) {
    if (!kok || !kok.querySelectorAll) return;
    kok.querySelectorAll('p').forEach((p) => {
      if (p.dataset.bs) return;
      const t = p.textContent;
      if (t.slice(0, 3) !== '## ' || p.children.length > 1) return;
      p.dataset.bs = '1'; p.textContent = t.slice(3).trim(); p.style.cssText = STIL;
    });
  }
  let zaman = null;
  const gozle = new MutationObserver(() => { clearTimeout(zaman); zaman = setTimeout(() => tara(document.body), 60); });
  function basla() { gozle.observe(document.body, { childList: true, subtree: true }); tara(document.body); }
  if (document.body) basla(); else document.addEventListener('DOMContentLoaded', basla);
  window.TefsirBaslikTara = () => tara(document.body);
})();
