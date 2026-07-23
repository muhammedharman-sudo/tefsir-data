// ════════════════════════════════════════

// Âyet → PDF sayfa haritaları (sure numarası → {ayet: sayfa})
const PDF_SAYFA_HARITASI = {
  80: { // Abese Suresi — İslamoğlu
    "1":4,"2":4,"3":6,"4":8,"5":10,"6":11,"7":11,"8":12,
    "9":13,"10":13,"11":13,"12":13,"13":14,"14":14,"15":14,
    "16":15,"17":15,"18":15,"19":16,"20":16,"21":17,"22":17,
    "23":17,"24":18,"25":18,"26":18,"27":19,"28":19,"29":19,
    "30":19,"31":19,"32":20,"33":20,"34":20,"35":20,"36":20,
    "37":21,"38":21,"39":21,"40":21,"41":22,"42":22
  },
  78: { // Nebe Suresi — Gürgen Tefsiri
    "1":1,"2":2,"3":2,"4":3,"5":3,"6":4,"7":4,"8":5,"9":5,
    "10":6,"11":6,"12":6,"13":7,"14":8,"15":8,"16":8,
    "17":9,"18":9,"19":9,"20":10,"21":10,"22":10,
    "23":11,"24":11,"25":11,"26":12,"27":12,"28":12,
    "29":13,"30":13,"31":14,"32":14,"33":15,"34":16,
    "35":16,"36":17,"37":17,"38":18,"39":18,"40":19
  }
};

// PDF metadata — hangi sure hangi PDF'e ait, birden fazla PDF olabilir
const PDF_KATALOG = {
  80: [{ isim: "İslamoğlu Tefsiri", dosya: "Abese_suresi", musannif: "İslamoğlu", key: "80_islamoglu" }],
  78: [{ isim: "Gürgen Tefsiri", dosya: "80-Nebe_Suresi", musannif: "Gürgen", key: "78_gurgen" }]
};

let _pdfJsYuklendi = false;
let _pdfMevcut = null;
let _pdfMevcutSure = null;
let _pdfMevcutKatalog = null;
let _pdfMevcutSayfa = 1;
let _pdfRenderDevam = false;
let _pdfZoom = 1.0;
let _pdfZoomAktif = false;

function _pdfJsHazirla(cb) {
  const WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
    cb();
    return;
  }
  // Zaten head'de script var, bekle
  let bekle = 0;
  const kontrol = setInterval(() => {
    bekle++;
    if (window.pdfjsLib) {
      clearInterval(kontrol);
      pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER;
      cb();
    } else if (bekle > 50) {
      clearInterval(kontrol);
      console.error('PDF.js yüklenemedi');
    }
  }, 100);
}

// IndexedDB'ye PDF kaydet (key: string)
function _pdfKaydetIDB(key, arrayBuffer) {
  return new Promise((res, rej) => {
    const req = indexedDB.open('tefsir_pdf_db', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pdfler')) db.createObjectStore('pdfler');
    };
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('pdfler', 'readwrite');
      tx.objectStore('pdfler').put(arrayBuffer, 'pdf_' + key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej();
    };
    req.onerror = () => rej();
  });
}

// IndexedDB'den PDF oku
function _pdfOkuIDB(key) {
  return new Promise((res) => {
    const req = indexedDB.open('tefsir_pdf_db', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pdfler')) db.createObjectStore('pdfler');
    };
    req.onsuccess = e => {
      const db = e.target.result;
      const tx = db.transaction('pdfler', 'readonly');
      const get = tx.objectStore('pdfler').get('pdf_' + key);
      get.onsuccess = () => {
        const sonuc = get.result;
        if (!sonuc) { res(null); return; }
        // Tipi normalize et
        if (sonuc instanceof ArrayBuffer) { res(sonuc); return; }
        if (sonuc instanceof Uint8Array) { res(sonuc.buffer); return; }
        res(sonuc);
      };
      get.onerror = () => res(null);
    };
    req.onerror = () => res(null);
  });
}

// Kullanıcı PDF yüklüyor
async function pdfTefsirYukle(input) {
  const dosya = input.files[0];
  if (!dosya) return;

  // Dosya adından katalog eşleşmesi bul
  let eslenenKat = null;
  const dosyaAdi = dosya.name.toLowerCase();
  for (const [sNo, katList] of Object.entries(PDF_KATALOG)) {
    for (const kat of katList) {
      if (dosyaAdi.includes(kat.dosya.toLowerCase())) {
        eslenenKat = kat; break;
      }
    }
    if (eslenenKat) break;
  }

  // Bulunamazsa kullanıcıya sor
  if (!eslenenKat) {
    const girdi = prompt('Bu PDF hangi sûreye ait? Sûre numarasını girin (örn: 78 veya 80)', '');
    if (!girdi || isNaN(parseInt(girdi))) return;
    const sNo = parseInt(girdi);
    const katList = PDF_KATALOG[sNo] || [];
    eslenenKat = katList[0] || { key: String(sNo), isim: sNo + '. Sûre', musannif: '' };
  }

  const buf = await dosya.arrayBuffer();
  await _pdfKaydetIDB(eslenenKat.key, buf.slice(0));
  alert('✅ PDF kaydedildi! ' + eslenenKat.isim + ' için tefsir butonu aktif.');
  input.value = '';
}

// Yüklü PDF listesini göster
async function _pdfYukluListeGuncelle() {
  const wrap = document.getElementById('pdf-yuklu-liste');
  if (!wrap) return;
  wrap.innerHTML = '';

  for (const [sNo, katList] of Object.entries(PDF_KATALOG)) {
    for (const kat of katList) {
      const buf = await _pdfOkuIDB(kat.key);
      const chip = document.createElement('span');
      chip.style.cssText = 'padding:4px 10px;border-radius:14px;font-size:11px;font-weight:700;cursor:pointer;' +
        (buf
          ? 'background:var(--gold3);border:1px solid var(--gold);color:var(--ink);'
          : 'background:var(--paper);border:1px solid var(--border);color:var(--muted);');
      chip.textContent = (buf ? '✅ ' : '○ ') + kat.isim;
      wrap.appendChild(chip);
    }
  }
}

// Sayfayı canvas'a çiz
async function _pdfSayfaCiz(sayfaNo) {
  if (!_pdfMevcut || _pdfRenderDevam) return;
  _pdfRenderDevam = true;

  const canvas = document.getElementById('pdf-canvas');
  const notCanvas = document.getElementById('pdf-not-canvas');
  const yukl = document.getElementById('pdf-yukleniyor');
  const modalBody = document.getElementById('pdf-modal-body');

  try {
    const sayfa = await _pdfMevcut.getPage(sayfaNo);
    // Modal genişliğine tam oturacak scale hesapla
    const modalW = modalBody ? modalBody.clientWidth : window.innerWidth;
    const dpr = window.devicePixelRatio || 1;
    const viewport0 = sayfa.getViewport({ scale: 1 });
    const scale = (modalW / viewport0.width) * dpr;
    const viewport = sayfa.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = modalW + 'px';
    canvas.style.height = (viewport.height / dpr) + 'px';
    canvas.style.display = 'block';

    if (notCanvas) {
      notCanvas.width = viewport.width;
      notCanvas.height = viewport.height;
      notCanvas.style.width = modalW + 'px';
      notCanvas.style.height = (viewport.height / dpr) + 'px';
      notCanvas.style.display = 'block';
      notCanvas.style.pointerEvents = _pdfCizimAraci ? 'auto' : 'none';
    }

    if (yukl) yukl.style.display = 'none';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await sayfa.render({ canvasContext: ctx, viewport }).promise;

    _pdfMevcutSayfa = sayfaNo;
    const bilgi = document.getElementById('pdf-sayfa-bilgi');
    if (bilgi) bilgi.textContent = sayfaNo + ' / ' + _pdfMevcut.numPages;

    _pdfNotCiz(sayfaNo);
    if (notCanvas) _pdfNotCanvasBagla(notCanvas);
    _pdfSwipeBagla();

  } catch(e) {
    console.error('Sayfa render hatası:', e);
  }
  _pdfRenderDevam = false;
}

// ── SWIPE (parmakla kaydırma) ──
let _swipeBasX = null, _swipeBasY = null;

let _pinchBasMesafe = null;
let _pinchBasZoom = 1;

function _pdfSwipeBagla() {
  const body = document.getElementById('pdf-modal-body');
  if (!body || body._swipeBagli) return;
  body._swipeBagli = true;

  // Swipe — tek parmak
  body.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      _swipeBasX = e.touches[0].clientX;
      _swipeBasY = e.touches[0].clientY;
      _pinchBasMesafe = null;
    } else if (e.touches.length === 2) {
      // Pinch başladı
      _swipeBasX = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      _pinchBasMesafe = Math.sqrt(dx*dx + dy*dy);
      _pinchBasZoom = _pdfZoom;
    }
  }, { passive: true });

  body.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && _pinchBasMesafe) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const mevcutMesafe = Math.sqrt(dx*dx + dy*dy);
      const oran = mevcutMesafe / _pinchBasMesafe;
      _pdfZoom = Math.max(0.5, Math.min(4.0, _pinchBasZoom * oran));
      // Zoom göstergesini güncelle
      const goster = document.getElementById('pdf-zoom-goster');
      if (goster) goster.textContent = Math.round(_pdfZoom * 100) + '%';
    }
  }, { passive: true });

  body.addEventListener('touchend', (e) => {
    if (_pinchBasMesafe && e.touches.length === 0) {
      // Pinch bitti — yeniden render
      _pinchBasMesafe = null;
      if (_pdfMevcut) _pdfSayfaCiz(_pdfMevcutSayfa);
      return;
    }
    if (_swipeBasX === null) return;
    const dx = e.changedTouches[0].clientX - _swipeBasX;
    const dy = e.changedTouches[0].clientY - _swipeBasY;
    _swipeBasX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      pdfSayfaDegis(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
}

// ── OKUMA MODU ──
let _okumaModuAcik = false;

let _reflowAcik = false;

function pdfOkumaModu() {
  if (!_pdfMevcut) return;
  _okumaModuAcik = !_okumaModuAcik;

  const btn = document.getElementById('pdf-okuma-btn');
  const modalSheet = document.querySelector('#pdf-tefsir-modal .modal-sheet');
  const modalBody = document.getElementById('pdf-modal-body');

  if (_okumaModuAcik) {
    if (modalSheet) {
      modalSheet.style.maxHeight = '100vh';
      modalSheet.style.height = '100vh';
      modalSheet.style.borderRadius = '0';
    }
    if (btn) {
      btn.innerHTML = '📄 Reflow &nbsp;|&nbsp; ✕';
      btn.style.color = 'var(--rust)';
      btn.style.borderColor = '#f0c0b8';
    }
    // Reflow butonu tıklanınca metin moduna geç
    btn.onclick = (e) => {
      if (e.target.textContent.includes('Reflow') || e.offsetX > btn.offsetWidth / 2) {
        _pdfReflowGoster();
      } else {
        pdfOkumaModuKapat();
      }
    };
    setTimeout(() => _pdfSayfaCiz(_pdfMevcutSayfa), 50);
  } else {
    pdfOkumaModuKapat();
  }
}

function pdfOkumaModuKapat() {
  _okumaModuAcik = false;
  _reflowAcik = false;
  const btn = document.getElementById('pdf-okuma-btn');
  const modalSheet = document.querySelector('#pdf-tefsir-modal .modal-sheet');
  const modalBody = document.getElementById('pdf-modal-body');

  if (modalSheet) {
    modalSheet.style.maxHeight = '';
    modalSheet.style.height = '';
    modalSheet.style.borderRadius = '';
  }
  if (btn) {
    btn.textContent = '📖 Okuma';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.onclick = pdfOkumaModu;
  }

  // Reflow alanını kaldır, canvas'ı geri getir
  const reflowDiv = document.getElementById('pdf-reflow-div');
  if (reflowDiv) reflowDiv.remove();
  const canvas = document.getElementById('pdf-canvas');
  const notCanvas = document.getElementById('pdf-not-canvas');
  if (canvas) canvas.style.display = 'block';
  if (notCanvas) notCanvas.style.display = 'block';

  setTimeout(() => _pdfSayfaCiz(_pdfMevcutSayfa), 50);
}

function _pdfReflowToggle() {
  if (!_pdfMevcut) return;
  const btn = document.getElementById('pdf-reflow-btn');
  const reflowDiv = document.getElementById('pdf-reflow-div');
  const canvas = document.getElementById('pdf-canvas');
  const notCanvas = document.getElementById('pdf-not-canvas');

  if (reflowDiv) {
    // Kapat — canvas'a geri dön
    reflowDiv.remove();
    if (canvas) canvas.style.display = 'block';
    if (notCanvas) notCanvas.style.display = 'block';
    if (btn) { btn.textContent = '📄 Reflow'; btn.style.color = ''; btn.style.borderColor = ''; }
  } else {
    // Aç
    if (btn) { btn.textContent = '📄 Kapat'; btn.style.color = 'var(--gold)'; btn.style.borderColor = 'var(--gold)'; }
    _pdfReflowGoster();
  }
}

async function _pdfReflowGoster() {
  if (!_pdfMevcut) return;
  _reflowAcik = true;

  const modalBody = document.getElementById('pdf-modal-body');
  const canvas = document.getElementById('pdf-canvas');
  const notCanvas = document.getElementById('pdf-not-canvas');

  // Canvas gizle
  if (canvas) canvas.style.display = 'none';
  if (notCanvas) notCanvas.style.display = 'none';

  // Reflow div oluştur veya temizle
  let reflowDiv = document.getElementById('pdf-reflow-div');
  if (!reflowDiv) {
    reflowDiv = document.createElement('div');
    reflowDiv.id = 'pdf-reflow-div';
    reflowDiv.style.cssText = 'width:100%;height:100%;overflow-y:auto;padding:16px;box-sizing:border-box;background:var(--paper);';
    modalBody.appendChild(reflowDiv);
  }
  reflowDiv.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Metin çıkarılıyor…</div>';

  try {
    // Mevcut sayfanın metnini çıkar
    const sayfa = await _pdfMevcut.getPage(_pdfMevcutSayfa);
    const icerik = await sayfa.getTextContent();

    // Satırları grupla — Y koordinatına göre
    const satirlar = {};
    icerik.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!satirlar[y]) satirlar[y] = [];
      satirlar[y].push({ text: item.str, x: item.transform[4], width: item.width });
    });

    // Y'ye göre sırala (büyükten küçüğe — PDF koordinatı ters)
    const siraliY = Object.keys(satirlar).map(Number).sort((a, b) => b - a);

    // HTML oluştur
    let html = '';
    siraliY.forEach(y => {
      const satirElemanlar = satirlar[y].sort((a, b) => a.x - b.x);
      const satirMetni = satirElemanlar.map(e => e.text).join(' ').trim();
      if (!satirMetni) return;

      // Arapça mı kontrol et
      const arapcaMi = /[؀-ۿ]/.test(satirMetni);

      if (arapcaMi) {
        html += `<div style="font-family:var(--ar-font);font-size:22px;line-height:2;color:var(--turkuaz, #2dd4bf);direction:rtl;text-align:right;margin:8px 0;padding:8px;background:rgba(45,212,191,0.05);border-radius:8px;">${satirMetni}</div>`;
      } else if (satirMetni.length < 100 && satirMetni === satirMetni.toUpperCase() && satirMetni.length > 3) {
        // Başlık satırı
        html += `<div style="font-family:Playfair Display,serif;font-size:15px;font-weight:700;color:var(--ink);margin:12px 0 4px;">${satirMetni}</div>`;
      } else {
        html += `<span style="font-family:'Source Serif 4',serif;font-size:15px;line-height:1.85;color:var(--ink2);">${satirMetni} </span>`;
      }
    });

    // Paragraf yapısı kur — boş satırlarda paragraf kır
    reflowDiv.innerHTML = `
      <div style="max-width:100%;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
          <span style="font-size:11px;color:var(--muted);font-weight:700;">REFLOW — Sayfa ${_pdfMevcutSayfa}/${_pdfMevcut.numPages}</span>
          <div style="display:flex;gap:6px;">
            <button onclick="pdfSayfaDegis(-1);setTimeout(_pdfReflowGoster,200)" style="padding:4px 10px;background:var(--paper2);border:1px solid var(--border);border-radius:6px;font-size:14px;cursor:pointer;">‹</button>
            <button onclick="pdfSayfaDegis(1);setTimeout(_pdfReflowGoster,200)" style="padding:4px 10px;background:var(--paper2);border:1px solid var(--border);border-radius:6px;font-size:14px;cursor:pointer;">›</button>
          </div>
        </div>
        <div style="line-height:1.85;">${html}</div>
      </div>`;

  } catch(e) {
    reflowDiv.innerHTML = '<div style="padding:20px;color:var(--rust);">Metin çıkarılamadı: ' + e.message + '</div>';
  }
}

// Not canvas çizim sistemi
let _cizimYapiliyor = false;
let _sonX = 0, _sonY = 0;

function _pdfNotCanvasBagla(nc) {
  if (!nc) return;
  nc.onmousedown = nc.ontouchstart = (e) => {
    if (!_pdfCizimAraci) return;
    _cizimYapiliyor = true;
    const [x, y] = _pdfKoord(e, nc);
    _sonX = x; _sonY = y;
    e.preventDefault();
  };
  nc.onmousemove = nc.ontouchmove = (e) => {
    if (!_cizimYapiliyor || !_pdfCizimAraci) return;
    const [x, y] = _pdfKoord(e, nc);
    const ctx = nc.getContext('2d');
    if (_pdfCizimAraci === 'kalem') {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      ctx.globalCompositeOperation = 'source-over';
    } else if (_pdfCizimAraci === 'marker') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 16;
      ctx.globalCompositeOperation = 'source-over';
    } else if (_pdfCizimAraci === 'silgi') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 20;
    }
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(_sonX, _sonY);
    ctx.lineTo(x, y);
    ctx.stroke();
    _sonX = x; _sonY = y;
    e.preventDefault();
  };
  nc.onmouseup = nc.ontouchend = () => {
    if (_cizimYapiliyor) {
      _cizimYapiliyor = false;
      _pdfNotKaydet(_pdfMevcutSayfa, nc);
    }
  };
}

function _pdfKoord(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return [(src.clientX - rect.left) * scaleX, (src.clientY - rect.top) * scaleY];
}

function _pdfNotKaydet(sayfaNo, canvas) {
  if (!_pdfMevcutSure) return;
  const key = 'pdfnot_' + _pdfMevcutSure + '_' + sayfaNo;
  localStorage.setItem(key, canvas.toDataURL());
}

function _pdfNotCiz(sayfaNo) {
  const nc = document.getElementById('pdf-not-canvas');
  if (!nc || !_pdfMevcutSure) return;
  const key = 'pdfnot_' + _pdfMevcutSure + '_' + sayfaNo;
  const data = localStorage.getItem(key);
  if (!data) return;
  const img = new Image();
  img.onload = () => nc.getContext('2d').drawImage(img, 0, 0);
  img.src = data;
}

function pdfAracSec(arac) {
  _pdfCizimAraci = arac;
  const nc = document.getElementById('pdf-not-canvas');
  if (nc) nc.style.cursor = arac ? 'crosshair' : 'default';
  ['kalem', 'marker', 'silgi'].forEach(a => {
    const btn = document.getElementById('pdf-arac-' + a);
    if (btn) btn.style.background = (a === arac) ? 'var(--gold3)' : 'var(--paper)';
    if (btn) btn.style.borderColor = (a === arac) ? 'var(--gold)' : 'var(--border)';
  });
}

async function pdfMetniKopyala(btn) {
  if (!_pdfMevcut) { alert('Önce bir PDF açın.'); return; }
  try {
    const sayfa = await _pdfMevcut.getPage(_pdfMevcutSayfa);
    const icerik = await sayfa.getTextContent();
    // Satır sonlarını koru
    let metin = '';
    let sonY = null;
    icerik.items.forEach(item => {
      if (sonY !== null && Math.abs(item.transform[5] - sonY) > 5) metin += '\n';
      metin += item.str;
      if (item.str && !item.str.endsWith(' ')) metin += ' ';
      sonY = item.transform[5];
    });
    metin = metin.trim();
    if (!metin) { alert('Bu sayfada kopyalanabilir metin bulunamadı.'); return; }
    await navigator.clipboard.writeText(metin);
    if (btn) {
      const eski = btn.textContent;
      btn.textContent = '✅ Kopyalandı!';
      btn.style.color = 'var(--gold)';
      setTimeout(() => { btn.textContent = eski; btn.style.color = ''; }, 2500);
    }
  } catch(e) {
    // Clipboard API çalışmazsa fallback
    try {
      const sayfa = await _pdfMevcut.getPage(_pdfMevcutSayfa);
      const icerik = await sayfa.getTextContent();
      const metin = icerik.items.map(i => i.str).join(' ');
      const ta = document.createElement('textarea');
      ta.value = metin;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (btn) { btn.textContent = '✅ Kopyalandı!'; setTimeout(() => btn.textContent = '📋 Kopyala', 2500); }
    } catch(e2) {
      alert('Kopyalama başarısız. Tarayıcı izni gerekebilir.');
    }
  }
}

function pdfZoomDegis(miktar) {
  _pdfZoom = Math.max(0.5, Math.min(3.0, _pdfZoom + miktar));
  const goster = document.getElementById('pdf-zoom-goster');
  if (goster) goster.textContent = Math.round(_pdfZoom * 100) + '%';
  if (_pdfMevcut) _pdfSayfaCiz(_pdfMevcutSayfa);
}

function pdfZoomSifirla() {
  _pdfZoom = 1.0;
  const goster = document.getElementById('pdf-zoom-goster');
  if (goster) goster.textContent = '100%';
  if (_pdfMevcut) _pdfSayfaCiz(_pdfMevcutSayfa);
}

async function pdfSayfaSil() {
  if (!_pdfMevcut) { alert('Önce bir PDF açın.'); return; }
  const silinecek = _pdfMevcutSayfa;
  if (!confirm(silinecek + '. sayfa kalıcı olarak silinecek. Emin misiniz?')) return;

  const yukl = document.getElementById('pdf-yukleniyor');
  if (yukl) { yukl.style.display = 'block'; yukl.textContent = 'Sayfa siliniyor…'; }

  try {
    // pdf-lib yükle
    if (!window.PDFLib) {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
        s.onload = () => { if (window.PDFLib) res(); else rej(new Error('PDFLib yüklenemedi')); };
        s.onerror = () => rej(new Error('Script yüklenemedi'));
        document.head.appendChild(s);
      });
    }
    await new Promise(r => setTimeout(r, 200)); // CDN settle

    const idbKey = _pdfMevcutKatalog ? _pdfMevcutKatalog.id : String(_pdfMevcutSure);
    const buf = await _pdfOkuIDB(idbKey);
    if (!buf) { alert('PDF verisi bulunamadı.'); return; }

    const uint = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
    const pdfDoc = await PDFLib.PDFDocument.load(uint);

    if (pdfDoc.getPageCount() <= 1) { alert('Son sayfa silinemez.'); return; }
    pdfDoc.removePage(silinecek - 1);
    const yeniBytes = await pdfDoc.save();
    const yeniBuf = yeniBytes.buffer.slice(yeniBytes.byteOffset, yeniBytes.byteOffset + yeniBytes.byteLength);

    await _pdfKaydetIDB(idbKey, yeniBuf);

    // Sayfa haritasını güncelle — silinen sayfadan sonrakileri kaydır
    const kayitlar = _pdfKutKayitlariGetir();
    const kayitIdx = kayitlar.findIndex(k => k.id === idbKey);
    if (kayitIdx >= 0) {
      const harita = kayitlar[kayitIdx].sayfaHaritasi || {};
      const yeniHarita = {};
      Object.entries(harita).forEach(([ayet, sayfa]) => {
        const s = parseInt(sayfa);
        if (s < silinecek) yeniHarita[ayet] = s;
        else if (s > silinecek) yeniHarita[ayet] = s - 1;
        // s === silinecek → o âyet artık haritada yok
      });
      kayitlar[kayitIdx].sayfaHaritasi = yeniHarita;
      _pdfKutKayitlariKaydet(kayitlar);
    }

    // Yeniden render
    _pdfJsHazirla(async () => {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(yeniBuf) }).promise;
      _pdfMevcut = pdf;
      if (yukl) yukl.style.display = 'none';
      const hedef = Math.min(silinecek, pdf.numPages);
      await _pdfSayfaCiz(hedef);
    });
  } catch(e) {
    if (yukl) yukl.style.display = 'none';
    alert('Sayfa silme hatası: ' + e.message);
    console.error(e);
  }
}

// Sayfa değiştir (±1)
function pdfSayfaDegis(yon) {
  if (!_pdfMevcut) return;
  const yeni = _pdfMevcutSayfa + yon;
  if (yeni < 1 || yeni > _pdfMevcut.numPages) return;
  _pdfSayfaCiz(yeni);
}

// Aktif çizim aracı
let _pdfCizimAraci = null;
let _pdfAktifKayitlar = [];
let _pdfAktifIdx = 0;
let _pdfAktifSure = null;
let _pdfAktifAyet = null;

async function pdfTefsirModalAc(sureNo, ayetNo) {
  const pdfKayitlar = _ayetIcinPdfler(sureNo, ayetNo);
  const modal = document.getElementById('pdf-tefsir-modal');
  const baslik = document.getElementById('pdf-tefsir-baslik');
  const alt = document.getElementById('pdf-tefsir-alt');
  const canvas = document.getElementById('pdf-canvas');
  const yukl = document.getElementById('pdf-yukleniyor');
  const sure = SURELER[sureNo - 1];

  _pdfAktifKayitlar = pdfKayitlar;
  _pdfAktifIdx = 0;
  _pdfAktifSure = sureNo;
  _pdfAktifAyet = ayetNo;

  baslik.textContent = (sure ? sure.isim + ' ' : '') + sureNo + ':' + ayetNo + ' — PDF Tefsir';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  if (pdfKayitlar.length === 0) {
    alt.textContent = '';
    canvas.style.display = 'none';
    yukl.style.display = 'block';
    yukl.innerHTML = '📂 Bu âyet için PDF eklenmedi.<br><span style="font-size:12px;color:var(--muted);">Daha › PDF Kütüphanesinden ekleyin</span>';
    _pdfSekmeleriGuncelle([]);
    return;
  }

  _pdfSekmeleriGuncelle(pdfKayitlar);
  await _pdfKayitYukle(pdfKayitlar[0], ayetNo);
}

function _pdfSekmeleriGuncelle(kayitlar) {
  // Modal header'daki alt alanı sekmeler için kullan
  const alt = document.getElementById('pdf-tefsir-alt');
  alt.innerHTML = '';
  if (kayitlar.length <= 1) {
    alt.textContent = kayitlar[0] ? '📖 ' + (kayitlar[0].isim || kayitlar[0].muellif || '') : '';
    return;
  }
  alt.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;';
  kayitlar.forEach((k, i) => {
    const tab = document.createElement('button');
    tab.style.cssText = 'padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ' + (i === _pdfAktifIdx ? 'var(--gold)' : 'var(--border)') + ';background:' + (i === _pdfAktifIdx ? 'var(--gold)' : 'var(--paper2)') + ';color:' + (i === _pdfAktifIdx ? '#fff' : 'var(--muted)') + ';';
    tab.textContent = k.isim || k.muellif || 'Tefsir';
    tab.onclick = async () => {
      _pdfAktifIdx = i;
      _pdfSekmeleriGuncelle(kayitlar);
      await _pdfKayitYukle(k, _pdfAktifAyet);
    };
    alt.appendChild(tab);
  });
}

async function _pdfKayitYukle(kayit, ayetNo) {
  // JSON tip ise farklı göster
  if (kayit._tip === 'json') {
    await jsonTefsirAc(_pdfAktifSure, ayetNo, kayit);
    return;
  }

  const canvas = document.getElementById('pdf-canvas');
  const yukl = document.getElementById('pdf-yukleniyor');

  yukl.style.display = 'block';
  yukl.innerHTML = '<div class="spin"></div>Yükleniyor…';
  canvas.style.display = 'none';

  const buf = await _pdfOkuIDB(kayit.id);
  if (!buf) {
    yukl.innerHTML = '⚠️ PDF dosyası bulunamadı.<br><span style="font-size:12px;color:var(--muted);">Kütüphaneden tekrar yükleyin</span>';
    return;
  }

  _pdfJsHazirla(async () => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      _pdfMevcut = pdf;
      _pdfMevcutSure = kayit.sureNo;
      _pdfMevcutKatalog = kayit;
      const hedefSayfa = (kayit.sayfaHaritasi && (kayit.sayfaHaritasi[String(ayetNo)] || kayit.sayfaHaritasi[parseInt(ayetNo)])) || 1;
      await _pdfSayfaCiz(hedefSayfa);
    } catch(e) {
      yukl.style.display = 'block';
      yukl.textContent = 'PDF yüklenemedi: ' + e.message;
    }
  });
}

function pdfTefsirModalKapat(e) {
  if (e && e.target !== document.getElementById('pdf-tefsir-modal')) return;
  document.getElementById('pdf-tefsir-modal').classList.remove('open');
  document.body.style.overflow = '';
  const rd = document.getElementById('pdf-reflow-div');
  if (rd) { rd.style.display = 'none'; rd.innerHTML = ''; }
}

function notlarModalKapat(e) {
  if (e && e.target !== document.getElementById('notlar-modal')) return;
  document.getElementById('notlar-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function sureBilgiModalKapat(e) {
  if (e && e.target !== document.getElementById('sure-bilgi-modal')) return;
  document.getElementById('sure-bilgi-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function sureBilgiModalAc(sNo) {
  const modal = document.getElementById('sure-bilgi-modal');
  const sure = SURELER[sNo - 1];
  document.getElementById('sure-bilgi-baslik').textContent = (sure ? sure.isim : sNo + '. Sure') + ' Suresi';
  document.getElementById('sure-bilgi-alt').textContent = sure ? sure.tip + '  |  ' + sure.ayet + ' ayet  |  ' + sure.cuz + '. Cuz' : '';
  const bilgi = SURE_BILGI[sNo] || '';
  const ic = document.getElementById('sure-bilgi-ic');
  if (!bilgi.trim()) {
    ic.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted);">Bu sure icin bilgi bulunamadi.</div>';
  } else {
    ic.innerHTML = '<div style="padding:16px 18px 30px;font-family:Georgia,serif;font-size:14px;color:var(--ink);line-height:1.9;">' + bilgi + '</div>';
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}


// ════════════════════════════════════════
//  MÜELLİFLER MODAL
// ════════════════════════════════════════
function muellifModalKapat(e) {
  if (e && e.target !== document.getElementById('muellif-modal')) return;
  document.getElementById('muellif-modal').classList.remove('open');
  document.body.style.overflow = '';
}

async function muellifModalAc(sureNo, ayetNo) {
  const modal = document.getElementById('muellif-modal');
  const baslik = document.getElementById('muellif-modal-baslik');
  const alt = document.getElementById('muellif-modal-alt');
  const ic = document.getElementById('muellif-modal-ic');
  const sure = SURELER[parseInt(sureNo) - 1];

  baslik.textContent = (sure ? sure.isim + ' ' : '') + sureNo + ':' + ayetNo;
  alt.textContent = 'Müellif Tefsirleri';
  ic.innerHTML = '';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  const kayitlar = _jsonTefsirKayitlariGetir().filter(k => parseInt(k.sure_no) === parseInt(sureNo));

  if (kayitlar.length === 0) {
    ic.innerHTML = `
      <div style="padding:40px 20px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">📂</div>
        <div style="font-family:'Playfair Display',serif;font-size:15px;color:var(--ink);margin-bottom:8px;">Müellif eklenmedi</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;">Daha › PDF Kütüphanesinden<br>JSON formatında tefsir ekleyin</div>
      </div>`;
    return;
  }

  const liste = document.createElement('div');
  liste.style.cssText = 'padding:12px;';

  for (const k of kayitlar) {
    const sureBilgi = SURELER[parseInt(k.sure_no) - 1];
    const btn = document.createElement('button');
    btn.style.cssText = `
      width:100%;text-align:left;padding:16px;
      background:var(--paper);border:1.5px solid var(--border);
      border-radius:14px;margin-bottom:10px;cursor:pointer;
      display:flex;align-items:center;gap:14px;
      box-shadow:0 2px 8px var(--shadow);
      transition:box-shadow 0.15s, border-color 0.15s;
    `;
    btn.innerHTML = `
      <div style="width:44px;height:44px;border-radius:12px;background:var(--gold2);
        display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📝</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;
          color:var(--ink);margin-bottom:3px;">${k.muellif}</div>
        <div style="font-size:11px;color:var(--muted);">
          ${sureBilgi ? sureBilgi.isim : k.sure_no + '. Sûre'} · ${k.sure_no}. Sûre
        </div>
      </div>
      <div style="font-size:20px;color:var(--gold);">›</div>
    `;
    btn.addEventListener('mouseenter', () => { btn.style.boxShadow = '0 4px 16px var(--shadow)'; btn.style.borderColor = 'var(--gold)'; });
    btn.addEventListener('mouseleave', () => { btn.style.boxShadow = '0 2px 8px var(--shadow)'; btn.style.borderColor = 'var(--border)'; });
    btn.onclick = () => _muellifTefsirGoster(ic, sureNo, ayetNo, k, baslik, alt);
    liste.appendChild(btn);
  }

  ic.appendChild(liste);
}

async function _muellifTefsirGoster(ic, sureNo, ayetNo, kayit, baslik, alt) {
  const sure = SURELER[parseInt(sureNo) - 1];
  ic.innerHTML = '';

  // Geri bar
  const geriBar = document.createElement('div');
  geriBar.style.cssText = 'padding:10px 14px;border-bottom:1px solid var(--border);background:var(--paper2);display:flex;align-items:center;gap:8px;';
  const geriBtn = document.createElement('button');
  geriBtn.style.cssText = 'background:none;border:none;color:var(--gold);font-size:13px;font-weight:700;cursor:pointer;padding:4px 0;display:flex;align-items:center;gap:4px;';
  geriBtn.innerHTML = '‹ Tüm Müellifler';
  geriBtn.onclick = () => muellifModalAc(sureNo, ayetNo);
  geriBar.appendChild(geriBtn);
  ic.appendChild(geriBar);

  baslik.textContent = kayit.muellif;
  alt.textContent = (sure ? sure.isim + ' ' : '') + sureNo + ':' + ayetNo;

  // Yükleniyor
  const yukl = document.createElement('div');
  yukl.style.cssText = 'padding:50px 20px;text-align:center;color:var(--muted);';
  yukl.innerHTML = '<div class="spin" style="margin:0 auto 12px;"></div>Tefsir yükleniyor…';
  ic.appendChild(yukl);

  const cacheKey = kayit.sure_no + '_' + kayit.muellif;
  let data = _jsonTefsirCache[cacheKey] || null;

  if (!data) {
    try {
      let url = kayit.url;
      if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
        url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      data = await r.json();
      _jsonTefsirCache[cacheKey] = data;
    } catch(e) {
      yukl.innerHTML = `<div style="color:var(--rust);font-size:14px;">⚠️ Tefsir yüklenemedi<br>
        <span style="font-size:12px;color:var(--muted);">${e.message}</span></div>`;
      return;
    }
  }

  ic.removeChild(yukl);

  const ayetler = data.ayetler || {};
  const yorum = ayetler[String(ayetNo)] || ayetler[parseInt(ayetNo)] || null;

  // Tefsir içerik alanı — okunaklı tasarım
  const icerik = document.createElement('div');
  icerik.style.cssText = 'padding:0 0 20px;';

  // Üst bilgi şeridi
  const bilgiSerit = document.createElement('div');
  bilgiSerit.style.cssText = `
    display:flex;align-items:center;gap:12px;
    padding:14px 16px;
    background:linear-gradient(135deg, var(--gold2) 0%, var(--paper2) 100%);
    border-bottom:1px solid var(--border);
  `;
  bilgiSerit.innerHTML = `
    <div style="width:40px;height:40px;border-radius:10px;background:var(--gold);
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-family:'Playfair Display',serif;font-size:16px;font-weight:700;flex-shrink:0;">${sureNo}</div>
    <div>
      <div style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:var(--ink);">
        ${kayit.muellif}
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
        ${sure ? sure.isim : ''} ${sureNo}:${ayetNo} tefsiri
      </div>
    </div>
  `;
  icerik.appendChild(bilgiSerit);

  if (!yorum) {
    const bosEl = document.createElement('div');
    bosEl.style.cssText = 'padding:40px 20px;text-align:center;';
    bosEl.innerHTML = `
      <div style="font-size:28px;margin-bottom:10px;">🔍</div>
      <div style="font-family:'Playfair Display',serif;font-size:14px;color:var(--muted);">
        Bu âyet için tefsir bulunamadı<br>
        <span style="font-size:12px;">(Âyet ${ayetNo})</span>
      </div>`;
    icerik.appendChild(bosEl);
  } else {
    // Metin alanı — okunabilir, göz dinlendiren
    const metin = document.createElement('div');
    metin.style.cssText = `
      margin:16px;
      padding:20px 20px;
      background:var(--paper);
      border-radius:14px;
      border:1px solid var(--border);
      border-left:4px solid var(--gold);
      box-shadow:0 2px 12px var(--shadow);
      font-family:'Source Serif 4',serif;
      font-size:16px;
      line-height:2;
      color:var(--ink);
      letter-spacing:0.01em;
    `;

    // HTML içerik desteği: <p></p>, <br>, vs.
    // Önce <p></p> → boş satırları temizle, sonra düzgün render et
    let yorumTemiz = String(yorum)
      .replace(/<p>\s*<\/p>/gi, '\n\n')           // <p></p> → çift satır
      .replace(/<p>/gi, '')                         // <p> açan tag → kaldır
      .replace(/<\/p>/gi, '\n\n')                  // </p> → çift satır
      .replace(/<br\s*\/?>/gi, '\n')               // <br> → satır sonu
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')        // <b> → markdown bold geçici
      .replace(/<i>(.*?)<\/i>/gi, '$1')            // <i> → düz
      .replace(/<[^>]+>/g, '')                     // kalan tag'ları temizle
      .replace(/\n{3,}/g, '\n\n')                 // 3+ newline → 2'ye indir
      .trim();

    const paragraflar = yorumTemiz.split('\n\n').filter(p => p.trim());
    paragraflar.forEach((p, i) => {
      const pTemiz = p.replace(/\n/g, ' ').trim();
      const dipnotM = pTemiz.match(/^(\d+)-\s(.+)/);
      if (dipnotM) {
        const dipDiv = document.createElement('div');
        dipDiv.style.cssText = `
          display:flex;gap:10px;
          padding:10px 12px;
          background:var(--paper2);
          border-radius:8px;
          margin-top:${i > 0 ? '10' : '0'}px;
          border-left:2px solid var(--gold);
        `;
        const numEl = document.createElement('span');
        numEl.style.cssText = 'font-size:11px;font-weight:800;color:var(--gold);min-width:20px;margin-top:2px;flex-shrink:0;';
        numEl.textContent = '[' + dipnotM[1] + ']';
        const txtEl = document.createElement('span');
        txtEl.style.cssText = 'font-size:14px;color:var(--muted);line-height:1.8;';
        txtEl.appendChild(atifMetniParsele(dipnotM[2]));
        dipDiv.appendChild(numEl);
        dipDiv.appendChild(txtEl);
        metin.appendChild(dipDiv);
      } else {
        const pEl = document.createElement('p');
        pEl.style.cssText = `
          margin:0 0 ${i < paragraflar.length - 1 ? '16' : '0'}px;
        `;
        // [1] referanslarını süperskript yap + atıf zinciri
        const metinAtif = pTemiz.replace(/\[(\d+)\]/g, '|||DIPNOT$1|||');
        const parcalar = metinAtif.split('|||');
        parcalar.forEach(parca => {
          const dm = parca.match(/^DIPNOT(\d+)$/);
          if (dm) {
            const sup = document.createElement('sup');
            sup.style.cssText = 'color:var(--gold);font-weight:700;font-size:11px;cursor:pointer;';
            sup.textContent = '[' + dm[1] + ']';
            pEl.appendChild(sup);
          } else if (parca) {
            pEl.appendChild(atifMetniParsele(parca));
          }
        });
        metin.appendChild(pEl);
      }
    });

    icerik.appendChild(metin);
  }

  ic.appendChild(icerik);
}

// ════════════════════════════════════════
//  AYET EKSTRİ PANELİ (Tefsir + Hadis + Kök)
// ════════════════════════════════════════
const tefsirCache = {};
const hadisCache = {};
const kokCache = {};

function ayetEkstraPanel(sNo, aNo) {
  const wrap = document.createElement('div');
  wrap.className = 'ayet-ekstra-wrap';

  const btnRow = document.createElement('div');
  btnRow.className = 'ayet-ekstra-btn-row';

  // Sa'dî Tefsiri butonu
  const sadiBtn = document.createElement('button');
  sadiBtn.className = 'ayet-ekstra-btn';
  sadiBtn.setAttribute('data-tip', 'tefsir');
  sadiBtn.innerHTML = '📖 Tefsir';
  const sadiPanel = document.createElement('div');
  sadiPanel.className = 'ayet-ekstra-panel';
  sadiPanel.innerHTML = "<div class='ayet-ekstra-baslik'>📖 Tefsir</div><div class='ayet-ekstra-icerik yukl'>Yükleniyor…</div>";
  sadiBtn.onclick = () => {
    const acik = sadiPanel.classList.toggle('open');
    sadiBtn.classList.toggle('aktif', acik);
    if (acik) sadiTefsirYukle(sNo, aNo, sadiPanel);
  };

  btnRow.appendChild(sadiBtn);
  wrap.appendChild(btnRow);
  wrap.appendChild(sadiPanel);
  return wrap;
}

// ════════════════════════════════════════
//  KURANSEFERBERLIGI.COM SAYFA HARITASI
// ════════════════════════════════════════
const ksfSayfaCache = {};
const ksfIcerikCache = {};

async function _ksfSayfaHaritaAl(sNo) {
  if (ksfSayfaCache[sNo]) return ksfSayfaCache[sNo];
  try {
    const r = await fetch('https://kuranseferberligi.com/Sure/' + sNo);
    const html = await r.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const linkler = Array.from(doc.querySelectorAll('a[href*="/Sayfa/"]'));
    const harita = [];
    linkler.forEach(link => {
      const href = link.getAttribute('href') || '';
      const m = href.match(/\/Sayfa\/(\d+)/);
      if (!m) return;
      const sayfaNo = parseInt(m[1]);
      const metin = link.textContent || '';
      const aralik = metin.match(/(\d+)[-–](\d+)/);
      if (aralik) {
        harita.push({ sayfaNo, bas: parseInt(aralik[1]), bit: parseInt(aralik[2]) });
      }
    });
    ksfSayfaCache[sNo] = harita;
    return harita;
  } catch(e) { return []; }
}

async function _ksfSayfaIcerikAl(sayfaNo) {
  if (ksfIcerikCache[sayfaNo]) return ksfIcerikCache[sayfaNo];
  try {
    const r = await fetch('https://kuranseferberligi.com/Sayfa/' + sayfaNo);
    const html = await r.text();
    ksfIcerikCache[sayfaNo] = html;
    return html;
  } catch(e) { return ''; }
}

function _ksfAyetBolumCikart(html, sNo, aNo) {
  // HTML'den ilgili âyetin tefsir ve hadis metinlerini çıkart
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sure = SURELER[sNo-1];
  if (!sure) return { tefsir: '', hadis: '' };

  const tumMetin = doc.body.textContent || '';

  // Ayet bölümü: "SureName Sûresi X. Ayet" başlığından sonraki metin
  const ayetBaslik = new RegExp(
    sure.isim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*?' + aNo + '\.\s*[Aa]ye[ti]',
    'i'
  );
  const ayetIdx = tumMetin.search(ayetBaslik);
  if (ayetIdx < 0) {
    // Âyet bulunamazsa sayfa içeriğini tamamını dene
    return _ksfSayfaTefsirHadis(tumMetin);
  }

  // Bir sonraki âyet başlığına kadar al
  const sonraBaslik = new RegExp(
    sure.isim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*?\d+\.\s*[Aa]ye[ti]',
    'gi'
  );
  let sonraIdx = -1;
  let m;
  sonraBaslik.lastIndex = ayetIdx + 10;
  while ((m = sonraBaslik.exec(tumMetin)) !== null) {
    if (m.index > ayetIdx + 10) { sonraIdx = m.index; break; }
  }

  const ayetMetin = sonraIdx > 0
    ? tumMetin.substring(ayetIdx, sonraIdx)
    : tumMetin.substring(ayetIdx, ayetIdx + 3000);

  return _ksfSayfaTefsirHadis(ayetMetin);
}

function _ksfSayfaTefsirHadis(metin) {
  let tefsir = '', hadis = '';

  // Tefsir bölümü
  const tefsirM = metin.match(/Ayetin Tefsiri([\s\S]*?)(?=Kelime Çalışması|Kelime Meali|İrab|Belâgat|Hadis|$)/i)
                || metin.match(/Tefsiri?([\s\S]*?)(?=Kelime|İrab|Belâgat|Hadis|$)/i);
  if (tefsirM) tefsir = tefsirM[1].replace(/\s+/g, ' ').trim().substring(0, 2500);

  // Hadis bölümü
  const hadisM = metin.match(/Hadis[-i\s]*[Şş]erif([\s\S]*?)(?=Kelime|Tefsir|İrab|Belâgat|$)/i)
               || metin.match(/Hadis([\s\S]*?)(?=Kelime|Tefsir|İrab|Belâgat|$)/i);
  if (hadisM) hadis = hadisM[1].replace(/\s+/g, ' ').trim().substring(0, 1500);

  return { tefsir, hadis };
}


// ── Hadis yükle — kuranseferberligi.com birincil, yerel veri tabanı fallback ──
async function _hadisYukle(sNo, aNo, panel) {
  const icerik = panel.querySelector('.ayet-ekstra-icerik');
  const ck = sNo+':'+aNo;
  if (hadisCache[ck] !== undefined) {
    icerik.textContent = hadisCache[ck] || 'Bu âyet için hadis bulunamadı.';
    icerik.classList.remove('yukl');
    return;
  }
  try {
    const harita = await _ksfSayfaHaritaAl(sNo);
    let sayfaNo = null;
    for (const h of harita) {
      if (aNo >= h.bas && aNo <= h.bit) { sayfaNo = h.sayfaNo; break; }
    }
    if (sayfaNo) {
      const html = await _ksfSayfaIcerikAl(sayfaNo);
      if (html) {
        const { hadis } = _ksfAyetBolumCikart(html, sNo, aNo);
        if (hadis && hadis.length > 20) {
          hadisCache[ck] = hadis;
          icerik.textContent = hadis;
          icerik.classList.remove('yukl');
          return;
        }
      }
    }
  } catch(e) {}
  // Fallback: yerel veri tabanı
  _hadisManuel(sNo, aNo, icerik);
}

function _hadisManuel(sNo, aNo, icerik) {
  const key = sNo+':'+aNo;
  if (HADİS_VERİTABANI[key]) {
    hadisCache[key] = HADİS_VERİTABANI[key];
    icerik.textContent = HADİS_VERİTABANI[key];
    icerik.classList.remove('yukl');
    return;
  }
  for (const k in HADİS_VERİTABANI) {
    if (k.startsWith(sNo+':') && Math.abs(parseInt(k.split(':')[1]) - aNo) <= 2) {
      hadisCache[key] = HADİS_VERİTABANI[k];
      icerik.textContent = HADİS_VERİTABANI[k];
      icerik.classList.remove('yukl');
      return;
    }
  }
  hadisCache[key] = '';
  icerik.textContent = 'Bu âyet için hadis-i şerif bulunamadı.';
  icerik.classList.remove('yukl');
}

function _hadisRender(data, icerik) {
  icerik.classList.remove('yukl');
  icerik.textContent = typeof data === 'string' ? data : 'Hadis verisi işlenemedi.';
}

// ── Kök yükle ──
function _kokYukle(sNo, aNo, panel) {
  const icerik = panel.querySelector('.ayet-ekstra-icerik');
  const ck = sNo+':'+aNo;
  if (kokCache[ck]) { _kokRender(kokCache[ck], icerik); return; }

  fetch(`https://api.acikkuran.com/surah/${sNo}/verse/${aNo}/verseparts`)
    .then(r => r.json())
    .then(d => {
      const kelimeler = d.data || [];
      // Sadece kökü olanları al
      const koklu = kelimeler.filter(k => k.root && k.root.arabic);
      kokCache[ck] = koklu;
      _kokRender(koklu, icerik);
    })
    .catch(() => {
      icerik.textContent = 'Kök verisi yüklenemedi.';
      icerik.classList.remove('yukl');
    });
}

function _kokRender(koklu, icerik) {
  icerik.classList.remove('yukl');
  icerik.innerHTML = '';

  if (!koklu || koklu.length === 0) {
    icerik.textContent = 'Bu âyet için kök verisi bulunamadı.';
    return;
  }

  // Tekrar eden kökleri kaldır
  const gorulmus = new Set();
  koklu.forEach(k => {
    const kokAr = k.root.arabic;
    const kokLatin = k.root.latin || '';
    const kokId = k.root.id || kokAr;
    if (gorulmus.has(kokId)) return;
    gorulmus.add(kokId);

    const satir = document.createElement('div');
    satir.className = 'kok-satir';
    satir.title = 'Bu kökü içeren ayetleri göster';

    const arEl = document.createElement('div');
    arEl.className = 'kty-kok-link';
    arEl.textContent = kokAr;

    const latinEl = document.createElement('span');
    latinEl.className = 'kty-kok-latin';
    latinEl.textContent = kokLatin;

    const trEl = document.createElement('div');
    trEl.className = 'kok-tr';
    trEl.textContent = k.turkish || '';

    satir.appendChild(arEl);
    satir.appendChild(latinEl);
    satir.appendChild(trEl);

    // Tıklayınca kök araması yap
    satir.onclick = () => kokAyetleriniGoster(kokId, kokLatin, kokAr);

    icerik.appendChild(satir);
  });
}

// Kök tıklandığında ilgili ayetleri modal'da göster
async function kokAyetleriniGoster(kokId, kokLatin, kokAr) {
  if (!kokLatin) { alert('Bu kök için arama yapılamıyor.'); return; }

  document.getElementById('ceviri-modal-baslik').textContent = '√ ' + kokAr + ' (' + kokLatin + ') — İlgili Âyetler';
  const ic = document.getElementById('ceviri-modal-ic');
  ic.innerHTML = '<div class="yukleniyor"><div class="spin"></div>Kök araması yapılıyor…</div>';
  document.getElementById('ceviri-modal').classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const r = await fetch(`https://api.acikkuran.com/root/latin/${encodeURIComponent(kokLatin)}/verseparts?page=1`);
    const d = await r.json();
    const ayetler = d.data || [];
    ic.innerHTML = '';

    if (ayetler.length === 0) {
      ic.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">Sonuç bulunamadı.</div>';
      return;
    }

    const baslik = document.createElement('div');
    baslik.style.cssText = 'font-size:11px;color:var(--muted);padding:0 0 10px;border-bottom:1px solid var(--border);margin-bottom:10px;';
    baslik.textContent = '√ ' + kokAr + ' kökünden türeyen kelimeler — ' + (d.meta?.total || ayetler.length) + ' âyet';
    ic.appendChild(baslik);

    ayetler.forEach(item => {
      const sure = SURELER[(item.surah?.id || 1) - 1];
      const sNo = item.surah?.id;
      const aNo = item.verse?.verse_number;
      if (!sNo || !aNo) return;

      const kart = document.createElement('div');
      kart.style.cssText = 'padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;';
      kart.onclick = () => { ayetDetayAc(sNo, aNo); };

      const ref = document.createElement('div');
      ref.style.cssText = 'font-size:11px;color:var(--muted);margin-bottom:4px;font-weight:600;';
      ref.textContent = (sure ? sure.isim : sNo) + ' ' + sNo + ':' + aNo;

      const ar = document.createElement('div');
      ar.style.cssText = 'font-family:var(--ar-font);font-size:17px;color:var(--gold);direction:rtl;text-align:right;line-height:2;';
      ar.textContent = item.verse?.verse || '';

      kart.appendChild(ref);
      kart.appendChild(ar);
      ic.appendChild(kart);
    });

  } catch(e) {
    ic.innerHTML = '<div style="text-align:center;padding:20px;color:var(--rust)">Kök araması başarısız.</div>';
  }
}

// ════════════════════════════════════════
//  KÖKLER EKRANI — api.acikkuran.com
// ════════════════════════════════════════
let tumKokler = [];
let aktifHarf = '';
let koklerYuklendi = false;

const ARAPCA_HARFLER = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];

async function koklerEkraniYukle() {
  if (koklerYuklendi) return;

  const liste = document.getElementById('kokler-liste');
  const sayi = document.getElementById('kokler-sayi');
  liste.innerHTML = '<div class="yukleniyor"><div class="spin"></div>Kökler yükleniyor…</div>';

  // Alfabe satırını oluştur
  const alfabeRow = document.getElementById('kokler-alfabe-row');
  alfabeRow.innerHTML = '';
  ARAPCA_HARFLER.forEach(harf => {
    const btn = document.createElement('button');
    btn.className = 'kokler-harf-btn';
    btn.textContent = harf;
    btn.onclick = () => {
      document.querySelectorAll('.kokler-harf-btn').forEach(b=>b.classList.remove('aktif'));
      if (aktifHarf === harf) { aktifHarf = ''; _koklerRender(tumKokler); }
      else { btn.classList.add('aktif'); aktifHarf = harf; _koklerFiltrele(); }
    };
    alfabeRow.appendChild(btn);
  });

  try {
    const r = await fetch('https://api.acikkuran.com/rootchars');
    const d = await r.json();
    const harfler = d.data || [];

    // Tüm harfler için kökleri çek (sadece ilk yükleme)
    const kokPromises = harfler.slice(0,28).map(h =>
      fetch(`https://api.acikkuran.com/rootchar/${h.id}`)
        .then(r2 => r2.json())
        .then(d2 => d2.data || [])
        .catch(() => [])
    );

    const sonuclar = await Promise.all(kokPromises);
    tumKokler = sonuclar.flat();
    koklerYuklendi = true;
    sayi.textContent = tumKokler.length + ' kök bulundu';
    _koklerRender(tumKokler.slice(0, 50)); // İlk 50 göster
  } catch(e) {
    liste.innerHTML = '<div style="text-align:center;padding:30px;color:var(--rust)">Kökler yüklenemedi.</div>';
  }
}

function koklerAra(val) {
  if (!tumKokler.length) return;
  const q = val.trim().toLowerCase();
  if (!q) { _koklerRender(tumKokler.slice(0,50)); return; }
  const filtre = tumKokler.filter(k =>
    (k.latin || '').toLowerCase().includes(q) ||
    (k.arabic || '').includes(q)
  );
  document.getElementById('kokler-sayi').textContent = filtre.length + ' kök bulundu';
  _koklerRender(filtre.slice(0,80));
}

function _koklerFiltrele() {
  if (!aktifHarf) { _koklerRender(tumKokler.slice(0,50)); return; }
  const filtre = tumKokler.filter(k => (k.arabic || '').startsWith(aktifHarf));
  document.getElementById('kokler-sayi').textContent = filtre.length + ' kök bulundu';
  _koklerRender(filtre);
}

function _koklerRender(kokler) {
  const liste = document.getElementById('kokler-liste');
  liste.innerHTML = '';
  if (!kokler.length) {
    liste.innerHTML = '<div class="bos-durum" style="padding:30px 0"><div class="ic">🌱</div>Kök bulunamadı</div>';
    return;
  }
  kokler.forEach(kok => {
    const kart = document.createElement('div');
    kart.className = 'kok-kart';

    const hdr = document.createElement('div');
    hdr.className = 'kok-kart-hdr';
    hdr.onclick = () => kokKartToggle(kart, kok);

    const arEl = document.createElement('div');
    arEl.className = 'kok-kart-ar';
    arEl.textContent = kok.arabic || '';

    const bilgi = document.createElement('div');
    bilgi.className = 'kok-kart-bilgi';

    const latin = document.createElement('div');
    latin.className = 'kok-kart-latin';
    latin.textContent = kok.latin || '';

    const sayiEl = document.createElement('div');
    sayiEl.className = 'kok-kart-ayet-sayi';
    sayiEl.textContent = 'Âyetleri görmek için tıklayın';

    bilgi.appendChild(latin);
    bilgi.appendChild(sayiEl);

    const chev = document.createElement('span');
    chev.className = 'kok-kart-chev';
    chev.textContent = '▾';

    hdr.appendChild(arEl);
    hdr.appendChild(bilgi);
    hdr.appendChild(chev);
    kart.appendChild(hdr);

    const ic = document.createElement('div');
    ic.className = 'kok-kart-ic';
    kart.appendChild(ic);

    liste.appendChild(kart);
  });
}

async function kokKartToggle(kart, kok) {
  const acik = kart.classList.toggle('open');
  const ic = kart.querySelector('.kok-kart-ic');
  const sayiEl = kart.querySelector('.kok-kart-ayet-sayi');
  if (!acik) return;
  if (ic.children.length > 0) return;

  ic.innerHTML = '<div class="yukleniyor" style="padding:12px"><div class="spin"></div>Âyetler yükleniyor…</div>';

  try {
    const r = await fetch(`https://api.acikkuran.com/root/latin/${encodeURIComponent(kok.latin)}/verseparts?page=1`);
    const d = await r.json();
    const ayetler = d.data || [];
    const toplam = d.meta?.total || ayetler.length;

    if (sayiEl) sayiEl.textContent = toplam + ' âyette geçiyor';
    ic.innerHTML = '';

    if (!ayetler.length) {
      ic.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:12px">Âyet bulunamadı.</div>';
      return;
    }

    ayetler.forEach(item => {
      const sNo = item.surah?.id;
      const aNo = item.verse?.verse_number;
      const sure = sNo ? SURELER[sNo-1] : null;

      const satir = document.createElement('div');
      satir.className = 'kok-ayet-satir';
      satir.onclick = () => ayetDetayAc(sNo, aNo);

      const ref = document.createElement('div');
      ref.className = 'kok-ayet-ref';
      ref.textContent = (sure ? sure.isim : sNo||'') + '\n' + (sNo||'') + ':' + (aNo||'');
      ref.style.whiteSpace = 'pre-line';

      const ar = document.createElement('div');
      ar.className = 'kok-ayet-ar-oniz';
      ar.textContent = item.verse?.verse || '';

      satir.appendChild(ref);
      satir.appendChild(ar);
      ic.appendChild(satir);
    });

    if (toplam > ayetler.length) {
      const devam = document.createElement('div');
      devam.style.cssText = 'text-align:center;padding:10px;font-size:12px;color:var(--muted);';
      devam.textContent = '+ ' + (toplam - ayetler.length) + ' âyet daha var';
      ic.appendChild(devam);
    }
  } catch(e) {
    ic.innerHTML = '<div style="padding:12px;color:var(--rust);font-size:12px">Yüklenemedi.</div>';
  }
}

// ════════════════════════════════════════
//  HADİS (iyileştirilmiş)
// ════════════════════════════════════════
const HADİS_DB = {
  '1:1':   'Ebû Hüreyre (r.a.): Rasûlullah ﷺ buyurdu: "Fâtiha\'sız kılınan namaz eksik ve geçersizdir." (Müslim, Salât 38)',
  '1:2':   'Rasûlullah ﷺ buyurdu: "Hamd, Allah\'ın kendisine ettiği hamdle başlar." (Tirmizî, Duâ 9)',
  '2:255': 'Rasûlullah ﷺ buyurdu: "Kur\'ân\'ın efendisi Bakara, Bakara\'nın efendisi ise Âyetü\'l-Kürsî\'dir." (Tirmizî, Fezâilü\'l-Kur\'ân 2)\n\nÜbey b. Ka\'b (r.a.): Rasûlullah ﷺ bana "Kur\'ân\'daki en büyük âyet hangisidir?" diye sordu, "Allâhü lâ ilâhe illâ hüve\'l-Hayyü\'l-Kayyûm" dedim. Mübarek eliyle göğsüme vurdu ve "İlim sana kolay olsun!" buyurdu. (Ebû Dâvûd, Salât 327)',
  '2:256': 'İbn Abbas (r.a.): Bu âyet bazı ensâr hakkında nâzil olmuştur; çocuklarını Yahudi ve Hristiyan yapmak istediklerinde "Dinde zorlama yoktur" âyeti inmiştir. (Ebû Dâvûd, Cihâd 14)',
  '2:285': 'Ebû Hüreyre (r.a.): Rasûlullah ﷺ buyurdu: "Bakara\'nın son iki âyetini her kim bir gecede okursa sabaha kadar o iki âyet ona yeter." (Buhârî, Fezâilü\'l-Kur\'ân 10)',
  '2:286': 'Hz. Âişe (r.anha): Bu âyet inince Rasûlullah ﷺ buyurdu: "Allah, ümmetime yüklenmeye güç yetiremeyecekleri şeyleri afvetti." (Müslim, Îmân 200)',
  '17:23': 'İbn Mes\'ûd (r.a.): Rasûlullah ﷺ\'a "En faziletli amel nedir?" diye sordum, "Vaktinde kılınan namaz" buyurdu. "Sonra hangisi?" dedim, "Anne-babaya iyilik" buyurdu. (Buhârî, Mevâkîtu\'s-Salât 5)',
  '36:1':  'Rasûlullah ﷺ buyurdu: "Her şeyin bir kalbi vardır, Kur\'ân\'ın kalbi Yâsîn\'dir." (Tirmizî, Fezâilü\'l-Kur\'ân 7)',
  '55:13': 'Câbir (r.a.): Rasûlullah ﷺ ashâbına Rahmân sûresini okudu, hepsi sustu. "Ben bu sûreyi cinlere okuduğumda onlar sizden daha güzel karşılık verdiler" buyurdu. (Tirmizî, Tefsîru\'l-Kur\'ân 56)',
  '67:1':  'Rasûlullah ﷺ buyurdu: "Kur\'ân\'da otuz âyetlik bir sûre vardır; sahibine şefaat edip onu affettirir. O sûre \'Tebârekellezî biyedihil mülk\'tür." (Ebû Dâvûd, Salât 326)',
  '112:1': 'Ebû Saîd el-Hudrî (r.a.): Rasûlullah ﷺ buyurdu: "İhlâs sûresini okumak Kur\'ân\'ın üçte birini okumaya denktir." (Buhârî, Fezâilü\'l-Kur\'ân 13)',
  '113:1': 'Ukbe b. Âmir (r.a.): Rasûlullah ﷺ buyurdu: "Felak ve Nâs sûreleri gibi sûre görmedin; bunlar gibi tedbir alınanı görmedin." (Nesâî, İstiâze 1)',
  '96:1':  'Hz. Âişe (r.anha): Rasûlullah ﷺ\'a gelen ilk vahiy "Oku!" ile başladı. Cebrâil onu üç kez sıkıştırdı, her defasında "Ben okuma bilmem" dedi. Sonra "İkra\' bismi Rabbikellezî halak" âyetlerini okudu. (Buhârî, Bed\'ü\'l-Vahy 3)',
};



// ════════════════════════════════════════
//  İRAB & BELÂGAT — api.acikkuran.com verseparts üzerinden
// ════════════════════════════════════════
const irabCache = {};
const belagatCache = {};

function _irabYukle(sNo, aNo, panel) {
  const icerik = panel.querySelector('.ayet-ekstra-icerik');
  const ck = sNo+':'+aNo;
  if (irabCache[ck]) { _irabRender(irabCache[ck], icerik); return; }

  fetch(`https://api.acikkuran.com/surah/${sNo}/verse/${aNo}/verseparts`)
    .then(r => r.json())
    .then(d => {
      const kelimeler = d.data || [];
      irabCache[ck] = kelimeler;
      _irabRender(kelimeler, icerik);
    })
    .catch(() => {
      icerik.textContent = 'İrab verisi yüklenemedi.';
      icerik.classList.remove('yukl');
    });
}

function _irabRender(kelimeler, icerik) {
  icerik.classList.remove('yukl');
  icerik.innerHTML = '';

  if (!kelimeler || kelimeler.length === 0) {
    icerik.textContent = 'Bu âyet için irab verisi bulunamadı.';
    return;
  }

  const tablo = document.createElement('table');
  tablo.style.cssText = 'width:100%;border-collapse:collapse;';

  // Başlık satırı
  const baslikSatir = document.createElement('tr');
  baslikSatir.style.cssText = 'background:var(--paper2);';
  ['#','Kelime','Türkçe','Özellik','Kök'].forEach(b => {
    const th = document.createElement('th');
    th.style.cssText = 'padding:5px 6px;font-size:10px;font-weight:700;color:var(--muted);text-align:left;border-bottom:1px solid var(--border);';
    th.textContent = b;
    baslikSatir.appendChild(th);
  });
  tablo.appendChild(baslikSatir);

  kelimeler.forEach((k, i) => {
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom:1px solid var(--border);';
    if (i % 2 === 0) tr.style.background = 'var(--paper2)';

    // Özellikler: prop_1..prop_8 (sarf/nahiv bilgileri)
    const ozellikler = [k.prop_1, k.prop_2, k.prop_3, k.prop_4, k.prop_5]
      .filter(Boolean).join(', ');

    const arText = k.arabic || k.verse_part || '';
    const trText = k.turkish || '';
    const kokAr = k.root ? k.root.arabic : '';
    const kokLatin = k.root ? k.root.latin : '';

    const hucre = (metin, style='') => {
      const td = document.createElement('td');
      td.style.cssText = 'padding:6px 6px;font-size:12px;vertical-align:middle;' + style;
      td.textContent = metin;
      return td;
    };

    const noTd = hucre(i+1, 'color:var(--muted);width:20px;');
    const arTd = document.createElement('td');
    arTd.style.cssText = 'padding:6px;font-family:var(--ar-font);font-size:18px;color:var(--gold);direction:rtl;text-align:right;width:80px;';
    arTd.textContent = arText;
    const trTd = hucre(trText, 'color:var(--text);');
    const ozTd = hucre(ozellikler || '—', 'color:var(--teal);font-size:11px;');

    const kokTd = document.createElement('td');
    kokTd.style.cssText = 'padding:6px;';
    if (kokAr) {
      const kokLink = document.createElement('span');
      kokLink.style.cssText = 'font-family:var(--ar-font);font-size:16px;color:var(--teal);cursor:pointer;border-bottom:1px dashed var(--teal);';
      kokLink.textContent = kokAr;
      kokLink.title = kokLatin;
      kokLink.onclick = () => kokAyetleriniGoster(k.root.id, kokLatin, kokAr);
      kokTd.appendChild(kokLink);
      const latinEl = document.createElement('div');
      latinEl.style.cssText = 'font-size:9px;color:var(--muted);font-style:italic;';
      latinEl.textContent = kokLatin;
      kokTd.appendChild(latinEl);
    } else {
      kokTd.textContent = '—';
      kokTd.style.color = 'var(--muted)';
    }

    tr.appendChild(noTd);
    tr.appendChild(arTd);
    tr.appendChild(trTd);
    tr.appendChild(ozTd);
    tr.appendChild(kokTd);
    tablo.appendChild(tr);
  });

  icerik.appendChild(tablo);

  const kaynak = document.createElement('div');
  kaynak.style.cssText = 'font-size:10px;color:var(--muted);text-align:center;margin-top:10px;padding-top:8px;border-top:1px solid var(--border);';
  kaynak.textContent = 'Kaynak: api.acikkuran.com — Sarf/nahiv bilgileri kelime bazlıdır';
  icerik.appendChild(kaynak);
}

function _belagatYukle(sNo, aNo, panel) {
  const icerik = panel.querySelector('.ayet-ekstra-icerik');
  const ck = sNo+':'+aNo;
  if (belagatCache[ck]) { icerik.textContent = belagatCache[ck]; icerik.classList.remove('yukl'); return; }

  // kuranseferberligi.com'dan sayfa bazlı belağat notu çekmeye çalış
  // Şimdilik manuel veritabanı + açıklama
  const BELAGAT_DB = {
    '1:2':   'الْحَمْدُ لِلَّهِ — "el-hamdu lillâh": Elif-lâm takısı ile gelen "hamd" kelimesi tüm övgülerin Allah\'a ait olduğunu ifade eden kapsamlı bir cins ismidir (istiğrâk). Bu, sadece "bir hamd" değil, "her türlü hamd" anlamını katar. Ayrıca cümlenin isim cümlesi olması sürekliliği ve kalıcılığı ifade eder.',
    '2:255': 'Âyetü\'l-Kürsî belâgat bakımından şu özellikleri taşır:\n• Cinas: "Hayyü\'l-Kayyûm" — her iki isim de süreklilik bildirir, bu tekrar vurguyu güçlendirir.\n• Nefy ve isbât: "lâ te\'huzühû sinetün ve lâ nevm" — önce uyuklama, sonra uyku nefyedilerek kademeli yükseliş sağlanır.\n• Tecâhülü ârif: "men zellezî yeşfeu indehû illâ bi iznih" — Allah\'ın izni olmadan şefaat edilemeyeceği sanki soru soruluyormuş gibi anlatılır.',
    '36:1':  'يس — "Yâ-Sîn" hurûf-i mukattaadır. Bu harflerin kullanımı, Kur\'ân\'ın okunduğu alfabeyle indiğine dikkat çeken belâgî bir uyarıdır; muhatapların en az bu harflerle bir benzerini getirememesi i\'câzın temelini oluşturur.',
    '55:13': 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ — Tekriru\'l-mütevâzi (aynı sorunun farklı bağlamlarda tekrarı). Bu soru sûre boyunca 31 kez tekrarlanır. Her tekrar farklı bir nimet anlatıldıktan sonra gelir; bu "i\'tiras" yani söze müdahale sanatıdır ve dinleyiciyi her defasında şükre yönlendirir.',
    '112:1': 'قُلْ هُوَ اللَّهُ أَحَدٌ — "Ehad" kelimesi "vâhid"den farklıdır; ortaklığı tamamen nefyeder. "Allâhü\'s-Samed" — samed ismi, hiçbir şeye muhtaç olmayan ve her şeyin kendisine muhtaç olduğu anlamındadır. Dört âyette birbirini tamamlayan nefy ve isbât ile tevhid en özlü biçimde ifade edilir.',
  };

  const metin = BELAGAT_DB[ck];
  if (metin) {
    belagatCache[ck] = metin;
    icerik.textContent = metin;
    icerik.classList.remove('yukl');
    return;
  }

  // Genel bilgi göster
  icerik.classList.remove('yukl');
  icerik.innerHTML = '';

  const bilgi = document.createElement('div');
  bilgi.style.cssText = 'font-size:13px;color:var(--text);line-height:1.8;';
  bilgi.innerHTML = `
    <p style="margin-bottom:8px;color:var(--muted);font-size:12px;">Bu âyet için özel belâgat notu henüz eklenmemiştir.</p>
    <p style="margin-bottom:6px;font-weight:600;">Temel Belâgat Kavramları:</p>
    <div style="background:var(--paper2);border-radius:8px;padding:10px;font-size:12px;line-height:1.9;">
      <b>Teşbih:</b> Benzetme sanatı<br>
      <b>İstiare:</b> Açık/kapalı mecaz<br>
      <b>Kinaye:</b> Dolaylı anlatım<br>
      <b>Tıbak:</b> Zıt kavramları bir arada kullanma<br>
      <b>Mürâatü\'n-nazîr:</b> Birbiriyle uyumlu kavramlar<br>
      <b>İltifat:</b> Anlatım şahsının değişmesi
    </div>
    <p style="margin-top:8px;font-size:11px;color:var(--muted);">Belâgat analizi için Fatma Serap Karamollaoğlu\'nun kuranseferberligi.com adresini ziyaret edin.</p>
  `;
  icerik.appendChild(bilgi);
  belagatCache[ck] = '__rendered__';
}

// ════════════════════════════════════════
//  KONU ARAMA
// ════════════════════════════════════════
let aramaFiltre = 'hepsi';
let aramaTimer = null;

function aramaFiltreSec(btn) {
  document.querySelectorAll('.arama-filtre-btn').forEach(b=>b.classList.remove('aktif'));
  btn.classList.add('aktif');
  aramaFiltre = btn.dataset.filtre;
  const inp = document.getElementById('arama-inp');
  if(inp.value.trim()) aramaYap2(inp.value);
}

function aramaYap2(val) {
  clearTimeout(aramaTimer);
  aramaTimer = setTimeout(() => _aramaYap(val.trim().toLowerCase()), 200);
}

function _aramaYap(q) {
  const sonucEl = document.getElementById('arama-sonuclar');
  const sayiEl = document.getElementById('arama-sonuc-sayi');
  sonucEl.innerHTML = '';

  if (!q || q.length < 2) {
    sayiEl.textContent = '';
    sonucEl.innerHTML = '<div class="bos-durum" style="padding:30px 0"><div class="ic" style="font-size:28px">🔍</div>En az 2 karakter girin</div>';
    return;
  }

  const sonuclar = [];

  // 1) Konu araması (TEMATIK)
  if (aramaFiltre === 'hepsi' || aramaFiltre === 'konu') {
    for (const sNoStr in TEMATIK) {
      const sNo = parseInt(sNoStr);
      const sure = SURELER[sNo-1];
      TEMATIK[sNo].forEach(b => {
        const konuLow = b.konu.toLowerCase();
        const isimLow = sure.isim.toLowerCase();
        if (konuLow.includes(q) || isimLow.includes(q)) {
          sonuclar.push({ tip:'konu', sNo, bolum:b, sure });
        }
      });
    }
  }

  // 2) Not araması
  if (aramaFiltre === 'hepsi' || aramaFiltre === 'notlar') {
    for (let key in localStorage) {
      const m = key.match(/^([td])_(\d+)_(\d+)$/);
      if (m) {
        const val = localStorage.getItem(key) || '';
        if (val.toLowerCase().includes(q)) {
          const sNo = parseInt(m[2]); const aNo = parseInt(m[3]);
          sonuclar.push({ tip:'not', sNo, aNo, sure:SURELER[sNo-1], metin:val, notTip:m[1] });
        }
        continue;
      }
      const m2 = key.match(/^an_(\d+)_(\d+)$/);
      if (m2) {
        try {
          const liste = JSON.parse(localStorage.getItem(key) || '[]');
          liste.forEach(not => {
            const metin = not.icerik || not.metin || not.text || '';
            if (metin.toLowerCase().includes(q)) {
              const sNo = parseInt(m2[1]); const aNo = parseInt(m2[2]);
              sonuclar.push({ tip:'not', sNo, aNo, sure:SURELER[sNo-1], metin, notTip:'n' });
            }
          });
        } catch(e) {}
      }
    }
  }

  sayiEl.textContent = sonuclar.length + ' sonuç bulundu';

  if (sonuclar.length === 0) {
    sonucEl.innerHTML = '<div class="bos-durum" style="padding:30px 0"><div class="ic" style="font-size:28px">😔</div>"' + q + '" için sonuç yok</div>';
    return;
  }

  sonuclar.forEach(s => {
    const kart = document.createElement('div');
    kart.className = 'arama-sonuc-kart';

    if (s.tip === 'konu') {
      kart.onclick = () => konuSonucAc(s.sNo, s.bolum);
      kart.innerHTML = `
        <div class="arama-sonuc-hdr">
          <span class="arama-sure-chip">${s.sNo}. ${s.sure.isim}</span>
          <span class="arama-konu-text">${_vurgula(s.bolum.konu, q)}</span>
          <span class="arama-ayet-aralik">${s.bolum.bas}–${s.bolum.bit}</span>
        </div>
        <div class="arama-sonuc-meal" style="color:var(--muted);font-size:11px">📁 Konu klasörü • ${s.bolum.bit - s.bolum.bas + 1} âyet</div>`;
    } else {
      const oniz = s.metin.substring(0, 120);
      kart.onclick = () => ayetDetayAc(s.sNo, s.aNo);
      kart.innerHTML = `
        <div class="arama-sonuc-hdr">
          <span class="arama-sure-chip">${s.sNo}:${s.aNo}</span>
          <span class="arama-konu-text">${s.sure.isim}</span>
          <span class="arama-ayet-aralik">${s.notTip==='t'?'📝':'🔖'}</span>
        </div>
        <div class="arama-sonuc-meal">${_vurgula(oniz, q)}…</div>`;
    }
    sonucEl.appendChild(kart);
  });
}

function _vurgula(metin, q) {
  if (!q) return metin;
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
  return metin.replace(re, '<mark class="arama-highlight">$1</mark>');
}

function konuSonucAc(sNo, bolum) {
  // Kur'ân sekmesine git, ilgili sûreyi ve klasörü aç
  tabGec('kuran');
  setTimeout(() => {
    let kart = document.getElementById('sure-kart-'+sNo);
    if (!kart) return;
    if (!kart.classList.contains('open')) {
      kart.classList.add('open');
      const ic = document.getElementById('sure-ic-'+sNo);
      if (ic && ic.children.length === 0) sureIcDoldur(sNo, ic);
    }
    kart.scrollIntoView({ behavior:'smooth', block:'start' });

    // İlgili klasörü bul ve aç
    setTimeout(() => {
      const tematikler = TEMATIK[sNo] || [];
      const idx = tematikler.findIndex(b => b.bas === bolum.bas && b.bit === bolum.bit);
      if (idx >= 0) {
        const klasor = document.getElementById('kl-'+sNo+'-'+idx);
        if (klasor && !klasor.classList.contains('open')) {
          klasorToggle(sNo, idx, bolum.bas, bolum.bit, klasor);
        }
      }
    }, 400);
  }, 200);
}

// ════════════════════════════════════════
//  VERİ YEDEKLEMESİ
// ════════════════════════════════════════

// ════════════════════════════════════════
//  ISI HARİTASI
// ════════════════════════════════════════
// ════════════════════════════════════════
//  PDF KÜTÜPHANESİ
// ════════════════════════════════════════

// PDF meta verisini localStorage'da sakla
// Her kayıt: { id, isim, sureNo, basAyet, bitAyet, sayfaHaritasi: {"1":4,"2":4,...} }
function _pdfKutKayitlariGetir() {
  try { return JSON.parse(localStorage.getItem('pdf_kutuphane') || '[]'); } catch(e) { return []; }
}
function _pdfKutKayitlariKaydet(arr) {
  localStorage.setItem('pdf_kutuphane', JSON.stringify(arr));
}

// Bir âyeti kapsayan tüm PDF kayıtlarını getir
function _ayetIcinPdfler(sureNo, ayetNo) {
  return _pdfKutKayitlariGetir().filter(k =>
    parseInt(k.sureNo) === parseInt(sureNo) &&
    parseInt(ayetNo) >= parseInt(k.basAyet) &&
    parseInt(ayetNo) <= parseInt(k.bitAyet)
  );
}

// PDF kütüphanesi ekranı
// ════════════════════════════════════════
//  JSON TEFSİR SİSTEMİ
// ════════════════════════════════════════
const _jsonTefsirCache = {}; // { "sure_no_muellif": {ayetler:{}} }

function _jsonTefsirKayitlariGetir() {
  try { return JSON.parse(localStorage.getItem('json_tefsirler') || '[]'); } catch(e) { return []; }
}
function _jsonTefsirKayitlariKaydet(arr) {
  localStorage.setItem('json_tefsirler', JSON.stringify(arr));
}

// Bir âyet için JSON tefsir kayıtlarını getir
function _ayetIcinJsonTefsirler(sureNo, ayetNo) {
  return _jsonTefsirKayitlariGetir().filter(k => parseInt(k.sure_no) === parseInt(sureNo));
}

// JSON tefsir metnini getir (cache + fetch)
async function _jsonTefsirGetir(kayit) {
  const cacheKey = kayit.sure_no + '_' + kayit.muellif;
  if (_jsonTefsirCache[cacheKey]) return _jsonTefsirCache[cacheKey];

  try {
    // GitHub raw URL'yi düzelt
    let url = kayit.url;
    if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
      url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    _jsonTefsirCache[cacheKey] = data;
    return data;
  } catch(e) {
    console.error('JSON tefsir yüklenemedi:', e);
    return null;
  }
}

// Âyet tefsirini göster
async function jsonTefsirAc(sureNo, ayetNo, kayit) {
  const modal = document.getElementById('pdf-tefsir-modal');
  const baslik = document.getElementById('pdf-tefsir-baslik');
  const alt = document.getElementById('pdf-tefsir-alt');
  const canvas = document.getElementById('pdf-canvas');
  const yukl = document.getElementById('pdf-yukleniyor');
  const sure = SURELER[parseInt(sureNo) - 1];

  _pdfAktifSure = sureNo;
  _pdfAktifAyet = ayetNo;
  _pdfMevcut = null; // JSON modunda PDF yok

  baslik.textContent = (sure ? sure.isim + ' ' : '') + sureNo + ':' + ayetNo;
  alt.textContent = '📝 ' + (kayit.muellif || '');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Canvas gizle, metin göster
  canvas.style.display = 'none';
  const notCanvas = document.getElementById('pdf-not-canvas');
  if (notCanvas) notCanvas.style.display = 'none';

  yukl.style.display = 'block';
  yukl.innerHTML = '<div class="spin"></div>Tefsir yükleniyor…';

  const data = await _jsonTefsirGetir(kayit);
  yukl.style.display = 'none';

  // Reflow div — metin gösterimi için (HTML'de sabit, sadece göster)
  const reflowDiv = document.getElementById('pdf-reflow-div');
  reflowDiv.style.display = 'block';

  if (!data) {
    reflowDiv.innerHTML = '<div style="padding:20px;color:var(--rust);text-align:center;">⚠️ Tefsir yüklenemedi.<br><span style="font-size:12px;color:var(--muted);">URL kontrol edin</span></div>';
    return;
  }

  const ayetler = data.ayetler || {};
  const yorum = ayetler[String(ayetNo)] || ayetler[parseInt(ayetNo)] || null;

  if (!yorum) {
    reflowDiv.innerHTML = '<div style="padding:20px;color:var(--muted);text-align:center;">Bu âyet için tefsir bulunamadı.<br><span style="font-size:12px;">(Âyet ' + ayetNo + ')</span></div>';
    return;
  }

  // Sekmeleri güncelle
  const aktifKayitlar = _ayetIcinJsonTefsirler(sureNo, ayetNo);
  _pdfAktifKayitlar = aktifKayitlar.map(k => ({ ...k, _tip: 'json' }));
  _pdfSekmeleriGuncelle(_pdfAktifKayitlar);

  reflowDiv.innerHTML = `
    <div style="max-width:100%;margin:0 auto;">
      <div style="font-family:Playfair Display,serif;font-size:14px;font-weight:700;color:var(--ink);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
        ${sure ? sure.isim : sureNo + '. Sûre'} ${sureNo}:${ayetNo}
      </div>
      <div style="font-family:'Source Serif 4',serif;font-size:15px;line-height:1.9;color:var(--ink2);">
        ${yorum.split('\n').map(p => p.trim() ? '<p style="margin-bottom:12px;">' + p + '</p>' : '').join('')}
').map(p => p.trim() ? '<p style="margin-bottom:12px;">' + p + '</p>' : '').join('')}
      </div>
    </div>`;
}

async function pdfKutuphaneRender() {
  const wrap = document.getElementById('pdfkut-ic');
  wrap.innerHTML = '';

  // Başlık
  const baslikDiv = document.createElement('div');
  baslikDiv.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px;box-shadow:0 2px 8px var(--shadow);';
  baslikDiv.innerHTML = '<div style="font-family:Playfair Display,serif;font-size:16px;font-weight:700;color:var(--ink);margin-bottom:4px;">📚 Tefsir Kütüphanesi</div><div style="font-size:12px;color:var(--muted);">JSON URL veya PDF yükle</div>';
  wrap.appendChild(baslikDiv);

  // JSON URL BOLUMU
  const jsonBolum = document.createElement('div');
  jsonBolum.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px;';
  const jsonBaslik = document.createElement('div');
  jsonBaslik.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;';
  jsonBaslik.textContent = '🔗 JSON Tefsir Ekle (GitHub URL)';
  jsonBolum.appendChild(jsonBaslik);
  const jsonUrlInp = document.createElement('input');
  jsonUrlInp.id = 'json-tefsir-url';
  jsonUrlInp.placeholder = 'https://raw.githubusercontent.com/...';
  jsonUrlInp.style.cssText = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:7px;background:var(--paper2);font-family:"Source Serif 4",serif;font-size:12px;color:var(--text);outline:none;box-sizing:border-box;margin-bottom:8px;';
  jsonBolum.appendChild(jsonUrlInp);
  const jsonMuellifInp = document.createElement('input');
  jsonMuellifInp.id = 'json-tefsir-muellif';
  jsonMuellifInp.placeholder = 'Müellif adı (örn: İslamoğlu)';
  jsonMuellifInp.style.cssText = 'width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:7px;background:var(--paper2);font-family:"Source Serif 4",serif;font-size:12px;color:var(--text);outline:none;box-sizing:border-box;margin-bottom:8px;';
  jsonBolum.appendChild(jsonMuellifInp);
  const jsonEkleBtn = document.createElement('button');
  jsonEkleBtn.style.cssText = 'width:100%;padding:9px;background:var(--gold);color:#fff;border:none;border-radius:8px;font-family:"Source Serif 4",serif;font-size:13px;font-weight:700;cursor:pointer;';
  jsonEkleBtn.textContent = '+ URL Tefsir Ekle';
  jsonEkleBtn.onclick = _jsonTefsirUrlEkle;
  jsonBolum.appendChild(jsonEkleBtn);
  wrap.appendChild(jsonBolum);

  // Mevcut JSON tefsirler
  const jsonKayitlar = _jsonTefsirKayitlariGetir();
  if (jsonKayitlar.length > 0) {
    const jb = document.createElement('div');
    jb.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;';
    jb.textContent = 'JSON Tefsirler (' + jsonKayitlar.length + ')';
    wrap.appendChild(jb);
    jsonKayitlar.forEach(k => {
      const sure = SURELER[parseInt(k.sure_no) - 1];
      const jk = document.createElement('div');
      jk.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:10px;padding:11px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;';
      const jIkon = document.createElement('span');
      jIkon.style.fontSize = '20px';
      jIkon.textContent = '📝';
      const jBilgi = document.createElement('div');
      jBilgi.style.cssText = 'flex:1;';
      jBilgi.innerHTML = '<div style="font-family:Playfair Display,serif;font-size:13px;font-weight:700;color:var(--ink);">' + k.muellif + '</div>'
        + '<div style="font-size:11px;color:var(--muted);margin-top:2px;">' + (sure ? sure.isim : k.sure_no + '. Sure') + '</div>';
      const jSil = document.createElement('button');
      jSil.style.cssText = 'padding:5px 10px;background:none;border:1px solid #f0c0b8;border-radius:7px;color:var(--rust);font-size:11px;font-weight:700;cursor:pointer;';
      jSil.textContent = 'Sil';
      jSil.onclick = () => _jsonTefsirSil(k.id);
      jk.appendChild(jIkon); jk.appendChild(jBilgi); jk.appendChild(jSil);
      wrap.appendChild(jk);
    });
  }

  // Ayirac
  const ayirac = document.createElement('div');
  ayirac.style.cssText = 'display:flex;align-items:center;gap:10px;margin:12px 0;font-size:11px;font-weight:700;color:var(--muted);';
  const c1 = document.createElement('div'); c1.style.cssText = 'flex:1;height:1px;background:var(--border);';
  const c2 = document.createElement('div'); c2.style.cssText = 'flex:1;height:1px;background:var(--border);';
  ayirac.appendChild(c1); ayirac.appendChild(document.createTextNode('PDF YUKLE')); ayirac.appendChild(c2);
  wrap.appendChild(ayirac);

  // Yeni PDF formu
  _pdfFormOlustur(wrap);

  // Yuklu PDF listesi
  const kayitlar = _pdfKutKayitlariGetir();
  if (kayitlar.length === 0) {
    const bos = document.createElement('div');
    bos.style.cssText = 'text-align:center;padding:20px;color:var(--muted);font-size:13px;';
    bos.textContent = '📂 Henüz PDF eklenmedi';
    wrap.appendChild(bos);
    return;
  }


  const listeBaslik = document.createElement('div');
  listeBaslik.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;';
  listeBaslik.textContent = 'Yüklü PDF\'ler (' + kayitlar.length + ')';
  wrap.appendChild(listeBaslik);

  for (const k of kayitlar) {
    const buf = await _pdfOkuIDB(k.id);
    const kart = document.createElement('div');
    kart.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px;';

    // Üst satır: ikon + isim + butonlar
    const ust = document.createElement('div');
    ust.style.cssText = 'display:flex;align-items:center;gap:10px;';

    const ikon = document.createElement('div');
    ikon.style.cssText = 'font-size:22px;flex-shrink:0;';
    ikon.textContent = buf ? '📖' : '⚠️';

    const isimDiv = document.createElement('div');
    isimDiv.style.cssText = 'flex:1;';
    isimDiv.innerHTML = '<div style="font-family:\'Playfair Display\',serif;font-size:14px;font-weight:700;color:var(--ink);">' + k.isim + '</div>'
      + '<div style="font-size:11px;color:var(--muted);margin-top:2px;">'
      + (k.sureler ? k.sureler.length + ' sûre aralığı' : '1 sûre aralığı')
      + (buf ? '' : ' · <span style="color:var(--rust);">PDF eksik</span>') + '</div>';

    const btnGrup = document.createElement('div');
    btnGrup.style.cssText = 'display:flex;gap:5px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;';

    const duzBtn = document.createElement('button');
    duzBtn.style.cssText = 'padding:5px 10px;background:none;border:1px solid var(--border);border-radius:7px;color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;';
    duzBtn.textContent = '✏️ Düzenle';
    duzBtn.onclick = () => _pdfKayitDuzenle(k.id, kart);

    const silBtn = document.createElement('button');
    silBtn.style.cssText = 'padding:5px 10px;background:none;border:1px solid #f0c0b8;border-radius:7px;color:var(--rust);font-size:11px;font-weight:700;cursor:pointer;';
    silBtn.textContent = '🗑 Sil';
    silBtn.onclick = async () => {
      if (!confirm('"' + k.isim + '" silinsin mi?')) return;
      await _pdfSilIDB(k.id);
      _pdfKutKayitlariKaydet(_pdfKutKayitlariGetir().filter(x => x.id !== k.id));
      pdfKutuphaneRender();
    };

    btnGrup.appendChild(duzBtn);
    btnGrup.appendChild(silBtn);
    ust.appendChild(ikon);
    ust.appendChild(isimDiv);
    ust.appendChild(btnGrup);
    kart.appendChild(ust);

    // Sûre listesi özeti
    const sureler = k.sureler || [{ sureNo: k.sureNo, basAyet: k.basAyet, bitAyet: k.bitAyet, sayfaHaritasi: k.sayfaHaritasi || {} }];
    const sureOzet = document.createElement('div');
    sureOzet.style.cssText = 'margin-top:8px;display:flex;flex-wrap:wrap;gap:5px;';
    sureler.forEach(s => {
      const sure = SURELER[parseInt(s.sureNo) - 1];
      const chip = document.createElement('span');
      chip.style.cssText = 'padding:3px 8px;background:var(--paper2);border:1px solid var(--border);border-radius:12px;font-size:11px;color:var(--muted);';
      chip.textContent = (sure ? sure.isim : s.sureNo + '. Sûre') + ' ' + s.sureNo + ':' + s.basAyet + '–' + s.bitAyet + ' (' + Object.keys(s.sayjfaHaritasi || s.sayfaHaritasi || {}).length + ' sayfa)';
      sureOzet.appendChild(chip);
    });
    kart.appendChild(sureOzet);
    wrap.appendChild(kart);
  }
}

function _pdfFormOlustur(wrap) {
  const form = document.createElement('div');
  form.id = 'pdfkut-form';
  form.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:12px;';

  form.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;">+ Yeni PDF Ekle</div>
    <input id="pdfkut-isim" placeholder="PDF adı (örn: İslamoğlu Tefsiri)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:7px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--text);outline:none;box-sizing:border-box;margin-bottom:10px;">

    <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;">SÛRE ARALIĞI</div>
    <div id="pdfkut-sureler-wrap"></div>
    <button onclick="_pdfSureEkle()" style="width:100%;padding:8px;background:var(--paper2);border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-family:'Source Serif 4',serif;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:10px;">+ Sûre Ekle</button>

    <label style="display:flex;align-items:center;gap:8px;padding:11px 14px;background:var(--gold);color:#fff;border-radius:9px;font-family:'Source Serif 4',serif;font-size:13px;font-weight:700;cursor:pointer;justify-content:center;">
      <span>📂 PDF Seç ve Kaydet</span>
      <input type="file" accept=".pdf" style="display:none;" onchange="pdfKutYukle(this)">
    </label>`;

  wrap.appendChild(form);

  // İlk sûre satırını ekle
  _pdfSureEkle();
}

function _pdfSureEkle() {
  const wrap = document.getElementById('pdfkut-sureler-wrap');
  if (!wrap) return;
  const idx = wrap.children.length;
  const sure = SURELER[0];

  const satir = document.createElement('div');
  satir.className = 'pdfkut-sure-satir';
  satir.style.cssText = 'background:var(--paper2);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;';
  satir.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
      <div style="font-size:11px;font-weight:700;color:var(--muted);">${idx + 1}. Sûre Aralığı</div>
      <div style="flex:1;"></div>
      ${idx > 0 ? '<button onclick="this.closest(\'.pdfkut-sure-satir\').remove()" style="padding:3px 8px;background:none;border:1px solid #f0c0b8;border-radius:6px;color:var(--rust);font-size:11px;cursor:pointer;">✕ Kaldır</button>' : ''}
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <div style="flex:1.5;">
        <div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">SÛRE NO</div>
        <input type="number" min="1" max="114" placeholder="örn: 80" class="pdfkut-sure-no"
          style="width:100%;padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-family:'Source Serif 4',serif;font-size:12px;color:var(--text);outline:none;box-sizing:border-box;">
      </div>
      <div style="flex:1;">
        <div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">BAŞ ÂYET</div>
        <input type="number" min="1" placeholder="1" class="pdfkut-bas-ayet"
          style="width:100%;padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-family:'Source Serif 4',serif;font-size:12px;color:var(--text);outline:none;box-sizing:border-box;">
      </div>
      <div style="flex:1;">
        <div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">BİTİŞ ÂYET</div>
        <input type="number" min="1" placeholder="42" class="pdfkut-bit-ayet"
          style="width:100%;padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-family:'Source Serif 4',serif;font-size:12px;color:var(--text);outline:none;box-sizing:border-box;">
      </div>
    </div>
    <div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:4px;">SAYFA HARİTASI (her satıra âyet:sayfa — örn: 1:4)</div>
    <textarea class="pdfkut-harita" placeholder="1:4&#10;2:4&#10;3:6&#10;4:8"
      style="width:100%;padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-family:monospace;font-size:11px;color:var(--text);outline:none;box-sizing:border-box;height:80px;resize:vertical;"></textarea>`;

  wrap.appendChild(satir);
}

function _pdfHaritaParse(metin) {
  const h = {};
  (metin || '').split('\n').forEach(satir => {
    const [a, s] = satir.trim().split(':');
    if (a && s && !isNaN(parseInt(a)) && !isNaN(parseInt(s))) {
      h[parseInt(a)] = parseInt(s);
    }
  });
  return h;
}

async function pdfKutYukle(input) {
  const dosya = input.files[0];
  if (!dosya) return;
  input.value = '';

  // PDF'i hemen kaydet
  const id = 'pdf_' + Date.now();
  const buf = await dosya.arrayBuffer();
  await _pdfKaydetIDB(id, buf.slice(0));

  // Geçici isim — dosya adından al
  const geciciIsim = dosya.name.replace(/\.pdf$/i, '').replace(/_/g, ' ');

  // Formda zaten bilgi girilmişse kullan
  const isimInpEl = document.getElementById('pdfkut-isim');
  const isim = (isimInpEl && isimInpEl.value.trim()) ? isimInpEl.value.trim() : geciciIsim;

  const satirlar = document.querySelectorAll('.pdfkut-sure-satir');
  const sureler = [];
  satirlar.forEach(satir => {
    const sureNo = parseInt(satir.querySelector('.pdfkut-sure-no').value);
    const basAyet = parseInt(satir.querySelector('.pdfkut-bas-ayet').value);
    const bitAyet = parseInt(satir.querySelector('.pdfkut-bit-ayet').value);
    const haritaMetin = satir.querySelector('.pdfkut-harita').value.trim();
    if (sureNo >= 1 && sureNo <= 114 && basAyet && bitAyet && basAyet <= bitAyet) {
      sureler.push({ sureNo, basAyet, bitAyet, sayfaHaritasi: _pdfHaritaParse(haritaMetin) });
    }
  });

  const kayitlar = _pdfKutKayitlariGetir();
  kayitlar.push({ id, isim, sureler });
  _pdfKutKayitlariKaydet(kayitlar);

  await pdfKutuphaneRender();

  // Yüklenen kartı bul ve düzenleme panelini otomatik aç
  setTimeout(() => {
    const tümKartlar = document.querySelectorAll('#pdfkut-ic > div');
    for (const kart of tümKartlar) {
      const btns = kart.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.includes('Düzenle')) {
          btn.click();
          kart.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    }
  }, 300);
}

function _pdfKayitDuzenle(kayitId, kartEl) {
  // Mevcut panel varsa kapat
  const mevcutPanel = kartEl.querySelector('.duzenle-panel');
  if (mevcutPanel) { mevcutPanel.remove(); return; }

  const kayitlar = _pdfKutKayitlariGetir();
  const kayit = kayitlar.find(k => k.id === kayitId);
  if (!kayit) return;

  const sureler = kayit.sureler || [{ sureNo: kayit.sureNo, basAyet: kayit.basAyet, bitAyet: kayit.bitAyet, sayfaHaritasi: kayit.sayfaHaritasi || {} }];

  const panel = document.createElement('div');
  panel.className = 'duzenle-panel';
  panel.style.cssText = 'margin-top:10px;border-top:1px solid var(--border);padding-top:10px;';

  // İsim düzenle
  const isimWrap = document.createElement('div');
  isimWrap.style.cssText = 'margin-bottom:10px;';
  isimWrap.innerHTML = '<div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:4px;">PDF ADI</div>';
  const isimInp = document.createElement('input');
  isimInp.value = kayit.isim;
  isimInp.style.cssText = 'width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:7px;background:var(--paper2);font-family:\'Source Serif 4\',serif;font-size:13px;color:var(--text);outline:none;box-sizing:border-box;';
  isimWrap.appendChild(isimInp);
  panel.appendChild(isimWrap);

  // Sûre listesi wrap
  const surelerWrap = document.createElement('div');
  surelerWrap.className = 'duz-sureler-wrap';
  panel.appendChild(surelerWrap);

  sureler.forEach((s, si) => {
    const sure = SURELER[parseInt(s.sureNo) - 1];
    const haritaMetni = Object.entries(s.sayfaHaritasi || {}).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([a,p])=>a+':'+p).join('\n');
    const sureDiv = document.createElement('div');
    sureDiv.className = 'duz-sure-blok';
    sureDiv.style.cssText = 'background:var(--paper2);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;';
    sureDiv.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <div style="font-size:10px;font-weight:700;color:var(--muted);">${si + 1}. SÛRE ARALIĞI${sure ? ' — ' + sure.isim : ''}</div>
        <div style="flex:1;"></div>
        <button onclick="this.closest('.duz-sure-blok').remove()" style="padding:3px 8px;background:none;border:1px solid #f0c0b8;border-radius:6px;color:var(--rust);font-size:11px;cursor:pointer;">✕</button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <div style="flex:1.5;"><div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">SÛRE NO</div>
          <input type="number" class="duz-sure-no" value="${s.sureNo}" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-size:12px;color:var(--text);outline:none;box-sizing:border-box;"></div>
        <div style="flex:1;"><div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">BAŞ ÂYET</div>
          <input type="number" class="duz-bas" value="${s.basAyet}" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-size:12px;color:var(--text);outline:none;box-sizing:border-box;"></div>
        <div style="flex:1;"><div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">BİTİŞ ÂYET</div>
          <input type="number" class="duz-bit" value="${s.bitAyet}" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-size:12px;color:var(--text);outline:none;box-sizing:border-box;"></div>
      </div>
      <div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">SAYFA HARİTASI (âyet:sayfa — örn: 1:4)</div>
      <textarea class="duz-harita" style="width:100%;padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-family:monospace;font-size:11px;color:var(--text);outline:none;box-sizing:border-box;height:80px;resize:vertical;">${haritaMetni}</textarea>`;
    surelerWrap.appendChild(sureDiv);
  });

  // Sûre Ekle butonu
  const sureEkleBtn = document.createElement('button');
  sureEkleBtn.style.cssText = 'width:100%;padding:8px;background:var(--paper2);border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-family:"Source Serif 4",serif;font-size:12px;font-weight:600;cursor:pointer;margin-bottom:10px;';
  sureEkleBtn.textContent = '+ Sûre Aralığı Ekle';
  sureEkleBtn.onclick = () => {
    const wrap = panel.querySelector('.duz-sureler-wrap');
    const idx = wrap.children.length;
    const yeniDiv = document.createElement('div');
    yeniDiv.className = 'duz-sure-blok';
    yeniDiv.style.cssText = 'background:var(--paper2);border:1px solid var(--border);border-radius:10px;padding:10px;margin-bottom:8px;';
    yeniDiv.innerHTML = `
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        <div style="font-size:10px;font-weight:700;color:var(--muted);">${idx + 1}. SÛRE ARALIĞI</div>
        <div style="flex:1;"></div>
        <button onclick="this.closest('.duz-sure-blok').remove()" style="padding:3px 8px;background:none;border:1px solid #f0c0b8;border-radius:6px;color:var(--rust);font-size:11px;cursor:pointer;">✕</button>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:8px;">
        <div style="flex:1.5;"><div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">SÛRE NO</div>
          <input type="number" class="duz-sure-no" placeholder="örn: 80" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-size:12px;color:var(--text);outline:none;box-sizing:border-box;"></div>
        <div style="flex:1;"><div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">BAŞ ÂYET</div>
          <input type="number" class="duz-bas" placeholder="1" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-size:12px;color:var(--text);outline:none;box-sizing:border-box;"></div>
        <div style="flex:1;"><div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">BİTİŞ ÂYET</div>
          <input type="number" class="duz-bit" placeholder="42" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-size:12px;color:var(--text);outline:none;box-sizing:border-box;"></div>
      </div>
      <div style="font-size:9px;color:var(--muted);font-weight:700;margin-bottom:3px;">SAYFA HARİTASI (âyet:sayfa — örn: 1:4)</div>
      <textarea class="duz-harita" style="width:100%;padding:7px 8px;border:1px solid var(--border);border-radius:7px;background:var(--paper);font-family:monospace;font-size:11px;color:var(--text);outline:none;box-sizing:border-box;height:80px;resize:vertical;"></textarea>`;
    wrap.appendChild(yeniDiv);
  };
  panel.appendChild(sureEkleBtn);

  // Kaydet butonu
  const kaydetBtn = document.createElement('button');
  kaydetBtn.style.cssText = 'width:100%;padding:10px;background:var(--gold);color:#fff;border:none;border-radius:8px;font-family:"Source Serif 4",serif;font-size:13px;font-weight:700;cursor:pointer;';
  kaydetBtn.textContent = '✓ Değişiklikleri Kaydet';
  kaydetBtn.onclick = () => {
    const arr = _pdfKutKayitlariGetir();
    const idx = arr.findIndex(k => k.id === kayitId);
    if (idx < 0) return;
    arr[idx].isim = isimInp.value.trim() || arr[idx].isim;
    const yeniSureler = [];
    panel.querySelectorAll('.duz-sure-blok').forEach(blok => {
      const sNo = parseInt(blok.querySelector('.duz-sure-no').value);
      const bas = parseInt(blok.querySelector('.duz-bas').value);
      const bit = parseInt(blok.querySelector('.duz-bit').value);
      const harita = _pdfHaritaParse(blok.querySelector('.duz-harita').value);
      if (sNo >= 1 && sNo <= 114 && bas && bit && bas <= bit) {
        yeniSureler.push({ sureNo: sNo, basAyet: bas, bitAyet: bit, sayfaHaritasi: harita });
      }
    });
    if (yeniSureler.length === 0) { alert('En az bir geçerli sûre aralığı gerekli.'); return; }
    arr[idx].sureler = yeniSureler;
    _pdfKutKayitlariKaydet(arr);
    panel.remove();
    pdfKutuphaneRender();
  };
  panel.appendChild(kaydetBtn);
  kartEl.appendChild(panel);
}

// _ayetIcinPdfler güncelle — sureler dizisini destekle
function _ayetIcinPdfler(sureNo, ayetNo) {
  return _pdfKutKayitlariGetir().filter(k => {
    // Yeni format: sureler dizisi
    const sureler = k.sureler || [{ sureNo: k.sureNo, basAyet: k.basAyet, bitAyet: k.bitAyet }];
    return sureler.some(s =>
      parseInt(s.sureNo) === parseInt(sureNo) &&
      parseInt(ayetNo) >= parseInt(s.basAyet) &&
      parseInt(ayetNo) <= parseInt(s.bitAyet)
    );
  });
}

// _pdfKayitYukle güncelle — sureler dizisinden haritayı bul
async function _pdfKayitYukle(kayit, ayetNo) {
  const canvas = document.getElementById('pdf-canvas');
  const yukl = document.getElementById('pdf-yukleniyor');

  yukl.style.display = 'block';
  yukl.innerHTML = '<div class="spin"></div>Yükleniyor…';
  canvas.style.display = 'none';

  const buf = await _pdfOkuIDB(kayit.id);
  if (!buf) {
    yukl.innerHTML = '⚠️ PDF dosyası bulunamadı.<br><span style="font-size:12px;color:var(--muted);">Kütüphaneden tekrar yükleyin</span>';
    return;
  }

  // Doğru sûre aralığını bul
  const sureler = kayit.sureler || [{ sureNo: kayit.sureNo, basAyet: kayit.basAyet, bitAyet: kayit.bitAyet, sayfaHaritasi: kayit.sayjfaHaritasi || kayit.sayfaHaritasi || {} }];
  const ilgiliSure = sureler.find(s =>
    parseInt(s.sureNo) === parseInt(_pdfAktifSure) &&
    parseInt(ayetNo) >= parseInt(s.basAyet) &&
    parseInt(ayetNo) <= parseInt(s.bitAyet)
  ) || sureler[0];

  _pdfJsHazirla(async () => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      _pdfMevcut = pdf;
      _pdfMevcutSure = _pdfAktifSure;
      _pdfMevcutKatalog = kayit;
      const harita = ilgiliSure.sayfaHaritasi || {};
      const hedefSayfa = harita[String(ayetNo)] || harita[parseInt(ayetNo)] || 1;
      await _pdfSayfaCiz(hedefSayfa);
    } catch(e) {
      yukl.style.display = 'block';
      yukl.textContent = 'PDF yüklenemedi: ' + e.message;
    }
  });
}

async function _jsonTefsirUrlEkle() {
  const urlInp = document.getElementById('json-tefsir-url');
  const muellifInp = document.getElementById('json-tefsir-muellif');
  const btn = document.querySelector('#pdfkut-ic button[onclick="_jsonTefsirUrlEkle()"]') ||
              document.querySelector('#pdfkut-ic .json-ekle-btn');

  const url = urlInp ? urlInp.value.trim() : '';
  const muellif = muellifInp ? muellifInp.value.trim() : '';

  if (!url) { alert('URL girin.'); return; }
  if (!muellif) { alert('Müellif adı girin.'); return; }

  if (btn) { btn.textContent = 'Yükleniyor…'; btn.disabled = true; }

  let rawUrl = url;
  if (rawUrl.includes('github.com') && !rawUrl.includes('raw.githubusercontent.com')) {
    rawUrl = rawUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }

  try {
    const r = await fetch(rawUrl);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();

    if (!data.sure_no || !data.ayetler) throw new Error('Geçersiz format. sure_no ve ayetler alanları gerekli.');

    const id = 'json_' + Date.now();
    const kayitlar = _jsonTefsirKayitlariGetir();

    const mevcutIdx = kayitlar.findIndex(k => parseInt(k.sure_no) === parseInt(data.sure_no) && k.muellif === muellif);
    if (mevcutIdx >= 0) {
      kayitlar[mevcutIdx].url = rawUrl;
    } else {
      kayitlar.push({ id, url: rawUrl, muellif, sure_no: parseInt(data.sure_no), sure_adi: data.sure_adi || '' });
    }

    _jsonTefsirKayitlariKaydet(kayitlar);
    delete _jsonTefsirCache[data.sure_no + '_' + muellif];

    if (urlInp) urlInp.value = '';
    if (muellifInp) muellifInp.value = '';

    // Ekrandaki tefsir butonlarını güncelle
    document.querySelectorAll('[id^="pdfbtn-"]').forEach(btn => {
      const parts = btn.id.split('-');
      const bSure = parseInt(parts[1]);
      const bAyet = parseInt(parts[2]);
      const toplamPdf = _ayetIcinPdfler(bSure, bAyet).length;
      const toplamJson = _ayetIcinJsonTefsirler(bSure, bAyet).length;
      const toplam = toplamPdf + toplamJson;
      btn.textContent = toplam > 0 ? '📖 Tefsir (' + toplam + ')' : '📖 Tefsir';
      btn.style.borderColor = toplam > 0 ? 'var(--gold)' : '';
      btn.style.color = toplam > 0 ? 'var(--gold)' : '';
    });

    alert('✅ ' + muellif + ' — ' + (data.sure_adi || data.sure_no + '. Sûre') + ' eklendi!');
    pdfKutuphaneRender();
  } catch(e) {
    alert('Hata: ' + e.message);
  } finally {
    if (btn) { btn.textContent = '+ URL Tefsir Ekle'; btn.disabled = false; }
  }
}

function _jsonTefsirSil(id) {
  if (!confirm('Bu tefsir silinsin mi?')) return;
  _jsonTefsirKayitlariKaydet(_jsonTefsirKayitlariGetir().filter(k => k.id !== id));
  pdfKutuphaneRender();
}

async function _pdfSilIDB(key) {
  return new Promise(res => {
    const req = indexedDB.open('tefsir_pdf_db', 2);
    req.onsuccess = e => {
      const tx = e.target.result.transaction('pdfler', 'readwrite');
      tx.objectStore('pdfler').delete('pdf_' + key);
      tx.oncomplete = res;
      tx.onerror = res;
    };
    req.onerror = res;
  });
}


function isiHaritasiRender() {
  const wrap = document.getElementById('isi-ic');
  wrap.innerHTML = '';

  const sureBilgileri = SURELER.map((s, i) => {
    const sNo = i + 1;
    let notSayisi = 0;
    for (let j = 0; j < localStorage.length; j++) {
      const key = localStorage.key(j);
      if (!key) continue;
      if (key.startsWith('t_' + sNo + '_') || key.startsWith('d_' + sNo + '_')) notSayisi++;
      if (key.startsWith('an_' + sNo + '_')) {
        try { notSayisi += (JSON.parse(localStorage.getItem(key)) || []).length; } catch(e) {}
      }
    }
    try { notSayisi += (JSON.parse(localStorage.getItem('sn_' + sNo)) || []).length; } catch(e) {}
    const okunanlar = (() => { try { return JSON.parse(localStorage.getItem('okunanlar')||'[]'); } catch(e){ return []; } })();
    const okunan = okunanlar.some(o => o.sNo === sNo);
    const kumeler = (() => { try { return JSON.parse(localStorage.getItem('kumeler')||'[]'); } catch(e){ return []; } })();
    const kumeVar = kumeler.some(k => k.sure === sNo);
    return { sNo, isim: s.isim, ayet: s.ayet, notSayisi, okunan, kumeVar };
  });

  const toplamNot = sureBilgileri.reduce((a, b) => a + b.notSayisi, 0);
  const okunanSayisi = sureBilgileri.filter(b => b.okunan).length;
  const aktifSure = sureBilgileri.filter(b => b.notSayisi > 0 || b.okunan || b.kumeVar).length;

  // Özet
  const ozetWrap = document.createElement('div');
  ozetWrap.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;';
  [
    { sayi: toplamNot, lbl: 'Toplam Not' },
    { sayi: okunanSayisi, lbl: 'Okunan Sûre' },
    { sayi: aktifSure, lbl: 'Aktif Sûre' },
  ].forEach(o => {
    const kart = document.createElement('div');
    kart.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:10px;padding:10px 8px;text-align:center;';
    kart.innerHTML = `<div style="font-family:Playfair Display,serif;font-size:22px;font-weight:700;color:var(--gold);">${o.sayi}</div><div style="font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-top:2px;">${o.lbl}</div>`;
    ozetWrap.appendChild(kart);
  });
  wrap.appendChild(ozetWrap);

  // Başlık + legend
  const baslikWrap = document.createElement('div');
  baslikWrap.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:10px 12px;background:var(--paper);border-radius:var(--radius);border:1px solid var(--border);';
  baslikWrap.innerHTML = `
    <div>
      <div style="font-family:Playfair Display,serif;font-size:15px;font-weight:700;color:var(--ink);">🌡️ Okuma Isı Haritası</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">Her kare bir sûre — tıkla ve git</div>
    </div>
    <div style="display:flex;align-items:center;gap:3px;font-size:10px;color:var(--muted);">
      <span>Az</span>
      ${[0,1,2,3,4].map(s=>`<div style="width:13px;height:13px;border-radius:3px;background:${['var(--paper2)','#d4edda','#8ec99a','#4a9a60','#1a6050'][s]};border:1px solid var(--border);"></div>`).join('')}
      <span>Çok</span>
    </div>`;
  wrap.appendChild(baslikWrap);

  // Grid
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:5px;';

  let seciliSure = null;
  const detayPanel = document.createElement('div');
  detayPanel.style.cssText = 'display:none;margin-top:10px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:14px;';

  sureBilgileri.forEach(b => {
    let puan = 0;
    if (b.okunan) puan++;
    if (b.kumeVar) puan++;
    if (b.notSayisi >= 1) puan++;
    if (b.notSayisi >= 4) puan++;
    puan = Math.min(puan, 4);
    const renkler = ['var(--paper2)','#d4edda','#8ec99a','#4a9a60','#1a6050'];
    const yazirenkler = ['var(--muted)','#155724','#0d3d1a','#fff','#fff'];

    const kart = document.createElement('div');
    kart.style.cssText = `background:${renkler[puan]};color:${yazirenkler[puan]};border-radius:8px;padding:6px 4px 5px;cursor:pointer;display:flex;flex-direction:column;align-items:center;min-height:52px;border:1.5px solid transparent;transition:transform 0.1s;`;
    kart.innerHTML = `
      <div style="font-family:Playfair Display,serif;font-size:12px;font-weight:700;">${b.sNo}</div>
      <div style="font-size:8px;text-align:center;margin-top:2px;line-height:1.2;max-height:20px;overflow:hidden;">${b.isim}</div>
      ${b.notSayisi > 0 ? `<div style="font-size:9px;font-weight:700;margin-top:3px;">${b.notSayisi} not</div>` : ''}
    `;

    kart.onclick = () => {
      if (seciliSure === b.sNo) {
        // İkinci tıkta sûreye git
        tabGec('kuran');
        setTimeout(() => {
          const sureKarti = document.getElementById('sure-kart-' + b.sNo);
          if (!sureKarti) return;
          if (!sureKarti.classList.contains('open')) {
            sureKarti.classList.add('open');
            const ic = document.getElementById('sure-ic-' + b.sNo);
            if (ic && ic.children.length === 0) sureIcDoldur(b.sNo, ic);
          }
          sureKarti.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return;
      }
      seciliSure = b.sNo;
      grid.querySelectorAll('div[data-sno]').forEach(k => k.style.borderColor = 'transparent');
      kart.style.borderColor = 'var(--gold)';
      detayPanel.style.display = 'block';
      detayPanel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <span style="font-family:Playfair Display,serif;font-size:15px;font-weight:700;color:var(--ink);">${b.sNo}. ${b.isim}</span>
          <button onclick="this.closest('div[style]').style.display='none'" style="background:none;border:none;font-size:16px;color:var(--muted);cursor:pointer;">✕</button>
        </div>
        ${[
          ['📄 Âyet Sayısı', b.ayet],
          ['📝 Not Sayısı', b.notSayisi],
          ['📖 Okundu', b.okunan ? '✅ Evet' : '—'],
          ['📂 Kümede', b.kumeVar ? '✅ Evet' : '—'],
        ].map(([l,v]) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px;"><span style="color:var(--muted);">${l}</span><strong>${v}</strong></div>`).join('')}
        <button onclick="
          tabGec('kuran');
          setTimeout(() => {
            const sk = document.getElementById('sure-kart-${b.sNo}');
            if (!sk) return;
            if (!sk.classList.contains('open')) {
              sk.classList.add('open');
              const ic2 = document.getElementById('sure-ic-${b.sNo}');
              if (ic2 && ic2.children.length === 0) sureIcDoldur(${b.sNo}, ic2);
            }
            sk.scrollIntoView({ behavior:'smooth', block:'start' });
          }, 150);
        " style="margin-top:10px;width:100%;padding:10px;background:var(--gold);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">▶ Sûreyi Aç</button>
      `;
      detayPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    kart.dataset.sno = b.sNo;
    grid.appendChild(kart);
  });

  wrap.appendChild(grid);
  wrap.appendChild(detayPanel);
}

function yedekEkraniRender() {
  const wrap = document.getElementById('yedek-ic');
  wrap.innerHTML = '';

  let notSayisi = 0, kumeSayisi = 0, okunanSayisi = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('t_') || key.startsWith('d_')) notSayisi++;
    if (key.startsWith('an_') || key.startsWith('sn_')) {
      try { notSayisi += (JSON.parse(localStorage.getItem(key))||[]).length; } catch(e) {}
    }
  }
  try { kumeSayisi = (JSON.parse(localStorage.getItem('kumeler')||'[]')).length; } catch(e){}
  try { okunanSayisi = (JSON.parse(localStorage.getItem('okunanlar')||'[]')).length; } catch(e){}

  const statKart = document.createElement('div');
  statKart.className = 'yedek-kart';
  statKart.innerHTML = `
    <h3>📊 Verilerim</h3>
    <div class="yedek-istatistik">
      <div class="yi-item"><div class="yi-sayi">${notSayisi}</div><div class="yi-lbl">Not</div></div>
      <div class="yi-item"><div class="yi-sayi">${kumeSayisi}</div><div class="yi-lbl">Küme</div></div>
      <div class="yi-item"><div class="yi-sayi">${okunanSayisi}</div><div class="yi-lbl">Okunan Sure</div></div>
      <div class="yi-item"><div class="yi-sayi">${(JSON.stringify(localStorage).length/1024).toFixed(1)}KB</div><div class="yi-lbl">Toplam</div></div>
    </div>`;
  wrap.appendChild(statKart);

  const yedekKart = document.createElement('div');
  yedekKart.className = 'yedek-kart';
  yedekKart.innerHTML = `
    <h3>💾 Yedekleme</h3>
    <p>Notlarınız, kümeleriniz ve okuma listeniz tek bir JSON dosyasına aktarılır. Tarayıcı temizlenmeden önce mutlaka yedek alın.</p>
    <button class="yedek-btn yedek-btn-indir" onclick="yedekIndir()">⬇ Yedeği İndir (.json)</button>
    <div class="yedek-durum" id="yedek-indir-durum">✓ İndirildi!</div>
    <hr style="border:none;border-top:1px solid var(--border);margin:10px 0">
    <p>Daha önce aldığınız yedeği geri yükleyin.</p>
    <label class="yedek-btn yedek-btn-yukle" style="display:block;text-align:center;cursor:pointer">
      ⬆ Yedekten Geri Yükle
      <input type="file" accept=".json" onchange="yedekYukle(event)" style="display:none">
    </label>
    <div class="yedek-durum" id="yedek-yukle-durum">✓ Yüklendi!</div>`;
  wrap.appendChild(yedekKart);

  const silKart = document.createElement('div');
  silKart.className = 'yedek-kart';
  silKart.innerHTML = `
    <h3>⚠️ Tüm Verileri Sil</h3>
    <p>Tüm notlar, kümeler ve okuma listesi kalıcı olarak silinir. Bu işlem geri alınamaz.</p>
    <button class="yedek-btn yedek-btn-sil" onclick="tumVerileriSil()">🗑 Tüm Verileri Kalıcı Sil</button>`;
  wrap.appendChild(silKart);
}

function yedekIndir() {
  const veri = {};
  for (let key in localStorage) { veri[key] = localStorage.getItem(key); }
  const json = JSON.stringify({ versiyon: 2, tarih: new Date().toISOString(), veri }, null, 2);
  const blob = new Blob([json], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kuran-tefsir-yedek-' + new Date().toLocaleDateString('tr-TR').replace(/\./g,'-') + '.json';
  a.click();
  URL.revokeObjectURL(url);
  const d = document.getElementById('yedek-indir-durum');
  if (d) { d.style.display='block'; setTimeout(()=>d.style.display='none',2500); }
}

function yedekYukle(event) {
  const dosya = event.target.files[0];
  if (!dosya) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const obj = JSON.parse(e.target.result);
      const veri = obj.veri || obj;
      let sayac = 0;
      for (let key in veri) { localStorage.setItem(key, veri[key]); sayac++; }
      const d = document.getElementById('yedek-yukle-durum');
      if (d) { d.textContent='✓ '+sayac+' kayıt yüklendi!'; d.style.display='block'; setTimeout(()=>d.style.display='none',3000); }
      statGuncelle(); yedekEkraniRender();
    } catch(err) { alert('Geçersiz yedek dosyası: '+err.message); }
  };
  reader.readAsText(dosya);
}

function tumVerileriSil() {
  if (!confirm('Tüm notlar, kümeler ve okuma listesi silinecek. Önce yedek aldınız mı?')) return;
  if (!confirm('Emin misiniz? Bu işlem GERİ ALINAMAZ.')) return;
  localStorage.clear();
  statGuncelle(); yedekEkraniRender();
  alert('Tüm veriler silindi.');
}
// ════════════════════════════════════════
//  TEMA YÖNETİMİ
// ════════════════════════════════════════
function dahaFazlaAc() {
  const m = document.getElementById('daha-menu');
  const o = document.getElementById('daha-menu-overlay');
  const acik = m.style.display === 'block';
  m.style.display = acik ? 'none' : 'block';
  o.style.display = acik ? 'none' : 'block';
}
function dahaFazlaKapat() {
  document.getElementById('daha-menu').style.display = 'none';
  document.getElementById('daha-menu-overlay').style.display = 'none';
}

function temaSeciciAc() {
  let modal = document.getElementById('tema-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'tema-modal';
    modal.onclick = (e) => { if (e.target === modal) temaModalKapat(); };
    modal.innerHTML = `
      <div class="modal-sheet" style="max-height:80vh;">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <div class="modal-title">🎨 Tema & Yazı Boyutu</div>
          <button class="modal-close" onclick="temaModalKapat()">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;">Tema Seç</div>
          <div class="tema-grid">
            <button class="tema-kart" data-tema="gece" onclick="temaSec(this,'gece')">
              <div class="tema-renk-row"><span style="background:#0d1b2a"></span><span style="background:#c0922a"></span><span style="background:#f0f4f8"></span></div>
              <div class="tema-ad">Gece Mavisi</div>
            </button>
            <button class="tema-kart" data-tema="yesil" onclick="temaSec(this,'yesil')">
              <div class="tema-renk-row"><span style="background:#0f2318"></span><span style="background:#5a8f3c"></span><span style="background:#f3f9f5"></span></div>
              <div class="tema-ad">Yeşil Vadi</div>
            </button>
            <button class="tema-kart" data-tema="dark" onclick="temaSec(this,'dark')">
              <div class="tema-renk-row"><span style="background:#1c1810"></span><span style="background:#c8a040"></span><span style="background:#e8dcc8"></span></div>
              <div class="tema-ad">Koyu Gece</div>
            </button>
            <button class="tema-kart" data-tema="mor" onclick="temaSec(this,'mor')">
              <div class="tema-renk-row"><span style="background:#1e0f30"></span><span style="background:#8060c0"></span><span style="background:#f8f4ff"></span></div>
              <div class="tema-ad">Mor Akşam</div>
            </button>
            <button class="tema-kart" data-tema="acik" onclick="temaSec(this,'acik')">
              <div class="tema-renk-row"><span style="background:#c8a040"></span><span style="background:#4a6580"></span><span style="background:#f8f7f4"></span></div>
              <div class="tema-ad">Açık</div>
            </button>
          </div>

          <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin:16px 0 10px;">Türkçe Yazı Boyutu</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:12px;color:var(--muted);">A</span>
            <input type="range" id="font-boyut-slider" min="12" max="22" step="1" value="14" style="flex:1;accent-color:var(--gold);" oninput="fontBoyutUygula(parseInt(this.value));document.getElementById('font-boyut-goster').textContent=this.value+'px'">
            <span style="font-size:16px;color:var(--muted);">A</span>
            <span id="font-boyut-goster" style="font-size:11px;color:var(--gold);font-weight:700;min-width:30px;text-align:right;">14px</span>
          </div>

          <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin:16px 0 10px;">Arapça Yazı Boyutu</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-family:var(--ar-font);font-size:13px;color:var(--muted);">ا</span>
            <input type="range" id="ar-boyut-slider" min="18" max="36" step="1" value="26" style="flex:1;accent-color:var(--gold);" oninput="arFontBoyutUygula(parseInt(this.value));document.getElementById('ar-boyut-goster').textContent=this.value+'px'">
            <span style="font-family:var(--ar-font);font-size:20px;color:var(--muted);">ا</span>
            <span id="ar-boyut-goster" style="font-size:11px;color:var(--gold);font-weight:700;min-width:30px;text-align:right;">26px</span>
          </div>

        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  const aktifTema = localStorage.getItem('tema') || '';
  modal.querySelectorAll('.tema-kart').forEach(btn => {
    btn.classList.toggle('aktif', btn.dataset.tema === aktifTema);
  });
  const kaydedilmis = parseInt(localStorage.getItem('fontBoyut') || '14');
  const slider = document.getElementById('font-boyut-slider');
  if (slider) { slider.value = kaydedilmis; document.getElementById('font-boyut-goster').textContent = kaydedilmis + 'px'; }

  const kaydedilmisAr = parseInt(localStorage.getItem('arFontBoyut') || '26');
  const arSlider = document.getElementById('ar-boyut-slider');
  if (arSlider) { arSlider.value = kaydedilmisAr; document.getElementById('ar-boyut-goster').textContent = kaydedilmisAr + 'px'; }

  // Arapça renk seçici — bir kez ekle
  if (!document.getElementById('ar-renk-panel')) {
    const panel = document.createElement('div');
    panel.id = 'ar-renk-panel';
    panel.style.cssText = 'padding:0 16px 16px;';
    panel.innerHTML = `
      <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin:14px 0 10px;">🕌 Arapça Kutu Rengi</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        <button class="ar-renk-btn" data-id="krem"  data-bg="#fff8f0" data-br="#f0c8a0" style="width:40px;height:34px;border-radius:9px;border:2px solid #f0c8a0;background:#fff8f0;cursor:pointer;" title="Krem"></button>
        <button class="ar-renk-btn" data-id="mavi"  data-bg="#f0f7ff" data-br="#a8c8f0" style="width:40px;height:34px;border-radius:9px;border:2px solid #a8c8f0;background:#f0f7ff;cursor:pointer;" title="Mavi"></button>
        <button class="ar-renk-btn" data-id="yesil" data-bg="#f0fff4" data-br="#90d8a8" style="width:40px;height:34px;border-radius:9px;border:2px solid #90d8a8;background:#f0fff4;cursor:pointer;" title="Yeşil"></button>
        <button class="ar-renk-btn" data-id="mor"   data-bg="#fdf0ff" data-br="#d8a0f0" style="width:40px;height:34px;border-radius:9px;border:2px solid #d8a0f0;background:#fdf0ff;cursor:pointer;" title="Mor"></button>
        <button class="ar-renk-btn" data-id="altin" data-bg="#fff9e6" data-br="#f0d878" style="width:40px;height:34px;border-radius:9px;border:2px solid #f0d878;background:#fff9e6;cursor:pointer;" title="Altın"></button>
        <button class="ar-renk-btn" data-id="pembe" data-bg="#fff0f0" data-br="#f0a8a8" style="width:40px;height:34px;border-radius:9px;border:2px solid #f0a8a8;background:#fff0f0;cursor:pointer;" title="Pembe"></button>
      </div>`;
    panel.querySelectorAll('.ar-renk-btn').forEach(btn => { btn.onclick = () => arKutuRenkSec(btn); });
    const mb = modal.querySelector('.modal-body');
    if (mb) mb.appendChild(panel);
  }
  const aktifId = localStorage.getItem('arKutuId') || 'krem';
  document.querySelectorAll('.ar-renk-btn').forEach(btn => {
    btn.style.outline = btn.dataset.id === aktifId ? '3px solid var(--gold)' : 'none';
    btn.style.outlineOffset = '2px';
  });
}

function arKutuRenkSec(btn) {
  const bg = btn.getAttribute('data-bg');
  const br = btn.getAttribute('data-br');
  const id = btn.getAttribute('data-id');
  document.documentElement.style.setProperty('--ar-kutu-bg', bg);
  document.documentElement.style.setProperty('--ar-kutu-border', br);
  localStorage.setItem('arKutuBg', bg);
  localStorage.setItem('arKutuBorder', br);
  localStorage.setItem('arKutuId', id);
  document.querySelectorAll('.ar-renk-btn').forEach(b => {
    b.style.outline = b.dataset.id === id ? '3px solid var(--gold)' : 'none';
    b.style.outlineOffset = '2px';
  });
}

(function _arKutuRenkYukle() {
  const bg = localStorage.getItem('arKutuBg');
  const br = localStorage.getItem('arKutuBorder');
  if (bg) document.documentElement.style.setProperty('--ar-kutu-bg', bg);
  if (br) document.documentElement.style.setProperty('--ar-kutu-border', br);
})();

function fontBoyutUygula(deger) {
  document.documentElement.style.setProperty('--tr-fs', deger + 'px');
  document.documentElement.style.setProperty('--yazi-boyut', deger + 'px');
  document.documentElement.style.fontSize = deger + 'px';
  localStorage.setItem('fontBoyut', deger);
  const goster = document.getElementById('font-boyut-goster');
  if (goster) goster.textContent = deger + 'px';
}

function arFontBoyutUygula(deger) {
  document.documentElement.style.setProperty('--ar-fs', deger + 'px');
  localStorage.setItem('arFontBoyut', deger);
  const goster = document.getElementById('ar-boyut-goster');
  if (goster) goster.textContent = deger + 'px';
}

function temaModalKapat(e) {
  const modal = document.getElementById('tema-modal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
function temaSec(btn, tema) {
  if (!btn) return;
  btn.closest('.tema-grid') && btn.closest('.tema-grid').querySelectorAll('.tema-kart').forEach(b => b.classList.remove('aktif'));
  btn.classList.add('aktif');
  document.documentElement.setAttribute('data-tema', tema);
  localStorage.setItem('tema', tema);
  setTimeout(() => temaModalKapat(), 200);
}
// Sayfa açılınca kayıtlı tema ve font boyutunu uygula
(function() {
  const t = localStorage.getItem('tema') || '';
  if (t) document.documentElement.setAttribute('data-tema', t);
  const f = parseInt(localStorage.getItem('fontBoyut') || '15');
  document.documentElement.style.setProperty('--yazi-boyut', f + 'px');
  document.documentElement.style.fontSize = f + 'px';
  // Küme sure select'lerini doldur
  setTimeout(_kumeSureDoldur, 100);
})();

// ════════════════════════════════════════
//  NOT MODAL
// ════════════════════════════════════════
function notModalAc(sNo, aNo, tip, notBtn) {
  const sure = SURELER[sNo-1];
  document.getElementById('not-modal-baslik').textContent = '📝 ' + sure.isim + ' ' + sNo + ':' + aNo;
  const ic = document.getElementById('not-modal-ic');
  ic.innerHTML = '';
  const mevcutNot = localStorage.getItem(notKey(sNo, aNo, 't')) || '';
  const rteModal = rteOlustur('Tefsir, düşünce, açıklama…', mevcutNot);
  ic.appendChild(rteModal);
  const footer2 = document.createElement('div');
  footer2.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:10px;';
  const badge2 = document.createElement('span');
  badge2.className = 'not-kaydedildi';
  badge2.textContent = '✓ Kaydedildi';
  const sil2 = document.createElement('button');
  sil2.className = 'not-kaydet-btn';
  sil2.style.cssText = 'background:var(--rust);border-color:var(--rust);padding:10px 16px;';
  sil2.textContent = 'Sil';
  sil2.style.display = mevcutNot ? '' : 'none';
  sil2.onclick = () => {
    notKaydet(sNo, aNo, 't', '', badge2);
    if (notBtn) { notBtn.innerHTML = '📝 Not Ekle'; notBtn.classList.remove('var'); }
    setTimeout(notModalKapat, 300);
  };
  const kaydet2 = document.createElement('button');
  kaydet2.className = 'not-kaydet-btn';
  kaydet2.style.cssText = 'padding:10px 24px;font-size:14px;';
  kaydet2.textContent = 'Kaydet';
  kaydet2.onclick = () => {
    const html2 = rteModal.getRTEHtml();
    const duz2 = html2.replace(/<[^>]*>/g,'').trim();
    notKaydet(sNo, aNo, 't', duz2 ? html2 : '', badge2);
    if (notBtn) { notBtn.innerHTML = duz2 ? '📝 Notu Düzenle' : '📝 Not Ekle'; notBtn.classList.toggle('var', !!duz2); }
    const sdot = document.getElementById('sdot-'+sNo);
    if (sdot) sdot.classList.toggle('var', sureNotVarMi(sNo));
    setTimeout(notModalKapat, 400);
  };
  footer2.appendChild(badge2); footer2.appendChild(sil2); footer2.appendChild(kaydet2);
  ic.appendChild(footer2);
  document.getElementById('not-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => rteModal.focusEditor(), 100);
}

function notModalKapat(e) {
  if (e && e.target !== document.getElementById('not-modal')) return;
  document.getElementById('not-modal').classList.remove('open');
  document.body.style.overflow = '';
}


// ════════════════════════════════════════
//  YARDIMCI: sureNotlariniGetir
// ════════════════════════════════════════
function sureNotlariniGetir(sNo) {
  // Önce yeni format (an_sNo_0), sonra eski format (sn_sNo) kontrol et
  try {
    const yeni = JSON.parse(localStorage.getItem('an_' + sNo + '_0') || '[]');
    if (yeni.length > 0) return yeni;
    const eski = JSON.parse(localStorage.getItem('sn_' + sNo) || '[]');
    if (eski.length > 0) {
      // Eski formatı yeniye taşı
      localStorage.setItem('an_' + sNo + '_0', JSON.stringify(eski));
      localStorage.removeItem('sn_' + sNo);
      return eski;
    }
    return [];
  } catch(e) { return []; }
}

// ════════════════════════════════════════
//  ZENGİN METİN EDİTÖRÜ
// ════════════════════════════════════════
const RTE_RENKLER = ['#c0392b','#e67e22','#f1c40f','#27ae60','#2980b9','#8e44ad','#2c2c3e','#888899'];

function rteOlustur(placeholder, baslangicHTML) {
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';

  const toolbar = document.createElement('div');
  toolbar.className = 'rte-toolbar';

  const editor = document.createElement('div');
  editor.className = 'rte-editor';
  editor.contentEditable = 'true';
  editor.setAttribute('placeholder', placeholder || 'Notunuzu buraya yazın…');
  if (baslangicHTML) editor.innerHTML = baslangicHTML;

  function ekleBtn(icerik, komut, title) {
    const btn = document.createElement('button');
    btn.className = 'rte-btn';
    btn.innerHTML = icerik;
    btn.title = title || '';
    btn.type = 'button';
    btn.onmousedown = (e) => {
      e.preventDefault();
      editor.focus();
      document.execCommand(komut, false, null);
      guncelle();
    };
    toolbar.appendChild(btn);
    return btn;
  }

  const boldBtn   = ekleBtn('<b>B</b>', 'bold', 'Kalın');
  const italicBtn = ekleBtn('<i>İ</i>', 'italic', 'İtalik');
  const ulBtn     = ekleBtn('≡', 'insertUnorderedList', 'Liste');

  const underBtn = document.createElement('button');
  underBtn.className = 'rte-btn';
  underBtn.innerHTML = '<u>A</u>';
  underBtn.title = 'Altı çizili';
  underBtn.type = 'button';
  underBtn.onmousedown = (e) => { e.preventDefault(); editor.focus(); document.execCommand('underline'); guncelle(); };
  toolbar.appendChild(underBtn);

  const hBtn = document.createElement('button');
  hBtn.className = 'rte-btn';
  hBtn.innerHTML = 'H';
  hBtn.title = 'Başlık';
  hBtn.type = 'button';
  hBtn.onmousedown = (e) => {
    e.preventDefault(); editor.focus();
    const sel = window.getSelection();
    let isH3 = false;
    if (sel && sel.anchorNode) {
      const el = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
      isH3 = !!(el && el.closest && el.closest('h3'));
    }
    document.execCommand('formatBlock', false, isH3 ? 'p' : 'h3');
    guncelle();
  };
  toolbar.appendChild(hBtn);

  const sep = document.createElement('div'); sep.className = 'rte-sep'; toolbar.appendChild(sep);

  const renkBtn = document.createElement('button');
  renkBtn.className = 'rte-renk-btn';
  renkBtn.title = 'Metin rengi';
  renkBtn.style.background = '#c0392b';
  renkBtn.type = 'button';

  const renkSecici = document.createElement('div');
  renkSecici.className = 'rte-renk-secici';

  RTE_RENKLER.forEach(renk => {
    const dot = document.createElement('div');
    dot.className = 'rte-renk-dot';
    dot.style.background = renk;
    dot.onmousedown = (e) => {
      e.preventDefault(); editor.focus();
      document.execCommand('foreColor', false, renk);
      renkBtn.style.background = renk;
      renkSecici.classList.remove('open');
    };
    renkSecici.appendChild(dot);
  });

  renkBtn.onmousedown = (e) => { e.preventDefault(); editor.focus(); renkSecici.classList.toggle('open'); };
  document.addEventListener('mousedown', (e) => { if (!wrap.contains(e.target)) renkSecici.classList.remove('open'); }, true);

  wrap.appendChild(renkSecici);
  toolbar.appendChild(renkBtn);

  function guncelle() {
    boldBtn.classList.toggle('aktif', document.queryCommandState('bold'));
    italicBtn.classList.toggle('aktif', document.queryCommandState('italic'));
    underBtn.classList.toggle('aktif', document.queryCommandState('underline'));
    ulBtn.classList.toggle('aktif', document.queryCommandState('insertUnorderedList'));
    try {
      const sel = window.getSelection();
      if (sel && sel.anchorNode) {
        const el = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
        hBtn.classList.toggle('aktif', !!(el && el.closest && el.closest('h3')));
      }
    } catch(e2) {}
  }

  editor.addEventListener('keyup', guncelle);
  editor.addEventListener('mouseup', guncelle);

  wrap.appendChild(toolbar);
  wrap.appendChild(editor);
  wrap.getRTEHtml = () => editor.innerHTML;
  wrap.setRTEHtml = (html) => { editor.innerHTML = html || ''; };
  wrap.focusEditor = () => editor.focus();
  return wrap;
}

// ════════════════════════════════════════
//  SÛRE NOT MODAL
// ════════════════════════════════════════
function sureNotModalAc(sNo) {
  const sure = SURELER[sNo - 1];
  // Başlığı sure bazlı yap
  document.getElementById('notlar-modal-baslik').textContent =
    (sure ? sure.isim : sNo + '. Sûre') + ' — Notlar';
  // İçeriği sure not sistemiyle doldur
  _sureNotModalIcDoldur(sNo);
  document.getElementById('notlar-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _sureNotModalIcDoldur(sNo) {
  const ic = document.getElementById('notlar-modal-ic');
  ic.innerHTML = '';
  const sure = SURELER[sNo - 1];
  const notlar = sureNotlariniGetir(sNo);

  // Üst bilgi şeridi
  const bilgiBant = document.createElement('div');
  bilgiBant.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px 16px;background:linear-gradient(135deg,var(--gold2) 0%,var(--paper2) 100%);border-bottom:1px solid var(--border);margin-bottom:4px;';
  bilgiBant.innerHTML = `
    <div style="width:40px;height:40px;border-radius:10px;background:var(--gold);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:16px;font-weight:700;flex-shrink:0;">${sNo}</div>
    <div>
      <div style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:var(--ink);">${sure ? sure.isim : sNo + '. Sûre'}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">${notlar.length} not klasörü</div>
    </div>`;
  ic.appendChild(bilgiBant);

  // Mevcut notları listele
  notlar.forEach((n, idx) => {
    const kart = document.createElement('div');
    kart.className = 'cnot-kart';
    kart.style.cssText = 'margin:6px 10px;border-radius:12px;border:1px solid var(--border);background:var(--paper);overflow:hidden;';

    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;';

    const ikonDiv = document.createElement('div');
    ikonDiv.style.cssText = 'width:36px;height:36px;border-radius:9px;background:var(--gold3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;';
    ikonDiv.textContent = '📁';

    const bilgiDiv = document.createElement('div');
    bilgiDiv.style.cssText = 'flex:1;min-width:0;';
    const tmp = document.createElement('div');
    tmp.innerHTML = n.icerik || '';
    const kelimeSayisi = (tmp.textContent || '').trim().split(/\s+/).filter(Boolean).length;
    bilgiDiv.innerHTML = `<div style="font-family:'Source Serif 4',serif;font-size:13px;font-weight:700;color:var(--ink);">${n.isim || ('Not ' + (idx+1))}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">${n.tarih || ''} · ${kelimeSayisi} kelime</div>`;

    const silBtn = document.createElement('button');
    silBtn.textContent = 'Sil';
    silBtn.style.cssText = 'padding:4px 10px;border:1px solid var(--rust);border-radius:6px;background:none;color:var(--rust);font-size:11px;cursor:pointer;flex-shrink:0;';
    silBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm('"' + (n.isim||'Not') + '" silinsin mi?')) return;
      const arr = sureNotlariniGetir(sNo);
      arr.splice(idx, 1);
      if (arr.length === 0) localStorage.removeItem('an_' + sNo + '_0');
      else localStorage.setItem('an_' + sNo + '_0', JSON.stringify(arr));
      statGuncelle();
      _sureNotModalIcDoldur(sNo);
      const dot = document.getElementById('sdot-' + sNo);
      if (dot) dot.classList.toggle('var', sureNotVarMi(sNo));
    };

    const chev = document.createElement('span');
    chev.style.cssText = 'color:var(--muted);font-size:14px;flex-shrink:0;';
    chev.textContent = '›';

    hdr.appendChild(ikonDiv);
    hdr.appendChild(bilgiDiv);
    hdr.appendChild(silBtn);
    hdr.appendChild(chev);

    hdr.onclick = () => {
      // Not okuma sayfası aç — sure notu için özel mod
      _sureNotOkuAc(sNo, idx, n);
    };

    kart.appendChild(hdr);
    ic.appendChild(kart);
  });

  // Yeni Not Ekle butonu
  const ekleBtn = document.createElement('div');
  ekleBtn.style.cssText = 'margin:10px;padding:14px;border:1.5px dashed var(--gold);border-radius:12px;text-align:center;color:var(--gold);font-weight:700;font-size:13px;cursor:pointer;font-family:"Source Serif 4",serif;';
  ekleBtn.textContent = '+ Yeni Klasör & Not Ekle';
  ekleBtn.onclick = () => _sureYeniNotFormu(sNo, ic, ekleBtn);
  ic.appendChild(ekleBtn);
}

function _sureYeniNotFormu(sNo, ic, ekleBtn) {
  ekleBtn.style.display = 'none';
  const form = document.createElement('div');
  form.style.cssText = 'padding:10px 14px 16px;';
  form.innerHTML = `
    <input id="sure-not-isim" placeholder="Klasör adı (ör: Tefsir, Kişisel…)"
      style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:14px;color:var(--ink);outline:none;box-sizing:border-box;margin-bottom:10px;">
    <textarea id="sure-not-icerik" placeholder="Sûre hakkında notunuzu yazın…"
      style="width:100%;min-height:120px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:14px;color:var(--ink);outline:none;resize:none;box-sizing:border-box;line-height:1.8;"
      oninput="this.style.height='auto';this.style.height=Math.max(120,this.scrollHeight)+'px'"></textarea>
    <div style="display:flex;gap:8px;margin-top:10px;">
      <button id="sure-not-iptal" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);color:var(--muted);font-size:13px;cursor:pointer;">İptal</button>
      <button id="sure-not-kaydet" style="flex:2;padding:10px;border:none;border-radius:8px;background:var(--ink);color:var(--gold2);font-size:14px;font-weight:700;cursor:pointer;">✓ Kaydet</button>
    </div>`;
  ic.appendChild(form);
  setTimeout(() => document.getElementById('sure-not-isim')?.focus(), 100);

  form.querySelector('#sure-not-iptal').onclick = () => {
    form.remove();
    ekleBtn.style.display = '';
  };
  form.querySelector('#sure-not-kaydet').onclick = () => {
    const isim = document.getElementById('sure-not-isim').value.trim();
    const icerik = document.getElementById('sure-not-icerik').value.trim();
    if (!icerik) { document.getElementById('sure-not-icerik').style.borderColor = 'var(--rust)'; return; }
    const arr = sureNotlariniGetir(sNo);
    arr.push({ isim: isim || 'Klasör 1', icerik, tarih: new Date().toLocaleDateString('tr-TR', {day:'2-digit',month:'2-digit',year:'numeric'}) });
    localStorage.setItem('an_' + sNo + '_0', JSON.stringify(arr));
    statGuncelle();
    const dot = document.getElementById('sdot-' + sNo);
    if (dot) dot.classList.toggle('var', true);
    _sureNotModalIcDoldur(sNo);
  };
}

function _sureNotOkuAc(sNo, idx, n) {
  // Mevcut notOkumaSayfasiAc sistemini kullan
  // sure notu için aNo=0, geldigiYer='sure' olarak işaretle
  document.getElementById('notlar-modal').classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    notOkumaSayfasiAc(sNo, 0, idx, n, 'sure');
    // Başlık ve klasör adını sure için güncelle
    const sure = SURELER[sNo - 1];
    const sureAdiEl = document.getElementById('not-okuma-sure-adi');
    const klasorEl = document.getElementById('not-okuma-klasor-adi');
    if (sureAdiEl) sureAdiEl.textContent = sure ? sure.isim : sNo + '. Sûre';
    if (klasorEl) klasorEl.textContent = '📁 ' + (n.isim || 'Klasör ' + (idx + 1));
  }, 100);
}

function sureNotModalKapat(e) {
  if (e && e.target !== document.getElementById('sure-not-modal')) return;
  document.getElementById('sure-not-modal').classList.remove('open');
  document.body.style.overflow = '';
}

function _renderSureNotModal(sNo, body) {
  body.innerHTML = '';
  const notlar = sureNotlariniGetir(sNo);

  // Mevcut notları listele
  notlar.forEach((n, idx) => {
    const kart = document.createElement('div');
    kart.className = 'cnot-kart';

    const hdr = document.createElement('div');
    hdr.className = 'cnot-kart-hdr';

    const isimEl = document.createElement('div');
    isimEl.className = 'cnot-kart-isim';
    isimEl.textContent = n.isim || ('Not ' + (idx+1));

    const onizEl = document.createElement('div');
    onizEl.className = 'cnot-kart-oniz';
    const tmp = document.createElement('div');
    tmp.innerHTML = n.icerik || '';
    const duz = tmp.textContent;
    onizEl.textContent = duz.substring(0, 40) + (duz.length > 40 ? '…' : '');

    const silBtn = document.createElement('button');
    silBtn.className = 'cnot-kart-sil';
    silBtn.textContent = 'Sil';
    silBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm('"' + (n.isim||'Not') + '" silinsin mi?')) return;
      const arr = sureNotlariniGetir(sNo);
      arr.splice(idx, 1);
      localStorage.setItem('sn_'+sNo, JSON.stringify(arr));
      statGuncelle();
      _renderSureNotModal(sNo, body);
      const dot = document.getElementById('sdot-'+sNo);
      if (dot) dot.classList.toggle('var', sureNotVarMi(sNo));
    };

    const chev = document.createElement('span');
    chev.className = 'cnot-kart-chev';
    chev.textContent = '▾';

    hdr.appendChild(isimEl); hdr.appendChild(onizEl);
    hdr.appendChild(silBtn); hdr.appendChild(chev);
    kart.appendChild(hdr);

    const ic = document.createElement('div');
    ic.className = 'cnot-kart-ic';
    kart.appendChild(ic);

    hdr.onclick = () => {
      const acik = kart.classList.toggle('open');
      if (acik && ic.children.length === 0) {
        const rte = rteOlustur('', n.icerik || '');
        ic.appendChild(rte);
        const kaydet2 = document.createElement('button');
        kaydet2.className = 'cnot-yeni-btn';
        kaydet2.style.marginTop = '8px';
        kaydet2.textContent = '✓ Kaydet';
        kaydet2.onclick = () => {
          const arr2 = sureNotlariniGetir(sNo);
          arr2[idx].icerik = rte.getRTEHtml();
          localStorage.setItem('sn_'+sNo, JSON.stringify(arr2));
          statGuncelle();
          _renderSureNotModal(sNo, body);
        };
        ic.appendChild(kaydet2);
        setTimeout(() => rte.focusEditor(), 50);
      }
    };

    body.appendChild(kart);
  });

  if (notlar.length === 0) {
    const bos = document.createElement('div');
    bos.style.cssText = 'text-align:center;padding:16px;color:var(--muted);font-size:13px;';
    bos.textContent = 'Henüz not yok. Aşağıdan ekleyin.';
    body.appendChild(bos);
  }

  // Yeni not formu
  const sep2 = document.createElement('div');
  sep2.style.cssText = 'border-top:1px solid var(--border);padding-top:14px;margin-top:8px;';

  const baslikEl = document.createElement('div');
  baslikEl.style.cssText = "font-family:Playfair Display,serif;font-size:14px;font-weight:500;color:var(--ink);margin-bottom:10px;";
  baslikEl.textContent = '+ Yeni Not';
  sep2.appendChild(baslikEl);

  const isimInp = document.createElement('input');
  isimInp.className = 'cnot-yeni-input';
  isimInp.placeholder = 'Not başlığı (örn: Genel, Tefsir, Hadis…)';
  sep2.appendChild(isimInp);

  const rteYeni = rteOlustur('Sûre hakkında düşünceler…', '');
  sep2.appendChild(rteYeni);

  const kaydetBtn = document.createElement('button');
  kaydetBtn.className = 'cnot-yeni-btn';
  kaydetBtn.textContent = '✓ Notu Kaydet';
  kaydetBtn.onclick = () => {
    const icerik = rteYeni.getRTEHtml();
    if (!icerik.replace(/<[^>]*>/g,'').trim()) { alert('Not boş olamaz.'); return; }
    const arr3 = sureNotlariniGetir(sNo);
    arr3.push({ isim: isimInp.value.trim() || 'Not', icerik: icerik, tarih: new Date().toLocaleDateString('tr-TR') });
    localStorage.setItem('sn_'+sNo, JSON.stringify(arr3));
    statGuncelle();
    _renderSureNotModal(sNo, body);
    const dot = document.getElementById('sdot-'+sNo);
    if (dot) dot.classList.add('var');
  };
  sep2.appendChild(kaydetBtn);
  body.appendChild(sep2);
}


// ════════════════════════════════════════
//  ÂYET ÇOKLU NOT
// ════════════════════════════════════════
function ayetNotlariniGetir(sNo, aNo) {
  // 1) Önce bellek cache'inde (GitHub'dan çekilmiş "Tefsir" verisi) var mı bak
  const bellekIcerik = _bellekTefsirAyetGetir(sNo, aNo);

  // 2) localStorage'daki (manuel eklenmiş diğer notlar, örn. Nüzul Sebebi, kişisel notlar) her zaman oku
  let localArr = [];
  try { localArr = JSON.parse(localStorage.getItem('an_'+sNo+'_'+aNo) || '[]'); } catch(e) { localArr = []; }

  // "Tefsir" isimli notu bellekten al (varsa), localStorage'daki "Tefsir" harici notları koru
  const digerNotlar = localArr.filter(n => n.isim !== 'Tefsir');
  if (bellekIcerik) {
    return [{ isim: 'Tefsir', icerik: bellekIcerik, tarih: '' }, ...digerNotlar];
  }
  return localArr; // bellek boşsa eski davranış (localStorage'daki her şey, varsa Tefsir dahil)
}

// Bellek cache'inden (GitHub kaynaklı, RAM'de) bir ayetin "Tefsir" içeriğini getirir
function _bellekTefsirAyetGetir(sNo, aNo) {
  if (!window._bellekTefsirVerisi || !window._bellekTefsirVerisi[sNo]) return null;
  return window._bellekTefsirVerisi[sNo][aNo] || null;
}

function ayetCokluNotModalAc(sNo, aNo) {
  const sure = SURELER[sNo-1];
  document.getElementById('sure-not-modal-baslik').textContent = '📝 ' + sure.isim + ' ' + sNo + ':' + aNo + ' — Not & Atıf';
  const body = document.getElementById('sure-not-modal-body');
  body.innerHTML = '';
  _renderAyetNotModal(sNo, aNo, body);
  document.getElementById('sure-not-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _renderAyetNotModal(sNo, aNo, body) {
  body.innerHTML = '';
  const notlar = ayetNotlariniGetir(sNo, aNo);

  notlar.forEach((n, idx) => {
    const kart = document.createElement('div');
    kart.className = 'cnot-kart';

    const hdr = document.createElement('div');
    hdr.className = 'cnot-kart-hdr';

    const isimEl = document.createElement('div');
    isimEl.className = 'cnot-kart-isim';
    isimEl.textContent = n.isim || ('Not ' + (idx+1));

    const onizEl = document.createElement('div');
    onizEl.className = 'cnot-kart-oniz';
    const tmp2 = document.createElement('div');
    tmp2.innerHTML = n.icerik || '';
    const duz2 = tmp2.textContent;
    onizEl.textContent = duz2.substring(0, 40) + (duz2.length > 40 ? '…' : '');

    const silBtn = document.createElement('button');
    silBtn.className = 'cnot-kart-sil';
    silBtn.textContent = 'Sil';
    silBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm('"' + (n.isim||'Not') + '" silinsin mi?')) return;
      const arr = ayetNotlariniGetir(sNo, aNo);
      arr.splice(idx, 1);
      if (arr.length === 0) localStorage.removeItem('an_'+sNo+'_'+aNo);
      else localStorage.setItem('an_'+sNo+'_'+aNo, JSON.stringify(arr));
      statGuncelle();
      _renderAyetNotModal(sNo, aNo, body);
      // Not butonunu güncelle
      const anBtn = document.getElementById('an-btn-'+sNo+'-'+aNo);
      if (anBtn) {
        const var2 = ayetNotlariniGetir(sNo,aNo).length > 0 || !!localStorage.getItem(notKey(sNo,aNo,'t'));
        anBtn.classList.toggle('var', var2);
        anBtn.innerHTML = ayetNotlariniGetir(sNo,aNo).length > 0 ? '📎 Atıf & Notlar (' + ayetNotlariniGetir(sNo,aNo).length + ')' : '📎 Atıf Ekle';
      }
    };

    const chev = document.createElement('span');
    chev.className = 'cnot-kart-chev';
    chev.textContent = '▾';

    hdr.appendChild(isimEl); hdr.appendChild(onizEl);
    hdr.appendChild(silBtn); hdr.appendChild(chev);
    kart.appendChild(hdr);

    const ic = document.createElement('div');
    ic.className = 'cnot-kart-ic';
    kart.appendChild(ic);

    hdr.onclick = () => {
      const acik = kart.classList.toggle('open');
      if (acik && ic.children.length === 0) {
        const rte = rteOlustur('', n.icerik || '');
        ic.appendChild(rte);
        const kaydet2 = document.createElement('button');
        kaydet2.className = 'cnot-yeni-btn';
        kaydet2.style.marginTop = '8px';
        kaydet2.textContent = '✓ Kaydet';
        kaydet2.onclick = () => {
          const arr2 = ayetNotlariniGetir(sNo, aNo);
          arr2[idx].icerik = rte.getRTEHtml();
          localStorage.setItem('an_'+sNo+'_'+aNo, JSON.stringify(arr2));
          statGuncelle();
          _renderAyetNotModal(sNo, aNo, body);
        };
        ic.appendChild(kaydet2);
        setTimeout(() => rte.focusEditor(), 50);
      }
    };

    body.appendChild(kart);
  });

  if (notlar.length === 0) {
    const bos = document.createElement('div');
    bos.style.cssText = 'text-align:center;padding:16px;color:var(--muted);font-size:13px;';
    bos.textContent = 'Henüz not yok. Aşağıdan ekleyin.';
    body.appendChild(bos);
  }

  // Yeni not formu
  const sep2 = document.createElement('div');
  sep2.style.cssText = 'border-top:1px solid var(--border);padding-top:14px;margin-top:8px;';

  const baslikLabel = document.createElement('div');
  baslikLabel.style.cssText = "font-family:Playfair Display,serif;font-size:14px;font-weight:500;color:var(--ink);margin-bottom:10px;";
  baslikLabel.textContent = '+ Yeni Not';
  sep2.appendChild(baslikLabel);

  const isimInp2 = document.createElement('input');
  isimInp2.className = 'cnot-yeni-input';
  isimInp2.placeholder = 'Not başlığı (örn: Tefsir, Hadis, Düşünce…)';
  sep2.appendChild(isimInp2);

  const rteYeni2 = rteOlustur('Bu âyet hakkında not…', '');
  sep2.appendChild(rteYeni2);

  const kaydetBtn2 = document.createElement('button');
  kaydetBtn2.className = 'cnot-yeni-btn';
  kaydetBtn2.textContent = '✓ Notu Kaydet';
  kaydetBtn2.onclick = () => {
    const icerik2 = rteYeni2.getRTEHtml();
    if (!icerik2.replace(/<[^>]*>/g,'').trim()) { alert('Not boş olamaz.'); return; }
    const arr3 = ayetNotlariniGetir(sNo, aNo);
    arr3.push({ isim: isimInp2.value.trim() || 'Not', icerik: icerik2, tarih: new Date().toLocaleDateString('tr-TR') });
    localStorage.setItem('an_'+sNo+'_'+aNo, JSON.stringify(arr3));
    statGuncelle();
    _renderAyetNotModal(sNo, aNo, body);
    // Butonu güncelle
    const anBtn = document.getElementById('an-btn-'+sNo+'-'+aNo);
    if (anBtn) {
      anBtn.classList.add('var');
      anBtn.innerHTML = '📎 Atıf & Notlar (' + arr3.length + ')';
    }
  };
  sep2.appendChild(kaydetBtn2);
  body.appendChild(sep2);
}

// ════════════════════════════════════════
//  YAZI BOYUTU
// ════════════════════════════════════════
const YAZI_BOYUT_ADIM = [13, 15, 17, 20, 24];
const YAZI_BOYUT_ETIKET = ['XS', 'S', 'M', 'L', 'XL'];
let aktifYaziBoyut = parseInt(localStorage.getItem('yaziBoyut') || '2');

function yaziBoyutUygula() {
  const boyut = YAZI_BOYUT_ADIM[aktifYaziBoyut];
  document.body.style.setProperty('--meal-fs', boyut + 'px');
  document.body.style.setProperty('--inline-meal-fs', boyut + 'px');
  const g = document.getElementById('yazi-boyut-goster');
  if (g) g.textContent = YAZI_BOYUT_ETIKET[aktifYaziBoyut];
  // Tüm meal ve içerik fontlarını güncelle
  const style = document.getElementById('dinamik-yazi-stili') || (() => {
    const s = document.createElement('style');
    s.id = 'dinamik-yazi-stili';
    document.head.appendChild(s);
    return s;
  })();
  style.textContent = `.inline-meal, .meal-metin, .okuma-meal, .ayet-ekstra-icerik { font-size: ${boyut}px !important; }
    .inline-arapca-metin { font-size: ${Math.round(boyut * 1.5)}px !important; }
    .arapca-metin { font-size: ${Math.round(boyut * 1.6)}px !important; }`;
}

function yaziBoyutDegistir(yon) {
  aktifYaziBoyut = Math.max(0, Math.min(YAZI_BOYUT_ADIM.length - 1, aktifYaziBoyut + yon));
  localStorage.setItem('yaziBoyut', aktifYaziBoyut);
  yaziBoyutUygula();
}

yaziBoyutUygula();

// Kayıtlı yazı boyutlarını uygula
(function() {
  const tr = parseInt(localStorage.getItem('fontBoyut') || '14');
  const ar = parseInt(localStorage.getItem('arFontBoyut') || '26');
  document.documentElement.style.setProperty('--tr-fs', tr + 'px');
  document.documentElement.style.setProperty('--ar-fs', ar + 'px');
})();

cuzBarOlustur();
sureListesiRender();
kumeListesiRender();
statGuncelle();

// Arama ekranı başlangıç mesajı
document.getElementById('arama-sonuclar').innerHTML =
  '<div class="bos-durum" style="padding:30px 0"><div class="ic" style="font-size:28px">🔍</div>Konu adı veya not metni arayın</div>';
// ════════════════════════════════════════════════════════════════
//  1. KONU AĞI — Âyetler arası bağlantı görselleştirme (D3 force graph)
// ════════════════════════════════════════════════════════════════
function konuAgiRender() {
  const wrap = document.getElementById('konuagi-ic');
  wrap.innerHTML = '';

  // Başlık + açıklama
  const baslik = _ekranBaslik('🕸️ Konu Ağı', 'İlişkili âyet bağlantılarınızın görsel haritası. Düğümlere tıklayarak âyete gidin.');
  wrap.appendChild(baslik);

  // Tüm ilişkili ayet verilerini topla
  const dugumler = new Map(); // "sNo:aNo" → {id, sNo, aNo, sure, baglar}
  const kenarlar = []; // {source, target}

  for (const key in localStorage) {
    const m = key.match(/^ia_(\d+)_(\d+)$/);
    if (!m) continue;
    const sNo = parseInt(m[1]), aNo = parseInt(m[2]);
    const id = sNo + ':' + aNo;
    if (!dugumler.has(id)) dugumler.set(id, { id, sNo, aNo, sure: SURELER[sNo-1], baglar: 0 });
    const liste = iliskiliAyetleriGetir(sNo, aNo);
    liste.forEach(it => {
      const tid = it.sNo + ':' + it.aNo;
      if (!dugumler.has(tid)) dugumler.set(tid, { id: tid, sNo: it.sNo, aNo: it.aNo, sure: SURELER[it.sNo-1], baglar: 0 });
      // Çift kenar ekleme
      const zaten = kenarlar.some(e => (e.source === id && e.target === tid) || (e.source === tid && e.target === id));
      if (!zaten) kenarlar.push({ source: id, target: tid });
      dugumler.get(id).baglar++;
      dugumler.get(tid).baglar++;
    });
  }

  const dugumArr = Array.from(dugumler.values());

  if (dugumArr.length === 0) {
    const bos = document.createElement('div');
    bos.className = 'bos-durum';
    bos.innerHTML = '<div class="ic">🔗</div><div>Henüz ilişkili âyet bağlantısı yok.<br>Âyetlerin altındaki <b>🔗 İlişkili Âyet</b> butonunu kullanın.</div>';
    wrap.appendChild(bos);
    return;
  }

  // Stats bar
  const statsBar = document.createElement('div');
  statsBar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px;';
  [
    { n: dugumArr.length, l: 'Âyet Düğümü' },
    { n: kenarlar.length, l: 'Bağlantı' },
    { n: new Set(dugumArr.map(d => d.sNo)).size, l: 'Sûre' }
  ].forEach(o => {
    const k = document.createElement('div');
    k.style.cssText = 'flex:1;background:var(--paper);border:1px solid var(--border);border-radius:10px;padding:10px 6px;text-align:center;';
    k.innerHTML = `<div style="font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--gold);">${o.n}</div><div style="font-size:9px;color:var(--muted);font-weight:700;letter-spacing:0.8px;text-transform:uppercase;margin-top:2px;">${o.l}</div>`;
    statsBar.appendChild(k);
  });
  wrap.appendChild(statsBar);

  // SVG canvas
  const svgWrap = document.createElement('div');
  svgWrap.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:12px;position:relative;';
  const W = Math.min(window.innerWidth - 24, 480);
  const H = Math.max(320, Math.min(dugumArr.length * 60, 500));
  svgWrap.style.height = H + 'px';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.display = 'block';

  // Renk paleti — sure bazlı
  const sureRenkler = {};
  const palet = ['#a07830','#1a6050','#8060c0','#c0392b','#2980b9','#27ae60','#e67e22','#8e44ad'];
  let ri = 0;
  dugumArr.forEach(d => {
    if (!sureRenkler[d.sNo]) { sureRenkler[d.sNo] = palet[ri % palet.length]; ri++; }
  });

  // Basit force layout simülasyonu (D3 olmadan, yerleşik)
  dugumArr.forEach((d, i) => {
    const angle = (2 * Math.PI * i) / dugumArr.length;
    const r = Math.min(W, H) * 0.35;
    d.x = W / 2 + r * Math.cos(angle);
    d.y = H / 2 + r * Math.sin(angle);
    d.vx = 0; d.vy = 0;
  });

  const idxMap = {};
  dugumArr.forEach((d, i) => idxMap[d.id] = i);

  // 80 adım simülasyon
  for (let iter = 0; iter < 80; iter++) {
    // İtme kuvveti
    for (let i = 0; i < dugumArr.length; i++) {
      for (let j = i + 1; j < dugumArr.length; j++) {
        const a = dugumArr[i], b = dugumArr[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const force = 1200 / (dist * dist);
        a.vx -= force * dx / dist; a.vy -= force * dy / dist;
        b.vx += force * dx / dist; b.vy += force * dy / dist;
      }
    }
    // Çekim kuvveti (bağlantılı düğümler)
    kenarlar.forEach(e => {
      const a = dugumArr[idxMap[e.source]], b = dugumArr[idxMap[e.target]];
      if (!a || !b) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const force = (dist - 80) * 0.05;
      a.vx += force * dx / dist; a.vy += force * dy / dist;
      b.vx -= force * dx / dist; b.vy -= force * dy / dist;
    });
    // Merkeze çekim
    dugumArr.forEach(d => {
      d.vx += (W/2 - d.x) * 0.01;
      d.vy += (H/2 - d.y) * 0.01;
    });
    // Güncelle + sınırla
    dugumArr.forEach(d => {
      d.vx *= 0.7; d.vy *= 0.7;
      d.x = Math.max(28, Math.min(W-28, d.x + d.vx));
      d.y = Math.max(28, Math.min(H-28, d.y + d.vy));
    });
  }

  // Kenarları çiz
  const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  kenarlar.forEach(e => {
    const a = dugumArr[idxMap[e.source]], b = dugumArr[idxMap[e.target]];
    if (!a || !b) return;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    line.setAttribute('stroke', 'var(--border)');
    line.setAttribute('stroke-width', '1.5');
    edgeGroup.appendChild(line);
  });
  svg.appendChild(edgeGroup);

  // Düğümleri çiz
  const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  dugumArr.forEach(d => {
    const r = 14 + Math.min(d.baglar * 3, 12);
    const renk = sureRenkler[d.sNo] || '#a07830';

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', d.x); circle.setAttribute('cy', d.y);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', renk);
    circle.setAttribute('fill-opacity', '0.85');
    circle.setAttribute('stroke', '#fff');
    circle.setAttribute('stroke-width', '2');
    circle.style.cursor = 'pointer';

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', d.x); label.setAttribute('y', d.y + 1);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('font-size', '9');
    label.setAttribute('font-weight', '700');
    label.setAttribute('fill', '#fff');
    label.setAttribute('font-family', 'Source Serif 4, serif');
    label.textContent = d.sNo + ':' + d.aNo;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.appendChild(circle); g.appendChild(label);
    g.style.cursor = 'pointer';
    g.addEventListener('click', () => ayetDetayAc(d.sNo, d.aNo));

    // Tooltip
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = (d.sure ? d.sure.isim : d.sNo) + ' ' + d.sNo + ':' + d.aNo + ' — ' + d.baglar + ' bağlantı';
    g.appendChild(title);

    nodeGroup.appendChild(g);
  });
  svg.appendChild(nodeGroup);
  svgWrap.appendChild(svg);
  wrap.appendChild(svgWrap);

  // Legend
  const legend = document.createElement('div');
  legend.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:10px;padding:12px 14px;';
  legend.innerHTML = '<div style="font-size:10px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;">Sûre Renkleri</div>';
  const legGrid = document.createElement('div');
  legGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
  Object.entries(sureRenkler).forEach(([sNo, renk]) => {
    const sure = SURELER[parseInt(sNo)-1];
    const chip = document.createElement('div');
    chip.style.cssText = `display:flex;align-items:center;gap:5px;padding:3px 8px;border-radius:12px;background:${renk}20;border:1px solid ${renk}50;font-size:11px;color:var(--ink);cursor:pointer;`;
    chip.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${renk};display:inline-block;"></span>${sure ? sure.isim : sNo}`;
    chip.onclick = () => {
      tabGec('kuran');
      setTimeout(() => {
        const kart = document.getElementById('sure-kart-' + sNo);
        if (kart) { kart.scrollIntoView({behavior:'smooth',block:'start'}); }
      }, 200);
    };
    legGrid.appendChild(chip);
  });
  legend.appendChild(legGrid);
  wrap.appendChild(legend);
}

// ════════════════════════════════════════════════════════════════
//  2. TEMALAR & MOTİFLER
// ════════════════════════════════════════════════════════════════
const HAZIR_TEMALAR = [];

function temalarEkraniRender() {
  const wrap = document.getElementById('temalar-ic');
  wrap.innerHTML = '';

  const baslik = _ekranBaslik('🏷️ Temalar & Motifler', 'Kur\'ân\'da tekrar eden temaları keşfedin veya kendi temalarınızı oluşturun.');
  wrap.appendChild(baslik);

  // Kişisel temalar
  const kisiselTemalar = _kisiselTemalarGetir();

  // Tema oluşturma formu
  const form = document.createElement('div');
  form.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;';
  form.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;">+ Yeni Tema Oluştur</div>
    <div style="display:flex;gap:8px;margin-bottom:8px;">
      <input id="tema-isim-inp" placeholder="Tema adı (örn: Nefis Terbiyesi)" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--text);outline:none;">
      <input id="tema-emoji-inp" placeholder="🏷️" style="width:50px;padding:8px 6px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-size:16px;text-align:center;outline:none;">
    </div>
    <input id="tema-anahtar-inp" placeholder="Anahtar kelimeler (virgülle ayırın: nefis,sabır,...)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--text);outline:none;box-sizing:border-box;margin-bottom:8px;">
    <button onclick="_temaKaydet()" style="width:100%;padding:9px;background:var(--ink);border:none;border-radius:8px;color:var(--gold2);font-family:'Source Serif 4',serif;font-size:13px;font-weight:600;cursor:pointer;">✦ Temayı Kaydet</button>
  `;
  wrap.appendChild(form);

  if (kisiselTemalar.length > 0) {
    const kisiselBaslik = document.createElement('div');
    kisiselBaslik.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;margin-top:4px;';
    kisiselBaslik.textContent = 'Kişisel Temalar (' + kisiselTemalar.length + ')';
    wrap.appendChild(kisiselBaslik);

    const kisiselGrid = document.createElement('div');
    kisiselGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';
    kisiselTemalar.forEach(t => {
      kisiselGrid.appendChild(_temaKart(t, true));
    });
    wrap.appendChild(kisiselGrid);
  }
}

function _temaKart(tema, silinebilir) {
  const kart = document.createElement('div');
  kart.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:12px;padding:12px;cursor:pointer;transition:box-shadow 0.15s;position:relative;';
  kart.addEventListener('mouseenter', () => kart.style.boxShadow = '0 2px 12px var(--shadow)');
  kart.addEventListener('mouseleave', () => kart.style.boxShadow = '');

  kart.innerHTML = `
    <div style="font-size:22px;margin-bottom:6px;">${tema.emoji || '🏷️'}</div>
    <div style="font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px;">${tema.isim}</div>
    <div style="font-size:11px;color:var(--muted);">${(tema.anahtar||[]).slice(0,3).join(', ')}${tema.anahtar && tema.anahtar.length > 3 ? '…' : ''}</div>
  `;

  if (silinebilir) {
    const silBtn = document.createElement('button');
    silBtn.style.cssText = 'position:absolute;top:8px;right:8px;padding:2px 7px;background:none;border:1px solid #f0c0b8;border-radius:5px;color:var(--rust);font-size:10px;cursor:pointer;';
    silBtn.textContent = 'Sil';
    silBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm('"' + tema.isim + '" silinsin mi?')) return;
      const arr = _kisiselTemalarGetir().filter(t => t.isim !== tema.isim);
      localStorage.setItem('kisitel_temalar', JSON.stringify(arr));
      temalarEkraniRender();
    };
    kart.appendChild(silBtn);
  }

  kart.onclick = () => _temaDetayAc(tema);
  return kart;
}

function _kisiselTemalarGetir() {
  try { return JSON.parse(localStorage.getItem('kisitel_temalar') || '[]'); } catch(e) { return []; }
}

function _temaKaydet() {
  const isim = document.getElementById('tema-isim-inp').value.trim();
  const emoji = document.getElementById('tema-emoji-inp').value.trim() || '🏷️';
  const anahtarStr = document.getElementById('tema-anahtar-inp').value.trim();
  if (!isim) { document.getElementById('tema-isim-inp').style.borderColor = 'var(--rust)'; return; }
  const anahtar = anahtarStr.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const arr = _kisiselTemalarGetir();
  arr.push({ isim, emoji, anahtar });
  localStorage.setItem('kisitel_temalar', JSON.stringify(arr));
  temalarEkraniRender();
}

function _temaDetayAc(tema) {
  // Konu araması ile bu temanın anahtar kelimelerini ara
  if (!tema.anahtar || tema.anahtar.length === 0) {
    alert('Bu tema için anahtar kelime tanımlanmamış.');
    return;
  }

  // Mevcut kavram araması ekranına yönlendir
  const q = tema.anahtar[0]; // ilk anahtar ile ara
  tabGec('arama');
  setTimeout(() => {
    const inp = document.getElementById('arama-inp');
    if (inp) {
      inp.value = q;
      aramaYap2(q);
    }
  }, 100);
}

// ════════════════════════════════════════════════════════════════
//  3. BÖLÜM HEDEFLERİ — Okuma planı ve takip
// ════════════════════════════════════════════════════════════════
function bolumOkumaRender() {
  const wrap = document.getElementById('bolumokuma-ic');
  wrap.innerHTML = '';

  const baslik = _ekranBaslik('📋 Bölüm Hedefleri', 'Okuma planı oluştur, tamamladıkça işaretle ve ilerlemeyi takip et.');
  wrap.appendChild(baslik);

  const hedefler = _bolumHedefleriGetir();

  // İlerleme özeti
  const toplam = hedefler.length;
  const tamamlanan = hedefler.filter(h => h.tamamlandi).length;
  if (toplam > 0) {
    const ilerleme = document.createElement('div');
    ilerleme.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;';
    const yuzde = Math.round((tamamlanan / toplam) * 100);
    ilerleme.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:var(--ink);">Genel İlerleme</div>
        <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--gold);">${yuzde}%</div>
      </div>
      <div style="background:var(--paper3);border-radius:20px;height:10px;overflow:hidden;">
        <div style="background:var(--gold);height:100%;width:${yuzde}%;border-radius:20px;transition:width 0.5s;"></div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px;">${tamamlanan} / ${toplam} hedef tamamlandı</div>
    `;
    wrap.appendChild(ilerleme);
  }

  // Yeni hedef formu
  const form = document.createElement('div');
  form.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px;';
  form.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;">+ Yeni Hedef</div>
    <input id="bh-baslik-inp" placeholder="Hedef başlığı (örn: Bakara'nın ilk 50 âyeti)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:13px;color:var(--text);outline:none;box-sizing:border-box;margin-bottom:8px;">
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <select id="bh-sure-sel" style="flex:1.5;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:'Source Serif 4',serif;font-size:12px;color:var(--text);outline:none;">
        <option value="">Sûre seç…</option>
        ${SURELER.map((s,i) => `<option value="${i+1}">${i+1}. ${s.isim}</option>`).join('')}
      </select>
      <input id="bh-bas-inp" type="number" min="1" placeholder="Baş" style="flex:0.7;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-size:12px;color:var(--text);outline:none;">
      <input id="bh-bit-inp" type="number" min="1" placeholder="Bitiş" style="flex:0.7;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-size:12px;color:var(--text);outline:none;">
    </div>
    <div style="display:flex;gap:6px;margin-bottom:8px;">
      <input id="bh-son-inp" type="date" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-size:12px;color:var(--text);outline:none;" title="Hedef tarihi (opsiyonel)">
      <select id="bh-oncelik-inp" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-size:12px;color:var(--text);outline:none;">
        <option value="normal">🟡 Normal</option>
        <option value="yuksek">🔴 Yüksek</option>
        <option value="dusuk">🟢 Düşük</option>
      </select>
    </div>
    <button onclick="_bolumHedefiEkle()" style="width:100%;padding:9px;background:var(--ink);border:none;border-radius:8px;color:var(--gold2);font-family:'Source Serif 4',serif;font-size:13px;font-weight:600;cursor:pointer;">📋 Hedef Ekle</button>
  `;
  wrap.appendChild(form);

  if (hedefler.length === 0) {
    const bos = document.createElement('div');
    bos.className = 'bos-durum';
    bos.innerHTML = '<div class="ic">📋</div><div>Henüz hedef yok.<br>Yukarıdan ilk hedefini ekle.</div>';
    wrap.appendChild(bos);
    return;
  }

  // Hedef listesi — aktifler ve tamamlananlar
  const aktifler = hedefler.filter(h => !h.tamamlandi);
  const bitti = hedefler.filter(h => h.tamamlandi);

  if (aktifler.length > 0) {
    const ah = document.createElement('div');
    ah.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;';
    ah.textContent = 'Aktif Hedefler (' + aktifler.length + ')';
    wrap.appendChild(ah);
    aktifler.forEach((h, i) => wrap.appendChild(_bolumHedefKart(h, hedefler.indexOf(h))));
  }

  if (bitti.length > 0) {
    const bh = document.createElement('div');
    bh.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin:14px 0 8px;';
    bh.textContent = '✅ Tamamlananlar (' + bitti.length + ')';
    wrap.appendChild(bh);
    bitti.forEach((h, i) => wrap.appendChild(_bolumHedefKart(h, hedefler.indexOf(h))));
  }
}

function _bolumHedefleriGetir() {
  try { return JSON.parse(localStorage.getItem('bolum_hedefleri') || '[]'); } catch(e) { return []; }
}

function _bolumHedefiEkle() {
  const baslik = document.getElementById('bh-baslik-inp').value.trim();
  const sureNo = parseInt(document.getElementById('bh-sure-sel').value);
  const bas = parseInt(document.getElementById('bh-bas-inp').value);
  const bit = parseInt(document.getElementById('bh-bit-inp').value);
  const son = document.getElementById('bh-son-inp').value;
  const oncelik = document.getElementById('bh-oncelik-inp').value;

  if (!baslik) { document.getElementById('bh-baslik-inp').style.borderColor='var(--rust)'; return; }

  const arr = _bolumHedefleriGetir();
  arr.push({
    baslik: baslik || (SURELER[sureNo-1] ? SURELER[sureNo-1].isim + ' ' + sureNo + ':' + bas + '–' + bit : 'Hedef'),
    sureNo: sureNo || 0, bas: bas || 0, bit: bit || 0,
    son, oncelik,
    tamamlandi: false,
    tarih: new Date().toLocaleDateString('tr-TR')
  });
  localStorage.setItem('bolum_hedefleri', JSON.stringify(arr));
  bolumOkumaRender();
}

function _bolumHedefKart(h, idx) {
  const sure = h.sureNo ? SURELER[h.sureNo - 1] : null;
  const oncelikRenk = { yuksek: '#c0392b', normal: '#e67e22', dusuk: '#27ae60' }[h.oncelik] || '#e67e22';

  const kart = document.createElement('div');
  kart.style.cssText = `background:var(--paper);border:1px solid ${h.tamamlandi ? 'var(--border)' : oncelikRenk + '40'};border-left:4px solid ${h.tamamlandi ? 'var(--border)' : oncelikRenk};border-radius:10px;padding:12px 14px;margin-bottom:8px;opacity:${h.tamamlandi ? '0.65' : '1'};`;

  // Gün kalan hesabı
  let gunKalan = '';
  if (h.son && !h.tamamlandi) {
    const fark = Math.ceil((new Date(h.son) - new Date()) / 86400000);
    gunKalan = fark < 0 ? `<span style="color:var(--rust);font-size:10px;font-weight:700;">⚠️ ${Math.abs(fark)} gün gecikti</span>` :
               fark === 0 ? `<span style="color:var(--rust);font-size:10px;font-weight:700;">⏰ Bugün!</span>` :
               `<span style="font-size:10px;color:var(--muted);">${fark} gün kaldı</span>`;
  }

  kart.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <button onclick="_hedefToggle(${idx})" style="flex-shrink:0;width:22px;height:22px;border-radius:50%;border:2px solid ${h.tamamlandi ? 'var(--gold)' : 'var(--border)'};background:${h.tamamlandi ? 'var(--gold)' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;margin-top:1px;">
        ${h.tamamlandi ? '✓' : ''}
      </button>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:var(--ink);margin-bottom:3px;${h.tamamlandi ? 'text-decoration:line-through;' : ''}">${h.baslik}</div>
        ${sure ? `<div style="font-size:11px;color:var(--gold);margin-bottom:3px;">${sure.isim} ${h.sureNo}:${h.bas}${h.bit && h.bit !== h.bas ? '–' + h.bit : ''}</div>` : ''}
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${gunKalan}
          <span style="font-size:10px;color:var(--muted);">Eklendi: ${h.tarih}</span>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        ${sure && h.bas ? `<button onclick="_hedefOku(${idx})" style="padding:4px 8px;background:var(--ink);border:none;border-radius:6px;color:var(--gold2);font-size:10px;font-weight:700;cursor:pointer;">▶ Oku</button>` : ''}
        <button onclick="_hedefSil(${idx})" style="padding:4px 8px;background:none;border:1px solid #f0c0b8;border-radius:6px;color:var(--rust);font-size:10px;cursor:pointer;">Sil</button>
      </div>
    </div>
  `;
  return kart;
}

function _hedefToggle(idx) {
  const arr = _bolumHedefleriGetir();
  arr[idx].tamamlandi = !arr[idx].tamamlandi;
  if (arr[idx].tamamlandi) arr[idx].tamamlanmaTarih = new Date().toLocaleDateString('tr-TR');
  localStorage.setItem('bolum_hedefleri', JSON.stringify(arr));
  bolumOkumaRender();
}

function _hedefSil(idx) {
  if (!confirm('Bu hedef silinsin mi?')) return;
  const arr = _bolumHedefleriGetir();
  arr.splice(idx, 1);
  localStorage.setItem('bolum_hedefleri', JSON.stringify(arr));
  bolumOkumaRender();
}

function _hedefOku(idx) {
  const arr = _bolumHedefleriGetir();
  const h = arr[idx];
  if (!h.sureNo || !h.bas) return;
  const sure = SURELER[h.sureNo - 1];
  kumeOkuDirekt({ konu: h.baslik, sure: h.sureNo, bas: h.bas, bit: h.bit || h.bas });
}

// ════════════════════════════════════════════════════════════════
//  4. KRONOLOJİK OKUMA — İniş sırasına göre dönem dönem
// ════════════════════════════════════════════════════════════════
const MEKKE_DONEM = [
  { ad: 'Mekke I — Nübüvvetin İlk 3 Yılı', yillar: '610–612', renk: '#c0922a',
    aciklama: 'İlk vahiyler: Tevhid çağrısı, kıyamet sahneleri, insan sorumluluğu.',
    inis: [1, 96, 68, 74, 111, 81, 87, 92, 89, 93, 94, 103, 100, 108, 102, 107, 109, 105, 113, 114, 112, 53, 80, 97, 91, 85, 95, 106, 101, 75, 104, 77] },
  { ad: 'Mekke II — Orta Dönem', yillar: '612–620', renk: '#a07830',
    aciklama: 'Peygamber kıssaları, diriliş delilleri, müşriklerle mücadele.',
    inis: [6, 54, 37, 71, 76, 44, 50, 20, 26, 15, 19, 38, 36, 43, 72, 67, 23, 21, 25, 17, 27, 18] },
  { ad: 'Mekke III — Son Dönem', yillar: '620–622', renk: '#8060c0',
    aciklama: 'İsra, detaylı peygamber kıssaları, Mekke\'ye son çağrılar.',
    inis: [32, 41, 45, 16, 30, 11, 14, 12, 40, 28, 39, 29, 31, 42, 10, 34, 35, 7, 46, 6, 13] },
];

const MEDINE_DONEM = [
  { ad: 'Medine I — Hicret Sonrası', yillar: '622–625', renk: '#1a6050',
    aciklama: 'Topluluk inşası, Yahudi kabilelerle ilişkiler, ilk savaş hükümleri.',
    inis: [2, 98, 64, 62, 8, 47, 3, 61, 57, 4, 65, 59, 33, 63, 24, 58, 22, 48, 66, 60, 110, 49, 9, 5] },
  { ad: 'Medine II — Olgunluk', yillar: '625–632', renk: '#27ae60',
    aciklama: 'Kapsamlı hukuk, aile hukuku, münafıklarla mücadele, fetih.',
    inis: [5, 9, 49, 110] },
];

function kronolojikOkumaRender() {
  const wrap = document.getElementById('kronoloji-ic');
  wrap.innerHTML = '';

  const baslik = _ekranBaslik('📅 Kronolojik Okuma', 'Kur\'ân\'ı iniş sırasına göre, dönemler hâlinde keşfet.');
  wrap.appendChild(baslik);

  // Okunan sureleri al
  const okunanlar = (() => { try { return JSON.parse(localStorage.getItem('okunanlar')||'[]'); } catch(e){ return []; } })();
  const okunanSet = new Set(okunanlar.map(o => o.sNo));

  const tumDonemler = [...MEKKE_DONEM.map(d => ({...d, tip:'Mekkî'})), ...MEDINE_DONEM.map(d => ({...d, tip:'Medenî'}))];

  tumDonemler.forEach(donem => {
    // Dönemdeki gerçek sureler (SURELER verisinden inis sırasına göre)
    const donemSureleri = SURELER
      .map((s, i) => ({...s, no: i+1}))
      .filter(s => s.inis >= Math.min(...donem.inis) && s.inis <= Math.max(...donem.inis) && s.tip === donem.tip)
      .sort((a, b) => a.inis - b.inis);

    const tamamlanan = donemSureleri.filter(s => okunanSet.has(s.no)).length;
    const yuzde = donemSureleri.length ? Math.round((tamamlanan / donemSureleri.length) * 100) : 0;

    const bolum = document.createElement('div');
    bolum.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:14px;margin-bottom:12px;overflow:hidden;box-shadow:0 2px 8px var(--shadow);';

    // Başlık bar
    const hdr = document.createElement('div');
    hdr.style.cssText = `display:flex;flex-direction:column;gap:4px;padding:14px 16px;background:${donem.renk};cursor:pointer;`;
    hdr.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#fff;">${donem.ad}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:2px;">📆 ${donem.yillar} · ${donem.tip} · ${donemSureleri.length} sûre</div>
        </div>
        <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;color:#fff;opacity:0.9;">${yuzde}%</div>
      </div>
      <div style="background:rgba(255,255,255,0.25);border-radius:10px;height:6px;overflow:hidden;">
        <div style="background:#fff;height:100%;width:${yuzde}%;border-radius:10px;"></div>
      </div>
    `;

    const ic = document.createElement('div');
    ic.style.display = 'none';

    hdr.onclick = () => {
      ic.style.display = ic.style.display === 'none' ? 'block' : 'none';
    };

    // Dönem açıklaması
    const acik = document.createElement('div');
    acik.style.cssText = 'padding:10px 16px;background:var(--paper2);border-bottom:1px solid var(--border);font-size:13px;color:var(--muted);font-style:italic;';
    acik.textContent = donem.aciklama;
    ic.appendChild(acik);

    // Sure listesi
    donemSureleri.forEach(s => {
      const okunan = okunanSet.has(s.no);
      const satir = document.createElement('div');
      satir.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);background:${okunan ? 'var(--paper2)' : 'var(--paper)'};`;

      satir.innerHTML = `
        <div style="width:28px;height:28px;border-radius:7px;background:${okunan ? donem.renk : 'var(--paper3)'};color:${okunan ? '#fff' : 'var(--muted)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${s.no}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Playfair Display',serif;font-size:14px;font-weight:500;color:var(--ink);">${s.isim}</div>
          <div style="font-size:10px;color:var(--muted);">${s.inis}. iniş · ${s.ayet} âyet · ${s.cuz}. cüz</div>
        </div>
        <div style="font-family:var(--ar-font);font-size:16px;color:var(--gold);flex-shrink:0;">${s.ar}</div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button style="padding:5px 10px;background:${okunan ? 'var(--gold)' : 'var(--ink)'};border:none;border-radius:6px;color:${okunan ? 'var(--ink)' : 'var(--gold2)'};font-size:10px;font-weight:700;cursor:pointer;" onclick="event.stopPropagation();_kronoSureAc(${s.no})">▶ Oku</button>
        </div>
      `;

      ic.appendChild(satir);
    });

    bolum.appendChild(hdr);
    bolum.appendChild(ic);
    wrap.appendChild(bolum);
  });
}

function _kronoSureAc(sNo) {
  const sure = SURELER[sNo - 1];
  if (!sure) return;
  kumeOkuDirekt({ konu: sure.isim + ' Sûresi', sure: sNo, bas: 1, bit: sure.ayet });
}

// ════════════════════════════════════════════════════════════════
//  YARDIMCI
// ════════════════════════════════════════════════════════════════
function _ekranBaslik(baslik, aciklama) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'background:var(--paper);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:14px;box-shadow:0 2px 8px var(--shadow);';
  wrap.innerHTML = `
    <div style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;color:var(--ink);margin-bottom:4px;">${baslik}</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.6;">${aciklama}</div>
  `;
  return wrap;
}
// ════════════════════════════════════════
//  PWA — MANIFEST + SERVICE WORKER
// ════════════════════════════════════════

// 1. Manifest blob olarak inject et
(function() {
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="#2c2c3e"/><text y="360" x="256" font-size="280" text-anchor="middle" font-family="serif">📖</text></svg>`;
  const iconUrl = 'data:image/svg+xml,' + encodeURIComponent(iconSvg);
  const manifest = {
    name: "Kur'ân-ı Kerîm – Tefsir Defteri",
    short_name: "Tefsir Defteri",
    description: "Kur'an okuma ve not alma uygulaması",
    start_url: location.href,
    scope: location.href,
    display: "standalone",
    orientation: "portrait",
    background_color: "#2c2c3e",
    theme_color: "#2c2c3e",
    icons: [
      { src: iconUrl, sizes: "192x192", type: "image/svg+xml" },
      { src: iconUrl, sizes: "512x512", type: "image/svg+xml" }
    ]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.getElementById('pwa-manifest-link');
  if (link) link.href = url;
})();

// 2. Service Worker — offline cache
const _SW_KOD = `
const CACHE_ADI = 'tefsir-v3';
const CACHE_URL = self.location.href.replace('service-worker-blob','');

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_ADI).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const kendiOrigin = url.origin === self.location.origin;
  const cacheable = kendiOrigin ||
    url.hostname.includes('fonts.googleapis') ||
    url.hostname.includes('fonts.gstatic') ||
    url.hostname.includes('cdn.jsdelivr') ||
    url.hostname.includes('acikkuran.com');
  if (!cacheable) return;

  // Kendi origin'imizdeki JS/HTML dosyaları: ÖNCE AĞ (network-first).
  // Böylece kod güncellemesi yayınladığınızda kullanıcı bir sonraki açılışta HEMEN yeni kodu alır;
  // sadece ağ yoksa (offline) önbelleğe düşer. Eski "önce önbellek" davranışı kod güncellemelerinin
  // günlerce gecikmesine / hiç yansımamasına sebep oluyordu.
  const kodDosyasiMi = kendiOrigin && (
    url.pathname.endsWith('.js') || url.pathname.endsWith('.html') ||
    url.pathname === '/' || url.pathname.endsWith('/')
  );

  if (kodDosyasiMi) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) caches.open(CACHE_ADI).then(cache => cache.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.open(CACHE_ADI).then(cache => cache.match(e.request)))
    );
    return;
  }

  // Diğer statik varlıklar (fontlar, CDN kütüphaneleri): eski davranış — cache-first + arka planda güncelle
  e.respondWith(
    caches.open(CACHE_ADI).then(cache =>
      cache.match(e.request).then(cached => {
        const network = fetch(e.request).then(res => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});
`;

if ('serviceWorker' in navigator) {
  const swBlob = new Blob([_SW_KOD], { type: 'application/javascript' });
  const swUrl = URL.createObjectURL(swBlob);
  navigator.serviceWorker.register(swUrl, { scope: './' })
    .then(reg => { console.log('SW kayıtlı'); })
    .catch(err => { console.log('SW hatası (normal):', err.message); });
}

// 3. Install prompt
let _pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _pwaInstallPrompt = e;
  // 2 saniye sonra banner göster
  setTimeout(_pwaYukleBanneriGoster, 2000);
});

function _pwaYukleBanneriGoster() {
  if (document.getElementById('pwa-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'pwa-banner';
  banner.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    z-index:500;
    background:var(--ink);color:var(--gold2);
    border-radius:14px;padding:12px 18px;
    display:flex;align-items:center;gap:12px;
    box-shadow:0 4px 24px rgba(0,0,0,0.3);
    font-family:'Source Serif 4',serif;font-size:13px;
    max-width:320px;width:90%;
    animation:fadeInUp 0.3s ease;
  `;
  banner.innerHTML = `
    <span style="font-size:22px;">📲</span>
    <div style="flex:1;">
      <div style="font-weight:700;margin-bottom:2px;">Ana Ekrana Ekle</div>
      <div style="font-size:11px;opacity:0.7;">Uygulama gibi kullanmak için</div>
    </div>
    <button onclick="_pwaKur()" style="padding:8px 14px;background:var(--gold);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">Ekle</button>
    <button onclick="this.parentElement.remove()" style="padding:6px 8px;background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;">✕</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => { if (banner.parentElement) banner.remove(); }, 20000);
}

async function _pwaKur() {
  const banner = document.getElementById('pwa-banner');
  if (banner) banner.remove();
  if (_pwaInstallPrompt) {
    _pwaInstallPrompt.prompt();
    const { outcome } = await _pwaInstallPrompt.userChoice;
    _pwaInstallPrompt = null;
    if (outcome === 'accepted') {
      _pwaBasariMesaji();
    } else {
      _pwaManuelTalimat();
    }
  } else {
    _pwaManuelTalimat();
  }
}

function _pwaBasariMesaji() {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:600;background:#2d8a50;color:#fff;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:600;`;
  toast.textContent = '✓ Ana ekrana eklendi!';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function _pwaManuelTalimat() {
  const modal = document.createElement('div');
  modal.style.cssText = `position:fixed;inset:0;z-index:600;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;`;
  modal.innerHTML = `
    <div style="width:100%;background:var(--paper);border-radius:20px 20px 0 0;padding:24px 20px 40px;">
      <div style="font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--ink);margin-bottom:16px;">📲 Ana Ekrana Ekle</div>
      <div style="font-size:14px;color:var(--ink);line-height:2;margin-bottom:20px;">
        <b>Android Chrome:</b><br>
        Sağ üst menü (⋮) → <b>"Ana ekrana ekle"</b><br><br>
        <b>Samsung Internet:</b><br>
        Alt menü → <b>"+"</b> → <b>"Ana ekrana ekle"</b><br><br>
        <b>iPhone Safari:</b><br>
        Paylaş (□↑) → <b>"Ana Ekrana Ekle"</b>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="width:100%;padding:13px;background:var(--ink);border:none;border-radius:10px;color:var(--gold2);font-size:14px;font-weight:700;cursor:pointer;">Anladım</button>
    </div>
  `;
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
}

// ════════════════════════════════════════
//  GERI AL SİSTEMİ — Not textarea için
