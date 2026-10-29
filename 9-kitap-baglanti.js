// ════════════════════════════════════════
//  KİTAP BAĞLANTILARI — kitaplarda arama, tema/hedef bağlantısı, küme yapay zekâsı
//  Kitap txt dosyalarına ASLA yazılmaz; yalnız okunur (IndexedDB'deki ayrıştırılmış kopya).
//  Gerekir: 7a (KTP), 7-kutuphane.js (KutIc), 7b (KutNot), SURELER ve mevcut tefsir/Gemini işlevleri.
// ════════════════════════════════════════
(function () {
  'use strict';
  if (!window.KutIc) return;
  const IC = () => window.KutIc;

  // ── Küçük yardımcılar ───────────────────────────────────────
  const $ = (id) => document.getElementById(id);
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function lsOku(k, v) { try { const x = JSON.parse(localStorage.getItem(k)); return x === null || x === undefined ? v : x; } catch (e) { return v; } }
  function lsYaz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sureAdi(n) { return (SURELER[n - 1] && SURELER[n - 1].isim) || String(n); }
  function yeniId() { return 'r-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function kisalt(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n).trimEnd() + '…' : s; }
  function duzMetin(html) {
    if (!html) return '';
    try { return (new DOMParser().parseFromString(String(html), 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim(); } catch (e) { return String(html); }
  }
  let toastZ = null;
  function toast(m) {
    let t = $('kb-toast');
    if (!t) { t = el('div', 'kb-toast'); t.id = 'kb-toast'; document.body.appendChild(t); }
    t.textContent = m; t.classList.add('acik');
    clearTimeout(toastZ); toastZ = setTimeout(() => t.classList.remove('acik'), 2200);
  }

  // Uzunluğu KORUYAN katlama: her harf tek harfe iner; böylece eşleşme yeri özgün metne birebir taşınır.
  const KAT = { 'İ': 'i', 'I': 'i', 'ı': 'i', 'Â': 'a', 'â': 'a', 'Î': 'i', 'î': 'i', 'Û': 'u', 'û': 'u', 'Ç': 'c', 'ç': 'c', 'Ğ': 'g', 'ğ': 'g', 'Ö': 'o', 'ö': 'o', 'Ş': 's', 'ş': 's', 'Ü': 'u', 'ü': 'u' };
  function fold(s) {
    return String(s).replace(/[A-Za-zÇĞİÖŞÜÂÎÛçğıöşüâîû]/g, (c) => KAT[c] || c.toLowerCase());
  }
  const DURAK = new Set(('bu su o bir ve ile icin ne nasil neden nedir mi mu da de ki gibi daha cok en olarak ise ama fakat veya ya hakkinda diyor soyluyor anlatiyor ' +
    'kitap kitaplar kitaplarda tefsir ayet ayetler ayetin ayetlerde kume bana bize lutfen acikla ozetle karsilastir nelerdir midir olan olur olarak icinde uzerine').split(' '));
  function tokenler(q, durakSuz) {
    const tk = fold(q).split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
    const f = durakSuz ? tk.filter((t) => t.length >= 3 && !DURAK.has(t)) : tk;
    return [...new Set(f)];
  }

  // ── Kitap dizini (bellekte, kitap güncellenince yenilenir) ───
  const ONBELLEK = new Map(); // url -> {surum, ayr, f[]}
  async function kitapYukle(url) {
    const meta = (IC().meta && IC().meta()) || {};
    const surum = meta[url] ? meta[url].guncellendi : 0;
    const o = ONBELLEK.get(url);
    if (o && o.surum === surum) return o;
    const ayr = await IC().kitapGetir(url);
    if (!ayr) return null;
    const yeni = { surum, ayr, f: ayr.paras.map((p) => fold(p.t)) };
    ONBELLEK.set(url, yeni);
    return yeni;
  }
  async function tumKitaplar() {
    if (IC().metaYukle) await IC().metaYukle();
    const cikti = [];
    for (const k of IC().kaynaklar()) {
      const v = await kitapYukle(k.url).catch(() => null);
      if (v) cikti.push({ kayit: k, ayr: v.ayr, f: v.f });
    }
    return cikti;
  }

  function baslikYolu(ayr, pi) {
    let hid = null;
    for (let i = Math.min(pi, ayr.paras.length - 1); i >= 0; i--) { if (ayr.paras[i].k === 'h') { hid = ayr.paras[i].hid; break; } }
    if (hid === null || !ayr.heads[hid]) return [];
    const h = ayr.heads; const p = [h[hid].t]; let lv = h[hid].lv;
    for (let j = hid - 1; j >= 0 && lv > 1; j--) { if (h[j].lv < lv) { p.unshift(h[j].t); lv = h[j].lv; } }
    return p.slice(-3);
  }

  // Arama. kip 'and': sözcüklerin (çoğunun) birlikte geçtiği paragraflar; 'or': nadir sözcüğe ağırlık veren esnek arama.
  async function kitapAra(q, ayar) {
    ayar = ayar || {};
    const tk = ayar.durakSuz ? tokenler(q, true) : tokenler(q);
    const kitaplar = await tumKitaplar();
    if (!tk.length) return { hits: [], toplam: 0, kitapSay: kitaplar.length, tk };
    const faz = fold(q).trim();
    const or = ayar.kip === 'or';
    const esik = or ? 1 : (tk.length <= 2 ? tk.length : Math.ceil(tk.length * 0.6));
    const adaylar = [];
    const df = new Array(tk.length).fill(0); let N = 0;
    kitaplar.forEach((b) => {
      if (ayar.url && b.kayit.url !== ayar.url) return;
      N += b.f.length;
      b.f.forEach((f, pi) => {
        let say = 0, ek = 0; const maske = [];
        for (let i = 0; i < tk.length; i++) {
          const ix = f.indexOf(tk[i]);
          if (ix >= 0) { say++; maske.push(i); ek += Math.min(3, f.split(tk[i]).length - 2) * 0.3; }
        }
        if (say < esik) return;
        maske.forEach((i) => df[i]++);
        adaylar.push({ b, pi, f, say, maske, ek });
      });
    });
    const hits = adaylar.map((a) => {
      let puan = 0;
      a.maske.forEach((i) => { puan += or ? Math.log(1 + N / (1 + df[i])) : 1; });
      puan += a.ek;
      if (tk.length > 1 && a.f.indexOf(faz) >= 0) puan += 3;
      const p = a.b.ayr.paras[a.pi];
      if (p.k === 'h') puan *= 2;
      puan *= 1 + a.say / tk.length;
      puan /= Math.log(2 + a.f.length / 400);
      return { url: a.b.kayit.url, kad: a.b.kayit.ad, pi: a.pi, puan };
    });
    hits.sort((x, y) => y.puan - x.puan);
    return { hits: ayar.limit ? hits.slice(0, ayar.limit) : hits, toplam: hits.length, kitapSay: kitaplar.length, tk };
  }

  // Eşleşen sözcükleri <mark> ile sarar; metin birebir korunur.
  function isaretle(ebeveyn, metin, tk) {
    const f = fold(metin); const araliklar = [];
    tk.forEach((t) => { let i = 0; while ((i = f.indexOf(t, i)) >= 0) { araliklar.push([i, i + t.length]); i += t.length; } });
    araliklar.sort((a, b) => a[0] - b[0]);
    let son = 0;
    araliklar.forEach(([b, e]) => {
      if (b < son) return;
      if (b > son) ebeveyn.appendChild(document.createTextNode(metin.slice(son, b)));
      ebeveyn.appendChild(el('mark', 'arama-highlight', metin.slice(b, e)));
      son = e;
    });
    if (son < metin.length) ebeveyn.appendChild(document.createTextNode(metin.slice(son)));
  }
  function ozetPenceresi(metin, tk, uzun) {
    const f = fold(metin); let ilk = -1;
    tk.forEach((t) => { const i = f.indexOf(t); if (i >= 0 && (ilk < 0 || i < ilk)) ilk = i; });
    const boy = uzun || 240;
    if (metin.length <= boy) return metin;
    const b = Math.max(0, (ilk < 0 ? 0 : ilk) - 70);
    return (b > 0 ? '…' : '') + metin.slice(b, b + boy) + (b + boy < metin.length ? '…' : '');
  }

  // ── Konu bağlantısı (ref) ───────────────────────────────────
  // {id,url,kad,pi,yol,q}: q = paragrafın ilk 100 harfi; kitap değişse de yeniden bulunur.
  function refYap(url, kad, ayr, pi) {
    const p = ayr.paras[pi];
    return { id: yeniId(), url, kad, pi, yol: baslikYolu(ayr, pi).join(' › '), q: String(p ? p.t : '').slice(0, 100), ts: Date.now() };
  }
  async function refCoz(ref) {
    const v = await kitapYukle(ref.url).catch(() => null);
    if (!v) return { yok: true };
    const P = v.ayr.paras; const q60 = (ref.q || '').slice(0, 60);
    const uyar = (i) => P[i] && (!q60 || P[i].t.startsWith(q60));
    if (uyar(ref.pi)) return { ayr: v.ayr, pi: ref.pi };
    for (let d = 1; d <= 60; d++) { if (uyar(ref.pi + d)) return { ayr: v.ayr, pi: ref.pi + d }; if (uyar(ref.pi - d)) return { ayr: v.ayr, pi: ref.pi - d }; }
    for (let i = 0; i < P.length; i++) if (uyar(i)) return { ayr: v.ayr, pi: i };
    return { ayr: v.ayr, pi: Math.min(ref.pi, P.length - 1), kopuk: true };
  }
  function kapatHepsi() { document.querySelectorAll('.kb-ov').forEach((o) => o.remove()); try { IC().sheetKapat(); } catch (e) {} }
  async function refAc(ref) {
    const c = await refCoz(ref);
    if (c.yok) { toast('Bu kitap cihazda yok; Kütüphane’den indirin.'); return; }
    kapatHepsi();
    if (c.kopuk) toast('Paragraf kitapta değişmiş; yaklaşık yere gidiliyor.');
    IC().kitapAc({ ad: ref.kad, url: ref.url }, c.pi);
  }
  // Her kitaba sabit bir renk (kartlarda sol şerit): kitapları ayırt etmeyi kolaylaştırır
  const RENKLER = ['#b8862e', '#2f7d6d', '#5b6fb0', '#a8506a', '#7a5ea8', '#3f8f4f', '#c0663a', '#3a8aa8'];
  function kitapRengi(ad) { let h = 0; String(ad).split('').forEach((c) => { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return RENKLER[h % RENKLER.length]; }

  function refKarti(ref, islemler, rozet) {
    const k = el('div', 'kb-kart');
    k.style.setProperty('--kr', kitapRengi(ref.kad));
    const ust = el('button', 'kb-kart-ana');
    const satir = el('div', 'kb-kart-satir');
    satir.appendChild(el('div', 'kb-kitap', '📘 ' + ref.kad));
    if (rozet) satir.appendChild(el('span', 'kb-rozet-mini', rozet));
    ust.appendChild(satir);
    const yolEl = el('div', 'kb-kirinti');
    const parcalar = (ref.yol || '').split(' › ').filter(Boolean);
    if (!parcalar.length) yolEl.appendChild(el('span', 'kb-kir', '(başlık öncesi)'));
    parcalar.forEach((p, i) => { if (i) yolEl.appendChild(el('span', 'kb-kir-ok', '›')); yolEl.appendChild(el('span', 'kb-kir' + (i === parcalar.length - 1 ? ' kb-kir-son' : ''), kisalt(p, 46))); });
    ust.appendChild(yolEl);
    if (ref.q) ust.appendChild(el('div', 'kb-ozet', ref.q));
    ust.appendChild(el('span', 'kb-git', 'Kitapta aç ›'));
    ust.onclick = () => refAc(ref);
    k.appendChild(ust);
    if (islemler && islemler.length) {
      const s = el('div', 'kb-islem');
      islemler.forEach((i) => { const b = el('button', 'kb-mini' + (i.sinif ? ' ' + i.sinif : ''), i.t); b.onclick = (e) => { e.stopPropagation(); i.f(b); }; s.appendChild(b); });
      k.appendChild(s);
    }
    return k;
  }

  // Kitaba göre gruplanmış, katlanabilir pasaj listesi. oge: {ref, rozet, islemler}
  function gruplu(kap, ogeler, acik) {
    const gruplar = new Map();
    ogeler.forEach((o) => { if (!gruplar.has(o.ref.url)) gruplar.set(o.ref.url, { kad: o.ref.kad, liste: [] }); gruplar.get(o.ref.url).liste.push(o); });
    let n = 0;
    gruplar.forEach((g) => {
      const kutu = el('div', 'kb-grup'); kutu.style.setProperty('--kr', kitapRengi(g.kad));
      const bas = el('button', 'kb-grup-baslik');
      bas.appendChild(el('span', 'kb-grup-ad', '📘 ' + g.kad));
      bas.appendChild(el('span', 'kb-grup-sayi', g.liste.length + ' pasaj'));
      const ok = el('span', 'kb-grup-ok', '▾'); bas.appendChild(ok);
      const govde = el('div', 'kb-grup-govde');
      g.liste.forEach((o) => govde.appendChild(refKarti(o.ref, o.islemler, o.rozet)));
      const bas_acik = acik === undefined ? n < 2 : acik; n++;
      const ayarla = (a) => { govde.style.display = a ? '' : 'none'; ok.textContent = a ? '▾' : '▸'; };
      ayarla(bas_acik); let a = bas_acik; bas.onclick = () => { a = !a; ayarla(a); };
      kutu.appendChild(bas); kutu.appendChild(govde); kap.appendChild(kutu);
    });
  }

  // ── Alt sayfa ───────────────────────────────────────────────
  function sayfa(baslik, tam) {
    const ov = el('div', 'kb-ov');
    // Klavye açılınca panel görünür alanın içinde kalsın (yazı kutusu klavyenin altında kalmasın)
    const vv = window.visualViewport;
    if (vv) {
      const uyar = () => {
        if (!ov.isConnected) { vv.removeEventListener('resize', uyar); vv.removeEventListener('scroll', uyar); return; }
        ov.style.top = vv.offsetTop + 'px'; ov.style.height = vv.height + 'px'; ov.style.bottom = 'auto';
      };
      vv.addEventListener('resize', uyar); vv.addEventListener('scroll', uyar);
      setTimeout(uyar, 0);
    }
    const p = el('div', 'kb-panel' + (tam ? ' kb-tam' : ''));
    const ust = el('div', 'kb-ust');
    const b = el('div', 'kb-baslik', baslik); ust.appendChild(b);
    const eklenti = el('div', 'kb-ust-ek'); ust.appendChild(eklenti);
    const x = el('button', 'kb-x', '✕'); x.onclick = () => ov.remove(); ust.appendChild(x);
    const g = el('div', 'kb-govde');
    p.appendChild(ust); p.appendChild(g); ov.appendChild(p);
    ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
    return { ov, govde: g, baslikEl: b, ek: eklenti, kapat: () => ov.remove() };
  }

  // ── Konu seçici: aramayla ya da kitaba göz atarak ───────────
  function konuSec(ayar) {
    ayar = ayar || {};
    const S = sayfa(ayar.baslik || '📚 Kitaptan konu ekle');
    const g = S.govde;
    const yardim = el('div', 'kut-yardim', 'Ara ya da “Kitaba göz at”la bir başlığı seç. Dokunduğun paragraf/başlık eklenir; birden çok ekleyebilirsin.');
    const ara = el('input', 'kb-input'); ara.placeholder = 'Kitaplarda ara…'; ara.value = ayar.baslangic || '';
    const sek = el('div', 'kb-sekme');
    const s1 = el('button', 'kb-sekme-b sec', '🔍 Ara'), s2 = el('button', 'kb-sekme-b', '📖 Kitaba göz at');
    sek.appendChild(s1); sek.appendChild(s2);
    const alan = el('div', 'kb-liste');
    g.appendChild(yardim); g.appendChild(sek); g.appendChild(ara); g.appendChild(alan);
    const eklendi = new Set();
    let mod = 'ara', sira = 0;

    function ekle(ref, b) {
      const anahtar = ref.url + '#' + ref.pi;
      if (eklendi.has(anahtar)) return;
      const sonuc = ayar.ekle(ref);
      if (sonuc === false) { toast('Zaten ekli.'); return; }
      eklendi.add(anahtar); if (b) { b.textContent = '✓ Eklendi'; b.disabled = true; }
      if (ayar.tek) S.kapat(); else toast('Eklendi');
    }
    async function aramaCiz() {
      const q = ara.value.trim(); const my = ++sira;
      alan.innerHTML = '';
      if (q.length < 2) { alan.appendChild(el('div', 'kut-yardim', 'En az 2 harf yaz.')); return; }
      alan.appendChild(el('div', 'kut-yardim', 'Aranıyor…'));
      const r = await kitapAra(q, { limit: 40 });
      if (my !== sira) return;
      alan.innerHTML = '';
      if (!r.kitapSay) { alan.appendChild(el('div', 'kut-yardim', 'Cihazda indirilmiş kitap yok. Kütüphane’den kitap açıp indirin.')); return; }
      if (!r.hits.length) { alan.appendChild(el('div', 'kut-yardim', 'Sonuç yok.')); return; }
      for (const h of r.hits) {
        const v = await kitapYukle(h.url); if (!v) continue;
        const ref = refYap(h.url, h.kad, v.ayr, h.pi);
        const k = el('div', 'kb-kart');
        const a = el('button', 'kb-kart-ana');
        a.appendChild(el('div', 'kb-kitap', h.kad));
        a.appendChild(el('div', 'kb-yol', ref.yol || '(başlık öncesi)'));
        const oz = el('div', 'kb-ozet'); isaretle(oz, ozetPenceresi(v.ayr.paras[h.pi].t, r.tk), r.tk); a.appendChild(oz);
        a.onclick = () => ekle(ref, k.querySelector('.kb-mini'));
        k.appendChild(a);
        const isl = el('div', 'kb-islem'); const b = el('button', 'kb-mini kb-mini-vurgu', '＋ Ekle'); b.onclick = (e) => { e.stopPropagation(); ekle(ref, b); };
        const git = el('button', 'kb-mini', '📖 Aç'); git.onclick = (e) => { e.stopPropagation(); refAc(ref); };
        isl.appendChild(b); isl.appendChild(git); k.appendChild(isl);
        alan.appendChild(k);
      }
      if (r.toplam > r.hits.length) alan.appendChild(el('div', 'kut-yardim', 'İlk ' + r.hits.length + ' sonuç gösteriliyor (' + r.toplam + ' eşleşme). Aramayı daraltın.'));
    }
    async function gozCiz(url) {
      alan.innerHTML = '';
      if (!url) {
        const ks = IC().kaynaklar(); let say = 0;
        for (const k of ks) {
          const v = await kitapYukle(k.url).catch(() => null); if (!v) continue; say++;
          const b = el('button', 'kb-satir', '📘 ' + k.ad + '  (' + v.ayr.heads.length + ' başlık)'); b.onclick = () => gozCiz(k.url); alan.appendChild(b);
        }
        if (!say) alan.appendChild(el('div', 'kut-yardim', 'Cihazda indirilmiş kitap yok.'));
        return;
      }
      const v = await kitapYukle(url); if (!v) return;
      const kayit = IC().kaynaklar().find((k) => k.url === url) || { ad: url, url };
      const geri = el('button', 'kb-satir kb-geri', '‹ Kitaplar'); geri.onclick = () => gozCiz(null); alan.appendChild(geri);
      if (ayar.kitap) { const tum = el('button', 'kb-btn', '📘 Tüm kitabı hedef yap'); tum.onclick = () => { ayar.kitap({ url, kad: kayit.ad }); S.kapat(); }; alan.appendChild(tum); }
      const liste = el('div', 'kb-liste');
      const ciz = () => {
        liste.innerHTML = '';
        const f = fold(ara.value.trim()); let n = 0;
        v.ayr.heads.forEach((h) => {
          if (n >= 400) return;
          if (f && fold(h.t).indexOf(f) < 0) return;
          n++;
          const b = el('button', 'kb-satir kb-h' + Math.min(4, Math.max(1, h.lv)), h.t);
          b.onclick = () => ekle(refYap(url, kayit.ad, v.ayr, h.pi), b);
          liste.appendChild(b);
        });
        if (!n) liste.appendChild(el('div', 'kut-yardim', 'Başlık bulunamadı.'));
      };
      ara.oninput = ciz; ara.placeholder = 'Bu kitabın başlıklarında süz…'; ara.value = '';
      alan.appendChild(liste); ciz();
    }
    function modDegis(m) {
      mod = m; s1.classList.toggle('sec', m === 'ara'); s2.classList.toggle('sec', m === 'goz');
      if (m === 'ara') { ara.placeholder = 'Kitaplarda ara…'; ara.oninput = () => { clearTimeout(modDegis.z); modDegis.z = setTimeout(aramaCiz, 300); }; if (!ara.value) ara.value = ayar.baslangic || ''; aramaCiz(); }
      else { ara.value = ''; ara.oninput = null; gozCiz(null); }
    }
    s1.onclick = () => modDegis('ara'); s2.onclick = () => modDegis('goz');
    modDegis('ara');
  }

  // ═══════════════════════════════════════════════════════════
  //  1) ARA SEKMESİ — kitaplarda ve kütüphane notlarında arama
  // ═══════════════════════════════════════════════════════════
  let aramaSira = 0;
  function kitapBolumuTemizle() { const b = $('arama-sonuclar'); if (b) b.querySelectorAll('.kb-bolum').forEach((x) => x.remove()); }

  async function kitapSonuclari(q, tek) {
    const sonucEl = $('arama-sonuclar'), sayiEl = $('arama-sonuc-sayi');
    if (!sonucEl) return;
    const my = ++aramaSira;
    kitapBolumuTemizle();
    const bolum = el('div', 'kb-bolum');
    sonucEl.appendChild(bolum);
    if (tek) sayiEl.textContent = '';
    bolum.appendChild(el('div', 'kb-bolum-baslik', '📚 Kitaplarda aranıyor…'));
    const r = await kitapAra(q);
    if (my !== aramaSira) return;
    bolum.innerHTML = '';
    if (!r.kitapSay) {
      if (tek) sonucEl.innerHTML = '<div class="bos-durum" style="padding:30px 0"><div class="ic" style="font-size:28px">📚</div>Cihazda indirilmiş kitap yok.<br>Daha → Kütüphane’den kitapları indirin.</div>';
      else bolum.remove();
      return;
    }
    if (!r.hits.length) {
      if (tek) sonucEl.innerHTML = '<div class="bos-durum" style="padding:30px 0"><div class="ic" style="font-size:28px">😔</div>“' + q.replace(/</g, '&lt;') + '” kitaplarda geçmiyor</div>';
      else bolum.remove();
      return;
    }
    // Hangi kitapta kaç sonuç
    const sayac = {}; r.hits.forEach((h) => { sayac[h.url] = sayac[h.url] || { kad: h.kad, n: 0 }; sayac[h.url].n++; });
    let kitapSuz = null, gosterilen = 30;
    const baslik = el('div', 'kb-bolum-baslik'); bolum.appendChild(baslik);
    const chipler = el('div', 'kb-chipler'); bolum.appendChild(chipler);
    const liste = el('div', 'kb-liste'); bolum.appendChild(liste);
    const daha = el('button', 'kb-daha', 'Daha fazla göster'); bolum.appendChild(daha);

    async function ciz() {
      const hs = r.hits.filter((h) => !kitapSuz || h.url === kitapSuz);
      baslik.textContent = '📚 Kitaplarda ' + hs.length + ' sonuç · ' + Object.keys(sayac).length + ' kitap';
      if (tek) sayiEl.textContent = r.hits.length + ' sonuç bulundu';
      chipler.innerHTML = '';
      const hepsi = el('button', 'kutn-chip' + (!kitapSuz ? ' kutn-chip-sec' : ''), 'Tümü'); hepsi.onclick = () => { kitapSuz = null; gosterilen = 30; ciz(); }; chipler.appendChild(hepsi);
      Object.keys(sayac).forEach((u) => { const c = el('button', 'kutn-chip' + (kitapSuz === u ? ' kutn-chip-sec' : ''), kisalt(sayac[u].kad, 26) + ' ' + sayac[u].n); c.onclick = () => { kitapSuz = kitapSuz === u ? null : u; gosterilen = 30; ciz(); }; chipler.appendChild(c); });
      liste.innerHTML = '';
      for (const h of hs.slice(0, gosterilen)) {
        const v = await kitapYukle(h.url); if (!v) continue;
        if (my !== aramaSira) return;
        const ref = refYap(h.url, h.kad, v.ayr, h.pi);
        const k = el('div', 'arama-sonuc-kart kb-sonuc');
        const hdr = el('div', 'arama-sonuc-hdr');
        hdr.appendChild(el('span', 'arama-sure-chip', kisalt(h.kad, 22)));
        hdr.appendChild(el('span', 'arama-konu-text', ref.yol || '(başlık öncesi)'));
        k.appendChild(hdr);
        const oz = el('div', 'arama-sonuc-meal'); isaretle(oz, ozetPenceresi(v.ayr.paras[h.pi].t, r.tk), r.tk); k.appendChild(oz);
        const isl = el('div', 'kb-islem');
        const t = el('button', 'kb-mini', '🏷 Temaya ekle'); t.onclick = (e) => { e.stopPropagation(); temayaEkleSec(ref); }; isl.appendChild(t);
        const hd = el('button', 'kb-mini', '📋 Hedefe ekle'); hd.onclick = (e) => { e.stopPropagation(); hedefeEkleSec(ref); }; isl.appendChild(hd);
        k.appendChild(isl);
        k.onclick = () => refAc(ref);
        liste.appendChild(k);
      }
      daha.style.display = hs.length > gosterilen ? '' : 'none';
    }
    daha.onclick = () => { gosterilen += 30; ciz(); };
    ciz();
  }

  async function notSonuclari(q) {
    if (!window.KutNot || !KutNot.ara) return;
    const ns = KutNot.ara(q); if (!ns.length) return;
    const sonucEl = $('arama-sonuclar'); if (!sonucEl) return;
    sonucEl.querySelectorAll('.kb-notbolum').forEach((x) => x.remove());
    const bolum = el('div', 'kb-bolum kb-notbolum');
    bolum.appendChild(el('div', 'kb-bolum-baslik', '📝 Kütüphane notlarımda ' + ns.length + ' sonuç'));
    const l = el('div', 'kutn-liste'); bolum.appendChild(l);
    ns.slice(0, 30).forEach((n) => l.appendChild(KutNot.notKarti(n, () => {})));
    sonucEl.appendChild(bolum);
  }

  function aramayaBagla() {
    const orij = window._aramaYap;
    if (typeof orij !== 'function' || orij._kb) return;
    const yeni = function (q) {
      const f = (typeof aramaFiltre !== 'undefined') ? aramaFiltre : 'hepsi';
      const sonucEl = $('arama-sonuclar');
      if (f === 'kitap') {
        if (sonucEl) sonucEl.innerHTML = '';
        if (!q || q.length < 2) { const s = $('arama-sonuc-sayi'); if (s) s.textContent = ''; if (sonucEl) sonucEl.innerHTML = '<div class="bos-durum" style="padding:30px 0"><div class="ic" style="font-size:28px">📚</div>Kitaplarda aramak için en az 2 karakter girin</div>'; return; }
        kitapSonuclari(q, true); return;
      }
      orij(q);
      if (!q || q.length < 2) return;
      if (f === 'hepsi') { kitapSonuclari(q, false); notSonuclari(q); }
      else if (f === 'notlar') notSonuclari(q);
    };
    yeni._kb = true;
    window._aramaYap = yeni;

    const satir = document.querySelector('.arama-filtre-row');
    if (satir && !satir.querySelector('[data-filtre="kitap"]')) {
      const b = el('button', 'arama-filtre-btn', '📚 Kitaplar'); b.dataset.filtre = 'kitap'; b.setAttribute('onclick', 'aramaFiltreSec(this)');
      satir.insertBefore(b, satir.querySelector('[data-filtre="notlar"]'));
    }
    const inp = $('arama-inp'); if (inp) inp.placeholder = 'Konu, sûre, âyet meali, kitap veya not ara…';
  }

  // ═══════════════════════════════════════════════════════════
  //  2) TEMA / MOTİF ve 3) BÖLÜM HEDEFİ — kitap konusu ekleme
  // ═══════════════════════════════════════════════════════════
  const TEMA_ANAHTAR = 'kisitel_temalar';
  const HEDEF_ANAHTAR = 'bolum_hedefleri';
  function temalar() { return lsOku(TEMA_ANAHTAR, []); }
  function temaBul(isim) { return temalar().find((t) => t.isim === isim); }
  function temaYaz(isim, fn) { const a = temalar(); const t = a.find((x) => x.isim === isim); if (!t) return; fn(t); lsYaz(TEMA_ANAHTAR, a); try { temalarEkraniRender(); } catch (e) {} }
  function hedefler() { return lsOku(HEDEF_ANAHTAR, []); }
  function hedefYaz(idx, fn) { const a = hedefler(); if (!a[idx]) return; fn(a[idx]); lsYaz(HEDEF_ANAHTAR, a); try { bolumOkumaRender(); } catch (e) {} }
  const ayniMi = (a, b) => a.url === b.url && a.pi === b.pi;

  // Ara sekmesinden "Temaya ekle / Hedefe ekle"
  function temayaEkleSec(ref) {
    const a = temalar();
    if (!a.length) { toast('Önce Daha → Temalar & Motifler’den bir tema oluşturun.'); return; }
    const S = sayfa('🏷 Hangi temaya eklensin?');
    a.forEach((t) => {
      const b = el('button', 'kb-satir', (t.emoji || '🏷️') + ' ' + t.isim + ((t.kaynaklar || []).length ? '  (' + t.kaynaklar.length + ')' : ''));
      b.onclick = () => {
        let var_ = false;
        temaYaz(t.isim, (x) => { x.kaynaklar = x.kaynaklar || []; if (x.kaynaklar.some((r) => ayniMi(r, ref))) var_ = true; else x.kaynaklar.push(ref); });
        S.kapat(); toast(var_ ? 'Bu konu zaten ekli.' : '“' + t.isim + '” temasına eklendi');
      };
      S.govde.appendChild(b);
    });
  }
  function hedefeEkleSec(ref) {
    const a = hedefler().map((h, i) => ({ h, i })).filter((x) => !x.h.tamamlandi);
    if (!a.length) { toast('Önce Daha → Bölüm Hedefleri’nden bir hedef ekleyin.'); return; }
    const S = sayfa('📋 Hangi hedefe eklensin?');
    a.forEach(({ h, i }) => {
      const b = el('button', 'kb-satir', '📋 ' + h.baslik + ((h.kaynaklar || []).length ? '  (' + h.kaynaklar.length + ')' : ''));
      b.onclick = () => {
        let var_ = false;
        hedefYaz(i, (x) => { x.kaynaklar = x.kaynaklar || []; if (x.kaynaklar.some((r) => ayniMi(r, ref))) var_ = true; else x.kaynaklar.push(ref); });
        S.kapat(); toast(var_ ? 'Bu konu zaten ekli.' : 'Hedefe eklendi');
      };
      S.govde.appendChild(b);
    });
  }

  // Ters indeks: bir âyet aralığına atıf yapan paragraflar (kitap meta'sındaki hazır dizin)
  function tersBul(sNo, bas, bit) {
    const meta = (IC().meta && IC().meta()) || {};
    const sonuc = new Map();
    IC().kaynaklar().forEach((k) => {
      const m = meta[k.url]; if (!m || !m.ters) return;
      for (let a = bas; a <= bit; a++) {
        (m.ters[sNo + ':' + a] || []).forEach(([pi]) => {
          const an = k.url + '#' + pi;
          const o = sonuc.get(an) || { url: k.url, kad: k.ad, pi, ayetler: new Set() };
          o.ayetler.add(a); sonuc.set(an, o);
        });
      }
    });
    return [...sonuc.values()].sort((x, y) => y.ayetler.size - x.ayetler.size || x.kad.localeCompare(y.kad, 'tr') || x.pi - y.pi);
  }

  // Tema ayrıntısı
  function temaAc(isim) {
    const t0 = temaBul(isim); if (!t0) return;
    const S = sayfa((t0.emoji || '🏷️') + ' ' + t0.isim);
    const g = S.govde;
    function ciz() {
      const t = temaBul(isim); if (!t) { S.kapat(); return; }
      g.innerHTML = '';
      const anahtarSatiri = el('div', 'kb-anahtar');
      anahtarSatiri.appendChild(el('span', 'kb-etiket', 'Anahtar kelimeler:'));
      (t.anahtar || []).forEach((a) => anahtarSatiri.appendChild(el('span', 'kutn-chip', a)));
      if (!(t.anahtar || []).length) anahtarSatiri.appendChild(el('span', 'kut-yardim', 'yok (tema adıyla aranır)'));
      const d = el('button', 'kb-mini', '✏️ Düzenle');
      d.onclick = () => { const yeni = prompt('Anahtar kelimeler (virgülle ayırın)', (t.anahtar || []).join(', ')); if (yeni === null) return; temaYaz(isim, (x) => { x.anahtar = yeni.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean); }); ciz(); };
      anahtarSatiri.appendChild(d);
      g.appendChild(anahtarSatiri);

      const ara = el('button', 'kb-btn kb-btn-ince', '🔍 Âyet ve konularda ara');
      ara.onclick = () => { const q = (t.anahtar && t.anahtar[0]) || t.isim; S.kapat(); tabGec('arama'); setTimeout(() => { const i = $('arama-inp'); if (i) { i.value = q; aramaYap2(q); } }, 100); };
      g.appendChild(ara);

      const ref = t.kaynaklar || [];
      g.appendChild(el('div', 'kb-bolum-baslik', '📌 Eklediğim kitap konuları (' + ref.length + ')'));
      if (!ref.length) g.appendChild(el('div', 'kut-yardim', 'Henüz yok. Aşağıdaki öneriden ya da “＋ Kitaptan konu ekle”den ekleyin.'));
      ref.forEach((r) => g.appendChild(refKarti(r, [{ t: '🗑 Çıkar', f: () => { temaYaz(isim, (x) => { x.kaynaklar = (x.kaynaklar || []).filter((y) => y.id !== r.id); }); ciz(); } }])));
      const ekle = el('button', 'kb-btn', '＋ Kitaptan konu ekle');
      ekle.onclick = () => konuSec({ baslik: '📚 “' + t.isim + '” için konu ekle', baslangic: (t.anahtar || [t.isim]).join(' '), ekle: (r) => { let ok = true; temaYaz(isim, (x) => { x.kaynaklar = x.kaynaklar || []; if (x.kaynaklar.some((y) => ayniMi(y, r))) ok = false; else x.kaynaklar.push(r); }); if (ok) setTimeout(ciz, 0); return ok; } });
      g.appendChild(ekle);

      g.appendChild(el('div', 'kb-bolum-baslik', '🔎 Kitaplarda bulunanlar (otomatik)'));
      const oto = el('div', 'kb-liste'); g.appendChild(oto);
      oto.appendChild(el('div', 'kut-yardim', 'Aranıyor…'));
      otomatikBul(t).then((hs) => {
        oto.innerHTML = '';
        const yeni = hs.filter((h) => !ref.some((y) => ayniMi(y, h)));
        if (!yeni.length) { oto.appendChild(el('div', 'kut-yardim', hs.length ? 'Bulunanların hepsi zaten ekli.' : 'Anahtar kelimelerle kitaplarda eşleşme yok.')); return; }
        gruplu(oto, yeni.slice(0, 25).map((h) => ({ ref: h, islemler: [{ t: '📌 Temaya ekle', sinif: 'kb-mini-vurgu', f: (b) => { temaYaz(isim, (x) => { x.kaynaklar = x.kaynaklar || []; if (!x.kaynaklar.some((y) => ayniMi(y, h))) x.kaynaklar.push(h); }); b.textContent = '✓ Eklendi'; b.disabled = true; } }] })));
      });
    }
    ciz();
  }
  async function otomatikBul(t) {
    const anahtar = (t.anahtar && t.anahtar.length) ? t.anahtar : [t.isim];
    const toplam = new Map();
    for (const a of anahtar.slice(0, 8)) {
      const r = await kitapAra(a, { limit: 15 });
      for (const h of r.hits) {
        const an = h.url + '#' + h.pi;
        const o = toplam.get(an) || { h, puan: 0 }; o.puan += h.puan; toplam.set(an, o);
      }
    }
    const sirali = [...toplam.values()].sort((x, y) => y.puan - x.puan).slice(0, 30);
    const cikti = [];
    for (const { h } of sirali) { const v = await kitapYukle(h.url); if (v) cikti.push(refYap(h.url, h.kad, v.ayr, h.pi)); }
    return cikti;
  }

  // Hedef ayrıntısı
  function hedefAc(idx) {
    const h0 = hedefler()[idx]; if (!h0) return;
    const S = sayfa('📚 ' + kisalt(h0.baslik, 40));
    const g = S.govde;
    function ciz() {
      const h = hedefler()[idx]; if (!h) { S.kapat(); return; }
      g.innerHTML = '';
      const ref = h.kaynaklar || [];
      if (h.sureNo) g.appendChild(el('div', 'kut-yardim', sureAdi(h.sureNo) + ' ' + h.sureNo + (h.bas ? ':' + h.bas + (h.bit && h.bit !== h.bas ? '–' + h.bit : '') : '')));
      const okunan = ref.filter((r) => r.ok).length;
      g.appendChild(el('div', 'kb-bolum-baslik', '📌 Bu hedefin kitap konuları (' + okunan + '/' + ref.length + ' okundu)'));
      if (!ref.length) g.appendChild(el('div', 'kut-yardim', 'Henüz yok. “＋ Kitap konusu ekle” ile ya da aşağıdaki önerilerden ekleyin.'));
      ref.forEach((r) => g.appendChild(refKarti(r, [
        { t: r.ok ? '✓ Okundu' : '○ Okundu işaretle', sinif: r.ok ? 'kb-mini-vurgu' : '', f: () => { hedefYaz(idx, (x) => { const y = x.kaynaklar.find((z) => z.id === r.id); if (y) y.ok = !y.ok; }); ciz(); } },
        { t: '🗑 Çıkar', f: () => { hedefYaz(idx, (x) => { x.kaynaklar = x.kaynaklar.filter((y) => y.id !== r.id); }); ciz(); } }
      ])));
      const ekle = el('button', 'kb-btn', '＋ Kitap konusu ekle');
      ekle.onclick = () => konuSec({ baslik: '📚 Hedefe konu ekle', baslangic: h.baslik, ekle: (r) => { let ok = true; hedefYaz(idx, (x) => { x.kaynaklar = x.kaynaklar || []; if (x.kaynaklar.some((y) => ayniMi(y, r))) ok = false; else x.kaynaklar.push(r); }); if (ok) setTimeout(ciz, 0); return ok; } });
      g.appendChild(ekle);

      if (h.sureNo && h.bas) {
        g.appendChild(el('div', 'kb-bolum-baslik', '🔗 Bu âyetlere atıf yapan kitap konuları'));
        const oto = el('div', 'kb-liste'); g.appendChild(oto);
        const bit = h.bit || h.bas;
        const bulunan = tersBul(h.sureNo, h.bas, bit).filter((x) => !ref.some((y) => ayniMi(y, x)));
        if (!bulunan.length) oto.appendChild(el('div', 'kut-yardim', 'Kitaplarda bu âyetlere atıf bulunamadı (kitaplar indirilmiş mi?).'));
        (async () => {
          const ogeler = [];
          for (const x of bulunan.slice(0, 30)) {
            const v = await kitapYukle(x.url); if (!v) continue;
            const r = refYap(x.url, x.kad, v.ayr, x.pi);
            ogeler.push({ ref: r, rozet: [...x.ayetler].sort((a, b) => a - b).join(',') + '. âyet', islemler: [{ t: '📌 Hedefe ekle', sinif: 'kb-mini-vurgu', f: (b) => { hedefYaz(idx, (z) => { z.kaynaklar = z.kaynaklar || []; if (!z.kaynaklar.some((y) => ayniMi(y, r))) z.kaynaklar.push(r); }); b.textContent = '✓ Eklendi'; b.disabled = true; } }] });
          }
          gruplu(oto, ogeler);
          if (bulunan.length > 30) oto.appendChild(el('div', 'kut-yardim', 'İlk 30 gösteriliyor (' + bulunan.length + ').'));
        })();
      }
    }
    ciz();
  }

  // ── Kitap / konu hedefi ─────────────────────────────────────
  function kitapHedefiEkle(kh, baslikOner) {
    const baslik = prompt('Hedef adı', baslikOner);
    if (baslik === null || !baslik.trim()) return;
    const a = hedefler();
    a.push({ baslik: baslik.trim(), sureNo: 0, bas: 0, bit: 0, son: '', oncelik: 'normal', tamamlandi: false, tarih: new Date().toLocaleDateString('tr-TR'), kitapHedef: kh });
    lsYaz(HEDEF_ANAHTAR, a);
    try { bolumOkumaRender(); } catch (e) {}
    toast('Hedef eklendi');
  }
  function kitapHedefiSec() {
    konuSec({
      baslik: '📚 Hedef için kitap / konu seç', tek: true,
      kitap: (k) => kitapHedefiEkle({ tur: 'kitap', url: k.url, kad: k.kad }, k.kad + ' — baştan sona'),
      ekle: (r) => { kitapHedefiEkle({ tur: 'konu', url: r.url, kad: r.kad, ref: r }, (r.yol ? r.yol.split(' › ').pop() : r.kad)); return true; }
    });
  }
  function kitapOkumaOrani(url) {
    const meta = (IC().meta && IC().meta()) || {}; const m = meta[url];
    try { const kn = JSON.parse(localStorage.getItem('kut_konum_' + url) || 'null'); if (kn && m && m.paraSay) return Math.min(100, Math.round(kn.pi / m.paraSay * 100)); } catch (e) {}
    return 0;
  }
  function kitapOkunduMu(url) { try { const o = (JSON.parse(localStorage.getItem('kut_okundu_v1') || '{}') || {})[url]; return !!o && (o.d === 'el' || o.d === 'oto'); } catch (e) { return false; } }

  function temaVeHedefeBagla() {
    if (typeof window.bolumOkumaRender === 'function' && !window.bolumOkumaRender._kb) {
      const orij = window.bolumOkumaRender;
      const f = function () {
        orij.apply(this, arguments);
        const form = document.querySelector('#bolumokuma-ic [onclick="_bolumHedefiEkle()"]');
        if (form && !document.getElementById('kb-kitap-hedef-btn')) {
          const b = el('button', 'kb-btn kb-btn-ince kb-tam-btn', '📚 Kitap / konu hedefi ekle'); b.id = 'kb-kitap-hedef-btn'; b.onclick = kitapHedefiSec;
          form.parentNode.appendChild(b);
        }
      }; f._kb = true; window.bolumOkumaRender = f;
    }
    if (typeof window._temaDetayAc === 'function' && !window._temaDetayAc._kb) {
      const f = function (tema) { temaAc(tema.isim); }; f._kb = true; window._temaDetayAc = f;
    }
    if (typeof window._temaKart === 'function' && !window._temaKart._kb) {
      const orij = window._temaKart;
      const f = function (tema, silinebilir) {
        const kart = orij(tema, silinebilir);
        const n = (tema.kaynaklar || []).length;
        if (n) { const r = el('div', 'kb-rozet', '📚 ' + n + ' kitap konusu'); kart.appendChild(r); }
        return kart;
      }; f._kb = true; window._temaKart = f;
    }
    if (typeof window._bolumHedefKart === 'function' && !window._bolumHedefKart._kb) {
      const orij = window._bolumHedefKart;
      const f = function (h, idx) {
        const kart = orij(h, idx);
        if (h.kitapHedef) {
          const kh = h.kitapHedef; const blok = el('div', 'kb-kh');
          const yolMetni = kh.tur === 'kitap' ? '📘 ' + kh.kad : '📘 ' + kh.kad + (kh.ref && kh.ref.yol ? ' › ' + kh.ref.yol : '');
          blok.appendChild(el('div', 'kb-kh-yol', yolMetni));
          if (kh.tur === 'kitap') {
            const oran = kitapOkunduMu(kh.url) ? 100 : kitapOkumaOrani(kh.url);
            const cubuk = el('div', 'kut-ilerleme'); const dolu = el('div', 'kut-ilerleme-dolu' + (oran === 100 ? ' tam' : '')); dolu.style.width = oran + '%'; cubuk.appendChild(dolu); blok.appendChild(cubuk);
            blok.appendChild(el('div', 'kb-kh-yuzde', oran === 100 ? '✅ Kitap okundu' : 'İlerleme: %' + oran));
          }
          const isl = el('div', 'kb-islem'); isl.style.padding = '8px 0 0';
          const oku = el('button', 'kb-mini kb-mini-vurgu', '▶ Oku');
          oku.onclick = () => { if (kh.tur === 'konu' && kh.ref) refAc(kh.ref); else IC().kitapAc({ ad: kh.kad, url: kh.url }); };
          isl.appendChild(oku);
          if (kh.tur === 'kitap' && !h.tamamlandi && kitapOkunduMu(kh.url)) {
            const tm = el('button', 'kb-mini', '✓ Okundu → hedefi tamamla'); tm.onclick = () => hedefYaz(idx, (x) => { x.tamamlandi = true; x.tamamlanmaTarih = new Date().toLocaleDateString('tr-TR'); }); isl.appendChild(tm);
          }
          blok.appendChild(isl); kart.appendChild(blok);
        }
        const n = (h.kaynaklar || []).length, ok = (h.kaynaklar || []).filter((r) => r.ok).length;
        const b = el('button', 'kb-mini kb-hedef-btn', '📚 Kitap konuları' + (n ? ' (' + ok + '/' + n + ')' : ''));
        b.onclick = () => hedefAc(idx);
        kart.appendChild(b);
        return kart;
      }; f._kb = true; window._bolumHedefKart = f;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  4) ÂYET KÜMESİ YAPAY ZEKÂSI
  // ═══════════════════════════════════════════════════════════
  const BUTCE = { meal: 14000, tefsir: 32000, kitap: 26000, not: 8000 };
  const SISTEM =
    'Sen, kullanıcının kendi kütüphanesiyle çalışan bir Kur’ân araştırma asistanısın. Sana bir âyet kümesi ve etiketli kaynaklar verilir: ' +
    '[M#] meal, [T#] tefsir, [K#] kullanıcının kütüphanesindeki kitaplardan getirilmiş pasajlar, [N#] kullanıcının kendi notları.\n' +
    'KURALLAR:\n' +
    '1) YALNIZCA verilen kaynaklara dayan. Her önemli iddianın sonuna kaynak etiketini köşeli parantezle yaz, örn. [K2] ya da [T1][K4].\n' +
    '2) Kaynaklarda olmayanı uydurma; hadis, rivayet, sayfa numarası ya da alıntı üretme. Kaynaklar yetmiyorsa “Verilen kaynaklarda bu konuda bilgi yok.” de.\n' +
    '3) Kaynak dışı genel bilgi kullanırsan o cümleyi “⚠️ Kaynak dışı:” ile başlat.\n' +
    '4) Uzun alıntı yapma (en çok birkaç kelime); kendi cümlelerinle aktar. Kitabın görüşünü sadık aktar, kendi yorumunu ayrıca belirt.\n' +
    '5) Türkçe, sade ve saygılı yaz. BİÇİM (ekranda kartlara dönüşecek): bölüm başlıklarını “## ” ile yaz (kısa: Ana mesaj, Ortak noktalar, Ayrışan yorumlar, Kitaplar, Tefsirler, Kısaca…); ' +
    'her başlığın altında en çok 5 kısa madde yaz, maddeleri “- ” ile başlat (bir ya da iki cümle); önemli terimleri **kalın** yaz; uzun paragraf yazma. En sona “## Kısaca” başlığıyla tek cümlelik çıkarım ekle.';
  const GOREV = {
    ozet: 'GÖREV: Bu âyet kümesi için bir özet hazırla. Önce “Ana mesaj” (2–4 cümle), ardından kaynak türüne göre (meal, tefsir, kitaplar, notlarım) kısa maddeler.',
    kitaplar: 'GÖREV: YALNIZCA [K#] pasajlarına dayanarak kitap kitap özetle: her kitap ne diyor? Aynı kitabın birden çok pasajını birleştir. Hiç [K#] yoksa bunu söyle.',
    karsilastir: 'GÖREV: Kaynakları karşılaştır: “Ortak noktalar”, “Ayrışan yorumlar”, “Yalnız tek kaynakta geçenler” bölümleriyle; hangi kaynak ne diyor, etiketle. Tablo kullanma.',
    soru: 'GÖREV: Aşağıdaki soruyu kaynaklara dayanarak cevapla.'
  };

  function ayetAraligiMetni(o) { return sureAdi(o.sNo) + ' ' + o.sNo + ':' + (o.bas === o.bit ? o.bas : o.bas + '–' + o.bit); }
  function anahtarOlustur(o) { return 'kume_' + o.sNo + '_' + (o.kumeId || (o.bas + '-' + o.bit)); }

  function sayiAraligi(anahtar) {
    const s = new Set();
    String(anahtar).split(',').forEach((p) => { const m = p.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/); if (!m) return; const a = +m[1], b = m[2] ? +m[2] : a; for (let i = a; i <= Math.min(b, a + 400); i++) s.add(i); });
    return s;
  }
  function aralikYaz(set) {
    const a = [...set].sort((x, y) => x - y); const p = []; let i = 0;
    while (i < a.length) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; p.push(a[i] === a[j] ? '' + a[i] : a[i] + '–' + a[j]); i = j + 1; }
    return p.join(',');
  }

  // Bağlam: seçili kaynaklardan etiketli bloklar. atif: etiket -> açılabilir kaynak bilgisi
  async function baglamKur(o, soru, sec) {
    const bloklar = []; const atif = {}; const ozet = { meal: 0, tefsir: 0, kitap: 0, not: 0 }; const uyari = [];
    const { sNo, bas, bit } = o;
    const ayetSay = Math.min(bit - bas + 1, 60);

    // Meal
    if (sec.meal && typeof _ozelCevirilerHepsiGetir === 'function') {
      const yazarlar = new Map();
      for (let a = bas; a < bas + ayetSay; a++) {
        let l = []; try { l = _ozelCevirilerHepsiGetir(sNo, a) || []; } catch (e) {}
        l.forEach((m) => { if (!m.text) return; const ad = (m.author && m.author.name) || 'Meal'; if (!yazarlar.has(ad)) yazarlar.set(ad, []); yazarlar.get(ad).push(a + ') ' + m.text); });
      }
      let n = 0, harf = 0;
      for (const [ad, satirlar] of yazarlar) {
        let metin = satirlar.join('\n');
        if (harf + metin.length > BUTCE.meal) { uyari.push('Meal bütçesi doldu: ' + ad + ' ve sonrası alınmadı'); break; }
        n++; harf += metin.length; const id = 'M' + n;
        bloklar.push('[' + id + '] MEAL — ' + ad + ' (' + ayetAraligiMetni(o) + ')\n' + metin);
        atif[id] = { tip: 'meal', etiket: ad, metin: kisalt(metin, 1200) };
      }
      ozet.meal = n;
    }

    // Tefsir (gruplu veri: "3,4" gibi anahtarlar)
    if (sec.tefsir && typeof _alimTefsirListesiGetir === 'function') {
      let n = 0, harf = 0;
      const aralik = new Set(); for (let a = bas; a <= bit; a++) aralik.add(a);
      for (const alim of _alimTefsirListesiGetir()) {
        const alimAd = typeof _notIsimGoster === 'function' ? _notIsimGoster(alim) : alim;
        let veri = {}; try { veri = _alimTefsirMetniGetir2(alim, sNo) || {}; } catch (e) {}
        const goruldu = new Set();
        for (const anahtar of Object.keys(veri)) {
          if (anahtar === '0') continue;
          const ayetler = sayiAraligi(anahtar); let kesisim = false; ayetler.forEach((a) => { if (aralik.has(a)) kesisim = true; });
          if (!kesisim) continue;
          const v = veri[anahtar]; const metin = (typeof v === 'string' ? v : (v && v.tefsir) || '').trim();
          if (!metin || goruldu.has(metin)) continue; goruldu.add(metin);
          const kes = metin.length > 6000 ? metin.slice(0, 6000) + '…' : metin;
          if (kes.length < metin.length) uyari.push(alimAd + ' ' + sNo + ':' + anahtar + ' kısaltıldı');
          if (harf + kes.length > BUTCE.tefsir) { uyari.push('Tefsir bütçesi doldu: ' + alimAd + ' ' + sNo + ':' + anahtar + ' ve sonrası alınmadı'); break; }
          n++; harf += kes.length; const id = 'T' + n;
          bloklar.push('[' + id + '] TEFSİR — ' + alimAd + ' (' + sNo + ':' + aralikYaz(ayetler) + ')\n' + kes);
          atif[id] = { tip: 'tefsir', etiket: alimAd + ' ' + sNo + ':' + aralikYaz(ayetler), metin: kisalt(metin, 1500) };
        }
      }
      ozet.tefsir = n;
    }

    // Kitap pasajları: (1) âyetlere atıf yapanlar (2) sorudaki/konudaki sözcüklerle bulunanlar
    if (sec.kitap) {
      const secilen = new Map();
      const tersler = tersBul(sNo, bas, bit).slice(0, 12);
      for (const x of tersler) { secilen.set(x.url + '#' + x.pi, { url: x.url, kad: x.kad, pi: x.pi, neden: 'atıf', puan: 10 + x.ayetler.size }); }
      const sorgu = (soru && soru.trim() ? soru + ' ' : '') + (o.konu || '');
      const r = await kitapAra(sorgu, { kip: 'or', durakSuz: true, limit: 14 });
      r.hits.forEach((h) => { const an = h.url + '#' + h.pi; if (!secilen.has(an)) secilen.set(an, { url: h.url, kad: h.kad, pi: h.pi, neden: 'arama', puan: h.puan }); });
      const sirali = [...secilen.values()].sort((a, b) => b.puan - a.puan).slice(0, 16);
      let n = 0, harf = 0;
      for (const x of sirali) {
        const v = await kitapYukle(x.url); if (!v) continue;
        const p = v.ayr.paras[x.pi]; if (!p || p.k === 'h') continue;
        let metin = p.t; if (metin.length > 1300) metin = metin.slice(0, 1300) + '…';
        if (harf + metin.length > BUTCE.kitap) break;
        n++; harf += metin.length; const id = 'K' + n;
        const ref = refYap(x.url, x.kad, v.ayr, x.pi);
        bloklar.push('[' + id + '] KİTAP — ' + x.kad + (ref.yol ? ' › ' + ref.yol : '') + '\n' + metin);
        atif[id] = { tip: 'kitap', ref, etiket: x.kad + (ref.yol ? ' › ' + ref.yol : ''), metin: kisalt(p.t, 700) };
      }
      ozet.kitap = n;
    }

    // Notlarım: âyet notları, küme notları, kütüphane notları
    if (sec.not) {
      const parcalar = [];
      for (let a = bas; a < bas + ayetSay; a++) {
        try { (ayetNotlariniGetir(sNo, a) || []).filter((x) => x.isim !== 'Tefsir').forEach((x) => { const t = duzMetin(x.icerik); if (t) parcalar.push({ e: 'Âyet notu ' + sNo + ':' + a + (x.isim ? ' (' + x.isim + ')' : ''), t }); }); } catch (e) {}
        try { if (window.KutNot) KutNot.ayetNotlari(sNo, a).forEach((n) => { const t = ((n.seg || []).map((s) => s.q).join(' … ') + (n.metin ? ' — Notum: ' + n.metin : '')).trim(); if (t) parcalar.push({ e: 'Kütüphane notu · ' + n.kad, t }); }); } catch (e) {}
      }
      try {
        const d = o.kumeId && typeof _kumeDugumuBul === 'function' ? _kumeDugumuBul(sNo, o.kumeId) : null;
        if (d) (d.notlar || []).forEach((x) => { const t = duzMetin(x.html); if (t) parcalar.push({ e: 'Küme notu' + (x.baslik ? ': ' + x.baslik : ''), t }); });
      } catch (e) {}
      const gor = new Set(); let n = 0, harf = 0;
      for (const p of parcalar) {
        const an = p.e + p.t; if (gor.has(an)) continue; gor.add(an);
        const metin = kisalt(p.t, 1500);
        if (harf + metin.length > BUTCE.not) { uyari.push('Not bütçesi doldu'); break; }
        n++; harf += metin.length; const id = 'N' + n;
        bloklar.push('[' + id + '] NOT — ' + p.e + '\n' + metin);
        atif[id] = { tip: 'not', etiket: p.e, metin: kisalt(p.t, 1200) };
      }
      ozet.not = n;
    }

    const baslik = 'ÂYET KÜMESİ: ' + (o.konu || '') + ' — ' + ayetAraligiMetni(o) + '\n(Kaynak sayıları: ' + ozet.meal + ' meal, ' + ozet.tefsir + ' tefsir, ' + ozet.kitap + ' kitap pasajı, ' + ozet.not + ' not)\n\n';
    return { metin: baslik + (bloklar.length ? bloklar.join('\n\n') : '(Hiç kaynak bulunamadı.)'), atif, ozet, uyari, bos: !bloklar.length };
  }

  // [K1], [K1, K3], [T2][K4] → tıklanabilir rozetler
  function atifliYaz(ebeveyn, metin, atif) {
    const re = /\[((?:[KMTN]\d+)(?:\s*[,;]\s*(?:[KMTN])?\d+)*)\]/g;
    let son = 0, m;
    while ((m = re.exec(metin)) !== null) {
      if (m.index > son) ebeveyn.appendChild(document.createTextNode(metin.slice(son, m.index)));
      let harf = '';
      m[1].split(/[,;]/).forEach((p) => {
        p = p.trim(); const h = p.match(/^[KMTN]/); if (h) harf = h[0]; const id = (h ? '' : harf) + p;
        const b = el('button', 'kb-atif kb-atif-' + id[0].toLowerCase(), id);
        b.onclick = () => atifAc(id, atif && atif[id]);
        ebeveyn.appendChild(b);
      });
      son = m.index + m[0].length;
    }
    if (son < metin.length) ebeveyn.appendChild(document.createTextNode(metin.slice(son)));
  }
  // Yapay zekâ cevabını başlık/madde/kalın biçiminde kartlara çevirir (güvenli: yalnız DOM metni)
  const BASLIK_IKON = [[/ana mesaj|ana tema|özet/i, '💡'], [/ortak/i, '🤝'], [/ayrış|fark|farklı/i, '⚖️'], [/meal/i, '📖'], [/tefsir/i, '📜'], [/kitap/i, '📚'], [/not/i, '📝'], [/kısaca|sonuç|değerlendirme/i, '✅'], [/kaynak dışı|uyarı/i, '⚠️']];
  function baslikIkon(t) { for (const [re, i] of BASLIK_IKON) if (re.test(t)) return i; return '▸'; }
  function satirIci(ebeveyn, metin, atif) {
    metin = metin.replace(/(?<!\*)\*(?!\*|\s)([^*\n]+?)(?<!\s)\*(?!\*)/g, '$1'); // tek yıldızlı vurguyu sadeleştir
    const re = /\*\*(.+?)\*\*/g; let son = 0, m;
    while ((m = re.exec(metin)) !== null) {
      if (m.index > son) atifliYaz(ebeveyn, metin.slice(son, m.index), atif);
      const b = el('strong', 'kb-md-kalin'); atifliYaz(b, m[1], atif); ebeveyn.appendChild(b);
      son = m.index + m[0].length;
    }
    if (son < metin.length) atifliYaz(ebeveyn, metin.slice(son), atif);
  }
  function mdYaz(kap, metin, atif) {
    let bolum = null, liste = null, paraBirik = [];
    const bolumAc = (baslik) => {
      bolum = el('div', 'kb-md-bolum');
      if (baslik) { const h = el('div', 'kb-md-baslik'); h.appendChild(el('span', 'kb-md-ikon', baslikIkon(baslik))); const t = el('span'); satirIci(t, baslik, atif); h.appendChild(t); bolum.appendChild(h); if (/kısaca|ana mesaj/i.test(baslik)) bolum.classList.add('kb-md-vurgulu'); }
      kap.appendChild(bolum); liste = null;
    };
    const paraBitir = () => { if (!paraBirik.length) return; if (!bolum) bolumAc(''); const p = el('p', 'kb-md-p'); satirIci(p, paraBirik.join(' '), atif); if (/^⚠️/.test(paraBirik[0])) p.classList.add('kb-md-uyari'); bolum.appendChild(p); paraBirik = []; };
    String(metin).replace(/\r/g, '').split('\n').forEach((ham) => {
      const s = ham.trimEnd();
      if (!s.trim()) { paraBitir(); liste = null; return; }
      let m;
      if ((m = s.match(/^\s*#{1,4}\s+(.*)$/)) || (m = s.match(/^\s*\*\*([^*]{2,60}?):?\*\*\s*:?\s*$/))) { paraBitir(); bolumAc(m[1].replace(/[*:]+$/, '').trim()); return; }
      if ((m = s.match(/^(\s*)(?:[-*•▪]|\d+[.)])\s+(.*)$/))) {
        paraBitir(); if (!bolum) bolumAc('');
        if (!liste) { liste = el('ul', 'kb-md-liste'); bolum.appendChild(liste); }
        const li = el('li', 'kb-md-madde' + (m[1].length >= 2 ? ' kb-md-alt' : '')); satirIci(li, m[2], atif); liste.appendChild(li); return;
      }
      liste = null; paraBirik.push(s.trim());
    });
    paraBitir();
  }

  function atifAc(id, a) {
    if (!a) { toast(id + ' kaynağı bu cevapla birlikte saklanmamış.'); return; }
    if (a.tip === 'kitap' && a.ref) { refAc(a.ref); return; }
    const S = sayfa(id + ' · ' + kisalt(a.etiket, 50));
    S.govde.appendChild(el('div', 'kb-kaynak-metin', a.metin || ''));
  }

  function kumeNotuHtml(metin) {
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<p>' + esc(metin).split(/\n{2,}/).map((p) => p.replace(/\n/g, '<br>')).join('</p><p>') + '</p>';
  }
  async function kumeNotunaKaydet(o, metin) {
    if (typeof _kumeDugumuGaranti !== 'function' || !o.kumeId) { toast('Bu küme için not klasörü bulunamadı.'); return; }
    try {
      _sbAktifSureNo = o.sNo;
      const d = _kumeDugumuGaranti(o.sNo, { id: o.kumeId, konu: o.konu, bas: o.bas, bit: o.bit });
      d.notlar = d.notlar || [];
      d.notlar.push({ id: _sbYeniId(), baslik: '🤖 ' + new Date().toLocaleDateString('tr-TR') + ' · yapay zekâ cevabı', html: kumeNotuHtml(metin) });
      await _sureBilgiKaydet(o.sNo, _sureBilgiGetir(o.sNo));
      toast('Küme notlarına kaydedildi');
    } catch (e) { toast('Kaydedilemedi: ' + (e.message || e)); }
  }

  function kumeAc(o) {
    o = Object.assign({}, o); o.bas = +o.bas; o.bit = +o.bit || o.bas;
    const anahtar = anahtarOlustur(o);
    const S = sayfa('🤖 ' + (o.konu || 'Küme'), true);
    S.ov.classList.add('kb-yz');
    const g = S.govde; g.classList.add('kb-yz-govde');
    const sec = Object.assign({ meal: true, tefsir: true, kitap: true, not: true }, lsOku('kb_yz_kaynak', {}));

    const baslikAlt = el('div', 'kb-yz-alt', ayetAraligiMetni(o));
    const temizle = el('button', 'kb-mini', '🗑 Sohbeti temizle'); S.ek.appendChild(temizle);
    g.appendChild(baslikAlt);

    // Kaynak seçimi
    const kaynakSatiri = el('div', 'kb-chipler');
    [['meal', '📖 Meal'], ['tefsir', '📜 Tefsir'], ['kitap', '📚 Kitaplar'], ['not', '📝 Notlarım']].forEach(([k, ad]) => {
      const c = el('button', 'kutn-chip' + (sec[k] ? ' kutn-chip-sec' : ''), ad);
      c.onclick = () => { sec[k] = !sec[k]; c.classList.toggle('kutn-chip-sec', sec[k]); lsYaz('kb_yz_kaynak', sec); };
      kaynakSatiri.appendChild(c);
    });
    g.appendChild(kaynakSatiri);

    // Hızlı eylemler
    const eylem = el('div', 'kb-eylemler');
    const eylemler = [
      ['📝 Özet', () => gonder('Bu âyet kümesini kaynaklara dayanarak özetle.', 'ozet')],
      ['📚 Kitaplar ne diyor?', () => gonder('Kütüphanemdeki kitaplar bu âyet kümesi hakkında ne diyor? Kitap kitap özetle.', 'kitaplar')],
      ['⚖️ Karşılaştır', () => gonder('Meal, tefsir ve kitaplar bu âyetleri yorumlarken ortak noktalar ve farklar neler?', 'karsilastir')],
      ['🧭 Pasajlara göz at', () => pasajlar()]
    ];
    eylemler.forEach(([ad, f]) => { const b = el('button', 'kb-mini kb-eylem', ad); b.onclick = f; eylem.appendChild(b); });
    g.appendChild(eylem);

    const liste = el('div', 'kb-yz-liste'); g.appendChild(liste);
    const giris = el('div', 'kb-yz-giris');
    const kutu = el('textarea', 'kb-input kb-yz-kutu'); kutu.rows = 1; kutu.placeholder = 'Bu kümeyle ilgili soru sor…';
    const yolla = el('button', 'kb-yz-yolla', '➤');
    giris.appendChild(kutu); giris.appendChild(yolla); g.appendChild(giris);
    const dipnot = el('div', 'kut-yardim kb-yz-ipucu', 'Cevaplar yalnızca seçili kaynaklara dayanır. [K1], [T2] gibi etiketlere dokununca kaynak açılır.');
    g.appendChild(dipnot);

    let mevcut = { mesajlar: [], sentez: null }; let mesgul = false;

    function balon(m) {
      const b = el('div', 'kb-mesaj ' + (m.rol === 'user' ? 'kb-kul' : 'kb-model'));
      if (m.rol === 'user') { b.textContent = m.metin; return b; }
      const ic = el('div', 'kb-mesaj-ic'); mdYaz(ic, m.metin, m.atif); b.appendChild(ic);
      if (m.kullanilan) b.appendChild(el('div', 'kb-kullanilan', m.kullanilan));
      const isl = el('div', 'kb-islem');
      const kopya = el('button', 'kb-mini', '📋 Kopyala'); kopya.onclick = () => { try { navigator.clipboard.writeText(m.metin); toast('Kopyalandı'); } catch (e) { toast('Kopyalanamadı'); } };
      isl.appendChild(kopya);
      if (o.kumeId) { const kn = el('button', 'kb-mini', '📁 Küme notuna kaydet'); kn.onclick = () => kumeNotunaKaydet(o, m.metin); isl.appendChild(kn); }
      b.appendChild(isl);
      return b;
    }
    function ciz() {
      liste.innerHTML = '';
      if (!mevcut.mesajlar.length) liste.appendChild(el('div', 'kut-yardim kb-yz-bos', 'Yukarıdan bir eylem seç ya da aşağıya soru yaz. Örnek: “Bu âyetlerde sabır nasıl işleniyor?” veya “Hangi kitap hangi âyeti öne çıkarıyor?”'));
      mevcut.mesajlar.forEach((m) => liste.appendChild(balon(m)));
      liste.scrollTop = liste.scrollHeight;
    }

    async function pasajlar() {
      const S2 = sayfa('🧭 Kitaplarda gezin');
      S2.govde.appendChild(el('div', 'kut-yardim', 'Bu kümenin âyetlerine atıf yapan ve konusuyla eşleşen kitap pasajları. Dokununca kitapta o yer açılır.'));
      const l = el('div', 'kb-liste'); S2.govde.appendChild(l);
      l.appendChild(el('div', 'kut-yardim', 'Aranıyor…'));
      const secilen = new Map();
      tersBul(o.sNo, o.bas, o.bit).slice(0, 40).forEach((x) => secilen.set(x.url + '#' + x.pi, { url: x.url, kad: x.kad, pi: x.pi, e: 'atıf · ' + [...x.ayetler].sort((a, b) => a - b).join(',') + '. âyet' }));
      const r = await kitapAra(o.konu || '', { kip: 'or', durakSuz: true, limit: 15 });
      r.hits.forEach((h) => { const an = h.url + '#' + h.pi; if (!secilen.has(an)) secilen.set(an, { url: h.url, kad: h.kad, pi: h.pi, e: 'konu eşleşmesi' }); });
      l.innerHTML = '';
      if (!secilen.size) { l.appendChild(el('div', 'kut-yardim', 'Kitaplarda ilgili pasaj bulunamadı. Kitaplar indirilmiş mi?')); return; }
      const ogeler = [];
      for (const x of secilen.values()) {
        const v = await kitapYukle(x.url); if (!v) continue;
        ogeler.push({ ref: refYap(x.url, x.kad, v.ayr, x.pi), rozet: x.e, atif: x.e.startsWith('atıf') });
      }
      ogeler.sort((a, b) => (b.atif ? 1 : 0) - (a.atif ? 1 : 0));
      l.className = ''; gruplu(l, ogeler);
      const atifSay = ogeler.filter((x) => x.atif).length;
      S2.govde.firstChild.textContent = '📍 ' + atifSay + ' pasaj bu âyetlere doğrudan atıf yapıyor, ' + (ogeler.length - atifSay) + ' pasaj konuyla eşleşiyor. Kitaba göre gruplandı; başlığa dokununca açılır/kapanır.';
    }

    async function gonder(metin, mod) {
      metin = (metin || '').trim(); if (!metin || mesgul) return;
      if (typeof _geminiHazirMi === 'function' && !_geminiHazirMi()) { toast('Önce Daha → Gemini API anahtarı girin.'); try { geminiAyarlariAc(); } catch (e) {} return; }
      mesgul = true; kutu.value = ''; kutu.disabled = true; yolla.disabled = true;
      mevcut.mesajlar.push({ rol: 'user', metin }); ciz();
      const bekle = el('div', 'kb-bekle', '⏳ Kaynaklar taranıyor, cevap yazılıyor…'); liste.appendChild(bekle); liste.scrollTop = liste.scrollHeight;
      try {
        const bag = await baglamKur(o, mod === 'soru' ? metin : '', sec);
        if (bag.bos) throw new Error('Seçili kaynaklardan hiçbiri bu küme için bulunamadı. Kaynak türlerini açın veya meal/tefsir/kitap yükleyin.');
        const gecmis = mevcut.mesajlar.slice(0, -1).slice(-6).map((m) => ({ rol: m.rol === 'user' ? 'user' : 'model', metin: m.metin }));
        const istek = bag.metin + '\n\n---\n' + (GOREV[mod] || GOREV.soru) + '\n' + (mod === 'soru' ? 'SORU: ' : 'İSTEK: ') + metin;
        const cevap = await _geminiApiCagir(SISTEM, gecmis.concat([{ rol: 'user', metin: istek }]));
        const kullanilan = [bag.ozet.meal ? bag.ozet.meal + ' meal' : '', bag.ozet.tefsir ? bag.ozet.tefsir + ' tefsir' : '', bag.ozet.kitap ? bag.ozet.kitap + ' kitap pasajı' : '', bag.ozet.not ? bag.ozet.not + ' not' : ''].filter(Boolean).join(' · ');
        const gecenler = {}; (cevap.match(/[KMTN]\d+/g) || []).forEach((id) => { if (bag.atif[id]) gecenler[id] = bag.atif[id]; });
        mevcut.mesajlar.push({ rol: 'model', metin: cevap, atif: gecenler, kullanilan: 'Kullanılan: ' + kullanilan + (bag.uyari.length ? ' · ⚠️ ' + bag.uyari.slice(0, 2).join('; ') : '') });
        await _aiSohbetYaz(anahtar, mevcut);
      } catch (e) {
        mevcut.mesajlar.pop(); // başarısız soruyu kaydetme
        kutu.value = metin;
        toast('⚠️ ' + (e.message || e));
      } finally {
        mesgul = false; kutu.disabled = false; yolla.disabled = false; ciz();
      }
    }
    yolla.onclick = () => gonder(kutu.value, 'soru');
    kutu.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder(kutu.value, 'soru'); } };
    temizle.onclick = async () => { if (!confirm('Bu kümenin yapay zekâ sohbeti silinsin mi? (Küme notlarına kaydettiklerin silinmez.)')) return; mevcut = { mesajlar: [], sentez: null }; await _aiSohbetYaz(anahtar, mevcut); ciz(); };

    if (typeof _geminiHazirMi === 'function' && !_geminiHazirMi()) {
      const u = el('div', 'kb-uyari', 'Yapay zekâ için ücretsiz bir Gemini API anahtarı gerekir. “🧭 Pasajlara göz at” anahtar olmadan da çalışır.');
      const b = el('button', 'kb-mini kb-mini-vurgu', '🤖 Gemini API anahtarı gir'); b.onclick = () => { try { geminiAyarlariAc(); } catch (e) {} }; u.appendChild(b);
      g.insertBefore(u, kaynakSatiri);
    }
    _aiSohbetOku(anahtar).then((k) => { if (k && Array.isArray(k.mesajlar)) mevcut = k; ciz(); }).catch(() => ciz());
    ciz();
  }

  window.KutAra = { kitapAra, konuSec, refAc, refYap, refCoz, tersBul, fold, sayfa, toast, kitapYukle };
  window.KutYZ = { kumeAc };
  window.kumeYapayZekaAc = kumeAc;

  // Bağlamalar: ilgili işlevler sonradan tanımlanabilir diye hem şimdi hem açılışta dene
  function bagla() { try { aramayaBagla(); } catch (e) { console.warn('Arama bağlantısı:', e); } try { temaVeHedefeBagla(); } catch (e) { console.warn('Tema/hedef bağlantısı:', e); } }
  bagla();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bagla);
})();
