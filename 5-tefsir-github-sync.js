// ════════════════════════════════════════
// Her textarea için geçmiş tut
const _undoGecmis = new WeakMap();
const _undoMax = 50;

function _undoKurulum(ta) {
  if (_undoGecmis.has(ta)) return;
  const state = {
    stack: [{ value: ta.value, selStart: 0, selEnd: 0 }],
    idx: 0,
    timer: null
  };
  _undoGecmis.set(ta, state);

  ta.addEventListener('input', () => {
    const s = _undoGecmis.get(ta);
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      // Mevcut pozisyondan sonrasını sil
      s.stack = s.stack.slice(0, s.idx + 1);
      s.stack.push({ value: ta.value, selStart: ta.selectionStart, selEnd: ta.selectionEnd });
      if (s.stack.length > _undoMax) s.stack.shift();
      s.idx = s.stack.length - 1;
    }, 300);
  });

  ta.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      _undoYap(ta);
    }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      _redoYap(ta);
    }
  });
}

function _undoYap(ta) {
  const s = _undoGecmis.get(ta);
  if (!s || s.idx <= 0) return;
  s.idx--;
  const snap = s.stack[s.idx];
  ta.value = snap.value;
  ta.selectionStart = snap.selStart;
  ta.selectionEnd = snap.selEnd;
  ta.style.height = 'auto';
  ta.style.height = Math.max(120, ta.scrollHeight) + 'px';
  // Geri al bildirimi
  _undoBildirim(ta, 'geri');
}

function _redoYap(ta) {
  const s = _undoGecmis.get(ta);
  if (!s || s.idx >= s.stack.length - 1) return;
  s.idx++;
  const snap = s.stack[s.idx];
  ta.value = snap.value;
  ta.selectionStart = snap.selStart;
  ta.selectionEnd = snap.selEnd;
  ta.style.height = 'auto';
  ta.style.height = Math.max(120, ta.scrollHeight) + 'px';
  _undoBildirim(ta, 'ileri');
}

function _undoBildirim(ta, tip) {
  let bildirim = ta.parentElement?.querySelector('.undo-bildirim');
  if (!bildirim) {
    bildirim = document.createElement('div');
    bildirim.className = 'undo-bildirim';
    bildirim.style.cssText = `
      position:absolute;top:-32px;left:50%;transform:translateX(-50%);
      background:var(--ink);color:var(--gold2);
      padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;
      pointer-events:none;transition:opacity 0.3s;white-space:nowrap;z-index:10;
    `;
    if (ta.parentElement) { ta.parentElement.style.position = 'relative'; ta.parentElement.appendChild(bildirim); }
  }
  bildirim.textContent = tip === 'geri' ? '↩ Geri alındı' : '↪ Yeniden yapıldı';
  bildirim.style.opacity = '1';
  clearTimeout(bildirim._t);
  bildirim._t = setTimeout(() => { bildirim.style.opacity = '0'; }, 1200);
}

// ════════════════════════════════════════
//  ÂLİM TEFSİRLERİ (ayrı sekme, sınırsız alim, ayet grubu bazlı)
//  Kaynak listesi: localStorage 'alim_tefsir_kaynaklari2' = [{alim, sureNo, url}]
//  Metin: localStorage 'alim_tefsir2_ALIM_SURENO' = { "1": "tefsir metni", "3,4": "...", ... }
// ════════════════════════════════════════

function _alimTefsirKaynaklariGetir() {
  try { return JSON.parse(localStorage.getItem('alim_tefsir_kaynaklari2') || '[]'); } catch(e) { return []; }
}
function _alimTefsirKaynaklariKaydet(arr) {
  localStorage.setItem('alim_tefsir_kaynaklari2', JSON.stringify(arr));
}
function _alimTefsirListesiGetir() {
  const kaynaklar = _alimTefsirKaynaklariGetir();
  const isimler = [...new Set(kaynaklar.map(k => k.alim).filter(Boolean))];
  // Notlar sisteminden (an_SURE_AYET) gelen "isim"leri de otomatik alim listesine ekle
  const notIsimleri = _notlardanAlimIsimleriGetir();
  const hepsi = [...new Set([...isimler, ...notIsimleri])];
  return hepsi.sort((a,b) => a.localeCompare(b, 'tr'));
}

// ════════════════════════════════════════
//  NOTLAR SİSTEMİNDEN OTOMATİK ALIM TÜRETME (senkron)
//  Notlar formatı: localStorage 'an_SURE_AYET' = [{isim, icerik, tarih}, ...]
//  Bu fonksiyonlar o veriyi okuyup Tefsir sekmesinde gösterir — kopyalamaz, aynı kaynağı okur.
// ════════════════════════════════════════

// localStorage'daki TÜM "an_" anahtarlarını tarayıp kullanılan "isim" etiketlerini toplar
// (Nüzul Sebebi, Tefsir, İslamoğlu gibi kullanıcı tanımlı adlar dahil)
function _notlardanAlimIsimleriGetir() {
  const isimler = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('an_')) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.forEach(n => { if (n.isim) isimler.add(n.isim); });
    } catch(e) {}
  }
  return [...isimler];
}

// Belirli bir alim adı + sure numarası için, Notlar sisteminden (an_SURE_AYET) tüm ayetleri toplar.
// Dönen format: { "1": "metin", "2": "metin", ... } — grupsuz, her ayet ayrı (kaynağı zaten öyle).
function _notlardanSureVerisiGetir(alim, sureNo) {
  const sonuc = {};
  // Sure kaç ayetli, SURELER dizisinden öğren (varsa), yoksa 300'e kadar tara (güvenli üst sınır)
  let ayetSayisi = 300;
  if (typeof SURELER !== 'undefined' && SURELER[sureNo-1] && SURELER[sureNo-1].ayet) {
    ayetSayisi = SURELER[sureNo-1].ayet;
  }
  for (let a = 1; a <= ayetSayisi; a++) {
    const key = 'an_' + sureNo + '_' + a;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const arr = JSON.parse(raw);
      const not = arr.find(n => n.isim === alim);
      if (not && not.icerik) sonuc[a] = not.icerik;
    } catch(e) {}
  }
  return sonuc;
}

// Bir alim adının kaynağı "GitHub kaynağı" mı yoksa "Notlar (senkron)" mu olduğunu ayırt eder
function _alimKaynagiTuru(alim) {
  const githubKaynaklari = _alimTefsirKaynaklariGetir();
  const githubdaVarMi = githubKaynaklari.some(k => k.alim === alim);
  return githubdaVarMi ? 'github' : 'notlar';
}

function _alimTefsirAnahtari(alim, sureNo) {
  return 'alim_tefsir2_' + alim.replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]/g,'_') + '_' + sureNo;
}

// Format: "1. metin..." veya "3,4. metin..." — sonraki ayet numarasına kadar biriktirir.
function _alimTefsirParseEt(metin) {
  const satirlar = metin.split('\n').map(s => s.trim());
  const sonuc = {};

  let mevcutGrupAyetler = [];   // bu grubun ayet numaraları
  let mevcutMealSatirlari = []; // "N. metin" satırları (meal)
  let mevcutTefsirSatirlari = []; // ayet numarasız satırlar (tefsir)
  let tefsirBasladiMi = false;

  function grubuKaydet() {
    if (mevcutGrupAyetler.length > 0) {
      const key = mevcutGrupAyetler.join(',');
      sonuc[key] = {
        meal: mevcutMealSatirlari.join('\n').trim(),
        tefsir: mevcutTefsirSatirlari.join('\n').trim()
      };
    }
  }

  for (let i = 0; i < satirlar.length; i++) {
    const satir = satirlar[i];
    if (!satir) continue; // boş satırları atla

    // Ayet numarası satırı mı? "N. metin" formatı (satır BAŞINDA numara + nokta + boşluk)
    const ayetMatch = satir.match(/^(\d+)\.\s+(.*)$/);

    if (ayetMatch) {
      // Daha önce tefsir birikmeye başlamışsa, bu yeni ayet numarası => YENİ GRUP başlıyor demektir.
      if (tefsirBasladiMi) {
        grubuKaydet();
        mevcutGrupAyetler = [];
        mevcutMealSatirlari = [];
        mevcutTefsirSatirlari = [];
        tefsirBasladiMi = false;
      }
      mevcutGrupAyetler.push(parseInt(ayetMatch[1]));
      mevcutMealSatirlari.push(satir);
    } else {
      // Ayet numarasıyla başlamayan satır = tefsir metninin parçası
      if (mevcutGrupAyetler.length > 0) {
        tefsirBasladiMi = true;
        mevcutTefsirSatirlari.push(satir);
      }
      // Henüz hiç ayet toplanmadıysa (dosya başındaki başlık gibi satırlar), yok say
    }
  }
  // Son grubu da kaydet
  grubuKaydet();

  return sonuc;
}

// Bir alim adının Notlar sisteminde hangi surelerde kaydı var, onu bulur
function _notlardanAlimSureleriGetir(alim) {
  const sureler = new Set();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('an_')) continue;
    const parcalar = key.split('_'); // an_SURE_AYET
    if (parcalar.length !== 3) continue;
    const sureNo = parseInt(parcalar[1]);
    if (isNaN(sureNo)) continue;
    try {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (arr.some(n => n.isim === alim)) sureler.add(sureNo);
    } catch(e) {}
  }
  return [...sureler];
}


function _alimTefsirYukle(alim, sureNo, metin) {
  const parsed = _alimTefsirParseEt(metin);
  _bellekCache.tefsir[_alimTefsirAnahtari(alim, sureNo)] = parsed;
  return Object.keys(parsed).length;
}

// ════════════════════════════════════════
//  ÇOKLU SURE (CİLT) AYRIŞTIRMA
//  Tek bir dosyada birden fazla sure varsa (ör: bir kitabın cildi), sure başlıklarından
//  ("N- SURE ADI SÜRESİ" veya "N. SURE ADI SÜRESİ") otomatik ayırıp her birini kaydeder.
//  Sure ADINA hiç bakılmaz, SADECE başlıktaki NUMARA baz alınır — böylece OCR/yazım farkı sorun olmaz.
// ════════════════════════════════════════
function _alimTefsirCoklaAyir(metin) {
  const satirlar = metin.split('\n');
  // 1. adım: "SÜRESİ" / "Sûresi" geçen satırları bul (büyük/küçük harf ve û/ü farkı önemsiz)
  const suresiSatirRegex = /S[UÜÛ]RES[İI]/i;
  // Sayı satırı: sadece "5-" veya "5." gibi kısa bir satır (başka metin içermeyen)
  const sadeceSayiRegex = /^(\d{1,3})[\-\.]?\s*$/;
  // Aynı satırda hem sayı hem SÜRESİ: "5- MÂİDE SÜRESİ" veya "114- Nâs Sûresi Tefsiri"
  const sayiVeSuresiAyniSatir = /^(\d{1,3})[\-\.]\s*[A-ZÂÎÛÜÇĞİÖŞa-zâîûüçğıöş'\- ]*S[UÜÛ]RES[İI]/i;

  const sureSinirlari = []; // {sureNo, satirIndex}
  for (let i = 0; i < satirlar.length; i++) {
    const satir = satirlar[i].trim();
    if (!suresiSatirRegex.test(satir)) continue;

    let sureNo = null;

    // Önce aynı satırda sayı var mı bak (en güvenilir durum)
    const ayniSatirM = satir.match(sayiVeSuresiAyniSatir);
    if (ayniSatirM) {
      sureNo = parseInt(ayniSatirM[1]);
    } else {
      // Yoksa yakın komşu satırlarda (±3 satır) yalnız başına duran bir sayı ara
      for (let d = 1; d <= 3 && sureNo === null; d++) {
        [i - d, i + d].forEach(j => {
          if (sureNo !== null) return;
          if (j < 0 || j >= satirlar.length) return;
          const komsu = satirlar[j].trim();
          const km = komsu.match(sadeceSayiRegex);
          if (km) sureNo = parseInt(km[1]);
        });
      }
    }

    if (sureNo === null || sureNo < 1 || sureNo > 114) continue; // güvenli aralık dışında ise atla

    // Aynı sure numarasının tekrar eden başlığını (bazı kitaplarda başlık 2 kez geçer) atla
    if (sureSinirlari.length === 0 || sureSinirlari[sureSinirlari.length-1].sureNo !== sureNo) {
      sureSinirlari.push({ sureNo, satirIndex: i });
    }
  }

  const parcalar = []; // {sureNo, metin}
  for (let i = 0; i < sureSinirlari.length; i++) {
    const baslangic = sureSinirlari[i].satirIndex;
    const bitis = (i+1 < sureSinirlari.length) ? sureSinirlari[i+1].satirIndex : satirlar.length;
    const sureMetni = satirlar.slice(baslangic, bitis).join('\n');
    parcalar.push({ sureNo: sureSinirlari[i].sureNo, metin: sureMetni });
  }

  return parcalar;
}

// Çoklu sureli dosyayı yükler: her sureyi ayırıp kaydeder. Dönen: [{sureNo, ayetSayisi}]
function _alimTefsirCokluYukle(alim, metin) {
  const parcalar = _alimTefsirCoklaAyir(metin);
  const sonuclar = [];
  parcalar.forEach(p => {
    const sayi = _alimTefsirYukle(alim, p.sureNo, p.metin);
    if (sayi > 0) sonuclar.push({ sureNo: p.sureNo, ayetSayisi: sayi });
  });
  return sonuclar;
}

function _alimTefsirMetniGetir2(alim, sureNo) {
  const tur = _alimKaynagiTuru(alim);
  if (tur === 'notlar') {
    // Notlar sisteminden oku — her ayet ayrı (grupsuz), format: {"1": "metin", "2": "metin"}
    return _notlardanSureVerisiGetir(alim, sureNo);
  }
  return _bellekCache.tefsir[_alimTefsirAnahtari(alim, sureNo)] || {};
}

// ── UI durumu ──
let _tefsirlerSecimi2 = { alim: null, sureNo: null, grup: null };

function tefsirlerEkraniRender() {
  const ic = document.getElementById('tefsirler-ic');
  const alimler = _alimTefsirListesiGetir();

  let html = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
    <div style="font-family:'Playfair Display',serif;font-size:19px;font-weight:700;color:var(--ink);">📚 Tefsir</div>
    <button onclick="alimTefsirKaynaklariAc()" style="padding:8px 12px;border:1px solid var(--border);border-radius:9px;background:none;font-family:'Source Serif 4',serif;font-size:12px;color:var(--muted);cursor:pointer;">⚙️ Kaynak Ekle</button>
  </div>`;

  if (window._kaynaklarYukleniyor) {
    html += `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-family:'Source Serif 4',serif;font-size:14px;line-height:1.7;">
      <div class="spin" style="margin:0 auto 12px;"></div>
      Kaynaklar GitHub'dan yükleniyor, lütfen bekleyin…
    </div>`;
    ic.innerHTML = html;
    return;
  }

  if (alimler.length === 0) {
    html += `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-family:'Source Serif 4',serif;font-size:14px;line-height:1.7;">
      Henüz bir tefsir kaynağı eklenmedi.<br>
      Yukarıdaki <b>⚙️ Kaynak Ekle</b> butonuyla istediğiniz kadar âlim ve sure ekleyebilirsiniz.
    </div>`;
    ic.innerHTML = html;
    return;
  }

  // 1) Alim seçim çipleri
  html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">`;
  alimler.forEach(a => {
    const aktif = _tefsirlerSecimi2.alim === a;
    const tur = _alimKaynagiTuru(a);
    const ikon = tur === 'notlar' ? '🔗 ' : '';
    html += `<button onclick="_alimTefsirSec('${a.replace(/'/g,"\\'")}')" style="padding:8px 14px;border-radius:20px;border:1px solid ${aktif?'var(--ink)':'var(--border)'};background:${aktif?'var(--ink)':'none'};color:${aktif?'var(--gold2)':'var(--ink)'};font-family:'Source Serif 4',serif;font-size:13px;font-weight:600;cursor:pointer;">${ikon}${a}</button>`;
  });
  html += `</div>`;

  // 2) Sure seçimi
  if (_tefsirlerSecimi2.alim) {
    const tur = _alimKaynagiTuru(_tefsirlerSecimi2.alim);
    let sureNolari = [];
    if (tur === 'notlar') {
      sureNolari = _notlardanAlimSureleriGetir(_tefsirlerSecimi2.alim);
    } else {
      // Bellek cache'inde bu alim için gerçekten yüklenmiş sureleri bul
      // (çoklu-sure/cilt modunda kaynak listesinde sureNo boş olabilir, bu yüzden cache'e bakılır)
      const alimAnahtarOnEki = 'alim_tefsir2_' + _tefsirlerSecimi2.alim.replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]/g,'_') + '_';
      Object.keys(_bellekCache.tefsir).forEach(anahtar => {
        if (anahtar.startsWith(alimAnahtarOnEki)) {
          const sNo = parseInt(anahtar.substring(alimAnahtarOnEki.length));
          if (!isNaN(sNo)) sureNolari.push(sNo);
        }
      });
    }
    html += `<div style="margin-bottom:16px;">
      <select onchange="_alimTefsirSureSec(this.value)" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:14px;color:var(--ink);">
        <option value="">— Sure seçin —</option>`;
    sureNolari.sort((a,b) => a - b).forEach(sNo => {
      const sureIsim = (typeof SURELER !== 'undefined' && SURELER[sNo-1]) ? SURELER[sNo-1].isim : ('Sure ' + sNo);
      const secili = _tefsirlerSecimi2.sureNo == sNo ? 'selected' : '';
      html += `<option value="${sNo}" ${secili}>${sNo}. ${sureIsim}</option>`;
    });
    html += `</select></div>`;
  }

  // 3) Ayet grupları listesi (tıklanınca açılır/kapanır)
  if (_tefsirlerSecimi2.alim && _tefsirlerSecimi2.sureNo) {
    const veri = _alimTefsirMetniGetir2(_tefsirlerSecimi2.alim, _tefsirlerSecimi2.sureNo);
    const gruplar = Object.keys(veri).sort((a,b) => {
      const ilkA = parseInt(a.split(',')[0]);
      const ilkB = parseInt(b.split(',')[0]);
      return ilkA - ilkB;
    });

    if (gruplar.length === 0) {
      html += `<div style="text-align:center;padding:30px 20px;color:var(--muted);font-family:'Source Serif 4',serif;font-size:14px;">Bu sure için tefsir henüz yüklenmedi.</div>`;
    } else {
      html += `<div style="border:1px solid var(--border);border-radius:14px;overflow:hidden;">`;
      gruplar.forEach((grup, i) => {
        const acik = _tefsirlerSecimi2.grup === grup;
        const parcalar = grup.split(',');
        const grupEtiketi = parcalar.length > 1 ? (parcalar[0] + '-' + parcalar[parcalar.length-1]) : parcalar[0];
        const veriGrup = veri[grup];
        // Geriye dönük uyumluluk: eski format düz string olabilir
        const mealMetni = (typeof veriGrup === 'object' && veriGrup !== null) ? veriGrup.meal : veriGrup;
        const tefsirMetni = (typeof veriGrup === 'object' && veriGrup !== null) ? veriGrup.tefsir : '';

        html += `<div style="border-bottom:${i < gruplar.length-1 ? '1px solid var(--border)' : 'none'};">
          <button onclick="_alimTefsirGrupToggle('${grup}')" style="width:100%;text-align:left;padding:12px 14px;background:${acik?'var(--paper2)':'var(--paper)'};border:none;font-family:'Source Serif 4',serif;font-size:14px;font-weight:700;color:var(--gold);cursor:pointer;display:flex;justify-content:space-between;align-items:center;">
            <span>${grupEtiketi}. âyet${parcalar.length > 1 ? 'ler' : ''}</span>
            <span style="font-size:12px;color:var(--muted);">${acik ? '▲' : '▼'}</span>
          </button>`;
        if (acik) {
          html += `<div style="padding:18px 16px;background:var(--paper2);">`;

          // Arapça (özel yüklenmiş varsa) — ayet grubundaki her ayetin arapçasını birleştir
          const ozelAr = _ozelArapcaGetir(_tefsirlerSecimi2.sureNo);

          if (ozelAr && ozelAr.length > 0) {
            const arParcalari = parcalar
              .map(no => {
                const bulunan = ozelAr.find(x => x.verse === parseInt(no));
                if (!bulunan) return null;
                let arMetin = _escapeHtml2(bulunan.arabic);
                arMetin = arMetin.replace(/(اللّٰه|اللَّه|الله)/g, '<span style="color:#b32020;">$1</span>');
                const arRakam = String(no).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
                return arMetin + ' <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#2f7d4f;color:#fff;font-family:\'Source Serif 4\',serif;font-size:12px;font-weight:700;margin:0 4px;vertical-align:middle;">' + arRakam + '</span>';
              })
              .filter(Boolean);
            if (arParcalari.length > 0) {
              html += `<div dir="rtl" style="font-family:'Amiri','Traditional Arabic',serif;font-size:24px;line-height:2.3;color:#1a1a1a;text-align:center;margin-bottom:18px;">${arParcalari.join(' ')}</div>`;
            }
          }

          if (mealMetni) {
            const mealHtml = _escapeHtml2(mealMetni).replace(/^(\d+)\.\s/gm, '<span style="color:var(--gold);font-weight:600;">$1.</span> ');
            html += `<div style="font-family:'Source Serif 4',serif;font-size:17px;font-weight:400;line-height:1.85;color:var(--ink);white-space:pre-wrap;letter-spacing:0.1px;">${mealHtml}</div>`;
          }
          if (tefsirMetni) {
            html += `<div style="border-top:1px solid var(--gold);opacity:0.35;margin:18px 0;"></div>`;
            const paragraflar = tefsirMetni.split(/\n+/).filter(p => p.trim());
            const tefsirHtml = paragraflar.map(p => {
              let pEsc = _escapeHtml2(p.trim());
              pEsc = pEsc.replace(/(\([^)]+\))/g, '<span style="color:var(--gold);font-weight:600;font-style:normal;">$1</span>');
              return '<p style="margin:0 0 16px 0;">' + pEsc + '</p>';
            }).join('');
            html += `<div style="font-family:'Source Serif 4',serif;font-size:14.5px;line-height:2;color:var(--muted);">${tefsirHtml}</div>`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }
  }

  ic.innerHTML = html;
}

function _escapeHtml2(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _alimTefsirSec(alim) {
  _tefsirlerSecimi2.alim = alim;
  _tefsirlerSecimi2.sureNo = null;
  _tefsirlerSecimi2.grup = null;
  tefsirlerEkraniRender();
}
function _alimTefsirSureSec(sureNo) {
  _tefsirlerSecimi2.sureNo = sureNo ? parseInt(sureNo) : null;
  _tefsirlerSecimi2.grup = null;
  tefsirlerEkraniRender();
}
function _alimTefsirGrupToggle(grup) {
  _tefsirlerSecimi2.grup = (_tefsirlerSecimi2.grup === grup) ? null : grup;
  tefsirlerEkraniRender();
}

// ════════════════════════════════════════
//  GITHUB TOKEN YÖNETİMİ (sadece bu telefonda, localStorage'da saklanır)
// ════════════════════════════════════════

function githubTokenAyarlariAc() {
  document.getElementById('github-token-modal').style.display = 'flex';
  document.getElementById('github-token-overlay').style.display = 'block';
  const mevcutToken = localStorage.getItem('github_pat') || '';
  const mevcutRepo = localStorage.getItem('github_repo') || '';
  document.getElementById('github-token-input').value = mevcutToken;
  document.getElementById('github-repo-input').value = mevcutRepo;
}

function githubTokenAyarlariKapat() {
  document.getElementById('github-token-modal').style.display = 'none';
  document.getElementById('github-token-overlay').style.display = 'none';
}

function githubTokenKaydet() {
  const token = document.getElementById('github-token-input').value.trim();
  const repo = document.getElementById('github-repo-input').value.trim();
  if (!token || !repo) { alert('Token ve repo adı gerekli.'); return; }
  localStorage.setItem('github_pat', token);
  localStorage.setItem('github_repo', repo);
  githubTokenAyarlariKapat();
  alert('✅ GitHub bağlantı bilgileri kaydedildi.');
}

function _githubHazirMi() {
  return !!(localStorage.getItem('github_pat') && localStorage.getItem('github_repo'));
}

// GitHub'daki bir dosyayı günceller (PUT /repos/{repo}/contents/{path})
// networkDeneme: iç kullanım, "Failed to fetch" gibi geçici ağ hatalarında 1 kez otomatik tekrar dener
async function _githubDosyaGuncelle(dosyaYolu, yeniIcerik, commitMesaji, _tekrarMi) {
  const token = localStorage.getItem('github_pat');
  const repo = localStorage.getItem('github_repo');
  if (!token || !repo) throw new Error('GitHub token/repo ayarlanmamış. Daha → GitHub Token Ayarla.');

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${dosyaYolu}`;

  let getResp;
  try {
    // Önce mevcut dosyanın SHA'sını al (güncelleme için gerekli)
    getResp = await fetch(apiUrl, {
      headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json' }
    });
  } catch(networkErr) {
    // "Failed to fetch" gibi geçici ağ hatası — bir kez daha dene (mobil veri/GitHub gecikmesi olabilir)
    if (!_tekrarMi) {
      await new Promise(res => setTimeout(res, 1500));
      return _githubDosyaGuncelle(dosyaYolu, yeniIcerik, commitMesaji, true);
    }
    throw new Error('İnternet bağlantısı kurulamadı (ağ hatası). Bağlantınızı kontrol edip tekrar deneyin.');
  }

  if (!getResp.ok) throw new Error('Dosya bilgisi alınamadı (' + getResp.status + '). Dosya yolu doğru mu?');
  const getData = await getResp.json();
  const sha = getData.sha;

  // İçeriği UTF-8 -> Base64'e çevir (Türkçe karakterler için TextEncoder kullan)
  const utf8Bytes = new TextEncoder().encode(yeniIcerik);
  let binaryStr = '';
  utf8Bytes.forEach(b => binaryStr += String.fromCharCode(b));
  const base64Icerik = btoa(binaryStr);

  let putResp;
  try {
    putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMesaji || 'Tefsir güncellendi',
        content: base64Icerik,
        sha: sha
      })
    });
  } catch(networkErr) {
    if (!_tekrarMi) {
      await new Promise(res => setTimeout(res, 1500));
      return _githubDosyaGuncelle(dosyaYolu, yeniIcerik, commitMesaji, true);
    }
    throw new Error('İnternet bağlantısı kurulamadı (ağ hatası). Bağlantınızı kontrol edip tekrar deneyin.');
  }

  if (!putResp.ok) {
    const errData = await putResp.json().catch(() => ({}));
    throw new Error('GitHub güncelleme hatası (' + putResp.status + '): ' + (errData.message || 'bilinmeyen hata'));
  }
  return await putResp.json();
}

// ════════════════════════════════════════
//  BEKLEYEN GITHUB YAZMALARI (yazma başarısız olursa değişiklik kaybolmasın diye)
// ════════════════════════════════════════
function _bekleyenGithubYazmalariGetir() {
  try { return JSON.parse(localStorage.getItem('tefsir_bekleyen_github_yazma') || '{}'); } catch(e) { return {}; }
}
function _bekleyenGithubYazmalariKaydet(obj) {
  localStorage.setItem('tefsir_bekleyen_github_yazma', JSON.stringify(obj));
}

// Uygulama açılışında (veya istenildiğinde) bekleyen, daha önce GitHub'a yazılamamış
// sûre notlarını tekrar göndermeyi dener. Başarılı olanları kuyruktan siler.
async function _bekleyenGithubYazmalariniDene() {
  const bekleyenler = _bekleyenGithubYazmalariGetir();
  const sureNolar = Object.keys(bekleyenler);
  if (sureNolar.length === 0) return;

  // ÖNEMLİ: Push başarılı olsun olmasın, kendi cihazınızdaki en son değişikliği HER ZAMAN
  // önce belleğe (ekrana) uygula — böylece internetiniz olmasa bile kendi düzenlemenizi görürsünüz,
  // GitHub'dan gelen (henüz güncellenmemiş) eski metin sizin değişikliğinizin üzerine yazmaz.
  for (const sureNo of sureNolar) {
    if (typeof _githubTefsirYukle === 'function') _githubTefsirYukle(sureNo, bekleyenler[sureNo]);
  }

  if (!_githubHazirMi()) return;

  for (const sureNo of sureNolar) {
    try {
      await _githubDosyaGuncelle(sureNo + '.txt', bekleyenler[sureNo], 'Notlar güncellendi (gecikmeli senkron): Sure ' + sureNo);
      delete bekleyenler[sureNo];
      _bekleyenGithubYazmalariKaydet(bekleyenler);
      console.log('✅ Bekleyen senkron başarılı: Sure ' + sureNo);
    } catch(e) {
      console.warn('Bekleyen senkron yine başarısız: Sure ' + sureNo, e.message);
      // Kuyrukta kalmaya devam eder, bir sonraki açılışta tekrar denenecek
    }
  }
}

// ════════════════════════════════════════
//  NOTLAR → GITHUB SENKRON
//  Bir ayet notu düzenlendiğinde, o surenin TÜM ayet notlarını "1-)" formatında
//  birleştirip https://raw.githubusercontent.com/{repo}/main/{sureNo}.txt dosyasına yazar.
// ════════════════════════════════════════

// Sabit taban URL — sen tüm sureleri buraya 1.txt, 2.txt ... 114.txt olarak yüklüyorsun
const NOTLAR_GITHUB_TABAN_URL = 'https://raw.githubusercontent.com/muhammedharman-sudo/tefsir-data/main/';

async function _notlarGithubSenkronla(sureNo) {
  if (!_githubHazirMi()) return; // Token ayarlı değilse sessizce çık, sadece telefonda kalır

  try {
    // Sureye ait TÜM ayetlerin notlarını topla (en fazla 300 ayet üst sınırı güvenli)
    let ayetSayisi = 300;
    if (typeof SURELER !== 'undefined' && SURELER[sureNo-1] && SURELER[sureNo-1].ayet) {
      ayetSayisi = SURELER[sureNo-1].ayet;
    }

    const parcalar = [];
    for (let a = 1; a <= ayetSayisi; a++) {
      const arr = ayetNotlariniGetir(sureNo, a);
      if (!arr || arr.length === 0) continue;
      // Bu ayette birden fazla klasör (not) olabilir; hepsini alt alta ekle
      arr.forEach(n => {
        if (n.icerik && n.icerik.trim()) {
          parcalar.push(a + '-) ' + n.icerik.trim());
        }
      });
    }

    if (parcalar.length === 0) return; // Yazacak bir şey yok

    const tamMetin = parcalar.join('\n\n');
    const dosyaYolu = sureNo + '.txt';

    await _githubDosyaGuncelle(dosyaYolu, tamMetin, 'Notlar güncellendi: Sure ' + sureNo);
    // Başarılı — eğer bu sure daha önce kuyrukta bekliyorduysa temizle
    const bekleyenler = _bekleyenGithubYazmalariGetir();
    if (bekleyenler[sureNo]) { delete bekleyenler[sureNo]; _bekleyenGithubYazmalariKaydet(bekleyenler); }
    _notlarGithubDurumGoster('✅ Sure ' + sureNo + ' GitHub\'a kaydedildi.');
  } catch(e) {
    // Yazılamadı — değişikliğiniz KAYBOLMASIN diye cihazda bekleyen kuyruğa alınıyor.
    // Bir sonraki uygulama açılışında (veya internet gelince) otomatik tekrar denenecek.
    try {
      const parcalarYedek = [];
      let ayetSayisiYedek = 300;
      if (typeof SURELER !== 'undefined' && SURELER[sureNo-1] && SURELER[sureNo-1].ayet) {
        ayetSayisiYedek = SURELER[sureNo-1].ayet;
      }
      for (let a = 1; a <= ayetSayisiYedek; a++) {
        const arr = ayetNotlariniGetir(sureNo, a);
        if (!arr || arr.length === 0) continue;
        arr.forEach(n => { if (n.icerik && n.icerik.trim()) parcalarYedek.push(a + '-) ' + n.icerik.trim()); });
      }
      if (parcalarYedek.length > 0) {
        const bekleyenler = _bekleyenGithubYazmalariGetir();
        bekleyenler[sureNo] = parcalarYedek.join('\n\n');
        _bekleyenGithubYazmalariKaydet(bekleyenler);
      }
    } catch(e2) { /* yedekleme de başarısız olursa sessiz geç */ }
    _notlarGithubDurumGoster('⚠️ GitHub\'a yazılamadı, değişiklik cihazda bekletiliyor (bağlantı gelince otomatik denenecek): ' + e.message, true);
  }
}

// ════════════════════════════════════════
//  BELLEK TABANLI TEFSİR (GitHub kaynaklı, localStorage'a hiç yazılmaz)
//  window._bellekTefsirVerisi = { sureNo: { ayetNo: "icerik metni" } }
//  window._bellekTefsirKaynaklar = { sureNo: true } -> bu sure GitHub'dan mı geldi işareti
// ════════════════════════════════════════

function _bellekTefsirKaynakliMi(sureNo) {
  return !!(window._bellekTefsirKaynaklar && window._bellekTefsirKaynaklar[sureNo]);
}

function _bellekTefsirAyetKaydet(sureNo, ayetNo, icerik) {
  if (!window._bellekTefsirVerisi) window._bellekTefsirVerisi = {};
  if (!window._bellekTefsirVerisi[sureNo]) window._bellekTefsirVerisi[sureNo] = {};
  window._bellekTefsirVerisi[sureNo][ayetNo] = icerik;
}

// GitHub'dan bir surenin TÜM ayet notlarını çekip belleğe (RAM) yükler — localStorage'a YAZMAZ
async function _bellekTefsirSureCek(sureNo) {
  const NOTLAR_GITHUB_TABAN_URL_YEREL = (typeof NOTLAR_GITHUB_TABAN_URL !== 'undefined')
    ? NOTLAR_GITHUB_TABAN_URL
    : 'https://raw.githubusercontent.com/muhammedharman-sudo/tefsir-data/main/';

  try {
    const url = NOTLAR_GITHUB_TABAN_URL_YEREL + sureNo + '.txt';
    const r = await fetch(url);
    if (!r.ok) return false;
    const metin = await r.text();

    // "1-)" formatını parse et
    const regex = /(\d+)-\)([\s\S]*?)(?=\d+-\)|$)/g;
    let match;
    const veri = {};
    let sayi = 0;
    while ((match = regex.exec(metin)) !== null) {
      const ayetNo = parseInt(match[1]);
      const icerik = match[2].trim();
      if (!icerik) continue;
      veri[ayetNo] = icerik;
      sayi++;
    }

    if (sayi === 0) return false;

    if (!window._bellekTefsirVerisi) window._bellekTefsirVerisi = {};
    if (!window._bellekTefsirKaynaklar) window._bellekTefsirKaynaklar = {};
    window._bellekTefsirVerisi[sureNo] = veri;
    window._bellekTefsirKaynaklar[sureNo] = true;
    return true;
  } catch(e) {
    console.warn('Bellek tefsir çekme hatası (Sure ' + sureNo + '):', e);
    return false;
  }
}

// Bir sure ekranı açıldığında (ayetler görüntülenmeye başladığında) çağrılır.
// Sure daha önce çekilmemişse GitHub'dan çeker, sonra ekranı tazeler.
let _bellekTefsirCekiliyor = {}; // eşzamanlı tekrar istek atmayı önler
async function _bellekTefsirSureHazirla(sureNo, tazelemeCB) {
  if (_bellekTefsirKaynakliMi(sureNo)) return; // zaten bellekte var
  if (_bellekTefsirCekiliyor[sureNo]) return; // zaten çekiliyor
  _bellekTefsirCekiliyor[sureNo] = true;
  const basarili = await _bellekTefsirSureCek(sureNo);
  _bellekTefsirCekiliyor[sureNo] = false;
  if (basarili && typeof tazelemeCB === 'function') tazelemeCB();
}

// Ekranın altında geçici bir bildirim gösterir (alert kullanmaz, akışı kesmez)
function _notlarGithubDurumGoster(mesaj, hataMi) {
  let el = document.getElementById('github-sync-bildirim');
  if (!el) {
    el = document.createElement('div');
    el.id = 'github-sync-bildirim';
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;padding:10px 18px;border-radius:20px;font-family:sans-serif;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,0.2);transition:opacity 0.3s;max-width:90vw;text-align:center;';
    document.body.appendChild(el);
  }
  el.style.background = hataMi ? '#f8d7da' : '#d4edda';
  el.style.color = hataMi ? '#721c24' : '#155724';
  el.textContent = mesaj;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, hataMi ? 5000 : 2500);
}



function alimTefsirKaynaklariAc() {
  // Modal yoksa oluştur
  if (!document.getElementById('alim-tefsir-kaynaklar-modal')) {
    const overlay = document.createElement('div');
    overlay.id = 'alim-tefsir-kaynaklar-overlay';
    overlay.onclick = alimTefsirKaynaklariKapat;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.5);';

    const modal = document.createElement('div');
    modal.id = 'alim-tefsir-kaynaklar-modal';
    modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:1101;background:var(--paper);border:1px solid var(--border);border-radius:16px;box-shadow:0 8px 32px var(--shadow);padding:0;width:min(94vw,420px);max-height:80vh;overflow:hidden;display:flex;flex-direction:column;';
    modal.innerHTML = `
      <div style="padding:16px 18px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
        <div style="font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:var(--ink);">📚 Tefsir Kaynakları</div>
        <button onclick="alimTefsirKaynaklariKapat()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted);padding:2px 6px;">✕</button>
      </div>
      <div style="padding:14px 18px;overflow-y:auto;flex:1;">
        <div style="font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.6;">Âlim adı, sure numarası ve GitHub <b>raw URL</b>'sini girin. Format: "1. metin" veya "3,4. metin" şeklinde ayet grubu başlıkları. İstediğiniz kadar âlim ekleyebilirsiniz.</div>
        <div id="alim-tefsir-kaynak-liste"></div>
        <button onclick="alimTefsirKaynakEkle()" style="width:100%;padding:10px;border:2px dashed var(--border);border-radius:10px;background:none;font-family:'Source Serif 4',serif;font-size:13px;color:var(--muted);cursor:pointer;margin-top:8px;">+ Yeni tefsir kaynağı ekle</button>
      </div>
      <div style="padding:12px 18px;border-top:1px solid var(--border);display:flex;gap:8px;">
        <button onclick="alimTefsirKaynaklariniKaydet()" style="flex:1;padding:11px;border:none;border-radius:10px;background:var(--ink);color:var(--gold2);font-family:'Source Serif 4',serif;font-size:14px;font-weight:700;cursor:pointer;">✓ Kaydet</button>
        <button onclick="alimTefsirKaynaklariKapat()" style="padding:11px 16px;border:1px solid var(--border);border-radius:10px;background:none;font-family:'Source Serif 4',serif;font-size:14px;color:var(--ink);cursor:pointer;">İptal</button>
      </div>`;
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }
  document.getElementById('alim-tefsir-kaynaklar-modal').style.display = 'flex';
  document.getElementById('alim-tefsir-kaynaklar-overlay').style.display = 'block';
  _alimTefsirKaynakListeRender();
}

function alimTefsirKaynaklariKapat() {
  const modal = document.getElementById('alim-tefsir-kaynaklar-modal');
  const overlay = document.getElementById('alim-tefsir-kaynaklar-overlay');
  if (modal) modal.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
}

function _alimTefsirKaynakListeRender() {
  const liste = document.getElementById('alim-tefsir-kaynak-liste');
  liste.innerHTML = '';
  const kaynaklar = _alimTefsirKaynaklariGetir();

  if (kaynaklar.length === 0) {
    liste.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px 0 4px;">Henüz kaynak eklenmedi.</div>';
    return;
  }

  kaynaklar.forEach((k, i) => {
    const satir = document.createElement('div');
    satir.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;';
    satir.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <input data-idx="${i}" data-field="alim" value="${k.alim||''}"
          placeholder="Âlim adı (örn: Ömer Çelik)"
          style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--ink);box-sizing:border-box;outline:none;">
        <input data-idx="${i}" data-field="sureNo" type="number" min="1" max="114" value="${k.sureNo||''}"
          placeholder="Sure No (boş=çoklu)"
          style="width:110px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--ink);box-sizing:border-box;outline:none;">
        <button onclick="_alimTefsirKaynakSil(${i})" style="padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:none;font-size:13px;cursor:pointer;color:var(--muted);flex-shrink:0;">🗑</button>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">Sure No boş bırakılırsa, dosyadaki TÜM sureler başlıklarından otomatik ayrılıp yüklenir (cilt modu).</div>
      <input data-idx="${i}" data-field="url" value="${k.url||''}"
        placeholder="https://raw.githubusercontent.com/..."
        style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:12px;color:var(--ink);box-sizing:border-box;outline:none;margin-bottom:8px;">
      <button onclick="_tekAlimTefsirYukle(${i})" style="width:100%;padding:8px;border:none;border-radius:8px;background:var(--ink);color:var(--gold2);font-family:'Source Serif 4',serif;font-size:13px;font-weight:600;cursor:pointer;">⬇ Bu Tefsiri Yükle</button>`;
    liste.appendChild(satir);
  });
}

function alimTefsirKaynakEkle() {
  const kaynaklar = _alimTefsirKaynaklariGetir();
  kaynaklar.push({ alim: '', sureNo: '', url: '' });
  _alimTefsirKaynaklariKaydet(kaynaklar);
  _alimTefsirKaynakListeRender();
}

function _alimTefsirKaynakSil(idx) {
  const kaynaklar = _alimTefsirKaynaklariGetir();
  kaynaklar.splice(idx, 1);
  _alimTefsirKaynaklariKaydet(kaynaklar);
  _alimTefsirKaynakListeRender();
}

async function _tekAlimTefsirYukle(idx) {
  const alimInp = document.querySelector(`#alim-tefsir-kaynak-liste input[data-idx="${idx}"][data-field="alim"]`);
  const sureNoInp = document.querySelector(`#alim-tefsir-kaynak-liste input[data-idx="${idx}"][data-field="sureNo"]`);
  const urlInp = document.querySelector(`#alim-tefsir-kaynak-liste input[data-idx="${idx}"][data-field="url"]`);
  if (!alimInp || !sureNoInp || !urlInp) return;

  const alim = alimInp.value.trim();
  const sureNoStr = sureNoInp.value.trim();
  const url = urlInp.value.trim();

  if (!alim || !url) { alert('Âlim adı ve URL giriniz.'); return; }

  const kaynaklar = _alimTefsirKaynaklariGetir();
  if (kaynaklar[idx]) { kaynaklar[idx].alim = alim; kaynaklar[idx].sureNo = sureNoStr; kaynaklar[idx].url = url; }
  _alimTefsirKaynaklariKaydet(kaynaklar);

  // Sure No boşsa: ÇOKLU SURE (cilt) modu
  if (!sureNoStr) {
    const onay = confirm(alim + ' — Bu dosyadaki TÜM sureler başlıklarından otomatik ayrılıp yüklenecek. Devam edilsin mi?');
    if (!onay) return;

    try {
      const r = await fetch(url);
      if (!r.ok) { alert('Yüklenemedi: ' + url); return; }
      const metin = await r.text();
      const sonuclar = _alimTefsirCokluYukle(alim, metin);
      if (sonuclar.length === 0) {
        alert('⚠️ Hiç sure başlığı bulunamadı. Dosya formatını kontrol edin (başlıklar "N- SURE ADI SÜRESİ" şeklinde olmalı).');
      } else {
        const ozet = sonuclar.map(s => 'Sure ' + s.sureNo + ' (' + s.ayetSayisi + ' grup)').join(', ');
        alert('✅ ' + sonuclar.length + ' sure yüklendi!\n\n' + ozet);
      }
      _alimTefsirKaynakListeRender();
    } catch(e) { alert('Hata: ' + e.message); }
    return;
  }

  // Tek sure modu (eski davranış)
  const sureNo = parseInt(sureNoStr);
  const onay = confirm(alim + ' — Sure ' + sureNo + ' tefsiri GitHub\'dan çekilecek ve üzerine yazılacak. Devam edilsin mi?');
  if (!onay) return;

  try {
    const r = await fetch(url);
    if (!r.ok) { alert('Yüklenemedi: ' + url); return; }
    const metin = await r.text();
    const sayi = _alimTefsirYukle(alim, sureNo, metin);
    alert('✅ ' + alim + ' — Sure ' + sureNo + ': ' + sayi + ' ayet grubu yüklendi!');
    _alimTefsirKaynakListeRender();
  } catch(e) { alert('Hata: ' + e.message); }
}

function alimTefsirKaynaklariniKaydet() {
  const alimInputs = document.querySelectorAll('#alim-tefsir-kaynak-liste input[data-field="alim"]');
  const sureInputs = document.querySelectorAll('#alim-tefsir-kaynak-liste input[data-field="sureNo"]');
  const urlInputs = document.querySelectorAll('#alim-tefsir-kaynak-liste input[data-field="url"]');
  const kaynaklar = _alimTefsirKaynaklariGetir();
  alimInputs.forEach(inp => { const idx = parseInt(inp.dataset.idx); if (kaynaklar[idx]) kaynaklar[idx].alim = inp.value.trim(); });
  sureInputs.forEach(inp => { const idx = parseInt(inp.dataset.idx); if (kaynaklar[idx]) kaynaklar[idx].sureNo = inp.value.trim(); });
  urlInputs.forEach(inp => { const idx = parseInt(inp.dataset.idx); if (kaynaklar[idx]) kaynaklar[idx].url = inp.value.trim(); });
  const temiz = kaynaklar.filter(k => k.alim && k.url);
  _alimTefsirKaynaklariKaydet(temiz);
  alimTefsirKaynaklariKapat();
}

// ════════════════════════════════════════
//  ARAPÇA KAYNAKLARI UI
// ════════════════════════════════════════

function arapcaKaynaklariAc() {
  const modal = document.getElementById('arapca-kaynaklar-modal');
  const overlay = document.getElementById('arapca-kaynaklar-overlay');
  modal.style.display = 'flex';
  overlay.style.display = 'block';
  _arapcaKaynakListeRender();
}

function arapcaKaynaklariKapat() {
  document.getElementById('arapca-kaynaklar-modal').style.display = 'none';
  document.getElementById('arapca-kaynaklar-overlay').style.display = 'none';
}

function _arapcaKaynakListeRender() {
  const liste = document.getElementById('arapca-kaynak-liste');
  liste.innerHTML = '';
  const kaynaklar = _ozelArapcaKaynaklariGetir();

  if (kaynaklar.length === 0) {
    liste.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px 0 4px;">Henüz Arapça kaynağı eklenmedi.</div>';
    return;
  }

  const ipucu = document.createElement('div');
  ipucu.style.cssText = 'font-size:11.5px;color:var(--muted);padding:0 2px 10px;line-height:1.5;';
  ipucu.innerHTML = '💡 <b>Sure No</b> alanını boş bırakırsanız, dosyanın <b>tüm Kur\'an tek dosya</b> olduğu kabul edilir. Format: her sure "<b>1- Fâtiha Süresi</b>" gibi bir başlıkla başlamalı, altında Arapça ayet metni, altında yalnız "<b>1.</b>" gibi tek başına ayet numarası, sonraki ayet, vb. şeklinde devam etmeli.';
  liste.appendChild(ipucu);

  kaynaklar.forEach((k, i) => {
    const satir = document.createElement('div');
    satir.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;';
    satir.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <input data-idx="${i}" data-field="sureNo" type="number" min="1" max="114" value="${k.sureNo||''}"
          placeholder="Sure No (boş=tüm Kur'an)"
          style="width:150px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--ink);box-sizing:border-box;outline:none;">
        <span style="font-size:12px;color:var(--muted);flex:1;">${k.sureNo ? 'Sure ' + k.sureNo : 'Tüm Kur\'an (tek dosya)'}</span>
        <button onclick="_arapcaKaynakSil(${i})" style="padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:none;font-size:13px;cursor:pointer;color:var(--muted);">🗑</button>
      </div>
      <input data-idx="${i}" data-field="url" value="${k.url||''}"
        placeholder="https://raw.githubusercontent.com/..."
        style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:12px;color:var(--ink);box-sizing:border-box;outline:none;margin-bottom:8px;">
      <button onclick="_tekArapcaYukle(${i})" style="width:100%;padding:8px;border:none;border-radius:8px;background:var(--ink);color:var(--gold2);font-family:'Source Serif 4',serif;font-size:13px;font-weight:600;cursor:pointer;">⬇ Bu Kaynağı Yükle</button>`;
    liste.appendChild(satir);
  });
}

function arapcaKaynakEkle() {
  const kaynaklar = _ozelArapcaKaynaklariGetir();
  kaynaklar.push({ sureNo: '', url: '' });
  _ozelArapcaKaynaklariKaydet(kaynaklar);
  _arapcaKaynakListeRender();
}

function _arapcaKaynakSil(idx) {
  const kaynaklar = _ozelArapcaKaynaklariGetir();
  kaynaklar.splice(idx, 1);
  _ozelArapcaKaynaklariKaydet(kaynaklar);
  _arapcaKaynakListeRender();
}

async function _tekArapcaYukle(idx) {
  const sureNoInp = document.querySelector(`#arapca-kaynak-liste input[data-idx="${idx}"][data-field="sureNo"]`);
  const urlInp = document.querySelector(`#arapca-kaynak-liste input[data-idx="${idx}"][data-field="url"]`);
  if (!sureNoInp || !urlInp) return;

  const sureNoStr = sureNoInp.value.trim();
  const url = urlInp.value.trim();

  if (!url) { alert('URL giriniz.'); return; }

  const kaynaklar = _ozelArapcaKaynaklariGetir();
  if (kaynaklar[idx]) { kaynaklar[idx].sureNo = sureNoStr; kaynaklar[idx].url = url; }
  _ozelArapcaKaynaklariKaydet(kaynaklar);

  const coklu = !sureNoStr;
  const onayMesaji = coklu
    ? 'Tüm Kur\'an (tek dosya) GitHub\'dan çekilecek ve dosyadaki her sure kendi Arapça metninin üzerine yazılacak. Devam edilsin mi?'
    : 'Sure ' + sureNoStr + ' Arapça metni GitHub\'dan çekilecek ve mevcut Arapçanın üzerine yazılacak. Devam edilsin mi?';
  const onay = confirm(onayMesaji);
  if (!onay) return;

  try {
    const r = await fetch(url);
    if (!r.ok) { alert('Yüklenemedi: ' + url); return; }
    const metin = await r.text();

    if (coklu) {
      const { sureSayisi, ayetSayisi } = _ozelArapcaCokluYukle(metin);
      // Cache temizle ki hemen görünsün
      Object.keys(kurancilarArCache).forEach(k => delete kurancilarArCache[k]);
      Object.keys(onizlemeCache).forEach(k => delete onizlemeCache[k]);
      if (sureSayisi === 0) {
        alert('⚠️ Hiçbir satır ayrıştırılamadı. Dosyanın "sureNo|ayetNo|arapça metin" formatında olduğundan emin olun.');
      } else {
        alert('✅ ' + sureSayisi + ' sure, toplam ' + ayetSayisi + ' ayet Arapçası yüklendi!');
      }
    } else {
      const sureNo = parseInt(sureNoStr);
      const sayi = _ozelArapcaYukle(sureNo, metin);
      delete kurancilarArCache[sureNo];
      Object.keys(onizlemeCache).forEach(k => { if (k.startsWith(sureNo + ':')) delete onizlemeCache[k]; });
      alert('✅ Sure ' + sureNo + ': ' + sayi + ' ayet Arapçası yüklendi!');
    }
    _arapcaKaynakListeRender();
  } catch(e) { alert('Hata: ' + e.message); }
}

function arapcaKaynaklariniKaydet() {
  const sureInputs = document.querySelectorAll('#arapca-kaynak-liste input[data-field="sureNo"]');
  const urlInputs = document.querySelectorAll('#arapca-kaynak-liste input[data-field="url"]');
  const kaynaklar = _ozelArapcaKaynaklariGetir();
  sureInputs.forEach(inp => { const idx = parseInt(inp.dataset.idx); if (kaynaklar[idx]) kaynaklar[idx].sureNo = inp.value.trim(); });
  urlInputs.forEach(inp => { const idx = parseInt(inp.dataset.idx); if (kaynaklar[idx]) kaynaklar[idx].url = inp.value.trim(); });
  // NOT: sureNo kasıtlı olarak boş bırakılabilir ("tüm Kur'an tek dosya" modu).
  // Bu yüzden sadece URL'nin dolu olması yeterli.
  const temiz = kaynaklar.filter(k => k.url);
  _ozelArapcaKaynaklariKaydet(temiz);
  arapcaKaynaklariKapat();
}



function ceviriKaynaklariAc() {
  const modal = document.getElementById('ceviri-kaynaklar-modal');
  const overlay = document.getElementById('ceviri-kaynaklar-overlay');
  modal.style.display = 'flex';
  overlay.style.display = 'block';
  _ceviriKaynakListeRender();
}

function ceviriKaynaklariKapat() {
  document.getElementById('ceviri-kaynaklar-modal').style.display = 'none';
  document.getElementById('ceviri-kaynaklar-overlay').style.display = 'none';
}

function _ceviriKaynakListeRender() {
  const liste = document.getElementById('ceviri-kaynak-liste');
  liste.innerHTML = '';
  const kaynaklar = _ozelCeviriKaynaklariGetir();

  if (kaynaklar.length === 0) {
    liste.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px 0 4px;">Henüz meal kaynağı eklenmedi.</div>';
    return;
  }

  kaynaklar.forEach((k, i) => {
    const satir = document.createElement('div');
    satir.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;';
    satir.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <input data-idx="${i}" data-field="isim" value="${k.isim||''}"
          placeholder="Mütercim adı (örn: Mustafa İslamoğlu)"
          style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--ink);box-sizing:border-box;outline:none;">
        <input data-idx="${i}" data-field="sureNo" type="number" min="1" max="114" value="${k.sureNo||''}"
          placeholder="Sure No"
          style="width:70px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--ink);box-sizing:border-box;outline:none;">
        <button onclick="_ceviriKaynakSil(${i})" style="padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:none;font-size:13px;cursor:pointer;color:var(--muted);flex-shrink:0;">🗑</button>
      </div>
      <input data-idx="${i}" data-field="url" value="${k.url||''}"
        placeholder="https://raw.githubusercontent.com/..."
        style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:12px;color:var(--ink);box-sizing:border-box;outline:none;margin-bottom:8px;">
      <button onclick="_tekCeviriYukle(${i})" style="width:100%;padding:8px;border:none;border-radius:8px;background:var(--ink);color:var(--gold2);font-family:'Source Serif 4',serif;font-size:13px;font-weight:600;cursor:pointer;">⬇ Bu Meali Yükle</button>`;
    liste.appendChild(satir);
  });
}

function ceviriKaynakEkle() {
  const kaynaklar = _ozelCeviriKaynaklariGetir();
  kaynaklar.push({ isim: '', sureNo: '', url: '' });
  _ozelCeviriKaynaklariKaydet(kaynaklar);
  _ceviriKaynakListeRender();
}

function _ceviriKaynakSil(idx) {
  const kaynaklar = _ozelCeviriKaynaklariGetir();
  kaynaklar.splice(idx, 1);
  _ozelCeviriKaynaklariKaydet(kaynaklar);
  _ceviriKaynakListeRender();
}

async function _tekCeviriYukle(idx) {
  const isimInp = document.querySelector(`#ceviri-kaynak-liste input[data-idx="${idx}"][data-field="isim"]`);
  const sureNoInp = document.querySelector(`#ceviri-kaynak-liste input[data-idx="${idx}"][data-field="sureNo"]`);
  const urlInp = document.querySelector(`#ceviri-kaynak-liste input[data-idx="${idx}"][data-field="url"]`);
  if (!isimInp || !sureNoInp || !urlInp) return;

  const isim = isimInp.value.trim();
  const sureNo = parseInt(sureNoInp.value);
  const url = urlInp.value.trim();

  if (!isim || !sureNo || !url) { alert('Mütercim adı, sure numarası ve URL giriniz.'); return; }

  const kaynaklar = _ozelCeviriKaynaklariGetir();
  if (kaynaklar[idx]) { kaynaklar[idx].isim = isim; kaynaklar[idx].sureNo = sureNo; kaynaklar[idx].url = url; }
  _ozelCeviriKaynaklariKaydet(kaynaklar);

  const onay = confirm(isim + ' — Sure ' + sureNo + ' meali GitHub\'dan çekilecek ve üzerine yazılacak. Devam edilsin mi?');
  if (!onay) return;

  try {
    const r = await fetch(url);
    if (!r.ok) { alert('Yüklenemedi: ' + url); return; }
    const metin = await r.text();
    const sayi = _ozelCeviriYukle(isim, sureNo, metin);
    // Cache'i temizle ki yeni veri hemen görünsün
    Object.keys(cevirilerCache).forEach(k => { if (k.startsWith(sureNo + ':')) delete cevirilerCache[k]; });
    alert('✅ ' + isim + ' — Sure ' + sureNo + ': ' + sayi + ' ayet yüklendi!');
    _ceviriKaynakListeRender();
  } catch(e) { alert('Hata: ' + e.message); }
}

function ceviriKaynaklariniKaydet() {
  const isimInputs = document.querySelectorAll('#ceviri-kaynak-liste input[data-field="isim"]');
  const sureInputs = document.querySelectorAll('#ceviri-kaynak-liste input[data-field="sureNo"]');
  const urlInputs = document.querySelectorAll('#ceviri-kaynak-liste input[data-field="url"]');
  const kaynaklar = _ozelCeviriKaynaklariGetir();
  isimInputs.forEach(inp => { const idx = parseInt(inp.dataset.idx); if (kaynaklar[idx]) kaynaklar[idx].isim = inp.value.trim(); });
  sureInputs.forEach(inp => { const idx = parseInt(inp.dataset.idx); if (kaynaklar[idx]) kaynaklar[idx].sureNo = inp.value.trim(); });
  urlInputs.forEach(inp => { const idx = parseInt(inp.dataset.idx); if (kaynaklar[idx]) kaynaklar[idx].url = inp.value.trim(); });
  const temiz = kaynaklar.filter(k => k.isim && k.sureNo && k.url);
  _ozelCeviriKaynaklariKaydet(temiz);
  ceviriKaynaklariKapat();
}



function tefsirKaynaklariAc() {
  const modal = document.getElementById('tefsir-kaynaklar-modal');
  const overlay = document.getElementById('tefsir-kaynaklar-overlay');
  modal.style.display = 'flex';
  overlay.style.display = 'block';
  _tefsirKaynakListeRender();
}

function tefsirKaynaklariKapat() {
  document.getElementById('tefsir-kaynaklar-modal').style.display = 'none';
  document.getElementById('tefsir-kaynaklar-overlay').style.display = 'none';
}

function _tefsirKaynakListeRender() {
  const liste = document.getElementById('tefsir-kaynak-liste');
  liste.innerHTML = '';
  const kaynaklar = _tefsirKaynaklariGetir();

  if (kaynaklar.length === 0) {
    liste.innerHTML = '<div style="font-size:12px;color:var(--muted);text-align:center;padding:8px 0 4px;">Henüz kaynak eklenmedi.</div>';
    return;
  }

  kaynaklar.forEach((k, i) => {
    const satir = document.createElement('div');
    satir.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:10px;';
    satir.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
        <input data-idx="${i}" data-field="sureNo" type="number" min="1" max="114" value="${k.sureNo||''}"
          placeholder="Sure No (boş=tüm Kur'an)"
          style="width:150px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--ink);box-sizing:border-box;outline:none;">
        <button onclick="_tefsirKaynakSil(${i})" style="padding:5px 8px;border:1px solid var(--border);border-radius:8px;background:none;font-size:13px;cursor:pointer;color:var(--muted);">🗑</button>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">Sure No boş bırakılırsa, dosyadaki TÜM sureler "N- SURE" başlıklarından otomatik ayrılıp yüklenir.</div>
      <input data-idx="${i}" data-field="url" value="${k.url||''}"
        placeholder="https://raw.githubusercontent.com/..."
        style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:12px;color:var(--ink);box-sizing:border-box;outline:none;margin-bottom:8px;">
      <button onclick="_tekSureYukle(${i})" style="width:100%;padding:8px;border:none;border-radius:8px;background:var(--ink);color:var(--gold2);font-family:'Source Serif 4',serif;font-size:13px;font-weight:600;cursor:pointer;">⬇ Bu Kaynağı Yükle</button>`;
    liste.appendChild(satir);
  });
}

function tefsirKaynakEkle() {
  const kaynaklar = _tefsirKaynaklariGetir();
  kaynaklar.push({ sureNo: '', url: '' });
  localStorage.setItem('tefsir_kaynaklar', JSON.stringify(kaynaklar));
  _tefsirKaynakListeRender();
}

function _tefsirKaynakSil(idx) {
  const kaynaklar = _tefsirKaynaklariGetir();
  kaynaklar.splice(idx, 1);
  localStorage.setItem('tefsir_kaynaklar', JSON.stringify(kaynaklar));
  _tefsirKaynakListeRender();
}

function _tefsirKaynaklariGetir() {
  try { return JSON.parse(localStorage.getItem('tefsir_kaynaklar') || '[]'); } catch(e) { return []; }
}

async function _tekSureYukle(idx) {
  // Formdaki güncel değerleri oku
  const sureNoInp = document.querySelector(`input[data-idx="${idx}"][data-field="sureNo"]`);
  const urlInp = document.querySelector(`input[data-idx="${idx}"][data-field="url"]`);
  if (!sureNoInp || !urlInp) return;

  const sureNoStr = sureNoInp.value.trim();
  const url = urlInp.value.trim();

  if (!url) { alert('URL giriniz.'); return; }

  // Önce kaydet
  const kaynaklar = _tefsirKaynaklariGetir();
  if (kaynaklar[idx]) { kaynaklar[idx].sureNo = sureNoStr; kaynaklar[idx].url = url; }
  localStorage.setItem('tefsir_kaynaklar', JSON.stringify(kaynaklar));

  // Sure No boşsa: ÇOKLU SURE (tüm Kur'an) modu
  if (!sureNoStr) {
    const onay = confirm('Bu dosyadaki TÜM sureler başlıklarından otomatik ayrılıp, her birinin ayet-altı Notlarına yüklenecek. Devam edilsin mi?');
    if (!onay) return;

    try {
      const r = await fetch(url);
      if (!r.ok) { alert('Yüklenemedi: ' + url); return; }
      const metin = await r.text();
      const sonuclar = _githubTefsirCokluYukle(metin);
      if (sonuclar.length === 0) {
        alert('⚠️ Hiç sure başlığı bulunamadı. Dosya formatını kontrol edin (başlıklar "N- SURE" şeklinde olmalı).');
      } else {
        const toplamAyet = sonuclar.reduce((t, s) => t + s.ayetSayisi, 0);
        alert('✅ ' + sonuclar.length + ' sure, toplam ' + toplamAyet + ' ayet yüklendi!');
      }
      _tefsirKaynakListeRender();
      _acikSureEkranlariniZorlaYenile();
    } catch(e) { alert('Hata: ' + e.message); }
    return;
  }

  // Tek sure modu (eski davranış)
  const sureNo = parseInt(sureNoStr);
  const onay = confirm('Sure ' + sureNo + ' için "Tefsir" notları GitHub\'dan çekilecek ve üzerine yazılacak. Devam edilsin mi?');
  if (!onay) return;

  try {
    const r = await fetch(url);
    if (!r.ok) { alert('Yüklenemedi: ' + url); return; }
    const metin = await r.text();
    const sayi = _githubTefsirYukle(sureNo, metin);
    alert('✅ Sure ' + sureNo + ': ' + sayi + ' ayet tefsiri yüklendi!');
    _tefsirKaynakListeRender();
    _acikSureEkranlariniZorlaYenile();
  } catch(e) { alert('Hata: ' + e.message); }
}

// Şu an ekranda açık/render edilmiş sure kartlarını bulup, tamamen boşaltıp
// yeniden çizdirir — böylece yeni yüklenen tefsir hemen görünür (sayfa yenilemeye gerek kalmaz).
function _acikSureEkranlariniZorlaYenile() {
  document.querySelectorAll('[id^="sure-ic-"]').forEach(ic => {
    const sNoStr = ic.id.replace('sure-ic-', '');
    const sNo = parseInt(sNoStr);
    if (!sNo || ic.children.length === 0) return; // hiç açılmamışsa dokunma
    ic.innerHTML = '';
    if (typeof sureIcDoldur === 'function') sureIcDoldur(sNo, ic);
  });
}

function tefsirKaynaklariniKaydet() {
  const inputs = document.querySelectorAll('#tefsir-kaynak-liste input');
  const kaynaklar = _tefsirKaynaklariGetir();
  inputs.forEach(inp => {
    const idx = parseInt(inp.dataset.idx);
    const field = inp.dataset.field;
    if (kaynaklar[idx]) kaynaklar[idx][field] = inp.value.trim();
  });
  // NOT: sureNo kasıtlı olarak boş bırakılabilir ("tüm Kur'an tek dosya / çoklu sure" modu).
  // Bu yüzden burada sadece URL'nin dolu olması yeterli — sureNo şartı KONULMAZ,
  // yoksa çoklu-sure kaynakları kayıt sırasında sessizce silinir.
  const temiz = kaynaklar.filter(k => k.url);
  localStorage.setItem('tefsir_kaynaklar', JSON.stringify(temiz));
  tefsirKaynaklariKapat();
}

// ════════════════════════════════════════
//  GITHUB TEFSİR YÜKLEYICI
//  Kullanım: GitHub raw URL'yi GITHUB_TEFSIR_DOSYALARI içine ekle
//  Format: { sureNo: 19, url: "https://raw.githubusercontent.com/..." }
// ════════════════════════════════════════

const GITHUB_TEFSIR_DOSYALARI = [
  // Örnek — kendi URL'lerinizi buraya ekleyin:
  // { sureNo: 19, url: "https://raw.githubusercontent.com/KULLANICI/REPO/main/sure_19.txt" },
  // { sureNo: 36, url: "https://raw.githubusercontent.com/KULLANICI/REPO/main/sure_36.txt" },
];

// localStorage'daki mevcut notu silmeden, GitHub'dan geleni "Tefsir" klasörü olarak ekler
// ════════════════════════════════════════
//  ÖZEL MÜTERCİM ÇEVİRİLERİ (GitHub'dan, salt-okunur, Çeviriler modalına entegre)
//  Depolama: localStorage 'ozel_ceviri_ISIM_SURENO' = { "1": {text, footnotes:[{number,text}]}, "6,7": {...}, ... }
//  Kaynak listesi: localStorage 'ozel_ceviri_kaynaklari' = [{isim, sureNo, url}]
// ════════════════════════════════════════

// Üst simge rakamları normal rakama çeviren tablo
const _USTSIMGE_TABLOSU = { '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9' };

function _ozelCeviriAnahtari(isim, sureNo) {
  return 'ozel_ceviri_' + isim.replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ]/g,'_') + '_' + sureNo;
}

function _ozelCeviriKaynaklariGetir() {
  try { return JSON.parse(localStorage.getItem('ozel_ceviri_kaynaklari') || '[]'); } catch(e) { return []; }
}
function _ozelCeviriKaynaklariKaydet(arr) {
  localStorage.setItem('ozel_ceviri_kaynaklari', JSON.stringify(arr));
}

// Metni parse eder: ayet no -> {text, footnotes}
// Destekler: "1." veya "6,7." başlıkları; üst simge (¹²³) veya yıldız (*) dipnot işaretleri;
// altta "1 açıklama" (Mehmet Türk tipi) veya "(*) açıklama" (İhsan Aktaş tipi) blokları
function _ozelCeviriParseEt(metin) {
  // Ayet bloklarını ayır: satır başında "SAYI." veya "SAYI,SAYI,SAYI." ile başlayan kısımlar
  const ayetRegex = /(?:^|\n)\s*((?:\d+,\s*)*\d+)\.\s+([\s\S]*?)(?=(?:\n\s*(?:\d+,\s*)*\d+\.\s+)|$)/g;

  const sonuc = {};
  let match;
  while ((match = ayetRegex.exec(metin)) !== null) {
    const ayetKey = match[1].replace(/\s+/g,''); // "6,7" veya "1"
    let blok = match[2].trim();
    if (!blok) continue;

    // Bloğu satır satır tara. Dipnot başlangıcı: satır "(*)" veya "N " veya "[N]" ile başlıyorsa.
    // Meal metni = ilk dipnot işaretinden önceki tüm kısım.
    const satirlar = blok.split('\n');
    let mealSatirlari = [];
    const footnotes = [];
    let dipnotBasladi = false;

    for (let i = 0; i < satirlar.length; i++) {
      const satir = satirlar[i];
      const satirTrim = satir.trim();
      if (!satirTrim) continue;

      // "(*) metin" formatı
      let m = satirTrim.match(/^\(\*\)\s*([\s\S]*)$/);
      if (m) {
        dipnotBasladi = true;
        footnotes.push({ number: '*', text: m[1].trim() });
        continue;
      }
      // "1 metin" veya "[1] metin" formatı (satır başında rakam + boşluk)
      m = satirTrim.match(/^\[?(\d+)\]?\s+(\S[\s\S]*)$/);
      if (m && dipnotBasladi === false) {
        // İlk dipnot adayı — ama meal metninde de "3, 4." gibi rakamla başlayan cümleler olabileceğinden
        // sadece daha önce meal metni toplanmışsa ve bu satır tek başına bir dipnot gibi duruyorsa kabul et.
        // Basit güvenli kural: meal metninde en az bir satır toplanmış olmalı.
        if (mealSatirlari.length > 0) {
          dipnotBasladi = true;
          footnotes.push({ number: m[1], text: m[2].trim() });
          continue;
        }
      } else if (m && dipnotBasladi === true) {
        footnotes.push({ number: m[1], text: m[2].trim() });
        continue;
      }

      if (dipnotBasladi) {
        // Önceki dipnotun devamı
        if (footnotes.length > 0) {
          footnotes[footnotes.length-1].text += ' ' + satirTrim;
        }
      } else {
        mealSatirlari.push(satirTrim);
      }
    }

    // Meal metnindeki sondaki dipnot işaretlerini (¹²³ veya *) temizlemeye gerek yok, görsel kalsın.
    const mealMetni = mealSatirlari.join(' ').trim();

    sonuc[ayetKey] = { text: mealMetni, footnotes: footnotes.length ? footnotes : null };
  }

  return sonuc;
}

// Parse edilmiş {ayetKey: {...}} verisini her tekil ayet numarasına genişletir (grup ise aynı içerik her ayete referans olur)
function _ozelCeviriGenislet(parsed) {
  const genis = {};
  Object.keys(parsed).forEach(key => {
    const parcalar = key.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (parcalar.length <= 1) {
      genis[key] = parsed[key];
    } else {
      // Gruplu ayet (örn: "6,7" veya "1,2,3") — grup etiketini koru, her tekil ayete de aynısını ata
      parcalar.forEach(no => { genis[no] = parsed[key]; });
    }
  });
  return genis;
}

function _ozelCeviriYukle(isim, sureNo, metin) {
  const parsed = _ozelCeviriParseEt(metin);
  const genis = _ozelCeviriGenislet(parsed);
  _bellekCache.ceviri[_ozelCeviriAnahtari(isim, sureNo)] = genis;
  return Object.keys(genis).length;
}

function _ozelCeviriGetir(isim, sureNo, aNo) {
  const veri = _bellekCache.ceviri[_ozelCeviriAnahtari(isim, sureNo)] || {};
  return veri[aNo] || null;
}

// O ayet için kayıtlı TÜM özel mütercimleri döndürür (Çeviriler modaline eklemek için)
function _ozelCevirilerHepsiGetir(sNo, aNo) {
  const kaynaklar = _ozelCeviriKaynaklariGetir();
  const isimler = [...new Set(kaynaklar.filter(k => k.sureNo == sNo).map(k => k.isim))];
  const sonuc = [];
  isimler.forEach(isim => {
    const veri = _ozelCeviriGetir(isim, sNo, aNo);
    if (veri) {
      sonuc.push({
        author: { id: 'ozel_' + isim, name: isim, description: '(GitHub kaynağı)' },
        text: veri.text,
        footnotes: veri.footnotes
      });
    }
  });
  return sonuc;
}


function _githubTefsirYukle(sureNo, metin) {
  // Ayetleri parse et: "1-)" ile başlayan bloklar
  const regex = /(\d+)-\)([\s\S]*?)(?=\d+-\)|$)/g;
  let match;
  let yuklenenSayisi = 0;

  if (!window._bellekTefsirVerisi) window._bellekTefsirVerisi = {};
  if (!window._bellekTefsirKaynaklar) window._bellekTefsirKaynaklar = {};
  window._bellekTefsirVerisi[sureNo] = {};

  while ((match = regex.exec(metin)) !== null) {
    const ayetNo = parseInt(match[1]);
    const icerik = match[2].trim();
    if (!icerik) continue;

    // localStorage'a YAZMIYORUZ artık — sadece bellek (RAM) cache'ine yazılır.
    // Kayıt anında GitHub'a zaten yazıldığı için burada tekrar dosyaya yazmaya gerek yok,
    // sadece görüntülemek için bellekte tutuyoruz.
    window._bellekTefsirVerisi[sureNo][ayetNo] = icerik;
    yuklenenSayisi++;
  }

  if (yuklenenSayisi > 0) window._bellekTefsirKaynaklar[sureNo] = true;

  return yuklenenSayisi;
}

// ════════════════════════════════════════
//  ÇOKLU SURE (TÜM KUR'AN TEK DOSYA) — NOTLAR SİSTEMİ İÇİN
//  Tek dosyada tüm sureler varsa, "N- SURE" başlıklarından otomatik ayırıp
//  her sureyi kendi ayet-altı Notlar'ına (an_SURE_AYET) yükler.
// ════════════════════════════════════════
function _githubTefsirCokluYukle(metin) {
  const parcalar = _alimTefsirCoklaAyir(metin); // mevcut Tefsir sekmesi ayırıcısını yeniden kullan
  const sonuclar = [];
  parcalar.forEach(p => {
    const sayi = _githubTefsirYukle(p.sureNo, p.metin);
    if (sayi > 0) sonuclar.push({ sureNo: p.sureNo, ayetSayisi: sayi });
  });
  return sonuclar;
}

// Sayfa yüklenince GitHub dosyalarını çek
async function _githubTefsirleriniCek() {
  if (!GITHUB_TEFSIR_DOSYALARI.length) return;

  for (const dosya of GITHUB_TEFSIR_DOSYALARI) {
    try {
      const r = await fetch(dosya.url);
      if (!r.ok) { console.warn('GitHub tefsir yüklenemedi:', dosya.url, r.status); continue; }
      const metin = await r.text();
      const sayi = _githubTefsirYukle(dosya.sureNo, metin);
      console.log('✅ Sure ' + dosya.sureNo + ': ' + sayi + ' ayet yüklendi.');
    } catch(e) {
      console.warn('GitHub tefsir hatası:', dosya.url, e);
    }
  }
}

// Sayfa açılışında GitHub'dan ÇEKMEZ.
// Notlar localStorage'da kalıcı olarak durur.
// Sadece "Kaydet & Yükle" butonuna basınca GitHub'dan çeker.

// ════════════════════════════════════════
// Markdown araç çubuğuna geri al / yeniden yap ekle
function _undoToolbarEkle(ta) {
  const toolbar = document.getElementById('not-md-toolbar');
  if (!toolbar) return;
  const div = toolbar.querySelector('div');
  if (!div) return;

  // Önceki undo butonlarını temizle
  toolbar.querySelectorAll('.undo-btn').forEach(b => b.remove());

  const geriBtn = document.createElement('button');
  geriBtn.className = 'undo-btn';
  geriBtn.title = 'Geri al (Ctrl+Z)';
  geriBtn.style.cssText = 'padding:5px 9px;border-radius:7px;border:1px solid var(--border);background:var(--paper);font-size:14px;cursor:pointer;color:var(--ink);';
  geriBtn.textContent = '↩';
  geriBtn.onclick = () => _undoYap(ta);

  const ileriBtn = document.createElement('button');
  ileriBtn.className = 'undo-btn';
  ileriBtn.title = 'Yeniden yap (Ctrl+Y)';
  ileriBtn.style.cssText = 'padding:5px 9px;border-radius:7px;border:1px solid var(--border);background:var(--paper);font-size:14px;cursor:pointer;color:var(--ink);';
  ileriBtn.textContent = '↪';
  ileriBtn.onclick = () => _redoYap(ta);

  const sep = document.createElement('div');
  sep.className = 'undo-btn';
  sep.style.cssText = 'width:1px;height:20px;background:var(--border);margin:0 2px;display:inline-block;vertical-align:middle;';

  div.insertBefore(sep, div.firstChild);
  div.insertBefore(ileriBtn, div.firstChild);
  div.insertBefore(geriBtn, div.firstChild);
}

// ════════════════════════════════════════
//  ESKİ VERİLERİ TEMİZLEME
//  Önceden localStorage'a kaydedilmiş büyük tefsir/meal/arapça verilerini siler.
//  Kaynak listelerine (isim+sure+URL) ve Notlar sistemine DOKUNMAZ.
// ════════════════════════════════════════
function eskiVerileriTemizle() {
  const onay = confirm('Eskiden telefona kaydedilmiş tefsir/meal/Arapça verileri silinecek (kaynak listeleriniz ve Notlarınız SİLİNMEZ). Devam edilsin mi?');
  if (!onay) return;

  const silinecekOnekler = ['alim_tefsir2_', 'ozel_ceviri_', 'ozel_arapca_', 'alim_tefsir_', 'tefsir_kaynaklar'];
  let silinen = 0;
  const tumAnahtarlar = [];
  for (let i = 0; i < localStorage.length; i++) tumAnahtarlar.push(localStorage.key(i));

  tumAnahtarlar.forEach(key => {
    if (!key) return;
    // Kaynak listelerini (küçük veri) koru, sadece büyük veri anahtarlarını sil
    if (key === 'alim_tefsir_kaynaklari2' || key === 'ozel_ceviri_kaynaklari' || key === 'ozel_arapca_kaynaklari') return;
    if (key.startsWith('an_')) return; // Notlar sistemine dokunma

    if (silinecekOnekler.some(onek => key.startsWith(onek))) {
      localStorage.removeItem(key);
      silinen++;
    }
  });

  alert('✅ ' + silinen + ' eski kayıt silindi. Sayfa yeniden yükleniyor...');
  location.reload();
}

// ════════════════════════════════════════
//  OTOMATİK ÖN-YÜKLEME
//  Sayfa her açıldığında, kayıtlı tüm kaynakları (Meal/Arapça/Tefsir) arka planda
//  GitHub'dan yeniden çeker ve bellek cache'ine doldurur. localStorage'a yazmaz.
// ════════════════════════════════════════
async function _tumKaynaklariOnYukle() {
  window._kaynaklarYukleniyor = true;
  try {
    // Tefsir kaynakları (Ömer Çelik gibi GitHub tabanlı olanlar)
    const tefsirKaynaklari = _alimTefsirKaynaklariGetir();
    for (const k of tefsirKaynaklari) {
      if (!k.alim || !k.url) continue;
      try {
        const r = await fetch(k.url);
        if (!r.ok) continue;
        const metin = await r.text();
        if (k.sureNo) {
          // Tek sure modu
          _alimTefsirYukle(k.alim, k.sureNo, metin);
        } else {
          // Çoklu sure (cilt) modu — dosyadaki tüm sureleri otomatik ayır
          _alimTefsirCokluYukle(k.alim, metin);
        }
      } catch(e) { console.warn('Ön-yükleme hatası (tefsir):', k.alim, k.sureNo, e); }
    }

    // Meal kaynakları
    const ceviriKaynaklari = _ozelCeviriKaynaklariGetir();
    for (const k of ceviriKaynaklari) {
      if (!k.isim || !k.sureNo || !k.url) continue;
      try {
        const r = await fetch(k.url);
        if (r.ok) { const metin = await r.text(); _ozelCeviriYukle(k.isim, k.sureNo, metin); }
      } catch(e) { console.warn('Ön-yükleme hatası (meal):', k.isim, k.sureNo, e); }
    }

    // Arapça kaynakları
    const arapcaKaynaklari = _ozelArapcaKaynaklariGetir();
    for (const k of arapcaKaynaklari) {
      if (!k.url) continue;
      try {
        const r = await fetch(k.url);
        if (!r.ok) continue;
        const metin = await r.text();
        if (k.sureNo) {
          // Tek sure modu
          _ozelArapcaYukle(k.sureNo, metin);
        } else {
          // Çoklu sure (tüm Kur'an tek dosya) modu
          _ozelArapcaCokluYukle(metin);
        }
      } catch(e) { console.warn('Ön-yükleme hatası (arapça):', k.sureNo, e); }
    }

    // "Tefsir Kaynakları" menüsünden eklenen kaynaklar (ayet-altı Notlar sistemine yüklenenler)
    // — bunlar window._bellekTefsirVerisi'nde RAM'de tutulur, sayfa yenilenince sıfırlanır.
    // Bu yüzden bunları da burada yeniden GitHub'dan çekip belleğe dolduruyoruz.
    const digerTefsirKaynaklari = _tefsirKaynaklariGetir();
    for (const k of digerTefsirKaynaklari) {
      if (!k.url) continue;
      try {
        const r = await fetch(k.url);
        if (!r.ok) continue;
        const metin = await r.text();
        if (k.sureNo) {
          // Tek sure modu
          _githubTefsirYukle(k.sureNo, metin);
        } else {
          // Çoklu sure (tüm Kur'an tek dosya) modu
          _githubTefsirCokluYukle(metin);
        }
      } catch(e) { console.warn('Ön-yükleme hatası (tefsir kaynakları):', k.sureNo, e); }
    }

    console.log('✅ Tüm kayıtlı kaynaklar arka planda yenilendi.');

    // Daha önce "GitHub'a yazılamadı" diye bekleyen not değişiklikleri varsa şimdi tekrar dene
    await _bekleyenGithubYazmalariniDene();

    window._kaynaklarYukleniyor = false;

    // Eğer kullanıcı şu an Tefsir sekmesindeyse, ekranı otomatik tazele
    const tefsirEkrani = document.getElementById('screen-tefsirler');
    if (tefsirEkrani && tefsirEkrani.classList.contains('active')) {
      tefsirlerEkraniRender();
    }

    // Şu an açık olan sure ekranlarını da tazele (ayet-altı tefsirler hemen görünsün)
    if (digerTefsirKaynaklari.length > 0 && typeof _acikSureEkranlariniZorlaYenile === 'function') {
      _acikSureEkranlariniZorlaYenile();
    }
  } catch(e) {
    window._kaynaklarYukleniyor = false;
    console.warn('Ön-yükleme genel hata:', e);
  }
}

// Sayfa yüklenir yüklenmez arka planda başlat (kullanıcıyı bekletmeden)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { _tumKaynaklariOnYukle(); });
} else {
  _tumKaynaklariOnYukle();
}

