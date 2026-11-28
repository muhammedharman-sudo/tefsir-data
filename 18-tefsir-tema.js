/* 18-tefsir-tema.js — Tefsir ekranı için okuma teması ve düzeni.
   • Temalar: Gündüz (krem), Sepya, Gece, Uygulama teması. Yazı boyutu, satır aralığı ve Arapça boyutu ayarlanır (Aa).
   • Âyet kartı: ARAPÇA ve MEÂL bölgeleri ayrı; tefsir "kâğıt" sayfa; başlıklar ve rozetler sakin renklerde.
   • Yalnız görünümdür; metinlere dokunmaz. Kapsam: #tefsirler-ic ve tefsir pencereleri (.tk-md, .ka-md, .tt-md). */
(function () {
  'use strict';
  const KEY = 'tt_ayar_v1';
  const VAR = { tema: 'gunduz', fs: 17.5, lh: 1.8, ar: 1 };
  const oku = () => { try { return Object.assign({}, VAR, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, VAR); } };
  const yaz = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} };
  let A = oku();
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  const KAP = (t) => ['#tefsirler-ic', '.tk-md', '.ka-md', '.tt-md'].map((s) => 'html[data-tt="' + t + '"] ' + s).join(',');
  const TEMA = {
    gunduz: '--tt-bg:#F3F0E8;--ink:#25232B;--paper:#FBF9F3;--paper2:#FFFEFA;--border:#E2DAC8;--gold:#9C7424;--gold2:#F1D9A0;--muted:#6E695F;--tt-teal:#2C6B66;--tt-on:#FFFEFA;--tt-soft:rgba(156,116,36,.12);--tt-tsoft:rgba(44,107,102,.09);--tt-gol:0 1px 2px rgba(60,45,20,.06),0 6px 18px rgba(60,45,20,.06)',
    sepya: '--tt-bg:#E9DFC9;--ink:#3A2E21;--paper:#F2E9D5;--paper2:#F8F0DD;--border:#D9CBAA;--gold:#8E5F18;--gold2:#F0D9A6;--muted:#7A6A55;--tt-teal:#6A4E29;--tt-on:#F8F0DD;--tt-soft:rgba(142,95,24,.13);--tt-tsoft:rgba(106,78,41,.1);--tt-gol:0 1px 2px rgba(70,50,20,.08),0 6px 18px rgba(70,50,20,.07)',
    gece: '--tt-bg:#0F1218;--ink:#E7E2D6;--paper:#181D27;--paper2:#151A23;--border:#2A3140;--gold:#D6B160;--gold2:#2A2208;--muted:#9B9689;--tt-teal:#7BBDB4;--tt-on:#0F1218;--tt-soft:rgba(214,177,96,.13);--tt-tsoft:rgba(123,189,180,.1);--tt-gol:0 1px 2px rgba(0,0,0,.4),0 8px 22px rgba(0,0,0,.35)',
  };
  const OTO = '--tt-bg:transparent;--tt-teal:var(--gold);--tt-on:var(--paper);--tt-soft:rgba(160,120,48,.12);--tt-tsoft:rgba(160,120,48,.08);--tt-gol:0 1px 2px rgba(0,0,0,.05)';

  const css = document.createElement('style');
  let c = '';
  Object.keys(TEMA).forEach((t) => { c += KAP(t) + '{' + TEMA[t] + '}'; });
  c += ['#tefsirler-ic', '.tk-md', '.ka-md', '.tt-md'].map((s) => 'html[data-tt="oto"] ' + s).join(',') + '{' + OTO + '}';
  c +=
    'html[data-tt] #tefsirler-ic{background:var(--tt-bg);color:var(--ink);min-height:calc(100vh - 150px);transition:background .25s,color .25s}' +
    /* mod çubuğu, seçiciler */
    'html[data-tt] #tefsirler-ic .tk-mod button{border-radius:999px;box-shadow:var(--tt-gol);background:var(--paper)}html[data-tt] #tefsirler-ic .tk-mod button.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}' +
    'html[data-tt] #tefsirler-ic .tk-mod .tt-aa{flex:none;width:52px;background:var(--paper);font-family:"Source Serif 4",serif}' +
    'html[data-tt] #tefsirler-ic .tk-sec select,html[data-tt] #tefsirler-ic .tk-ay input,html[data-tt] #tefsirler-ic .tk-ay button{background:var(--paper);color:var(--ink);border-color:var(--border);box-shadow:var(--tt-gol)}' +
    'html[data-tt] #tefsirler-ic .tk-ara button,html[data-tt] #tefsirler-ic .ka-cubuk button{background:var(--paper);color:var(--ink);border-color:var(--border);box-shadow:var(--tt-gol)}' +
    'html[data-tt] #tefsirler-ic .tk-ara button.on{background:var(--gold);color:var(--paper2);border-color:transparent}html[data-tt] #tefsirler-ic .tk-ara button.tk-alimbtn{background:var(--ink);color:var(--paper);border-color:var(--ink)}' +
    'html[data-tt] #tefsirler-ic .ka-cubuk button.kayitli{background:var(--tt-soft);border-color:var(--gold)}html[data-tt] #tefsirler-ic .tk-kl{background:var(--tt-soft)}' +
    /* âlim şeridi */
    'html[data-tt] #tefsirler-ic .tk-chip{background:var(--paper);color:var(--muted);border-color:var(--border)}html[data-tt] #tefsirler-ic .tk-chip.on{background:var(--tt-teal);color:var(--tt-on);border-color:var(--tt-teal)}' +
    'html[data-tt] #tefsirler-ic .tk-nokta i{background:var(--border)}html[data-tt] #tefsirler-ic .tk-nokta i.on{background:var(--tt-teal);width:16px;border-radius:4px}' +
    /* tefsir sayfası */
    'html[data-tt] #tefsirler-ic .tk-kutu,html[data-tt] #tefsirler-ic .tk-kart{background:var(--paper2);border-color:var(--border);border-radius:20px;box-shadow:var(--tt-gol)}html[data-tt] #tefsirler-ic .tk-kutu{padding:18px 20px 12px}' +
    'html[data-tt] #tefsirler-ic .tk-bas{font-family:"Playfair Display","Source Serif 4",serif;font-size:15.5px;color:var(--tt-teal);border-bottom:1px solid var(--border);padding-bottom:11px;margin-bottom:14px}html[data-tt] #tefsirler-ic .tk-bas span{font-family:"Source Serif 4",serif;font-size:12.5px;color:var(--muted)}' +
    'html[data-tt] #tefsirler-ic .tk-kart>summary{color:var(--tt-teal)}' +
    'html[data-tt] #tefsirler-ic .tk-meal,html[data-tt] #tefsirler-ic .tk-metin{font-size:var(--tt-fs);line-height:var(--tt-lh);color:var(--ink)}html[data-tt] #tefsirler-ic .tk-metin p{margin:0 0 .95em}' +
    'html[data-tt] #tefsirler-ic div[style*="font-size:17px"][style*="line-height:1.85"]{font-size:var(--tt-fs)!important;line-height:var(--tt-lh)!important}' +
    /* âyet kartı */
    '.tt-ayet{background:var(--paper);border:1px solid var(--border);border-radius:20px;box-shadow:var(--tt-gol);overflow:hidden;margin:6px 0 8px}' +
    '.tt-ayet .tt-b{padding:14px 18px 16px}.tt-ayet .tt-et{font:600 10.5px "Source Serif 4",serif;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:6px;display:flex;align-items:center;gap:8px}.tt-ayet .tt-et:after{content:"";flex:1;height:1px;background:var(--border)}.tt-ayet .tt-et em{font-style:normal;letter-spacing:.04em;text-transform:none;font-weight:400;color:var(--muted);font-size:11px}' +
    '.tt-ayet .tt-ar{font-family:var(--ar-font);font-size:calc(var(--tt-fs) * 1.5 * var(--tt-ar));line-height:2.1;text-align:right;direction:rtl;color:var(--ink)}' +
    '.tt-ayet .tt-meal{border-top:1px solid var(--border);background:linear-gradient(0deg,var(--tt-soft),transparent 70%)}.tt-ayet .tt-meal p{margin:0;font-family:"Source Serif 4",serif;font-style:italic;font-size:calc(var(--tt-fs) * .97);line-height:1.7;padding-left:13px;border-left:3px solid var(--gold);color:var(--ink)}.tt-ayet .tt-meal sup{color:var(--gold);font-style:normal;font-size:.7em}' +
    '.tt-ayet .tt-yok{color:var(--muted);font-size:13px;text-align:center;padding:16px}' +
    /* Aa penceresi */
    '.tt-md{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}.tt-md>div{background:var(--paper2);color:var(--ink);width:100%;max-width:560px;border-radius:18px 18px 0 0;padding:16px 18px 20px;box-sizing:border-box;font-family:"Source Serif 4",serif;max-height:88vh;overflow:auto}' +
    '.tt-md h4{margin:0 0 12px;font-family:"Playfair Display","Source Serif 4",serif;font-size:17px;display:flex;justify-content:space-between;align-items:center}.tt-md h4 button{border:0;background:none;color:var(--muted);font-size:20px;cursor:pointer}' +
    '.tt-md .tt-l{font-size:12.5px;color:var(--muted);margin:14px 0 6px;letter-spacing:.04em}.tt-md .tt-sat{display:flex;gap:6px;flex-wrap:wrap}.tt-md .tt-p{padding:9px 13px;border-radius:999px;border:1px solid var(--border);background:var(--paper);color:var(--ink);font:600 13.5px "Source Serif 4",serif;cursor:pointer}.tt-md .tt-p.on{background:var(--ink);color:var(--paper);border-color:var(--ink)}' +
    '.tt-md input[type=range]{width:100%;accent-color:var(--gold)}.tt-md .tt-on{margin-top:14px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:var(--paper);font-size:var(--tt-fs);line-height:var(--tt-lh)}';
  css.textContent = c; document.head.appendChild(css);

  function uygula() {
    const h = document.documentElement; h.dataset.tt = ({ gunduz: 1, sepya: 1, gece: 1, oto: 1 })[A.tema] ? A.tema : 'gunduz';
    h.style.setProperty('--tt-fs', A.fs + 'px'); h.style.setProperty('--tt-lh', String(A.lh)); h.style.setProperty('--tt-ar', String(A.ar));
  }
  uygula();

  /* ── âyet kartı ── */
  function ayetKutu(sNo, aNo, ar, meal) {
    const sure = (typeof SURELER !== 'undefined') ? SURELER[sNo - 1] : null;
    const k = el('div', 'tt-ayet');
    if (!ar && !meal) { k.appendChild(el('div', 'tt-yok', 'Âyet yüklenemedi (' + sNo + ':' + aNo + ')')); return k; }
    if (ar) { const b = el('div', 'tt-b'); const e = el('div', 'tt-et', 'Arapça · ' + (sure ? sure.isim : sNo) + ' ' + sNo + ':' + aNo); b.appendChild(e); const a = el('div', 'tt-ar'); a.setAttribute('data-ar', '1'); a.textContent = ar; b.appendChild(a); k.appendChild(b); }
    if (meal) {
      const b = el('div', 'tt-b tt-meal'); const e = el('div', 'tt-et', 'Meâl '); e.appendChild(el('em', null, '· Diyanet')); b.appendChild(e);
      const p = el('p'); String(meal).split(/(\[\d+\])/).forEach((x) => { const m = /^\[(\d+)\]$/.exec(x); if (m) { const s = el('sup', null, '[' + m[1] + ']'); p.appendChild(s); } else p.appendChild(document.createTextNode(x)); });
      b.appendChild(p); k.appendChild(b);
    }
    return k;
  }

  /* ── Aa penceresi ── */
  function ayarPenceresi() {
    const ov = el('div', 'tt-md'); const k = el('div'); ov.appendChild(k);
    const kapat = () => ov.remove(); ov.addEventListener('click', (e) => { if (e.target === ov) kapat(); });
    const bas = el('h4', null, 'Aa  Okuma ayarları'); const x = el('button', null, '✕'); x.onclick = kapat; bas.appendChild(x); k.appendChild(bas);
    k.appendChild(el('div', 'tt-l', 'TEMA')); const sat = el('div', 'tt-sat'); k.appendChild(sat);
    const ciz = () => { sat.innerHTML = ''; [['gunduz', '☀️ Gündüz'], ['sepya', '📜 Sepya'], ['gece', '🌙 Gece'], ['oto', '🎨 Uygulama teması']].forEach(([id, ad]) => { const b = el('button', 'tt-p' + (A.tema === id ? ' on' : ''), ad); b.onclick = () => { A.tema = id; yaz(A); uygula(); ciz(); }; sat.appendChild(b); }); };
    ciz();
    const kaydir = (etiket, anahtar, min, max, adim, goster) => {
      const l = el('div', 'tt-l', etiket); const v = el('span', null, ' · ' + goster(A[anahtar])); l.appendChild(v); k.appendChild(l);
      const r = el('input'); r.type = 'range'; r.min = min; r.max = max; r.step = adim; r.value = A[anahtar];
      r.oninput = () => { A[anahtar] = +r.value; v.textContent = ' · ' + goster(A[anahtar]); yaz(A); uygula(); }; k.appendChild(r);
    };
    kaydir('YAZI BOYUTU', 'fs', 14, 26, 0.5, (x) => x + ' px');
    kaydir('SATIR ARALIĞI', 'lh', 1.4, 2.3, 0.05, (x) => x.toFixed(2));
    kaydir('ARAPÇA BOYUTU', 'ar', 0.8, 1.5, 0.05, (x) => Math.round(x * 100) + '%');
    const o = el('div', 'tt-on', 'Onlardan her kapı için birer grup ayrılmıştır. Allah, Adem’i yaratırken onun içine bir de melekiyet yönünü koydu.'); k.appendChild(o);
    const s = el('button', 'tt-p', '↺ Varsayılana dön'); s.style.marginTop = '12px'; s.onclick = () => { A = Object.assign({}, VAR); yaz(A); uygula(); kapat(); ayarPenceresi(); }; k.appendChild(s);
    document.body.appendChild(ov);
  }

  /* ── ekrana Aa düğmesi ── */
  const orijRender = window.tefsirlerEkraniRender;
  if (typeof orijRender === 'function') {
    window.tefsirlerEkraniRender = function () {
      const r = orijRender.apply(this, arguments);
      try {
        uygula();
        const mod = document.querySelector('#tefsirler-ic .tk-mod');
        if (mod && !mod.querySelector('.tt-aa')) { const b = el('button', 'tt-aa', 'Aa'); b.title = 'Okuma ayarları'; b.onclick = ayarPenceresi; mod.appendChild(b); }
      } catch (e) {}
      return r;
    };
  }
  window.TefsirTema = { ayetKutu, ac: ayarPenceresi, ayar: () => A };
})();
