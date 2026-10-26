/* 8-tefsir-bicimleri.js — Biçime özel tefsir ayrıştırıcıları (UMD; tarayıcıda ve Node'da çalışır)
 * İlke: kaynak metin ASLA değiştirilmez; belirsiz/uymayan her şey rapora yazılır, sessizce atanmaz.
 * Çıktı modeli mevcut Tefsir sekmesiyle aynı: { "3,4": {meal, tefsir} }  ("0" = sûre girişi/besmele)
 */
(function (kok, fab) {
  if (typeof module === 'object' && module.exports) module.exports = fab();
  else kok.TefsirBicimleri = fab();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const AYET_SAYILARI = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];

  /* ---------------- KEŞFÜ'L-HAKÂYIK ---------------- */
  const KESF_BASLIK = /^\s*(\d+)\s*\/\s*(\d+)\s+(\S.{1,48}?S[UÛ]R[A-Za-zÇŞĞÜÖİçşğüöıâîûÂÎÛ]*)\s*$/i;
  const KESF_ISARET = /^\s*(\d+(?:\s*-\s*\d+)*)\s*\/\s*(\d+(?:\s*-\s*\d+)*)\s*-\s?/;
  const KESF_DEF = /^\s*\[(\d+)\]\s*-?\s*/;
  const KESF_AYRAC = /^\s*-{20,}\s*$/;
  const KESF_CILT = /(KEŞFU|C[İI]LD[İI])/;

  function kesfAyristir(metin, ayetSayilari) {
    ayetSayilari = ayetSayilari || AYET_SAYILARI;
    const L = metin.replace(/\r/g, '').split('\n');
    const rapor = { uyari: [], eksikSureler: [], dipnotKusur: [] };

    // 1) Dipnot blokları: ayraçtan sonraki bölge, bir sonraki cilt başlığına/dosya sonuna kadar
    const fnAralik = []; // [bas, son)
    for (let i = 0; i < L.length; i++) if (KESF_AYRAC.test(L[i])) {
      let son = L.length;
      for (let j = i + 1; j < L.length; j++) if (KESF_CILT.test(L[j]) && L[j].trim().length < 120) { son = j; break; }
      fnAralik.push([i, son]);
    }
    const fnIcinde = i => fnAralik.some(a => i >= a[0] && i < a[1]);
    // Her blok = bir cilt: {n: metin}
    const ciltDip = fnAralik.map(([b, s], ck) => {
      const d = {}; let cur = null;
      for (let i = b + 1; i < s; i++) {
        const m = L[i].match(KESF_DEF);
        const n = m ? +m[1] : 0;
        if (m && (cur === null ? n === 1 : n === cur + 1)) { cur = n; d[cur] = L[i].slice(m[0].length).trim(); }
        else if (m && cur !== null && n === cur + 2) {
          // tek numara kayıp: başlığı bozuk dipnotun metni, aradaki satırlardır (rapora yazılır)
          rapor.dipnotKusur.push(`${ck + 1}. cilt: [${cur + 1}] başlığı kaynakta yok; [${cur}] ile [${n}] arasındaki devam satırları [${cur + 1}] sayıldı`);
          const parca = d[cur].split('\u0001'); d[cur + 1] = (parca[1] || '').trim(); d[cur] = parca[0].trim();
          cur = n; d[cur] = L[i].slice(m[0].length).trim();
        }
        else if (cur !== null && L[i].trim()) {
          if (m && n === cur) rapor.dipnotKusur.push(`${ck + 1}. cilt: [${n}] iki kez var (satır ${i + 1}); ikinci metin birincinin devamı olarak eklendi`);
          // devam satırı: ilk devam satırı bir sonraki (kayıp) numaraya ait olabilir -> ayraç \u0001 ile ilk satırdan sonra ayırt et
          const ilk = d[cur].indexOf('\u0001') < 0;
          d[cur] += (ilk ? '\u0001' : ' ') + L[i].trim();
        }
      }
      Object.keys(d).forEach(k => { d[k] = d[k].replace('\u0001', ' ').trim(); });
      return d;
    });
    // satır -> cilt no (gövde satırı hangi dipnot bloğuna bağlı: kendinden sonraki ilk blok)
    const ciltOf = i => { for (let k = 0; k < fnAralik.length; k++) if (i < fnAralik[k][0]) return k; return fnAralik.length - 1; };

    // 2) Gövde satırları ve sûre başlıkları
    const basliklar = []; let beklenen = 1;
    for (let i = 0; i < L.length; i++) {
      if (fnIcinde(i)) continue;
      const m = L[i].match(KESF_BASLIK);
      if (!m || L[i].length > 70) continue;
      let no = +m[1];
      if (no < beklenen || no > 114) { rapor.uyari.push(`Başlık numarası uyumsuz ("${L[i].trim()}", satır ${i + 1}) → ${beklenen}. sûre sayıldı`); no = beklenen; }
      else if (no > beklenen) for (let q = beklenen; q < no; q++) rapor.eksikSureler.push(q);
      basliklar.push({ i, no, ad: m[3].trim() });
      beklenen = no + 1;
    }
    for (let q = beklenen; q <= 114; q++) rapor.eksikSureler.push(q);

    // 3) Her sûreyi işle
    const sureler = {};
    basliklar.forEach((h, k) => {
      const son = k + 1 < basliklar.length ? basliklar[k + 1].i : L.length;
      const beklenenAyet = ayetSayilari[h.no - 1];
      // satırları sınıfla
      const parcalar = []; // {tip:'isaret',a,e,satirNo,metin} | {tip:'metin',satir,i}
      let sonA = -1, kabul = [];
      for (let i = h.i + 1; i < son; i++) {
        if (fnIcinde(i)) continue;
        const s = L[i];
        if (KESF_CILT.test(s) && s.trim().length < 120) continue; // cilt başlık satırları
        const m = s.match(KESF_ISARET);
        if (m) {
          const lst = m[1].split('-').map(x => +x.trim()); const a = lst[0], e = lst.length > 1 ? Math.max.apply(null, lst) : null;
          if (a > sonA && a <= beklenenAyet) { sonA = e || a; parcalar.push({ tip: 'isaret', a, e, i, ilk: s.slice(m[0].length) }); continue; }
          if (a !== sonA && !(e === null && a === sonA)) rapor.uyari.push(`${h.no}. sûre: sırasız/aşan işaret "${s.slice(0, 20)}" (satır ${i + 1}) metin sayıldı`);
        }
        parcalar.push({ tip: 'metin', s, i });
      }
      // gruplar
      const gruplar = {}; const ac = [];
      const isaretler = parcalar.map((p, ix) => p.tip === 'isaret' ? ix : -1).filter(x => x >= 0);
      const giris = []; // ilk işaretten önceki metin
      const sinirlar = isaretler.concat([parcalar.length]);
      for (let x = 0; x < (isaretler[0] === undefined ? parcalar.length : isaretler[0]); x++) giris.push(parcalar[x]);
      const dipnotEkle = (satirlar, cilt) => {
        const metinS = satirlar.join('\n').replace(/^\n+|\n+$/g, '');
        const nlar = []; metinS.replace(/\[(\d+)\]/g, (_, n) => { if (!nlar.includes(+n)) nlar.push(+n); return _; });
        const dip = ciltDip[cilt] || {};
        const ekler = [];
        nlar.forEach(n => { if (dip[n] !== undefined) ekler.push(`[${n}] ${dip[n]}`); else rapor.dipnotKusur.push(`${h.no}. sûre: [${n}] işaretinin dipnotu yok`); });
        return ekler.length ? metinS + '\n\nDipnotlar:\n' + ekler.join('\n') : metinS;
      };
      let gTefsir0 = giris.map(p => p.s);
      const ayetSayisi = ayetSayilari[h.no - 1];
      isaretler.forEach((ix, q) => {
        const p = parcalar[ix];
        const sonrakiA = q + 1 < isaretler.length ? parcalar[isaretler[q + 1]].a : ayetSayisi + 1;
        const bitis = Math.max(p.e || p.a, sonrakiA - 1);
        const anahtar = []; for (let a = p.a; a <= bitis; a++) anahtar.push(a);
        const govde = [p.ilk]; for (let x = ix + 1; x < sinirlar[q + 1]; x++) govde.push(parcalar[x].s);
        // "Tefsir:" etiketine göre meal/tefsir ayır
        let mealS = [], tefS = [], tefte = false;
        govde.forEach(s => { if (!tefte && /^\s*Tefsir:\s*$/.test(s)) { tefte = true; return; } (tefte ? tefS : mealS).push(s); });
        const cilt = ciltOf(p.i);
        const kayit = { meal: dipnotEkle(mealS, cilt), tefsir: dipnotEkle(p.a === 0 && gTefsir0 ? gTefsir0.concat(tefS) : tefS, cilt) };
        if (p.a === 0) { gTefsir0 = null; gruplar['0'] = kayit; }
        else gruplar[anahtar.join(',')] = kayit;
      });
      if (gTefsir0 && gTefsir0.join('').trim()) gruplar['0'] = { meal: '', tefsir: dipnotEkle(gTefsir0, ciltOf(h.i)) };
      // sayım: kaç âyet kapsandı
      const kapsanan = new Set();
      Object.keys(gruplar).forEach(k => k.split(',').forEach(x => { if (+x > 0) kapsanan.add(+x); }));
      const eksik = []; for (let a = 1; a <= beklenenAyet; a++) if (!kapsanan.has(a)) eksik.push(a);
      sureler[h.no] = { ad: h.ad, gruplar, bulunan: kapsanan.size, beklenen: beklenenAyet, eksikAyet: eksik };
    });
    return { sureler, rapor, _ciltDip: ciltDip };
  }


  /* ---------------- NÂDİRÎ (yalnız hadisler) ---------------- */
  const AR_HARF = /[؀-ۿﭐ-﷿ﹰ-﻿]/g;
  const LAT_HARF = /[A-Za-zÇŞĞÜÖİçşğüöıâîûÂÎÛ]/g;
  const arapca = l => { const a = (l.match(AR_HARF) || []).length; const t = (l.match(LAT_HARF) || []).length; return a >= 3 && a > t; };
  const AR_HARF_VAR = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const KURAN_SATIR = /[﴿﴾]/;
  const NAD_SURE = /^\s*(\d+)\s*-\s*([A-ZÇŞĞÜÖİÂÎÛ'’ \-]+S[UÛ]RES[İI])\s*$/;
  const NAD_AYET_TR = /^(\d+)(?:\s*[-–]\s*(\d+)(?:\.|(?=\s))|\.)\s?/;
  const HADIS_KAYNAK = /(Buhâ?rî|Buharî|Müslim|Müslüm|Tirmizî|Nesâî|Nesaî|Ebû Dâvud|Ebu Davud|İbn-i Mâce|İbn Mâce|Müsned|Taberânî|Beyhakî|Hadis No|Kenz|Râmûz|Hâkim|Dârimî|Muvatta|Câmi’us-Sa[ğg]îr|Sünen|Sahîh|Sahih|Mu’cem|Müstedrek|Ebû Ya’lâ|Ebû Nuaym|Dârekutnî|Askalânî|Heysemî|Mecma’)/;
  const HADIS_GIRIS = /(Resûlullah|Resûl-i Ekrem|Peygamber|Hadis|Hadîs|Sallallâhu aleyhi|Efendimiz|Nebî)/i;
  const HADIS_KOD = /[()][^\n]*?عن\s|\(\s*(خ|م|ت|د|ن|ه|حم|ك|طب|هب|ق)\s|رواه/;

  function nadiriAyristir(metin, ayetSayilari) {
    ayetSayilari = ayetSayilari || AYET_SAYILARI;
    const L = metin.replace(/\r/g, '').split('\n');
    const rapor = { uyari: [], eksikSureler: [], kapsanmayanDipnot: [], belirsizArapca: [], tahminiSinir: [], haricArapca: [], arapcasizHadis: 0, hadisSayisi: 0, dipnotKusur: [] };
    // sûre başlıkları
    const sh = [];
    let beklenen = 1;
    L.forEach((l, i) => { const m = l.match(NAD_SURE); if (m && +m[1] === beklenen) { sh.push({ i, no: +m[1], ad: m[2].trim() }); beklenen++; } });
    for (let q = beklenen; q <= 114; q++) rapor.eksikSureler.push(q);
    const sureler = {};
    sh.forEach((h, k) => {
      const son = k + 1 < sh.length ? sh[k + 1].i : L.length;
      // ayet başlıkları: Arapça ﴿ satırı + sonraki satır "N." / "a-b."
      const bas = []; let sonA = 0;
      for (let i = h.i + 1; i < son; i++) {
        const m = L[i].match(NAD_AYET_TR);
        if (!m) continue;
        const a = +m[1], e = m[2] ? +m[2] : a;
        if (!(a === sonA + 1 && e >= a && e <= ayetSayilari[h.no - 1])) continue;
        let p = i - 1; while (p > h.i && !L[p].trim()) p--;
        if (p <= h.i || !(AR_HARF_VAR.test(L[p]) && (KURAN_SATIR.test(L[p]) || arapca(L[p])))) continue;
        let st = p; // bloğun ilk Arapça satırı
        while (st - 1 > h.i && (AR_HARF_VAR.test(L[st - 1]) && (KURAN_SATIR.test(L[st - 1]) || arapca(L[st - 1])) || !L[st - 1].trim())) st--;
        while (st < p && !L[st].trim()) st++;
        bas.push({ arapca: st, tr: i, a, e }); sonA = e;
      }
      const gruplar = {}; const blokAr = [];
      const dilimler = []; // {a,e,satirlar:[bas,son), ad}
      // 0: sûre girişi (ilk âyet başlığından önce); sonra her âyet bloğu
      const ilkSatir = bas.length ? bas[0].arapca : son;
      dilimler.push({ anahtar: '0', bas: h.i + 1, son: ilkSatir, trSatiri: -1 });
      bas.forEach((b, q) => dilimler.push({ anahtar: Array.from({ length: b.e - b.a + 1 }, (_, x) => b.a + x).join(','), bas: b.tr, son: q + 1 < bas.length ? bas[q + 1].arapca : son, trSatiri: b.tr }));
      let toplamHadis = 0;
      dilimler.forEach(d => {
        // dipnot bölgesi: son "[1] " satırından itibaren
        let fnBas = -1;
        for (let i = d.son - 1; i >= d.bas; i--) if (/^\[1\]\s/.test(L[i])) { fnBas = i; break; }
        const govdeSon = fnBas >= 0 ? fnBas : d.son;
        const dip = {}; let cur = 0;
        if (fnBas >= 0) {
          for (let i = fnBas; i < d.son; i++) {
            const m = L[i].match(/^\[(\d+)\]\s?/); const m2 = !m && cur > 0 && L[i].match(new RegExp('^' + (cur + 1) + '\\s+(?=\\S)'));
            if (m && +m[1] === cur + 1) { cur = +m[1]; dip[cur] = L[i].slice(m[0].length); }
            else if (m2) { rapor.dipnotKusur.push(`${h.no}. sûre ${d.anahtar}: dipnot [${cur + 1}] numarası bozuk ("${L[i].slice(0, 20)}")`); cur++; dip[cur] = L[i].slice(m2[0].length); }
            else if (cur > 0 && L[i].trim()) dip[cur] += ' ' + L[i].trim();
          }
        }
        const kayitlar = [];
        const kullanilan = new Set();
        const hadisKunye = n => dip[n] !== undefined && HADIS_KAYNAK.test(dip[n].slice(0, 90));
        // çeviri toplayıcı: j0'dan başlayıp ilk "hadis kaynaklı dipnot" işaretinde biter; satırın o işaretten sonrası yorum sayılır
        const topla = (j0, azami) => {
          const tr = []; let j = j0;
          while (j < govdeSon && tr.length < azami) {
            const l = L[j];
            if (tr.length && arapca(l) && !KURAN_SATIR.test(l)) break; // başka Arapça blok başladı
            j++;
            const re = /\[(\d+)\]/g; let m, kes = -1;
            while ((m = re.exec(l))) { if (hadisKunye(+m[1])) { kes = m.index + m[0].length; break; } }
            if (kes >= 0) { tr.push(l.slice(0, kes)); return { tr, j, ok: true }; }
            tr.push(l);
          }
          return { tr, j, ok: false };
        };
        // künye bulunamazsa: ″ paritesi çift olan ilk [n] işaretinde (tercihen satır sonunda) biter; sınır TAHMİNİDİR, raporlanır
        const toplaTahmin = (j0, azami) => {
          const tr = []; let j = j0; let sayi = 0; let ilkKes = null;
          while (j < govdeSon && tr.length < azami) {
            const l = L[j];
            if (tr.length && arapca(l) && !KURAN_SATIR.test(l)) break;
            j++;
            const re = /″|\[\d+\]/g; let m, kes = -1, kesSonda = -1;
            while ((m = re.exec(l))) {
              if (m[0] === '″') sayi++;
              else if (sayi % 2 === 0) { if (kes < 0) kes = m.index + m[0].length; if (/^\s*$/.test(l.slice(m.index + m[0].length))) { kesSonda = m.index + m[0].length; break; } }
            }
            if (kesSonda >= 0) { tr.push(l.slice(0, kesSonda)); return { tr, j, ok: true }; }
            if (kes >= 0 && ilkKes === null) ilkKes = { tr: tr.concat([l.slice(0, kes)]), j };
            tr.push(l);
          }
          return ilkKes ? { tr: ilkKes.tr, j: ilkKes.j, ok: true } : { tr, j, ok: false };
        };
        // işaret hiç yoksa: çeviri ″ ile başlıyorsa kapanış tırnağının bulunduğu satırda biter (tahmin)
        const toplaTirnak = (j0, azami) => {
          if (!/^\s*″/.test(L[j0] || '')) return { tr: [], j: j0, ok: false };
          const tr = []; let j = j0, say = 0;
          while (j < govdeSon && tr.length < azami) {
            const l = L[j]; if (tr.length && arapca(l) && !KURAN_SATIR.test(l)) break;
            tr.push(l); j++; say += (l.match(/″/g) || []).length;
            if (say % 2 === 0) return { tr, j, ok: true };
          }
          return { tr: [], j: j0, ok: false };
        };
        const girisSatirlari = (a0) => { // ":" ile biten giriş cümlesi (hard-wrap satırları birleştirilir; metin değişmez, yalnız satır sonları boşluğa döner)
          if (!(a0 > d.bas && /:\s*$/.test(L[a0 - 1]))) return [];
          const par = [L[a0 - 1]]; let x = a0 - 2;
          while (x >= d.bas && par.length < 6 && L[x].trim() && !arapca(L[x]) && !NAD_AYET_TR.test(L[x]) && !/^\[\d+\]/.test(L[x])) { par.unshift(L[x]); x--; }
          let t = par.join(' ');
          const sinir = [...t.matchAll(/(?<!\bHz)(?<!\bb)(?<!\bs)(?<!\bc)(?<!\bNo)(?<!\bAs)[.!?]″?(?:\[\d+\])?\s+(?=[A-ZÇŞĞÜÖİ″(])/g)]; // son cümle başı
          if (sinir.length) { const m = sinir[sinir.length - 1]; t = t.slice(m.index + m[0].length); }
          t = t.replace(/^İzah:\s*/, '').replace(/^″?\s*\[\d+\]\s*/, '').replace(/^″\s*(?=[A-ZÇŞĞÜÖİ])/, '').trim();
          return t ? [t] : [];
        };
        let i = d.trSatiri >= 0 ? d.trSatiri + 1 : d.bas;
        while (i < govdeSon) {
          const l = L[i];
          if (arapca(l) && !KURAN_SATIR.test(l)) {
            let a0 = i, a1 = i;
            while (a1 + 1 < govdeSon && (arapca(L[a1 + 1]) && !KURAN_SATIR.test(L[a1 + 1]) || !L[a1 + 1].trim())) a1++;
            while (!L[a1].trim() && a1 > a0) a1--;
            const girisS = girisSatirlari(a0);
            const kodlu = HADIS_KOD.test(L.slice(a0, a1 + 1).join('\n'));
            const ipucu = HADIS_GIRIS.test(girisS.join(' '));
            let T1 = topla(a1 + 1, 60), tahminiMi = false;
            if (!T1.ok && (kodlu || ipucu)) { T1 = toplaTahmin(a1 + 1, 40); tahminiMi = true; if (!T1.ok) T1 = toplaTirnak(a1 + 1, 30); }
            if (T1.ok) {
              const tr = T1.tr, j = T1.j;
              const nlar = []; tr.join('\n').replace(/\[(\d+)\]/g, (_, n) => { if (!nlar.includes(+n)) nlar.push(+n); return _; });
              const satirlar = girisS.concat([L.slice(a0, a1 + 1).map(x => x.trim()).filter(Boolean).join(' ')], [tr.map(x => x.trim()).filter(Boolean).join(' ')]);
              kayitlar.push({ metin: satirlar.join('\n'), dip: nlar, ilk: a0, son: j - 1, kodlu, tahmin: tahminiMi });
              if (tahminiMi) rapor.tahminiSinir.push(`${h.no}. sûre ${d.anahtar} (satır ${a0 + 1})`);
              nlar.forEach(n => kullanilan.add(n));
              i = j; continue;
            }
            if (kodlu || ipucu) rapor.belirsizArapca.push(`${h.no}. sûre ${d.anahtar}: hadis kodlu Arapça var ama çeviri sınırı bulunamadı (satır ${a0 + 1})`);
            else rapor.haricArapca.push(`${h.no}. sûre ${d.anahtar} (satır ${a0 + 1}): ${L[a0].slice(0, 40)}`);
            i = a1 + 1; continue;
          }
          // Arapçasız: "…:" ile biten satırı ″ ile başlayan satır izliyor
          if (/:\s*$/.test(l) && i + 1 < govdeSon && /^\s*″/.test(L[i + 1])) {
            const T2 = topla(i + 1, 25);
            if (T2.ok) {
              const nlar = []; T2.tr.join('\n').replace(/\[(\d+)\]/g, (_, n) => { if (!nlar.includes(+n)) nlar.push(+n); return _; });
              kayitlar.push({ metin: girisSatirlari(i + 1).concat([T2.tr.map(x => x.trim()).filter(Boolean).join(' ')]).join('\n'), dip: nlar, ilk: i, son: T2.j - 1, arapcasiz: true });
              nlar.forEach(n => kullanilan.add(n)); rapor.arapcasizHadis++;
              i = T2.j; continue;
            }
          }
          i++;
        }
        // kapsanmayan hadis kaynaklı dipnotlar (gövdede işareti olup hiçbir kayda girmeyen)
        Object.keys(dip).forEach(n => { if (HADIS_KAYNAK.test(dip[n]) && !kullanilan.has(+n)) { let x = d.bas; const re = new RegExp('\\[' + n + '\\]'); while (x < govdeSon && !re.test(L[x])) x++; rapor.kapsanmayanDipnot.push(`${h.no}. sûre ${d.anahtar}: [${n}] ${dip[n].slice(0, 60)}`); (rapor._ayrinti = rapor._ayrinti || []).push({ sure: h.no, k: d.anahtar, n, satir: x < govdeSon ? x : -1 }); } });
        if (kayitlar.length) {
          const tefsir = kayitlar.map(k => k.metin + '\n' + k.dip.filter(n => dip[n]).map(n => `[${n}] ${dip[n]}`).join('\n')).join('\n\n');
          const mealS = d.trSatiri >= 0 ? (() => { const t = []; for (let x = d.trSatiri; x < govdeSon; x++) { if (/^İzah:/.test(L[x])) break; t.push(L[x]); } return t.join('\n'); })() : '';
          gruplar[d.anahtar] = { meal: mealS, tefsir };
          toplamHadis += kayitlar.length;
        }
      });
      rapor.hadisSayisi += toplamHadis;
      const kapsanan = new Set(); bas.forEach(b => { for (let a = b.a; a <= b.e; a++) kapsanan.add(a); });
      const eksik = []; for (let a = 1; a <= ayetSayilari[h.no - 1]; a++) if (!kapsanan.has(a)) eksik.push(a);
      sureler[h.no] = { ad: h.ad, gruplar, bulunan: kapsanan.size, beklenen: ayetSayilari[h.no - 1], eksikAyet: eksik, hadis: toplamHadis };
    });
    return { sureler, rapor };
  }

  return { AYET_SAYILARI, nadiriAyristir, kesfAyristir };
});
