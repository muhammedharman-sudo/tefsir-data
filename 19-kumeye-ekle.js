/* 19-kumeye-ekle.js — "📂 Kümeye ekle": âyet(ler)i onay penceresiyle bir kümeye ekler veya yeni küme açar.
   Giriş noktaları: Kur'ân âyet düğme satırı, Tefsir › Karşılaştır çubuğu, makale/kitap metninde seçilen "Kehf 18/94" gibi atıflar (vurgu çubuğu).
   Metne dokunmaz; yalnız Küme Merkezi API'sini (KutKume.kume) kullanır. Belirsiz/geçersiz atıf sessizce düzeltilmez, onay penceresinde işaretlenir. */
(function () {
  'use strict';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const toast_ = (m) => { try { if (typeof toast === 'function') toast(m); else alert(m); } catch (e) {} };
  const fold = (s) => String(s || '').toLocaleLowerCase('tr').replace(/[âäà]/g, 'a').replace(/[îïì]/g, 'i').replace(/[ûüù]/g, 'u').replace(/[ôö]/g, 'o').replace(/[ç]/g, 'c').replace(/[ş]/g, 's').replace(/[ğ]/g, 'g').replace(/ı/g, 'i').replace(/[^a-z0-9]/g, '').replace(/suresi$/, '').replace(/sure$/, '');
  const sAd = (n) => (typeof SURELER !== 'undefined' && SURELER[n - 1]) ? SURELER[n - 1].isim : String(n);
  const sMax = (n) => (typeof SURELER !== 'undefined' && SURELER[n - 1]) ? SURELER[n - 1].ayet : 999;
  let ADLAR = null;
  function adlar() { if (ADLAR) return ADLAR; ADLAR = {}; if (typeof SURELER !== 'undefined') SURELER.forEach((s, i) => { ADLAR[fold(s.isim)] = i + 1; }); return ADLAR; }
  function sureBul(ad) { const f = fold(ad); if (!f) return 0; const A = adlar(); if (A[f]) return A[f]; if (f.length >= 4) { const k = Object.keys(A).filter((x) => x.indexOf(f) === 0 || f.indexOf(x) === 0 && x.length >= 4); if (k.length === 1) return A[k[0]]; } return 0; }

  /* Metinden atıfları ayıkla → [{sure,bas,bit,ham,not}] (not: uyarı) */
  const KELIME = "[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû’'\\-]+";
  function metinden(t) {
    t = String(t || ''); const out = [];
    const re = /(\d{1,3})\s*[:\/]\s*(\d{1,3}(?!\d)(?:\s*[-–—]\s*\d{1,3}(?!\d)(?!\s*[:\/]))?(?:\s*,\s*\d{1,3}(?!\d)(?!\s*[:\/\d])(?:\s*[-–—]\s*\d{1,3}(?!\d)(?!\s*[:\/]))?)*)/g;
    let m;
    while ((m = re.exec(t))) {
      const sNo = +m[1]; const onc = t.slice(Math.max(0, m.index - 40), m.index);
      const nm = new RegExp('(' + KELIME + '(?:\\s+' + KELIME + '){0,2})[\\s,]*\\(?\\s*$').exec(onc);
      let ad = nm ? nm[1] : ''; let adSure = 0;
      if (ad) { const w = ad.split(/\s+/); for (let n = w.length; n >= 1 && !adSure; n--) { adSure = sureBul(w.slice(w.length - n).join(' ')); if (adSure) ad = w.slice(w.length - n).join(' '); } if (!adSure) ad = ''; }
      m[2].split(',').forEach((p) => {
        const r = p.trim().split(/\s*[-–—]\s*/); const bas = +r[0], bit = +(r[1] || r[0]);
        const o = { sure: sNo, bas, bit, ham: (ad ? ad + ' ' : '') + sNo + ':' + p.trim() };
        if (!(sNo >= 1 && sNo <= 114)) o.not = 'Geçersiz sûre numarası';
        else if (!(bas >= 1 && bit >= bas)) o.not = 'Geçersiz âyet aralığı';
        else if (bas > sMax(sNo) || bit > sMax(sNo)) o.not = sAd(sNo) + ' sûresi ' + sMax(sNo) + ' âyettir';
        else if (adSure && adSure !== sNo) o.not = 'Sûre adı (' + sAd(adSure) + ') ile numara (' + sNo + ') uyuşmuyor';
        out.push(o);
      });
    }
    // adı olup numarası "Kehf, 94" biçiminde yalnız ad+âyet yazılanları da dene (yalnız ad bilinen sûrede)
    const re2 = new RegExp('(' + KELIME + ')\\s*,?\\s*\\(?(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3}))?\\)?(?!\\d)(?!\\s*[:\\/])', 'g'); let m2;
    while ((m2 = re2.exec(t))) {
      const s = sureBul(m2[1]); if (!s) continue;
      const bas = +m2[2], bit = +(m2[3] || m2[2]);
      if (out.some((o) => o.sure === s && o.bas === bas && o.bit === bit)) continue;
      if (t.slice(m2.index, m2.index + m2[0].length).match(/\d{1,3}\s*[:\/]/)) continue;
      const o = { sure: s, bas, bit, ham: m2[0].trim(), tahmin: true };
      if (!(bas >= 1 && bit >= bas) || bit > sMax(s)) o.not = 'Âyet numarası geçersiz (' + sAd(s) + ' ' + sMax(s) + ' âyet)';
      else o.not = 'Tahmin: sûre adı + âyet numarası';
      out.push(o);
    }
    const g = new Set(); return out.filter((o) => { const k = o.sure + ':' + o.bas + '-' + o.bit; if (g.has(k)) return false; g.add(k); return true; });
  }

  const css = document.createElement('style');
  css.textContent =
    '.ke-ov{position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}' +
    '.ke-k{background:var(--paper2,#fff);color:var(--ink,#222);width:100%;max-width:560px;border-radius:18px 18px 0 0;padding:16px 16px 22px;box-sizing:border-box;max-height:90vh;overflow:auto}' +
    '.ke-k h4{margin:0 0 4px;font-size:17px;display:flex;justify-content:space-between;align-items:center}.ke-k h4 button{border:0;background:none;font-size:20px;color:var(--muted);cursor:pointer}' +
    '.ke-yardim{font-size:12.5px;color:var(--muted);margin:2px 0 10px;line-height:1.5}.ke-l{font-size:12px;font-weight:700;letter-spacing:.04em;color:var(--gold);margin:14px 0 6px}' +
    '.ke-ref{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid var(--border);border-radius:12px;margin:5px 0;background:var(--paper)}.ke-ref.hata{border-color:#b94a48;background:rgba(185,74,72,.08)}.ke-ref input{margin-top:3px}.ke-ref b{font-size:14px}.ke-ref small{display:block;color:var(--muted);font-size:11.5px;margin-top:2px}.ke-ref.hata small{color:#b94a48}' +
    '.ke-kume{display:flex;gap:8px;align-items:center;width:100%;text-align:left;padding:10px 12px;margin:4px 0;border:1px solid var(--border);border-radius:12px;background:var(--paper);color:var(--ink);font:inherit;cursor:pointer}.ke-kume.sec{border-color:var(--gold);background:rgba(184,144,47,.14);font-weight:700}.ke-kume small{margin-left:auto;color:var(--muted);font-weight:400}' +
    '.ke-sat{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.ke-sat input,.ke-sat select{padding:9px 10px;border:1px solid var(--border);border-radius:10px;background:var(--paper);color:var(--ink);font:inherit;font-size:14px;min-width:0}.ke-sat input.ad{flex:1}' +
    '.ke-b{padding:10px 14px;border-radius:12px;border:1px solid var(--border);background:var(--paper);color:var(--ink);font:inherit;font-weight:700;cursor:pointer}.ke-b.ana{background:var(--ink);color:var(--paper);border-color:var(--ink);flex:1}';
  document.head.appendChild(css);

  function ac(refs, opt) {
    opt = opt || {}; const KK = window.KutKume && window.KutKume.kume; if (!KK) { toast_('Küme Merkezi yüklenmedi.'); return; }
    refs = (refs || []).map((r) => Object.assign({}, r, { sec: !r.not || r.tahmin }));
    refs.forEach((r) => { if (r.tahmin) r.sec = false; });
    const ov = el('div', 'ke-ov'); const k = el('div', 'ke-k'); ov.appendChild(k);
    const kapat = () => ov.remove(); ov.addEventListener('click', (e) => { if (e.target === ov) kapat(); });
    let hedef = opt.kumeId || ''; let yeniAd = opt.yeniAd || '';
    const ciz = () => {
      const kay = k.scrollTop; k.innerHTML = '';
      const bas = el('h4', null, '📂 Kümeye ekle'); const x = el('button', null, '✕'); x.onclick = kapat; bas.appendChild(x); k.appendChild(bas);
      k.appendChild(el('div', 'ke-yardim', refs.length ? 'Bulunan âyetleri kontrol et; yanlış olanların işaretini kaldır. Hiçbir şey onayın olmadan eklenmez.' : 'Seçilen metinde “Kehf 18/94” gibi bir âyet atfı bulunamadı. Aşağıdan elle ekleyebilirsin.'));
      k.appendChild(el('div', 'ke-l', 'ÂYETLER'));
      refs.forEach((r) => {
        const s = el('label', 'ke-ref' + (r.not && !r.tahmin ? ' hata' : '')); const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!r.sec; cb.disabled = !!(r.not && !r.tahmin);
        cb.onchange = () => { r.sec = cb.checked; };
        const d = el('div'); d.appendChild(el('b', null, sAd(r.sure) + ' ' + r.sure + ':' + r.bas + (r.bit !== r.bas ? '–' + r.bit : '')));
        if (r.ham && opt.metinli !== false) d.appendChild(el('small', null, 'Metinde: “' + r.ham + '”' + (r.not ? ' — ' + r.not : '')));
        else if (r.not) d.appendChild(el('small', null, r.not));
        s.appendChild(cb); s.appendChild(d); k.appendChild(s);
      });
      const ms = el('div', 'ke-sat'); const ss = el('select'); for (let n = 1; n <= 114; n++) { const o = el('option', null, n + '. ' + sAd(n)); o.value = n; ss.appendChild(o); }
      const b1 = el('input'); b1.type = 'number'; b1.placeholder = 'Başl.'; b1.style.width = '68px'; const b2 = el('input'); b2.type = 'number'; b2.placeholder = 'Bitiş'; b2.style.width = '68px';
      const eb = el('button', 'ke-b', '＋ Elle ekle');
      eb.onclick = () => { const a = +b1.value, e = +b2.value || a; if (!(a >= 1 && e >= a && e <= sMax(+ss.value))) { toast_('Âyet aralığı geçersiz'); return; } refs.push({ sure: +ss.value, bas: a, bit: e, sec: true }); ciz(); };
      ms.appendChild(ss); ms.appendChild(b1); ms.appendChild(b2); ms.appendChild(eb); k.appendChild(ms);

      k.appendChild(el('div', 'ke-l', 'KÜME'));
      KK.liste().forEach((c) => { const b = el('button', 'ke-kume' + (hedef === c.id ? ' sec' : ''), (hedef === c.id ? '✓ ' : '') + c.ad); b.appendChild(el('small', null, c.say + ' âyet')); b.onclick = () => { hedef = c.id; ciz(); }; k.appendChild(b); });
      const yb = el('button', 'ke-kume' + (hedef === '' ? ' sec' : ''), (hedef === '' ? '✓ ' : '') + '＋ Yeni küme'); yb.onclick = () => { hedef = ''; ciz(); }; k.appendChild(yb);
      if (hedef === '') { const yr = el('div', 'ke-sat'); const yi = el('input', 'ad'); yi.placeholder = 'Yeni kümenin adı'; yi.value = yeniAd; yi.oninput = () => { yeniAd = yi.value; }; yr.appendChild(yi); k.appendChild(yr); }

      const alt = el('div', 'ke-sat'); alt.style.marginTop = '14px';
      const v = el('button', 'ke-b', 'Vazgeç'); v.onclick = kapat;
      const ok = el('button', 'ke-b ana', 'Onayla ve ekle');
      ok.onclick = () => {
        const sec = refs.filter((r) => r.sec && !(r.not && !r.tahmin)); if (!sec.length) { toast_('Eklenecek âyet seçilmedi'); return; }
        const ar = sec.map((r) => ({ sure: r.sure, bas: r.bas, bit: r.bit }));
        if (hedef) { const n = KK.aralikEkle(hedef, ar); const c = KK.liste().find((x) => x.id === hedef); kapat(); toast_(n ? '✓ ' + n + ' aralık “' + (c ? c.ad : 'kümeye') + '” kümesine eklendi' : 'Bu âyetler kümede zaten var'); }
        else { const ad = (yeniAd || '').trim(); if (!ad) { toast_('Yeni küme için ad yaz'); return; } const nk = KK.yeni(ad, ar); kapat(); toast_(nk ? '✓ “' + ad + '” kümesi oluşturuldu' : 'Küme oluşturulamadı'); }
        if (opt.bitti) try { opt.bitti(); } catch (e) {}
      };
      alt.appendChild(v); alt.appendChild(ok); k.appendChild(alt); k.scrollTop = kay;
    };
    ciz(); document.body.appendChild(ov);
  }

  window.KumeyeEkle = { ac, metinden, metinleAc: (t) => ac(metinden(t)) };
  /* Kur'ân âyet düğme satırı kancası (2-ekranlar.js › ayetButonSatiri) */
  window.kumeyeEkleButonuEkle = function (satir, s, a) {
    const b = document.createElement('button'); b.className = 'ayet-ekstra-btn'; b.dataset.goster = 'derinlik'; b.textContent = '📂 Kümeye ekle';
    b.onclick = () => ac([{ sure: s, bas: a, bit: a }], { metinli: false }); satir.appendChild(b);
  };
})();
