/* 16-kayitli-ayet.js — Tefsir › Karşılaştır ekranında "☆ Kaydet" ve "★ Kayıtlılar".
   Kayıtlı âyet = Küme Merkezi'nde tek âyetlik küme + konu klasörü üyeliği (KutKume.kayitli).
   Veri telefonda saklanır ve Küme Merkezi'nin GitHub yedeğine (data/kume-merkezi.json) eşitlenir.
   Âyet/tefsir metinlerine dokunmaz. */
(function () {
  'use strict';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const KK = () => (window.KutKume && window.KutKume.kayitli) || null;
  const sureAd = (n) => (typeof SURELER !== 'undefined' && SURELER[n - 1]) ? SURELER[n - 1].isim : 'Sûre ' + n;
  const ref = (s, a) => sureAd(s) + ' ' + s + ':' + a;
  const toast = (m) => { try { if (window.KutAra && KutAra.toast) return KutAra.toast(m); } catch (e) {} };
  const foldTr = (x) => String(x || '').toLocaleLowerCase('tr').replace(/[âäà]/g, 'a').replace(/[îïì]/g, 'i').replace(/[ûüù]/g, 'u').replace(/[ôöò]/g, 'o').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ı/g, 'i');
  const meal = {}; // "s:a" → meal metni (önbellek)

  const css = document.createElement('style');
  css.textContent =
    '.ka-cubuk{display:flex;gap:8px;margin:0 0 10px;flex-wrap:wrap}.ka-cubuk button{flex:1;min-width:130px;padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:var(--paper2);color:var(--ink);font-family:"Source Serif 4",serif;font-size:14px;font-weight:600;cursor:pointer;text-align:center}' +
    '.ka-cubuk button.kayitli{background:rgba(184,144,47,.16);border-color:var(--gold);color:var(--ink)}' +
    '.ka-md{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}' +
    '.ka-md>div{background:var(--paper);color:var(--ink);width:100%;max-width:560px;border-radius:18px 18px 0 0;padding:16px;max-height:88vh;overflow:auto;box-sizing:border-box;font-family:"Source Serif 4",serif}' +
    '.ka-bas{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.ka-bas b{font-family:"Playfair Display","Source Serif 4",serif;font-size:17px}.ka-bas button{border:0;background:none;color:var(--muted);font-size:20px;padding:4px 8px;cursor:pointer}' +
    '.ka-md input.ka-ara{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:var(--paper2);color:var(--ink);font-size:16px;margin-bottom:8px}' +
    '.ka-cipler{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:6px}.ka-cip{flex:none;padding:7px 12px;border-radius:16px;border:1px solid var(--border);background:none;color:var(--ink);font-size:13px;cursor:pointer;font-family:inherit;white-space:nowrap}.ka-cip.on{background:var(--ink);color:var(--gold2);border-color:var(--ink)}' +
    '.ka-sat{display:flex;gap:10px;align-items:flex-start;padding:11px 4px;border-bottom:1px solid var(--border)}.ka-sat .ka-g{flex:1;min-width:0;cursor:pointer}' +
    '.ka-sat .ka-r{font-weight:700;color:var(--gold);font-size:15px}.ka-sat .ka-m{font-size:13.5px;line-height:1.45;color:var(--ink);opacity:.85;margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-style:italic}.ka-sat .ka-k{font-size:11.5px;color:var(--muted);margin-top:2px}' +
    '.ka-sat button.ka-3{flex:none;border:1px solid var(--border);background:none;color:var(--ink);border-radius:10px;padding:6px 10px;font-size:15px;cursor:pointer}' +
    '.ka-bos{color:var(--muted);font-size:13.5px;line-height:1.6;padding:14px 4px}' +
    '.ka-md button.ka-sec{display:block;width:100%;text-align:left;padding:11px 13px;margin:5px 0;border-radius:11px;border:1px solid var(--border);background:none;color:var(--ink);font-family:inherit;font-size:15px;cursor:pointer}.ka-md button.ka-sec.on{background:rgba(184,144,47,.16);border-color:var(--gold);font-weight:700}' +
    '.ka-md button.ka-ok{width:100%;margin-top:10px;padding:12px;border:0;border-radius:12px;background:var(--ink);color:#fff;font-size:15px;font-family:inherit;cursor:pointer}.ka-md button.ka-kirmizi{width:100%;margin-top:8px;padding:11px;border:1px solid #a8433c;border-radius:12px;background:none;color:#a8433c;font-size:14px;font-family:inherit;cursor:pointer}';
  document.head.appendChild(css);

  function pencere(baslik) {
    const ov = el('div', 'ka-md'); const k = el('div'); ov.appendChild(k);
    const bas = el('div', 'ka-bas'); bas.appendChild(el('b', null, baslik)); const x = el('button', null, '✕'); bas.appendChild(x); k.appendChild(bas);
    const kapat = () => { ov.remove(); };
    x.onclick = kapat; ov.addEventListener('click', (e) => { if (e.target === ov) kapat(); });
    document.body.appendChild(ov); return { ov, k, kapat };
  }
  const yenileEkran = () => { try { tefsirlerEkraniRender(); } catch (e) {} };

  /* ── klasör seçici (bir âyet için) ── */
  function klasorSecici(s, a) {
    const api = KK(); if (!api) return;
    const P = pencere('📁 ' + ref(s, a)); const alan = el('div'); P.k.appendChild(alan);
    const ciz = () => {
      alan.innerHTML = '';
      const mevcut = api.var(s, a); const sec = mevcut ? mevcut.konu : api.sonKonu();
      alan.appendChild(el('div', 'ka-bos', 'Hangi klasörde dursun?')).style.padding = '0 0 4px';
      api.konular().forEach((kn) => {
        const b = el('button', 'ka-sec' + (kn.id === sec ? ' on' : ''), (kn.id === sec ? '● ' : '○ ') + kn.emoji + ' ' + kn.ad);
        b.onclick = () => { api.ekle(s, a, kn.id); api.sonKonuYaz(kn.id); ciz(); yenileEkran(); };
        alan.appendChild(b);
      });
      const yeni = el('button', 'ka-sec', '＋ Yeni klasör'); yeni.onclick = () => { const ad = prompt('Klasör adı:'); if (ad && ad.trim()) { const id = api.konuEkle(ad.trim()); api.ekle(s, a, id); api.sonKonuYaz(id); ciz(); yenileEkran(); } }; alan.appendChild(yeni);
      if (mevcut) { const c = el('button', 'ka-kirmizi', '🗑 Kayıtlılardan çıkar'); c.onclick = () => { api.cikar(mevcut.id); P.kapat(); yenileEkran(); toast('Kayıttan çıkarıldı'); }; alan.appendChild(c); }
      const t = el('button', 'ka-ok', 'Tamam'); t.onclick = () => { P.kapat(); yenileEkran(); }; alan.appendChild(t);
    };
    ciz();
  }

  /* ── Kayıtlılar listesi ── */
  function kayitliListe() {
    const api = KK(); if (!api) return;
    const P = pencere('★ Kayıtlı âyetler');
    const ara = el('input', 'ka-ara'); ara.type = 'search'; ara.placeholder = '🔍 Sûre, âyet ya da meâl ara…'; P.k.appendChild(ara);
    const cipler = el('div', 'ka-cipler'); P.k.appendChild(cipler);
    const liste = el('div'); P.k.appendChild(liste);
    let secKonu = '';
    const ciz = () => {
      const hepsi = api.liste().reverse(); const kon = api.konular(); const adOf = (id) => { const k = kon.find((x) => x.id === id); return k ? k.emoji + ' ' + k.ad : 'Klasörsüz'; };
      cipler.innerHTML = '';
      const cip = (id, ad, n) => { const b = el('button', 'ka-cip' + (secKonu === id ? ' on' : ''), ad + (n != null ? ' (' + n + ')' : '')); b.onclick = () => { secKonu = id; ciz(); }; cipler.appendChild(b); };
      cip('', 'Tümü', hepsi.length); kon.forEach((k) => cip(k.id, k.emoji + ' ' + k.ad, hepsi.filter((r) => r.konu === k.id).length));
      const yk = el('button', 'ka-cip', '＋ Klasör'); yk.onclick = () => { const ad = prompt('Klasör adı:'); if (ad && ad.trim()) { secKonu = api.konuEkle(ad.trim()); ciz(); } }; cipler.appendChild(yk);
      const q = foldTr(ara.value.trim());
      const goster = hepsi.filter((r) => (!secKonu || r.konu === secKonu) && (!q || foldTr(ref(r.sure, r.ayet) + ' ' + (meal[r.sure + ':' + r.ayet] || '')).indexOf(q) >= 0));
      liste.innerHTML = '';
      if (!goster.length) { liste.appendChild(el('div', 'ka-bos', hepsi.length ? 'Bu filtrede kayıtlı âyet yok.' : 'Henüz kayıtlı âyet yok. Karşılaştır ekranında bir âyetin üstündeki “☆ Kaydet” butonuna basın.')); return; }
      goster.forEach((r) => {
        const sat = el('div', 'ka-sat'); const g = el('div', 'ka-g');
        g.appendChild(el('div', 'ka-r', ref(r.sure, r.ayet)));
        const m = el('div', 'ka-m', meal[r.sure + ':' + r.ayet] || ''); g.appendChild(m);
        g.appendChild(el('div', 'ka-k', adOf(r.konu)));
        g.onclick = () => { P.kapat(); if (window.TefsirKarsilastir) window.TefsirKarsilastir.ac(r.sure, r.ayet); };
        const o = el('button', 'ka-3', '⋯'); o.onclick = () => { P.kapat(); klasorSecici(r.sure, r.ayet); };
        sat.appendChild(g); sat.appendChild(o); liste.appendChild(sat);
        const anahtar = r.sure + ':' + r.ayet;
        if (!meal[anahtar] && typeof _ayetEmbedGetir === 'function') _ayetEmbedGetir(r.sure, r.ayet).then((x) => { meal[anahtar] = String(x.meal || '').replace(/\[\d+\]/g, '').trim(); m.textContent = meal[anahtar]; }).catch(() => {});
      });
    };
    const gez = el('button', 'ka-ok', '📖 Bu listeyi tefsirde sırayla gez'); gez.onclick = () => { const q = foldTr(ara.value.trim()); const l = api.liste().reverse().filter((r) => (!secKonu || r.konu === secKonu) && (!q || foldTr(ref(r.sure, r.ayet) + ' ' + (meal[r.sure + ':' + r.ayet] || '')).indexOf(q) >= 0)); if (!l.length || !window.TefsirKarsilastir) return; P.kapat(); window.TefsirKarsilastir.klasorAc(l.map((r) => ({ s: r.sure, a: r.ayet })), '★ Kayıtlılar'); };
    P.k.appendChild(gez);
    ara.oninput = ciz; ciz();
  }

  /* ── klasör modu seçici: bir klasörü seç → ◀ ▶ yalnız onun âyetlerinde gezer ── */
  function klasorSec() {
    const K = window.KutKume && window.KutKume.tefsir; if (!K) return;
    const P = pencere('📂 Klasörden gez'); const kon = K.konular();
    P.k.appendChild(el('div', 'ka-bos', 'Bir klasör seçin: ◀ ▶ okları yalnız o klasördeki âyetler arasında gezinir. Çıkmak için üstteki şeritte ✕.')).style.padding = '0 0 6px';
    const api = KK(); const kayit = api ? api.liste() : [];
    if (!kon.length) P.k.appendChild(el('div', 'ka-bos', 'Henüz klasör yok.'));
    kon.forEach((k) => {
      const b = el('button', 'ka-sec', k.emoji + ' ' + k.ad + '  ·  ' + k.say + ' âyet'); b.disabled = !k.say; if (!k.say) b.style.opacity = '.5';
      b.onclick = () => { P.kapat(); K.konu(k.id); }; P.k.appendChild(b);
    });
  }

  /* ── Karşılaştır ekranındaki çubuk ── */
  function cubuk(s, a) {
    const api = KK(); const w = el('div', 'ka-cubuk'); if (!api) return w;
    const mevcut = api.var(s, a);
    let ad = '';
    if (mevcut) { const k = api.konular().find((x) => x.id === mevcut.konu); ad = k ? k.emoji + ' ' + k.ad : ''; }
    const b = el('button', mevcut ? 'kayitli' : '', mevcut ? (ad ? '★ ' + ad.replace(/^\S+ /, '') + ' ▾' : '★ Kayıtlı ▾') : '☆ Kaydet');
    b.onclick = () => {
      if (mevcut) { klasorSecici(s, a); return; }
      const son = api.sonKonu(); api.ekle(s, a, son); toast('⭐ Kaydedildi'); yenileEkran();
    };
    const n = api.liste().length;
    const l = el('button', null, '★ Kayıtlılar (' + n + ')'); l.onclick = kayitliListe;
    const g = el('button', null, '📂 Klasörden gez'); g.onclick = klasorSec;
    w.appendChild(b); w.appendChild(l); w.appendChild(g); return w;
  }

  window.KayitliAyet = { cubuk, liste: kayitliListe, klasorSecici };
})();
