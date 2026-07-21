// ════════════════════════════════════════
function iliskiliAyetleriGetir(sNo, aNo) {
  try { return JSON.parse(localStorage.getItem('ia_' + sNo + '_' + aNo) || '[]'); } catch(e) { return []; }
}

function iliskiliAyetleriKaydet(sNo, aNo, liste) {
  if (liste.length === 0) localStorage.removeItem('ia_' + sNo + '_' + aNo);
  else localStorage.setItem('ia_' + sNo + '_' + aNo, JSON.stringify(liste));
}

function _iliskiliBtnGuncelle(sNo, aNo) {
  const btn = document.getElementById('iliskili-btn-' + sNo + '-' + aNo);
  if (!btn) return;
  const sayisi = iliskiliAyetleriGetir(sNo, aNo).length;
  btn.textContent = sayisi > 0 ? '🔗 İlişkili (' + sayisi + ')' : '🔗 İlişkili Âyet';
  if (sayisi > 0) { btn.style.borderColor = 'var(--teal)'; btn.style.color = 'var(--teal)'; btn.style.borderStyle = 'solid'; }
  else { btn.style.borderColor = ''; btn.style.color = ''; btn.style.borderStyle = ''; }
}

function iliskiliAyetModalAc(sNo, aNo) {
  const sure = SURELER[sNo - 1];
  const modal = document.getElementById('iliskili-modal');
  document.getElementById('iliskili-modal-baslik').textContent = '🔗 ' + sure.isim + ' ' + sNo + ':' + aNo + ' — İlişkili Âyetler';
  _iliskiliModalRender(sNo, aNo);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function iliskiliModalKapat(e) {
  const modal = document.getElementById('iliskili-modal');
  if (e && e.target !== modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function _iliskiliModalRender(sNo, aNo) {
  const body = document.getElementById('iliskili-modal-body');
  body.innerHTML = '';

  const liste = iliskiliAyetleriGetir(sNo, aNo);

  // Mevcut ilişkili ayetler
  if (liste.length > 0) {
    const baslik = document.createElement('div');
    baslik.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;';
    baslik.textContent = 'İlişkili Âyetler (' + liste.length + ')';
    body.appendChild(baslik);

    liste.forEach((item, idx) => {
      const ref = SURELER[item.sNo - 1];
      const kart = document.createElement('div');
      kart.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--paper);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;cursor:pointer;transition:background 0.1s;';

      const sol = document.createElement('div');
      sol.style.cssText = 'flex:1;';

      const refEl = document.createElement('div');
      refEl.style.cssText = 'font-size:11px;font-weight:700;color:var(--gold);margin-bottom:3px;';
      refEl.textContent = (ref ? ref.isim : item.sNo) + ' ' + item.sNo + ':' + item.aNo;

      const arEl = document.createElement('div');
      arEl.style.cssText = 'font-family:var(--ar-font);font-size:16px;color:var(--ink);direction:rtl;text-align:right;line-height:1.8;';
      const ck = item.sNo + ':' + item.aNo;
      arEl.textContent = onizlemeCache[ck] ? onizlemeCache[ck].ar.substring(0, 50) + '…' : '﴿ ' + item.sNo + ':' + item.aNo + ' ﴾';

      sol.appendChild(refEl);
      sol.appendChild(arEl);

      const silBtn = document.createElement('button');
      silBtn.style.cssText = 'padding:5px 10px;background:none;border:1px solid #f0c0b8;border-radius:7px;color:var(--rust);font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0;';
      silBtn.textContent = 'Sil';
      silBtn.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(refEl.textContent + ' silinsin mi?')) return;
        const arr = iliskiliAyetleriGetir(sNo, aNo);
        arr.splice(idx, 1);
        iliskiliAyetleriKaydet(sNo, aNo, arr);
        _iliskiliBtnGuncelle(sNo, aNo);
        _iliskiliModalRender(sNo, aNo);
      };

      kart.appendChild(sol);
      kart.appendChild(silBtn);

      kart.onclick = (e) => {
        if (e.target === silBtn || silBtn.contains(e.target)) return;
        iliskiliModalKapat({ target: null });
        document.body.style.overflow = '';
        setTimeout(() => ayetDetayAc(item.sNo, item.aNo), 150);
      };

      kart.addEventListener('mouseenter', () => kart.style.background = 'var(--paper2)');
      kart.addEventListener('mouseleave', () => kart.style.background = 'var(--paper)');

      body.appendChild(kart);
    });
  } else {
    const bos = document.createElement('div');
    bos.style.cssText = 'text-align:center;padding:16px;color:var(--muted);font-size:13px;';
    bos.textContent = 'Henüz ilişkili âyet eklenmedi.';
    body.appendChild(bos);
  }

  // Yeni ilişkili ayet ekleme formu
  const sep = document.createElement('div');
  sep.style.cssText = 'border-top:1px solid var(--border);padding-top:14px;margin-top:12px;';

  const formBaslik = document.createElement('div');
  formBaslik.style.cssText = 'font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:10px;';
  formBaslik.textContent = '+ İlişkili Âyet Ekle';
  sep.appendChild(formBaslik);

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';

  const sureSelect = document.createElement('select');
  sureSelect.style.cssText = 'flex:1.5;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:"Source Serif 4",serif;font-size:13px;color:var(--text);outline:none;';
  SURELER.forEach((s, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = (i + 1) + '. ' + s.isim;
    sureSelect.appendChild(opt);
  });
  sureSelect.value = sNo; // Varsayılan olarak mevcut sure

  const ayetInp = document.createElement('input');
  ayetInp.type = 'number';
  ayetInp.min = '1';
  ayetInp.placeholder = 'Âyet No';
  ayetInp.style.cssText = 'flex:0.8;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--paper2);font-family:"Source Serif 4",serif;font-size:13px;color:var(--text);outline:none;';

  row.appendChild(sureSelect);
  row.appendChild(ayetInp);
  sep.appendChild(row);

  const ekleBtn = document.createElement('button');
  ekleBtn.style.cssText = 'width:100%;padding:10px;background:var(--ink);border:none;border-radius:8px;color:var(--gold2);font-family:"Source Serif 4",serif;font-size:13px;font-weight:600;cursor:pointer;';
  ekleBtn.textContent = '🔗 Âyeti Ekle';
  ekleBtn.onclick = () => {
    const yeniSNo = parseInt(sureSelect.value);
    const yeniANo = parseInt(ayetInp.value);
    if (!yeniSNo || !yeniANo || yeniANo < 1) { ayetInp.style.borderColor = 'var(--rust)'; return; }
    const maxAyet = SURELER[yeniSNo - 1] ? SURELER[yeniSNo - 1].ayet : 9999;
    if (yeniANo > maxAyet) { ayetInp.style.borderColor = 'var(--rust)'; return; }
    ayetInp.style.borderColor = '';

    const arr = iliskiliAyetleriGetir(sNo, aNo);
    // Aynı ayet zaten ekliyse ekleme
    if (arr.some(x => x.sNo === yeniSNo && x.aNo === yeniANo)) {
      alert('Bu âyet zaten ekli.');
      return;
    }
    arr.push({ sNo: yeniSNo, aNo: yeniANo });
    iliskiliAyetleriKaydet(sNo, aNo, arr);
    _iliskiliBtnGuncelle(sNo, aNo);
    ayetInp.value = '';
    _iliskiliModalRender(sNo, aNo);
  };
  sep.appendChild(ekleBtn);
  body.appendChild(sep);
}

// ════════════════════════════════════════
//  DURUM
// ════════════════════════════════════════
let aktifCuz = 0;
let aramaStr = '';
let aktifTipFiltre = '';
const onizlemeCache = {};

// ════════════════════════════════════════
//  YARDIMCILAR
// ════════════════════════════════════════
function notKey(s,a,tip){ return `${tip}_${s}_${a}`; }
function notVarMi(s,a){
  return !!(localStorage.getItem(notKey(s,a,'t')) || localStorage.getItem(notKey(s,a,'d')) || (ayetNotlariniGetir(s,a).length > 0));
}
function sureNotVarMi(sNo){
  const sure = SURELER[sNo-1];
  if(!sure) return false;
  for(let i=1; i<=sure.ayet; i++) if(notVarMi(sNo,i)) return true;
  return sureNotlariniGetir(sNo).length > 0;
}
function statGuncelle(){
  let n=0, k=0;
  // localStorage anahtarlarını Object.keys ile al (for...in bazı ortamlarda eksik sayar)
  const keys = [];
  try {
    for(let i=0; i<localStorage.length; i++){
      const k2 = localStorage.key(i);
      if(k2) keys.push(k2);
    }
  } catch(e) {}
  keys.forEach(key => {
    if(key.startsWith('t_')) n++;
    if(key.startsWith('d_')) n++;
    if(key.startsWith('sn_')){ try{ n+=(JSON.parse(localStorage.getItem(key))||[]).length; }catch(e){} }
    if(key.startsWith('an_')){ try{ n+=(JSON.parse(localStorage.getItem(key))||[]).length; }catch(e){} }
    if(key==='kumeler'){
      try{ k=(JSON.parse(localStorage.getItem('kumeler'))||[]).length; }catch(e){}
    }
  });
  const en = document.getElementById('stat-not');
  const ek = document.getElementById('stat-kume');
  if(en) en.textContent = n;
  if(ek) ek.textContent = k;
}

// ════════════════════════════════════════
//  TAB YÖNETİMİ
// ════════════════════════════════════════
let _aktifTab = 'kuran';
function tabGec(ad, gecmiseEkle){
  const eskiTab = _aktifTab;
  _aktifTab = ad;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.tbar-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('screen-'+ad).classList.add('active');
  const tbtn = document.getElementById('tbtn-'+ad);
  if(tbtn) tbtn.classList.add('active');
  window.scrollTo(0,0);
  if(ad === 'notlar') notlarEkraniRender();
  if(ad === 'okunanlar') okunanlarRender();
  if(ad === 'yedek') yedekEkraniRender();
  if(ad === 'kokler') koklerEkraniYukle();
  if(ad === 'isi') isiHaritasiRender();
  if(ad === 'pdfkutuphane') pdfKutuphaneRender();
  if(ad === 'konuagi') konuAgiRender();
  if(ad === 'temalar') temalarEkraniRender();
  if(ad === 'bolumokuma') bolumOkumaRender();
  if(ad === 'kronoloji') kronolojikOkumaRender();
  if(ad === 'tefsirler') tefsirlerEkraniRender();
  // Geçmişe ekle (false geçilirse ekleme — geri tuşundan çağrılınca)
  if (gecmiseEkle !== false && eskiTab !== ad) {
    _navPush('tab', eskiTab);
  }
}

// ════════════════════════════════════════
//  CÜZ + ARAMA
// ════════════════════════════════════════
function cuzBarOlustur(){
  const sel = document.getElementById('cuz-select');
  for(let c=1; c<=30; c++){
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c + '. Cüz';
    sel.appendChild(opt);
  }
}
function cuzSecDropdown(sel){
  aktifCuz = parseInt(sel.value);
  sureListesiRender();
}
function tipSecDropdown(sel){
  aktifTipFiltre = sel.value;
  sureListesiRender();
}
function aramaYap(val){
  aramaStr = val.trim().toLowerCase();
  _aramaAyetHedefKontrol(aramaStr);
  sureListesiRender();
}

let _aramaAyetHedef = null;

function _normalizeTR(s) {
  return s.toLowerCase().replace(/î/g,'i').replace(/â/g,'a').replace(/û/g,'u')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ü/g,'u')
    .replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ç/g,'c');
}

function _aramaAyetHedefKontrol(q) {
  _aramaAyetHedef = null;
  const m = q.match(/^(.+?)\s+(\d+)$/);
  if (!m) return;
  const sureAdi = m[1].trim();
  const aNo = parseInt(m[2]);
  const idx = SURELER.findIndex(s =>
    _normalizeTR(s.isim).includes(_normalizeTR(sureAdi)) ||
    s.isim.toLowerCase().includes(sureAdi)
  );
  if (idx >= 0) {
    const sNo = idx + 1;
    if (aNo >= 1 && aNo <= SURELER[idx].ayet) _aramaAyetHedef = { sNo, aNo };
  }
}

// ════════════════════════════════════════
//  SURE LİSTESİ
// ════════════════════════════════════════
let aktifSiralama = 'mushaf'; // 'mushaf' | 'inis'


function siralamaDdToggle() {
  document.getElementById('siralama-dropdown-menu').classList.toggle('open');
}
function siralamaDdSec(tip, label) {
  aktifSiralama = tip;
  document.getElementById('siralama-aktif-label').textContent = label;
  document.getElementById('siralama-dropdown-menu').classList.remove('open');
  if (tip === 'inis' || tip === 'alfa') {
    aktifCuz = 0;
    const sel = document.getElementById('cuz-select');
    if (sel) sel.value = 0;
  }
  sureListesiRender();
}
// Dışarı tıklayınca kapat
document.addEventListener('click', function(e) {
  const wrap = document.querySelector('.siralama-dropdown-wrap');
  if (wrap && !wrap.contains(e.target)) {
    const menu = document.getElementById('siralama-dropdown-menu');
    if (menu) menu.classList.remove('open');
  }
});

function siralamaSec(tip, btn) {
  aktifSiralama = tip;
  document.querySelectorAll('.siralama-btn').forEach(b => b.classList.remove('aktif'));
  btn.classList.add('aktif');
  // İniş sırası seçilince cüz filtresi devre dışı
  if (tip === 'inis') {
    aktifCuz = 0;
    const sel = document.getElementById('cuz-select');
    if (sel) sel.value = 0;
  }
  sureListesiRender();
}

function sureListesiRender(){
  const list = document.getElementById('sure-list');
  list.innerHTML = '';

  let kaynakListe = SURELER.map((s, i) => ({...s, mushafNo: i+1}));

  // Sıralama
  if (aktifSiralama === 'inis') {
    kaynakListe = kaynakListe.slice().sort((a,b) => (a.inis||999) - (b.inis||999));
  } else if (aktifSiralama === 'alfa') {
    kaynakListe = kaynakListe.slice().sort((a,b) => a.isim.localeCompare(b.isim, 'tr'));
  }

  const filtreli = kaynakListe.filter((s)=>{
    const sNo = s.mushafNo;
    const cuzOk = aktifCuz===0 || s.cuz===aktifCuz;
    const tipOk = !aktifTipFiltre || s.tip===aktifTipFiltre;
    if (_aramaAyetHedef) return cuzOk && tipOk && sNo === _aramaAyetHedef.sNo;
    const araOk = !aramaStr ||
      s.isim.toLowerCase().includes(aramaStr) ||
      s.ar.includes(aramaStr) ||
      String(sNo).includes(aramaStr);
    return cuzOk && tipOk && araOk;
  });

  if(filtreli.length===0){
    list.innerHTML = '<div class="bos-durum"><div class="ic">🔍</div>Sonuç bulunamadı</div>';
    return;
  }

  // Alfabetik modda harf grubu başlıkları
  let oncekiHarf = '';

  filtreli.forEach(s=>{
    const sNo = s.mushafNo || (SURELER.indexOf(s)+1);

    if (aktifSiralama === 'alfa') {
      const harf = s.isim.charAt(0).toLocaleUpperCase('tr');
      if (harf !== oncekiHarf) {
        oncekiHarf = harf;
        const harfBaslik = document.createElement('div');
        harfBaslik.style.cssText = 'padding:10px 4px 4px;font-family:"Playfair Display",serif;font-size:18px;font-weight:700;color:var(--gold2);border-bottom:1px solid var(--border);margin-bottom:6px;';
        harfBaslik.textContent = harf;
        list.appendChild(harfBaslik);
      }
    }

    const kart = document.createElement('div');
    kart.className = 'sure-kart';
    kart.id = 'sure-kart-'+sNo;

    const hdr = document.createElement('div');
    hdr.className = 'sure-kart-header';
    hdr.onclick = () => sureToggle(sNo, kart);

    const noDiv = document.createElement('div');
    noDiv.className = 'sure-no';
    noDiv.textContent = sNo;
    noDiv.title = 'Sure hakkinda bilgi';
    noDiv.style.cursor = 'pointer';
    noDiv.onclick = (e) => { e.stopPropagation(); sureBilgiModalAc(sNo); };

    const info = document.createElement('div');
    info.className = 'sure-info';

    const isimDiv = document.createElement('div');
    isimDiv.className = 'sure-isim';
    isimDiv.textContent = s.isim;
    
    

    const meta = document.createElement('div');
    meta.className = 'sure-meta';

    const tip = document.createElement('span');
    tip.className = 'tip-badge ' + (s.tip==='Mekkî'?'mekki':'medeni');
    tip.textContent = s.tip;

    const ayetSay = document.createElement('span');
    ayetSay.textContent = s.ayet + ' âyet';

    const cuzSay = document.createElement('span');
    cuzSay.textContent = s.cuz + '. Cüz';

    meta.appendChild(tip); meta.appendChild(ayetSay); meta.appendChild(cuzSay);
    info.appendChild(isimDiv); info.appendChild(meta);

    const arDiv = document.createElement('div');
    arDiv.className = 'sure-ar';
    arDiv.textContent = s.ar;

    const dot = document.createElement('div');
    dot.className = 'sure-not-dot' + (sureNotVarMi(sNo) ? ' var' : '');
    dot.id = 'sdot-'+sNo;

    const sureNotBtn = document.createElement('button');
    sureNotBtn.className = 'sure-not-acma-btn' + (sureNotlariniGetir(sNo).length>0 ? ' var' : '');
    sureNotBtn.title = 'Sûre hakkında not';
    sureNotBtn.innerHTML = '✏️';
    sureNotBtn.onclick = (e) => { e.stopPropagation(); sureNotModalAc(sNo); };

    const chev = document.createElement('span');
    chev.className = 'sure-chevron';
    chev.textContent = '▾';

    hdr.appendChild(noDiv); hdr.appendChild(info);
    hdr.appendChild(dot); hdr.appendChild(sureNotBtn); hdr.appendChild(chev);
    kart.appendChild(hdr);

    const ic = document.createElement('div');
    ic.className = 'sure-ic';
    ic.id = 'sure-ic-'+sNo;
    kart.appendChild(ic);

    list.appendChild(kart);
  });

  if (_aramaAyetHedef) {
    const { sNo, aNo } = _aramaAyetHedef;
    setTimeout(() => {
      const k = document.getElementById('sure-kart-' + sNo);
      if (k && !k.classList.contains('open')) {
        k.classList.add('open');
        const ic = document.getElementById('sure-ic-' + sNo);
        if (ic && ic.children.length === 0) sureIcDoldur(sNo, ic);
      }
      setTimeout(() => ayetDetayAc(sNo, aNo), 500);
    }, 200);
  }
}

function sureToggle(sNo, kart){
  const ic = document.getElementById('sure-ic-'+sNo);
  const acik = kart.classList.toggle('open');
  if(acik && ic.children.length===0) sureIcDoldur(sNo, ic);
}

// ════════════════════════════════════════
//  TEMATİK KLASÖR YAPISI
// ════════════════════════════════════════

// ════════════════════════════════════════
//  SÛRE ÖZETİ — quran.com v4
// ════════════════════════════════════════
const sureOzetiCache = {};

async function _sureOzetiYukle(sNo, ic) {
  if (sureOzetiCache[sNo] === null) return; // Veri yok
  if (sureOzetiCache[sNo]) {
    _sureOzetiRender(sureOzetiCache[sNo], ic, sNo);
    return;
  }
  try {
    const r = await fetch('https://api.quran.com/api/v4/chapters/' + sNo + '?language=tr');
    const d = await r.json();
    const chapter = d.chapter;
    if (!chapter) { sureOzetiCache[sNo] = null; return; }
    const veri = {
      name_meaning: chapter.translated_name?.name || '',
      revelation_place: chapter.revelation_place || '',
      verses_count: chapter.verses_count || 0,
      pages: chapter.pages || [],
    };
    sureOzetiCache[sNo] = veri;
    _sureOzetiRender(veri, ic, sNo);
  } catch(e) {
    sureOzetiCache[sNo] = null;
  }
}

function _sureOzetiRender(veri, ic, sNo) {
  // Zaten eklendiyse atla
  if (ic.querySelector('.sure-ozet-kutu')) return;
  const sure = SURELER[sNo-1];
  const kutu = document.createElement('div');
  kutu.className = 'sure-ozet-kutu';
  const yer = veri.revelation_place === 'makkah' ? '🕋 Mekkî' : veri.revelation_place === 'madinah' ? '🕌 Medenî' : sure.tip;
  kutu.innerHTML = `
    <div class="sure-ozet-satir">
      <span class="sure-ozet-tag">${yer}</span>
      <span class="sure-ozet-tag">${veri.verses_count} Âyet</span>
      ${veri.name_meaning ? '<span class="sure-ozet-tag">Anlam: ' + veri.name_meaning + '</span>' : ''}
    </div>`;
  // ic'in başına ekle
  ic.insertBefore(kutu, ic.firstChild);
}

function sureIcDoldur(sNo, ic){
  // Bu sure için GitHub kaynaklı tefsir varsa arka planda çek (localStorage'a yazmadan, sadece bellek)
  if (typeof _bellekTefsirSureHazirla === 'function') {
    _bellekTefsirSureHazirla(sNo, () => {
      // Çekim bitince ekranı sessizce tazele (kullanıcı akışını bozmadan)
      if (document.getElementById('screen-kuran') && document.getElementById('screen-kuran').classList.contains('active')) {
        ic.innerHTML = '';
        sureIcDoldur(sNo, ic);
      }
    });
  }

  const tematikler = _tematikAl(sNo);

  // TEMATIK yoksa → tüm sûreyi tek klasör olarak aç
  if(!tematikler || tematikler.length===0){
    const sure = SURELER[sNo-1];
    if(!sure) return;
    const klasorWrap = document.createElement('div');
    klasorWrap.className = 'klasor-list';

    const klasor = document.createElement('div');
    klasor.className = 'klasor';
    klasor.id = 'kl-'+sNo+'-0';

    const kh = document.createElement('div');
    kh.className = 'klasor-header';
    kh.onclick = () => klasorToggle(sNo, 0, 1, sure.ayet, klasor);

    const kIcon = document.createElement('span');
    kIcon.className = 'klasor-icon';
    kIcon.textContent = '📁';

    const kLabel = document.createElement('span');
    kLabel.className = 'klasor-label';
    kLabel.textContent = sure.isim + ' Sûresi';

    const kBadge = document.createElement('span');
    kBadge.className = 'klasor-badge';
    kBadge.textContent = '1–' + sure.ayet + '. â. (' + sure.ayet + ')';

    const kChev = document.createElement('span');
    kChev.className = 'klasor-chevron';
    kChev.textContent = '▾';

    const kOk = document.createElement('span');
    kOk.style.cssText = 'color:var(--muted);font-size:13px;margin-left:4px;';
    kOk.textContent = '›';
    kh.appendChild(kIcon); kh.appendChild(kLabel);
    kh.appendChild(kBadge); kh.appendChild(kOk);
    klasor.appendChild(kh);

    const ki = document.createElement('div');
    ki.className = 'klasor-ic';
    ki.id = 'ki-'+sNo+'-0';
    klasor.appendChild(ki);

    klasorWrap.appendChild(klasor);
    ic.appendChild(klasorWrap);
    return;
  }

  const klasorWrap = document.createElement('div');
  klasorWrap.className = 'klasor-list';

  // Küme düzenleme butonu
  const duzenleBtn = document.createElement('button');
  duzenleBtn.style.cssText = 'display:flex;align-items:center;gap:6px;margin:4px 12px 8px;padding:7px 14px;background:none;border:1px solid var(--border);border-radius:9px;font-family:"Source Serif 4",serif;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;';
  const ozelVar = !!_kumeOzelAl(sNo);
  duzenleBtn.innerHTML = (ozelVar ? '✏️ Kümeler Düzenlendi' : '✏️ Kümeleri Düzenle');
  if (ozelVar) duzenleBtn.style.color = 'var(--gold)';
  if (ozelVar) duzenleBtn.style.borderColor = 'var(--gold)';
  duzenleBtn.onclick = (e) => { e.stopPropagation(); kumeDuzenleModalAc(sNo); };
  klasorWrap.appendChild(duzenleBtn);

  tematikler.forEach((bolum, idx) => {
    const klasor = document.createElement('div');
    klasor.className = 'klasor';
    klasor.id = 'kl-'+sNo+'-'+idx;

    const kh = document.createElement('div');
    kh.className = 'klasor-header';
    kh.onclick = () => kumeOkuDirekt({ konu: bolum.konu, sure: sNo, bas: bolum.bas, bit: bolum.bit });

    const kIcon = document.createElement('span');
    kIcon.className = 'klasor-icon';
    kIcon.textContent = '📁';

    const kLabel = document.createElement('span');
    kLabel.className = 'klasor-label';
    kLabel.textContent = bolum.konu;

    const kBadge = document.createElement('span');
    kBadge.className = 'klasor-badge';
    const ayetSayi = bolum.bit - bolum.bas + 1;
    kBadge.textContent = (bolum.bas === bolum.bit ? bolum.bas : bolum.bas + '–' + bolum.bit) + '. â. (' + ayetSayi + ')';

    const kChev = document.createElement('span');
    kChev.className = 'klasor-chevron';
    kChev.textContent = '▾';

    let grupNotVar = false;
    for(let i=bolum.bas; i<=bolum.bit; i++) if(notVarMi(sNo,i)) { grupNotVar=true; break; }
    if(grupNotVar){
      const dot = document.createElement('span');
      dot.style.cssText='width:6px;height:6px;border-radius:50%;background:var(--gold);display:inline-block;margin-right:5px;flex-shrink:0;';
      kh.appendChild(dot);
    }

    const kOk = document.createElement('span');
    kOk.style.cssText = 'color:var(--muted);font-size:13px;margin-left:4px;';
    kOk.textContent = '›';
    kh.appendChild(kIcon); kh.appendChild(kLabel);
    kh.appendChild(kBadge); kh.appendChild(kOk);
    klasor.appendChild(kh);

    const ki = document.createElement('div');
    ki.className = 'klasor-ic';
    ki.id = 'ki-'+sNo+'-'+idx;
    klasor.appendChild(ki);

    klasorWrap.appendChild(klasor);
  });

  ic.appendChild(klasorWrap);
}

// ── Küme Özelleştirme Sistemi ──
function _kumeOzelAl(sNo) {
  try {
    const v = localStorage.getItem('kumeOzel_' + sNo);
    return v ? JSON.parse(v) : null;
  } catch(e) { return null; }
}
function _kumeOzelKaydet(sNo, arr) {
  localStorage.setItem('kumeOzel_' + sNo, JSON.stringify(arr));
}
function _kumeOzelSifirla(sNo) {
  localStorage.removeItem('kumeOzel_' + sNo);
}
function _tematikAl(sNo) {
  return _kumeOzelAl(sNo) || TEMATIK[sNo] || [];
}

function kumeDuzenleModalAc(sNo) {
  const sure = SURELER[sNo - 1];
  // Deep copy — orijinali bozma
  let liste = JSON.parse(JSON.stringify(_tematikAl(sNo)));

  let modal = document.getElementById('kume-duzenle-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'kume-duzenle-modal';
  modal.className = 'modal-overlay';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);

  modal.innerHTML = `
    <div class="modal-sheet" style="max-height:90vh;">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <div class="modal-title">✏️ ${sure.isim} — Kümeleri Düzenle</div>
        <button class="modal-close" onclick="document.getElementById('kume-duzenle-modal').remove()">✕</button>
      </div>
      <div class="modal-body" id="kume-duzenle-body" style="padding:8px 0 16px;"></div>
    </div>`;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  _kumeDuzenleListeRender(sNo, liste, sure);
}

function _kumeDuzenleListeRender(sNo, liste, sure) {
  const body = document.getElementById('kume-duzenle-body');
  if (!body) return;
  body.innerHTML = '';

  liste.forEach((bolum, idx) => {
    const satirDiv = document.createElement('div');
    satirDiv.dataset.satiridx = idx;
    satirDiv.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:10px 14px;border-bottom:1px solid var(--border);transition:border 0.1s;';

    const siraEl = document.createElement('div');
    siraEl.style.cssText = 'color:var(--muted);font-size:20px;flex-shrink:0;padding:6px 4px;user-select:none;touch-action:none;cursor:grab;';
    siraEl.textContent = '⠿';
    siraEl.dataset.idx = idx;

    // Dokunmatik sürükle-bırak
    siraEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const body = document.getElementById('kume-duzenle-body');
      const satirlar = Array.from(body.querySelectorAll('[data-satiridx]'));
      const baslangicIdx = parseInt(satirDiv.dataset.satiridx);
      let mevcutIdx = baslangicIdx;

      satirDiv.style.opacity = '0.5';
      satirDiv.style.background = 'var(--gold3)';

      const startY = e.touches[0].clientY;
      const satirH = satirDiv.offsetHeight;

      const onMove = (ev) => {
        const dy = ev.touches[0].clientY - startY;
        const adim = Math.round(dy / satirH);
        const yeniIdx = Math.max(0, Math.min(liste.length - 1, baslangicIdx + adim));
        if (yeniIdx !== mevcutIdx) {
          mevcutIdx = yeniIdx;
          // Görsel ipucu
          satirlar.forEach((s, i) => { s.style.borderTop = ''; });
          if (satirlar[mevcutIdx]) {
            satirlar[mevcutIdx].style.borderTop = yeniIdx < baslangicIdx ? '3px solid var(--gold)' : '';
            satirlar[mevcutIdx].style.borderBottom = yeniIdx > baslangicIdx ? '3px solid var(--gold)' : '';
          }
        }
      };

      const onEnd = () => {
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        satirDiv.style.opacity = '';
        satirDiv.style.background = '';
        satirlar.forEach(s => { s.style.borderTop = ''; s.style.borderBottom = ''; });

        if (mevcutIdx !== baslangicIdx) {
          // Listedeki sırayı değiştir
          const [item] = liste.splice(baslangicIdx, 1);
          liste.splice(mevcutIdx, 0, item);
          _kumeDuzenleListeRender(sNo, liste, sure);
        }
      };

      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    }, { passive: false });

    const bilgiDiv = document.createElement('div');
    bilgiDiv.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;';

    const konuInp = document.createElement('input');
    konuInp.value = bolum.konu;
    konuInp.placeholder = 'Konu adı';
    konuInp.style.cssText = 'width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-family:"Source Serif 4",serif;font-size:13px;color:var(--ink);background:var(--paper2);outline:none;box-sizing:border-box;';
    konuInp.addEventListener('change', () => { liste[idx].konu = konuInp.value; });

    const ayetRow = document.createElement('div');
    ayetRow.style.cssText = 'display:flex;align-items:center;gap:6px;';

    const basInp = document.createElement('input');
    basInp.type = 'number';
    basInp.value = bolum.bas;
    basInp.min = 1; basInp.max = sure.ayet;
    basInp.style.cssText = 'width:58px;padding:5px 6px;border:1px solid var(--border);border-radius:7px;font-size:13px;color:var(--ink);background:var(--paper2);outline:none;text-align:center;';
    basInp.addEventListener('change', () => { liste[idx].bas = parseInt(basInp.value) || 1; });

    const ayraç = document.createElement('span');
    ayraç.style.cssText = 'color:var(--muted);';
    ayraç.textContent = '–';

    const bitInp = document.createElement('input');
    bitInp.type = 'number';
    bitInp.value = bolum.bit;
    bitInp.min = 1; bitInp.max = sure.ayet;
    bitInp.style.cssText = 'width:58px;padding:5px 6px;border:1px solid var(--border);border-radius:7px;font-size:13px;color:var(--ink);background:var(--paper2);outline:none;text-align:center;';
    bitInp.addEventListener('change', () => { liste[idx].bit = parseInt(bitInp.value) || 1; });

    const ayLabel = document.createElement('span');
    ayLabel.style.cssText = 'font-size:11px;color:var(--muted);';
    ayLabel.textContent = '. âyet';

    ayetRow.appendChild(basInp); ayetRow.appendChild(ayraç);
    ayetRow.appendChild(bitInp); ayetRow.appendChild(ayLabel);
    bilgiDiv.appendChild(konuInp); bilgiDiv.appendChild(ayetRow);

    const silBtn = document.createElement('button');
    silBtn.style.cssText = 'padding:6px 8px;border:1px solid var(--rust);border-radius:7px;background:none;color:var(--rust);font-size:14px;cursor:pointer;flex-shrink:0;margin-top:4px;';
    silBtn.textContent = '🗑';
    silBtn.onclick = () => {
      if (!confirm('"' + bolum.konu + '" silinsin mi?')) return;
      liste.splice(idx, 1);
      _kumeDuzenleListeRender(sNo, liste, sure);
    };

    satirDiv.appendChild(siraEl); satirDiv.appendChild(bilgiDiv); satirDiv.appendChild(silBtn);
    body.appendChild(satirDiv);
  });

  // Yeni küme ekle
  const ekleDiv = document.createElement('div');
  ekleDiv.style.cssText = 'padding:10px 14px;';
  const ekleBtn = document.createElement('button');
  ekleBtn.style.cssText = 'width:100%;padding:10px;border:1.5px dashed var(--gold);border-radius:10px;background:none;color:var(--gold);font-family:"Source Serif 4",serif;font-size:13px;font-weight:700;cursor:pointer;';
  ekleBtn.textContent = '+ Yeni Küme Ekle';
  ekleBtn.onclick = () => {
    const sonBit = liste.length > 0 ? liste[liste.length-1].bit : 0;
    liste.push({ konu: '', bas: Math.min(sonBit+1, sure.ayet), bit: Math.min(sonBit+5, sure.ayet) });
    _kumeDuzenleListeRender(sNo, liste, sure);
    setTimeout(() => body.scrollTop = body.scrollHeight, 50);
  };
  ekleDiv.appendChild(ekleBtn);
  body.appendChild(ekleDiv);

  // Alt butonlar
  const altDiv = document.createElement('div');
  altDiv.style.cssText = 'display:flex;gap:8px;padding:10px 14px 0;border-top:1px solid var(--border);margin-top:4px;';

  const sifirlaBtn = document.createElement('button');
  sifirlaBtn.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:9px;background:var(--paper2);color:var(--muted);font-size:13px;cursor:pointer;font-family:"Source Serif 4",serif;';
  sifirlaBtn.textContent = '↺ Orijinale Dön';
  sifirlaBtn.onclick = () => {
    if (!confirm('Tüm değişiklikler silinecek, orijinal kümeler geri gelecek. Emin misin?')) return;
    _kumeOzelSifirla(sNo);
    document.getElementById('kume-duzenle-modal').remove();
    document.body.style.overflow = '';
    const ic = document.getElementById('sure-ic-' + sNo);
    if (ic) { ic.innerHTML = ''; sureIcDoldur(sNo, ic); }
  };

  const kaydetBtn = document.createElement('button');
  kaydetBtn.style.cssText = 'flex:2;padding:10px;border:none;border-radius:9px;background:var(--ink);color:var(--gold2);font-size:14px;font-weight:700;cursor:pointer;font-family:"Source Serif 4",serif;';
  kaydetBtn.textContent = '✓ Kaydet';
  kaydetBtn.onclick = () => {
    // Input değerlerini güncelle (change event tetiklenmediyse)
    body.querySelectorAll('[data-idx]').forEach(el => {});
    const gecersiz = liste.find(b => !b.konu.trim() || b.bas < 1 || b.bit < b.bas || b.bit > sure.ayet);
    if (gecersiz) { alert('Konu adı ve ayet aralığını kontrol edin.'); return; }
    _kumeOzelKaydet(sNo, liste);
    document.getElementById('kume-duzenle-modal').remove();
    document.body.style.overflow = '';
    const ic = document.getElementById('sure-ic-' + sNo);
    if (ic) { ic.innerHTML = ''; sureIcDoldur(sNo, ic); }
  };

  altDiv.appendChild(sifirlaBtn); altDiv.appendChild(kaydetBtn);
  body.appendChild(altDiv);
}

function klasorToggle(sNo, idx, bas, bit, klasor){
  const ic = document.getElementById('ki-'+sNo+'-'+idx);
  const acik = klasor.classList.toggle('open');
  const icon = klasor.querySelector('.klasor-icon');
  if(icon) icon.textContent = acik ? '📂' : '📁';
  if(acik && ic.children.length===0){
    ayetleriInlineYukle(sNo, bas, bit, ic);
  }
}

function ayetleriInlineYukle(sNo, bas, bit, ic){
  const yukEl = document.createElement('div');
  yukEl.className = 'yukleniyor';
  yukEl.innerHTML = '<div class="spin"></div>Âyetler yükleniyor…';
  ic.appendChild(yukEl);

  // Cache'de varsa direkt render et
  let hepsiCachede = true;
  for(let a=bas; a<=bit; a++){
    if(!onizlemeCache[sNo+':'+a]){ hepsiCachede=false; break; }
  }
  if(hepsiCachede){
    ic.removeChild(yukEl);
    _ayetleriInlineRender(sNo, bas, bit, ic);
    return;
  }

  // Mehmet Okuyan (api.acikkuran.com, author=107) + Arapça metin paralel çek
  Promise.all([
    _okuyanSureAl(sNo),
    _kurancilarArAl(sNo)
  ]).then(([mealData, arData]) => {
    ic.removeChild(yukEl);

    if (mealData && mealData.length > 0) {
      mealData.forEach((ay, i) => {
        const aNo = ay.verse_number || (i + 1);
        const ck = sNo + ':' + aNo;
        const arAyet = arData ? arData.find(x => x.verse === aNo) : null;
        onizlemeCache[ck] = {
          ar:        arAyet ? arAyet.arabic : (ay.verse || ''),
          meal:      ay.translation ? ay.translation.text || '' : '',
          dipnotlar: ay.translation ? (ay.translation.footnotes || []) : []
        };
      });
      _ayetleriInlineRender(sNo, bas, bit, ic);
    } else {
      // Fallback: alquran.cloud Diyanet
      fetch('https://api.alquran.cloud/v1/surah/'+sNo+'/editions/quran-uthmani,tr.diyanet')
        .then(r=>r.json())
        .then(d=>{
          const arAyetler = d.data[0].ayahs;
          const meAyetler = d.data[1].ayahs;
          arAyetler.forEach((ay,i)=>{
            const ck = sNo+':'+(i+1);
            onizlemeCache[ck] = { ar: ay.text, meal: meAyetler[i].text, dipnotlar: [] };
          });
          _ayetleriInlineRender(sNo, bas, bit, ic);
        })
        .catch(()=>{
          ic.innerHTML = '<div style="text-align:center;padding:20px;color:var(--rust)">Bağlantı hatası.</div>';
        });
    }
  }).catch(() => {
    ic.removeChild(yukEl);
    ic.innerHTML = '<div style="text-align:center;padding:20px;color:var(--rust)">Bağlantı hatası.</div>';
  });
}

function _ayetleriInlineRender(sNo, bas, bit, ic){
  const arapcaRakam = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  // Besmele: sadece 1. âyet bu grupta VE Tevbe değilse, SADECE sûre açıldığında bir kez göster
  // Âyetin içine gömülü değil, bağımsız bir kutu olarak
  if(bas === 1 && sNo !== 9){
    const bsmWrap = document.createElement('div');
    bsmWrap.className = 'besmele-kutu besmele-bagimsiz';
    bsmWrap.textContent = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    ic.appendChild(bsmWrap);
  }

  for(let a=bas; a<=bit; a++){
    const data = onizlemeCache[sNo+':'+a];
    if(!data) continue;

    const blok = document.createElement('div');
    blok.className = 'inline-ayet-blok';

    const arWrap = document.createElement('div');
    arWrap.className = 'inline-arapca';

    const arText = document.createElement('div');
    arText.className = 'inline-arapca-metin';
    arText.textContent = data.ar;

    const noDekor = document.createElement('div');
    noDekor.style.cssText = 'text-align:center;margin-top:8px;';
    const noSpan = document.createElement('span');
    noSpan.style.cssText = 'font-family:var(--ar-font);font-size:15px;color:var(--gold2);padding:2px 10px;border:1px solid var(--gold2);border-radius:20px;';
    noSpan.textContent = arapcaRakam(a);
    noDekor.appendChild(noSpan);
    arWrap.appendChild(arText);
    arWrap.appendChild(noDekor);
    blok.appendChild(arWrap);

    const mealDiv = document.createElement('div');
    mealDiv.className = 'inline-meal';
    const noLabel = document.createElement('span');
    noLabel.style.cssText = 'font-size:11px;font-weight:700;color:var(--gold);margin-right:4px;';
    noLabel.textContent = a+'.';
    mealDiv.appendChild(noLabel);

    // Meal metni — dipnot numaralarını linkleştir + atıf zinciri
    const dipnotlar = data.dipnotlar || [];
    if (dipnotlar.length > 0) {
      const mealMetni = data.meal || '';
      const parcalar = mealMetni.split(/(\[\d+\])/g);
      parcalar.forEach(parca => {
        const m = parca.match(/^\[(\d+)\]$/);
        if (m) {
          const dipNo = parseInt(m[1]);
          const link = document.createElement('button');
          link.className = 'dipnot-ref-btn';
          link.textContent = '[' + dipNo + ']';
          link.dataset.dipno = dipNo;
          link.dataset.ayetKey = sNo + '_' + a;
          link.onclick = (e) => { e.stopPropagation(); _dipnotToggle(sNo, a, dipNo); };
          mealDiv.appendChild(link);
        } else if (parca) {
          mealDiv.appendChild(atifMetniParsele(parca));
        }
      });
    } else {
      mealDiv.appendChild(atifMetniParsele(data.meal || ''));
    }

    // Okuyan etiketi
    const okuyanEtiket = document.createElement('div');
    okuyanEtiket.style.cssText = 'font-size:10px;color:var(--muted);margin-top:5px;font-style:italic;';
    okuyanEtiket.textContent = '— Mehmet Okuyan';
    mealDiv.appendChild(okuyanEtiket);

    blok.appendChild(mealDiv);

    // Dipnot accordion kutuları
    if (dipnotlar.length > 0) {
      const dipnotWrap = document.createElement('div');
      dipnotWrap.id = 'dipnot-wrap-' + sNo + '_' + a;
      dipnotWrap.style.cssText = 'margin:0 0 0 0;';
      dipnotlar.forEach(dn => {
        const kutu = document.createElement('div');
        kutu.className = 'dipnot-kutu';
        kutu.id = 'dipnot-' + sNo + '_' + a + '_' + dn.number;
        kutu.style.cssText = 'display:none;background:var(--paper2);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:10px 12px;margin:4px 0;font-size:12px;color:var(--ink);line-height:1.7;animation:fadeIn 0.15s ease;';
        const dipNumEl = document.createElement('span');
        dipNumEl.style.cssText = 'font-weight:700;color:var(--gold);margin-right:6px;';
        dipNumEl.textContent = '[' + dn.number + ']';
        kutu.appendChild(dipNumEl);
        kutu.appendChild(atifMetniParsele(dn.text || ''));
        dipnotWrap.appendChild(kutu);
      });
      blok.appendChild(dipnotWrap);
    }

    // Buton satırı: Not | Kelime | Çeviriler
    blok.appendChild(ayetButonSatiri(sNo, a));

    // Not alanı — atıf destekli
    blok.appendChild(notAlaniOlustur(sNo, a, 'inline'));

    ic.appendChild(blok);
  }
}

// ════════════════════════════════════════
//  EVRENSEL NOT ALANI (Atıf destekli)
// ════════════════════════════════════════
/**
 * mod: 'inline' | 'modal' | 'okuma'
 * tip: 't' (tefsir) | 'd' (dipnot)
 */
function notAlaniOlustur(sNo, aNo, mod, tip) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:4px;';

  const notBtn = document.createElement('button');
  notBtn.className = 'inline-not-btn';
  notBtn.id = 'an-btn-' + sNo + '-' + aNo;
  _ayetNotBtnGuncelle(notBtn, sNo, aNo);
  notBtn.onclick = () => notlarModalAc(sNo, aNo);
  wrap.appendChild(notBtn);

  return wrap;
}

function _ayetNotBtnGuncelle(btn, sNo, aNo) {
  const notlar = ayetNotlariniGetir(sNo, aNo);
  const n = notlar.length;
  btn.className = 'inline-not-btn' + (n > 0 ? ' var' : '');
  btn.innerHTML = n > 0 ? '📂 Notlar (' + n + ')' : '📁 Not Ekle';
  // Notlar modal butonunu da güncelle
  const modalBtn = document.getElementById('notlar-modal-btn-' + sNo + '-' + aNo);
  if (modalBtn) modalBtn.textContent = n > 0 ? '📂 Notlar (' + n + ')' : '📁 Notlar';
}

function _cokluNotPanelRender(sNo, aNo, panelIc, notBtn) {
  panelIc.innerHTML = '';
  const notlar = ayetNotlariniGetir(sNo, aNo);

  // Mevcut notlar — her biri klasör kartı
  notlar.forEach((n, idx) => {
    const kart = document.createElement('div');
    kart.style.cssText = 'border-bottom:1px solid var(--border);';

    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;align-items:center;padding:9px 12px;gap:8px;cursor:pointer;background:var(--paper2);user-select:none;';

    const klasorIkon = document.createElement('span');
    klasorIkon.style.cssText = 'font-size:16px;flex-shrink:0;';
    klasorIkon.textContent = '📁';

    const isimEl = document.createElement('div');
    isimEl.style.cssText = 'flex:1;font-family:"Playfair Display",serif;font-size:13px;font-weight:600;color:var(--ink);';
    isimEl.textContent = n.isim || ('Klasör ' + (idx + 1));

    const onizEl = document.createElement('div');
    onizEl.style.cssText = 'font-size:11px;color:var(--muted);max-width:100px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';
    onizEl.textContent = (n.icerik || '').substring(0, 28) + ((n.icerik||'').length > 28 ? '…' : '');

    const silBtn = document.createElement('button');
    silBtn.style.cssText = 'padding:2px 8px;background:none;border:1px solid #f0c0b8;border-radius:5px;color:var(--rust);font-size:11px;cursor:pointer;flex-shrink:0;';
    silBtn.textContent = 'Sil';
    silBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm('"' + (n.isim || 'Klasör') + '" silinsin mi?')) return;
      const arr = ayetNotlariniGetir(sNo, aNo);
      arr.splice(idx, 1);
      if (arr.length === 0) localStorage.removeItem('an_' + sNo + '_' + aNo);
      else localStorage.setItem('an_' + sNo + '_' + aNo, JSON.stringify(arr));
      statGuncelle();
      _cokluNotPanelRender(sNo, aNo, panelIc, notBtn);
      _ayetNotBtnGuncelle(notBtn, sNo, aNo);
      const sdot = document.getElementById('sdot-' + sNo);
      if (sdot) sdot.classList.toggle('var', sureNotVarMi(sNo));
    };

    hdr.appendChild(klasorIkon);
    hdr.appendChild(isimEl);
    hdr.appendChild(onizEl);
    hdr.appendChild(silBtn);
    kart.appendChild(hdr);

    const ic = document.createElement('div');
    ic.style.cssText = 'display:none;padding:12px 14px;border-top:1px solid var(--border);background:var(--paper);';

    hdr.onclick = () => {
      const acik = ic.style.display === 'none';
      ic.style.display = acik ? 'block' : 'none';
      klasorIkon.textContent = acik ? '📂' : '📁';
      onizEl.style.display = acik ? 'none' : '';

      if (acik && ic.children.length === 0) {
        const isimDuz = document.createElement('input');
        isimDuz.style.cssText = 'width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:7px;background:var(--paper2);font-family:"Source Serif 4",serif;font-size:13px;color:var(--text);outline:none;box-sizing:border-box;margin-bottom:8px;';
        isimDuz.placeholder = 'Klasör adı';
        isimDuz.value = n.isim || '';

        // OKUMA MODU — büyük yazı, tıklayınca düzenleme açılır
        const okumaMeyinIC = document.createElement('div');
        okumaMeyinIC.className = 'not-okuma-metin';
        okumaMeyinIC.style.cssText = 'padding:6px 0 12px;border-bottom:1px solid var(--border);margin-bottom:8px;cursor:text;min-height:40px;';
        okumaMeyinIC.title = 'Düzenlemek için tıkla';
        if (n.icerik && n.icerik.trim()) {
          okumaMeyinIC.appendChild(atifMetniParsele(n.icerik));
        } else {
          okumaMeyinIC.innerHTML = '<span style="color:var(--muted);font-style:italic;font-size:13px;">Not içeriği yok…</span>';
        }

        const ta = document.createElement('textarea');
        ta.className = 'inline-not-textarea';
        ta.placeholder = 'Not içeriği… [[2:255]] ile âyet atıfı ekleyebilirsiniz';
        ta.value = n.icerik || '';
        ta.style.marginBottom = '6px';
        ta.style.display = 'none';

        let icDuzenlemeAcik = false;
        okumaMeyinIC.addEventListener('click', (e) => {
          if (e.target.classList.contains('atif-link')) return;
          if (!icDuzenlemeAcik) {
            icDuzenlemeAcik = true;
            okumaMeyinIC.style.display = 'none';
            ta.style.display = 'block';
            ta.style.height = 'auto';
            ta.style.height = Math.max(70, ta.scrollHeight) + 'px';
            ta.focus();
            icDuzenleBtn.textContent = '👁 Önizle';
          }
        });

        ta.addEventListener('input', () => {
          ta.style.height = 'auto';
          ta.style.height = Math.max(70, ta.scrollHeight) + 'px';
        });

        const icDuzenleBtn = document.createElement('button');
        icDuzenleBtn.className = 'cnot-yeni-btn';
        icDuzenleBtn.style.cssText = 'background:none;border:1.5px solid var(--border);color:var(--text);margin-top:0;margin-bottom:6px;';
        icDuzenleBtn.textContent = '✏️ Düzenle';
        icDuzenleBtn.onclick = () => {
          icDuzenlemeAcik = !icDuzenlemeAcik;
          if (icDuzenlemeAcik) {
            okumaMeyinIC.style.display = 'none';
            ta.style.display = 'block';
            ta.style.height = 'auto';
            ta.style.height = Math.max(70, ta.scrollHeight) + 'px';
            ta.focus();
            icDuzenleBtn.textContent = '👁 Önizle';
          } else {
            ta.style.display = 'none';
            okumaMeyinIC.style.display = 'block';
            okumaMeyinIC.innerHTML = '';
            if (ta.value.trim()) okumaMeyinIC.appendChild(atifMetniParsele(ta.value));
            else okumaMeyinIC.innerHTML = '<span style="color:var(--muted);font-style:italic;font-size:13px;">Not içeriği yok…</span>';
            icDuzenleBtn.textContent = '✏️ Düzenle';
          }
        };

        const prev = document.createElement('div');
        prev.style.display = 'none';

        const kaydet = document.createElement('button');
        kaydet.className = 'cnot-yeni-btn';
        kaydet.style.marginTop = '6px';
        kaydet.textContent = '✓ Kaydet';
        kaydet.onclick = () => {
          const yeniIcerik = ta.value.trim();
          const arr2 = ayetNotlariniGetir(sNo, aNo);
          arr2[idx].icerik = yeniIcerik;
          arr2[idx].isim = isimDuz.value.trim() || arr2[idx].isim || ('Klasör ' + (idx + 1));
          localStorage.setItem('an_' + sNo + '_' + aNo, JSON.stringify(arr2));
          statGuncelle();
          // Okuma moduna dön
          icDuzenlemeAcik = false;
          ta.style.display = 'none';
          okumaMeyinIC.style.display = 'block';
          okumaMeyinIC.innerHTML = '';
          if (yeniIcerik) okumaMeyinIC.appendChild(atifMetniParsele(yeniIcerik));
          else okumaMeyinIC.innerHTML = '<span style="color:var(--muted);font-style:italic;font-size:13px;">Not içeriği yok…</span>';
          icDuzenleBtn.textContent = '✏️ Düzenle';
          _cokluNotPanelRender(sNo, aNo, panelIc, notBtn);
          _ayetNotBtnGuncelle(notBtn, sNo, aNo);
          if (document.getElementById('notlar-modal').classList.contains('open')) {
            notlarModalIcDoldur(sNo, aNo);
          }
        };

        ic.appendChild(isimDuz);
        ic.appendChild(okumaMeyinIC);
        ic.appendChild(ta);
        ic.appendChild(prev);
        ic.appendChild(icDuzenleBtn);
        ic.appendChild(kaydet);
      }
    };

    kart.appendChild(ic);
    panelIc.appendChild(kart);
  });

  // Yeni klasör formu
  const form = document.createElement('div');
  form.style.cssText = 'padding:10px 12px;' + (notlar.length > 0 ? 'border-top:1px solid var(--border);' : '');

  const formBaslik = document.createElement('div');
  formBaslik.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--muted);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;';
  formBaslik.innerHTML = '<span style="font-size:14px;">📁</span>' + (notlar.length === 0 ? 'Yeni Klasör' : '+ Yeni Klasör');
  form.appendChild(formBaslik);

  const isimInp = document.createElement('input');
  isimInp.style.cssText = 'width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:7px;background:var(--paper2);font-family:"Source Serif 4",serif;font-size:13px;color:var(--text);outline:none;box-sizing:border-box;margin-bottom:8px;';
  isimInp.placeholder = 'Klasör adı (ör: Kişisel, Tefsir, Hadis…)';
  form.appendChild(isimInp);

  const ta2 = document.createElement('textarea');
  ta2.className = 'inline-not-textarea';
  ta2.placeholder = 'Notunuzu yazın… [[2:255]] ile âyet atıfı ekleyebilirsiniz';
  ta2.style.marginBottom = '6px';
  ta2.addEventListener('input', () => {
    ta2.style.height = 'auto';
    ta2.style.height = Math.max(70, ta2.scrollHeight) + 'px';
    onizlemeGuncelle(ta2.value, prev2);
  });
  form.appendChild(ta2);

  const prev2 = document.createElement('div');
  prev2.className = 'not-onizleme-wrap';
  prev2.style.display = 'none';
  form.appendChild(prev2);

  const kaydetBtn = document.createElement('button');
  kaydetBtn.className = 'cnot-yeni-btn';
  kaydetBtn.style.marginTop = '4px';
  kaydetBtn.textContent = '📁 Klasörü Kaydet';
  kaydetBtn.onclick = () => {
    const icerik = ta2.value.trim();
    if (!icerik) { ta2.style.borderColor = 'var(--rust)'; ta2.focus(); return; }
    ta2.style.borderColor = '';
    const arr = ayetNotlariniGetir(sNo, aNo);
    arr.push({ isim: isimInp.value.trim() || ('Klasör ' + (arr.length + 1)), icerik, tarih: new Date().toLocaleDateString('tr-TR') });
    localStorage.setItem('an_' + sNo + '_' + aNo, JSON.stringify(arr));
    statGuncelle();
    _cokluNotPanelRender(sNo, aNo, panelIc, notBtn);
    _ayetNotBtnGuncelle(notBtn, sNo, aNo);
    // Notlar modal butonunu güncelle
    const mBtn = document.getElementById('notlar-modal-btn-' + sNo + '-' + aNo);
    if (mBtn) mBtn.textContent = '📂 Notlar (' + arr.length + ')';
    const sdot = document.getElementById('sdot-' + sNo);
    if (sdot) sdot.classList.add('var');
  };
  form.appendChild(kaydetBtn);
  panelIc.appendChild(form);
}

//  AYET DETAY MODAL
// ════════════════════════════════════════
let modalSNo = null, modalANo = null;

function ayetDetayAc(sNo, aNo){
  // Açık olan diğer modalleri kapat
  document.getElementById('notlar-modal').classList.remove('open');
  document.getElementById('ceviri-modal').classList.remove('open');

  modalSNo = sNo; modalANo = aNo;
  const sure = SURELER[sNo-1];
  document.getElementById('modal-baslik').textContent =
    sure.isim + ' ' + sNo + ':' + aNo;
  document.getElementById('modal-ic').innerHTML =
    '<div class="yukleniyor"><div class="spin"></div>Yükleniyor…</div>';
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';

  const cacheKey = sNo+':'+aNo;
  if(onizlemeCache[cacheKey]){
    modalIcDoldur(sNo, aNo, onizlemeCache[cacheKey].ar, onizlemeCache[cacheKey].meal, onizlemeCache[cacheKey].dipnotlar || []);
    return;
  }

  // Önce özel (GitHub'dan yüklenmiş) Arapça var mı bak
  const ozelArData = _ozelArapcaGetir(sNo);
  const ozelAyet = ozelArData ? ozelArData.find(x => x.verse === aNo) : null;

  // Okuyan (acikkuran) + Arapça paralel çek
  Promise.all([
    fetch('https://api.acikkuran.com/surah/'+sNo+'/verse/'+aNo+'?author=107').then(r=>r.json()).catch(()=>null),
    ozelAyet ? Promise.resolve(null) : fetch('https://api.alquran.cloud/v1/ayah/'+sNo+':'+aNo+'/editions/quran-uthmani').then(r=>r.json()).catch(()=>null)
  ]).then(([okuyanData, arData]) => {
    const ar   = ozelAyet ? ozelAyet.arabic : (arData ? arData.data[0].text : '');
    const meal = okuyanData && okuyanData.data && okuyanData.data.translation ? okuyanData.data.translation.text : '';
    const dipnotlar = okuyanData && okuyanData.data && okuyanData.data.translation ? (okuyanData.data.translation.footnotes || []) : [];
    onizlemeCache[cacheKey] = {ar, meal, dipnotlar};
    const onEl = document.getElementById('oniz-'+sNo+'-'+aNo);
    if(onEl) onEl.textContent = ar.substring(0,30)+'…';
    modalIcDoldur(sNo, aNo, ar, meal, dipnotlar);
  }).catch(()=>{
    document.getElementById('modal-ic').innerHTML =
      '<div style="text-align:center;padding:30px;color:var(--rust)">Bağlantı hatası.</div>';
  });
}

function modalIcDoldur(sNo, aNo, ar, meal, dipnotlar){
  dipnotlar = dipnotlar || [];
  const ic = document.getElementById('modal-ic');
  ic.innerHTML = '';

  // Besmele: modal'da gösterilmiyor (âyet içinde zaten var)

  const arKutu = document.createElement('div');
  arKutu.className = 'arapca-kutu';

  const arMetin = document.createElement('div');
  arMetin.className = 'arapca-metin';
  arMetin.textContent = ar;

  const noDekor = document.createElement('div');
  noDekor.className = 'ayet-no-dekor';
  const noSpan = document.createElement('span');
  const arapcaRakam = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  noSpan.textContent = arapcaRakam(aNo);
  noDekor.appendChild(noSpan);
  arKutu.appendChild(arMetin);
  arKutu.appendChild(noDekor);
  ic.appendChild(arKutu);

  const mealKutu = document.createElement('div');
  mealKutu.className = 'meal-kutu';
  const mEtiket = document.createElement('div');
  mEtiket.className = 'etiket';
  mEtiket.textContent = 'Mehmet Okuyan Meali';
  mealKutu.appendChild(mEtiket);

  const mMetin = document.createElement('div');
  mMetin.className = 'meal-metin';

  // Dipnot numaralarını tıklanabilir yap
  if (dipnotlar.length > 0) {
    const parcalar = (meal || '').split(/(\[\d+\])/g);
    parcalar.forEach(parca => {
      const m = parca.match(/^\[(\d+)\]$/);
      if (m) {
        const dipNo = parseInt(m[1]);
        const link = document.createElement('button');
        link.className = 'dipnot-ref-btn';
        link.textContent = '[' + dipNo + ']';
        link.dataset.dipno = dipNo;
        link.onclick = (e) => { e.stopPropagation(); _modalDipnotToggle(dipNo); };
        mMetin.appendChild(link);
      } else if (parca) {
        mMetin.appendChild(document.createTextNode(parca));
      }
    });
  } else {
    mMetin.textContent = meal;
  }

  mealKutu.appendChild(mMetin);

  // Modal dipnot kutuları
  if (dipnotlar.length > 0) {
    const dipWrap = document.createElement('div');
    dipWrap.id = 'modal-dipnot-wrap';
    dipWrap.style.cssText = 'margin-top:6px;';
    dipnotlar.forEach(dn => {
      const kutu = document.createElement('div');
      kutu.className = 'dipnot-kutu';
      kutu.id = 'modal-dipnot-' + dn.number;
      kutu.style.cssText = 'display:none;background:var(--paper2);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:10px 12px;margin:4px 0;font-size:12px;color:var(--ink);line-height:1.7;animation:fadeIn 0.15s ease;';
      const mdNumEl = document.createElement('span');
      mdNumEl.style.cssText = 'font-weight:700;color:var(--gold);margin-right:6px;';
      mdNumEl.textContent = '[' + dn.number + ']';
      kutu.appendChild(mdNumEl);
      kutu.appendChild(atifMetniParsele(dn.text || ''));
      dipWrap.appendChild(kutu);
    });
    mealKutu.appendChild(dipWrap);
  }

  ic.appendChild(mealKutu);

  // Atıf Zinciri — bu âyete başka yerlerden yapılan atıflar
  const atiflar = _atifZinciriGetir(sNo, aNo);
  if (atiflar.length > 0) {
    const atifKutu = document.createElement('div');
    atifKutu.style.cssText = 'margin:0 16px 16px;';

    const atifBaslik = document.createElement('div');
    atifBaslik.style.cssText = `
      display:flex;align-items:center;gap:8px;
      padding:10px 14px;
      background:var(--paper2);
      border-radius:10px 10px 0 0;
      border:1px solid var(--border);
      border-bottom:none;
      cursor:pointer;
      user-select:none;
    `;
    atifBaslik.innerHTML = `
      <span style="font-size:16px;">🔗</span>
      <span style="font-family:'Playfair Display',serif;font-size:13px;font-weight:700;color:var(--ink);flex:1;">
        Atıf Zinciri
      </span>
      <span style="font-size:11px;font-weight:700;color:var(--gold);
        background:var(--gold2);padding:2px 8px;border-radius:10px;">
        ${atiflar.length}
      </span>
      <span style="font-size:16px;color:var(--muted);transition:transform 0.2s;" id="atif-chev-${sNo}_${aNo}">›</span>
    `;

    const atifIc = document.createElement('div');
    atifIc.style.cssText = 'display:none;border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px;overflow:hidden;';

    atiflar.forEach((a, idx) => {
      const satir = document.createElement('div');
      satir.style.cssText = `
        display:flex;align-items:center;gap:10px;
        padding:10px 14px;
        background:var(--paper);
        ${idx < atiflar.length - 1 ? 'border-bottom:1px solid var(--border);' : ''}
        cursor:pointer;transition:background 0.1s;
      `;

      const tipIkon = a.tip === 'not' ? '📝' : '🔗';
      const renkClass = a.tip === 'not' ? 'var(--gold)' : 'var(--teal)';

      satir.innerHTML = `
        <div style="width:32px;height:32px;border-radius:8px;
          background:${renkClass}20;border:1px solid ${renkClass}40;
          display:flex;align-items:center;justify-content:center;
          font-size:15px;flex-shrink:0;">${tipIkon}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;font-weight:700;color:${renkClass};margin-bottom:2px;">
            ${a.sure} ${a.kaynak} — ${a.isim}
          </div>
          ${a.ozet ? `<div style="font-size:11px;color:var(--muted);line-height:1.5;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.ozet}</div>` : ''}
        </div>
        <span style="font-size:16px;color:var(--muted);">›</span>
      `;

      satir.addEventListener('mouseenter', () => satir.style.background = 'var(--paper2)');
      satir.addEventListener('mouseleave', () => satir.style.background = 'var(--paper)');
      satir.onclick = () => {
        document.getElementById('modal').classList.remove('open');
        document.body.style.overflow = '';
        setTimeout(() => ayetDetayAc(a.sNo, a.aNo), 150);
      };

      atifIc.appendChild(satir);
    });

    atifBaslik.onclick = () => {
      const acik = atifIc.style.display === 'none';
      atifIc.style.display = acik ? 'block' : 'none';
      const chev = document.getElementById('atif-chev-' + sNo + '_' + aNo);
      if (chev) chev.style.transform = acik ? 'rotate(90deg)' : '';
    };

    atifKutu.appendChild(atifBaslik);
    atifKutu.appendChild(atifIc);
    ic.appendChild(atifKutu);
  }

  // Buton satırı: Çeviriler
  ic.appendChild(ayetButonSatiri(sNo, aNo));

  // Modal'da da çoklu not alanı
  ic.appendChild(notAlaniOlustur(sNo, aNo, 'modal', 't'));

  const spacer = document.createElement('div');
  spacer.style.height = '20px';
  ic.appendChild(spacer);
}

function notKaydet(sNo, aNo, tip, val, badge){
  const key = notKey(sNo, aNo, tip);
  if(val.trim()) localStorage.setItem(key, val);
  else localStorage.removeItem(key);

  const sdot = document.getElementById('sdot-'+sNo);
  if(sdot) sdot.classList.toggle('var', sureNotVarMi(sNo));

  statGuncelle();
  if(badge){ badge.style.display='inline'; setTimeout(()=>badge.style.display='none',1500); }
}

function modalKapat(e){
  if(e && e.target !== document.getElementById('modal')) return;
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
  modalSNo = null; modalANo = null;
}

// ════════════════════════════════════════
//  KÜMELER
// ════════════════════════════════════════
function _kumeSureDoldur() {
  // Tüm sure select'lerini SURELER ile doldur
  document.querySelectorAll('.k-sure-sel').forEach(sel => {
    if (sel.options.length > 1) return;
    SURELER.forEach((s, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = (i + 1) + '. ' + s.isim;
      sel.appendChild(opt);
    });
  });
}

function kumeAyetSatirEkle() {
  const wrap = document.getElementById('k-ayetler-wrap');
  const idx = wrap.children.length;
  const satir = document.createElement('div');
  satir.className = 'form-row k-ayet-satir';
  satir.dataset.idx = idx;
  satir.innerHTML = `
    <select class="finput k-sure-sel" style="flex:1.2;"><option value="">Sûre seç…</option></select>
    <input class="finput k-bas-inp" placeholder="Baş" type="number" min="1" style="flex:0.7;">
    <input class="finput k-bit-inp" placeholder="Bit" type="number" min="1" style="flex:0.7;">
    <button onclick="kumeAyetSatirSil(this)" style="padding:7px 10px;background:none;border:1px solid var(--border);border-radius:7px;color:var(--muted);cursor:pointer;font-size:14px;">✕</button>`;
  wrap.appendChild(satir);
  _kumeSureDoldur();
}

function kumeAyetSatirSil(btn) {
  const satir = btn.closest('.k-ayet-satir');
  const wrap = document.getElementById('k-ayetler-wrap');
  if (wrap.children.length <= 1) { alert('En az bir âyet aralığı gerekli.'); return; }
  satir.remove();
}

function kumeKaydet(){
  const konu = document.getElementById('k-konu').value.trim();
  if(!konu){ alert('Lütfen konu adı girin.'); return; }

  const satirlar = document.querySelectorAll('.k-ayet-satir');
  const ayetAraliklari = [];
  let hata = false;
  satirlar.forEach(satir => {
    const sNo = parseInt(satir.querySelector('.k-sure-sel').value);
    const bas = parseInt(satir.querySelector('.k-bas-inp').value);
    const bit = parseInt(satir.querySelector('.k-bit-inp').value);
    if (!sNo || !bas || !bit) { hata = true; return; }
    if (sNo < 1 || sNo > 114) { hata = true; return; }
    ayetAraliklari.push({ sure: sNo, bas, bit });
  });

  if (hata || ayetAraliklari.length === 0) { alert('Lütfen tüm âyet aralıklarını doldurun.'); return; }

  const liste = JSON.parse(localStorage.getItem('kumeler')||'[]');
  // Çoklu sure desteği: ilk aralığı ana bilgi olarak tut, tümünü de kaydet
  const ilk = ayetAraliklari[0];
  liste.push({
    konu,
    sure: ilk.sure, bas: ilk.bas, bit: ilk.bit,
    ayetler: ayetAraliklari,
    tarih: new Date().toLocaleDateString('tr-TR')
  });
  localStorage.setItem('kumeler', JSON.stringify(liste));

  document.getElementById('k-konu').value = '';
  const wrap = document.getElementById('k-ayetler-wrap');
  wrap.innerHTML = `<div class="form-row k-ayet-satir" data-idx="0">
    <select class="finput k-sure-sel" style="flex:1.2;"><option value="">Sûre seç…</option></select>
    <input class="finput k-bas-inp" placeholder="Baş" type="number" min="1" style="flex:0.7;">
    <input class="finput k-bit-inp" placeholder="Bit" type="number" min="1" style="flex:0.7;">
    <button onclick="kumeAyetSatirSil(this)" style="padding:7px 10px;background:none;border:1px solid var(--border);border-radius:7px;color:var(--muted);cursor:pointer;font-size:14px;">✕</button>
  </div>`;
  _kumeSureDoldur();
  kumeListesiRender();
  statGuncelle();
}

function kumeListesiRender(){
  const wrap = document.getElementById('kume-listesi');
  const liste = JSON.parse(localStorage.getItem('kumeler')||'[]');

  if(liste.length===0){
    wrap.innerHTML = '<div class="bos-durum"><div class="ic">📂</div>Henüz küme oluşturmadınız.</div>';
    return;
  }

  wrap.innerHTML = '';
  liste.forEach((k,i)=>{
    const sure = SURELER[k.sure-1];
    const kDiv = document.createElement('div');
    kDiv.className = 'kume-klasor';

    const hdr = document.createElement('div');
    hdr.className = 'kk-header';
    hdr.onclick = () => kDiv.classList.toggle('open');

    const icon = document.createElement('div');
    icon.className = 'kk-icon';
    icon.textContent = '📂';

    const bilgi = document.createElement('div');
    bilgi.className = 'kk-bilgi';

    const baslik = document.createElement('div');
    baslik.className = 'kk-baslik';
    baslik.textContent = k.konu;

    const ref = document.createElement('div');
    ref.className = 'kk-ref';
    if (k.ayetler && k.ayetler.length > 1) {
      ref.textContent = k.ayetler.length + ' aralık  ·  ' + (k.tarih || '');
    } else {
      ref.textContent = (sure?sure.isim:'?')+' '+k.sure+':'+k.bas+'–'+k.bit + (k.tarih ? '  ·  '+k.tarih : '');
    }

    bilgi.appendChild(baslik); bilgi.appendChild(ref);

    const actions = document.createElement('div');
    actions.className = 'kk-actions';

    const okuBtn = document.createElement('button');
    okuBtn.className = 'kk-btn kk-oku';
    okuBtn.textContent = '▶ Oku';
    okuBtn.onclick = (e) => { e.stopPropagation(); kumeOku(i); };

    const silBtn = document.createElement('button');
    silBtn.className = 'kk-btn kk-sil';
    silBtn.textContent = 'Sil';
    silBtn.onclick = (e) => { e.stopPropagation(); kumeSil(i); };

    actions.appendChild(okuBtn); actions.appendChild(silBtn);

    const chevIcon = document.createElement('span');
    chevIcon.className = 'kk-chev';
    chevIcon.textContent = '▾';
    chevIcon.style.cssText = 'color:var(--muted);font-size:14px;transition:transform 0.2s;flex-shrink:0;margin-left:4px;';

    hdr.appendChild(icon); hdr.appendChild(bilgi); hdr.appendChild(actions); hdr.appendChild(chevIcon);
    kDiv.appendChild(hdr);

    const ic = document.createElement('div');
    ic.className = 'kk-ic';
    let notSayisi = 0;
    for(let a=k.bas; a<=k.bit; a++) if(notVarMi(k.sure,a)) notSayisi++;
    ic.innerHTML = '<div style="font-size:13px;color:var(--muted)">'+(k.bit-k.bas+1)+' âyet  ·  '+notSayisi+' not</div>';
    kDiv.appendChild(ic);

    wrap.appendChild(kDiv);
  });
}

function kumeSil(i){
  if(!confirm('Bu küme silinsin mi?')) return;
  const liste = JSON.parse(localStorage.getItem('kumeler')||'[]');
  liste.splice(i,1);
  localStorage.setItem('kumeler', JSON.stringify(liste));
  kumeListesiRender();
  statGuncelle();
}

function kumeOku(i){
  const liste = JSON.parse(localStorage.getItem('kumeler')||'[]');
  kumeOkuDirekt(liste[i]);
}

// ════════════════════════════════════════
//  FAB
// ════════════════════════════════════════
window.addEventListener('scroll', ()=>{
  document.getElementById('fab').classList.toggle('goster', window.scrollY>300);
});

// ════════════════════════════════════════
//  NOTLAR EKRANI — Atıf linkleri ile
// ════════════════════════════════════════
function notlarAramaYap(q) {
  const aranan = (q || '').toLowerCase().trim();
  // Tüm not bloklarını filtrele
  const gruplar = document.querySelectorAll('.notlar-sure-grup');
  let hicSonuc = true;
  gruplar.forEach(grup => {
    let grupGoster = false;
    grup.querySelectorAll('.notlar-not-blok').forEach(blok => {
      const metin = blok.textContent.toLowerCase();
      const esles = !aranan || metin.includes(aranan);
      blok.style.display = esles ? '' : 'none';
      if (esles) { grupGoster = true; hicSonuc = false; }
    });
    grup.style.display = grupGoster ? '' : 'none';
    if (grupGoster && aranan) grup.classList.add('open');
  });
  const bos = document.getElementById('notlar-arama-bos');
  if (bos) bos.style.display = hicSonuc && aranan ? 'block' : 'none';
}

// ════════════════════════════════════════
//  NOT OKUMA MODU YAZI BOYUTU
// ════════════════════════════════════════
const NOT_OKUMA_ADIM = [13, 15, 17, 20, 24];
const NOT_OKUMA_ETIKET = ['XS', 'S', 'M', 'L', 'XL'];
let aktifNotOkumaIdx = parseInt(localStorage.getItem('notOkumaFs') || '2');

function notOkumaFsBoyutDegistir(yon) {
  aktifNotOkumaIdx = Math.max(0, Math.min(NOT_OKUMA_ADIM.length - 1, aktifNotOkumaIdx + yon));
  localStorage.setItem('notOkumaFs', aktifNotOkumaIdx);
  _notOkumaFsUygula();
}

function _notOkumaFsUygula() {
  const boyut = NOT_OKUMA_ADIM[aktifNotOkumaIdx];
  document.documentElement.style.setProperty('--not-okuma-fs', boyut + 'px');
  const etiket = NOT_OKUMA_ETIKET[aktifNotOkumaIdx];
  document.querySelectorAll('#not-okuma-fs-goster').forEach(g => g.textContent = etiket);
  const fsEl = document.getElementById('not-fs-goster');
  if (fsEl) fsEl.textContent = boyut + 'px';
}

_notOkumaFsUygula();

// ════════════════════════════════════════
//  NOTLAR YAZI BOYUTU
// ════════════════════════════════════════
const NOTLAR_BOYUT_ADIM = [13, 15, 17, 20, 24];
const NOTLAR_BOYUT_ETIKET = ['XS', 'S', 'M', 'L', 'XL'];
let aktifNotlarBoyut = parseInt(localStorage.getItem('notlarYaziBoyut') || '1');

function notlarYaziBoyutuDegistir(yon) {
  aktifNotlarBoyut = Math.max(0, Math.min(NOTLAR_BOYUT_ADIM.length - 1, aktifNotlarBoyut + yon));
  localStorage.setItem('notlarYaziBoyut', aktifNotlarBoyut);
  _notlarBoyutUygula();
}

function _notlarBoyutUygula() {
  const boyut = NOTLAR_BOYUT_ADIM[aktifNotlarBoyut];
  document.documentElement.style.setProperty('--notlar-fs', boyut + 'px');
  const g = document.getElementById('notlar-yazi-goster');
  if (g) g.textContent = NOTLAR_BOYUT_ETIKET[aktifNotlarBoyut];
}

// Sayfa açılınca uygula
_notlarBoyutUygula();

function notlarEkraniRender(){
  const liste  = document.getElementById('notlar-liste');
  const bosMsg = document.getElementById('notlar-bos');
  liste.innerHTML = '';

  const notlar = {};

  // Eski tek not sistemi (t_ ve d_)
  for(let key in localStorage){
    const m = key.match(/^([td])_(\d+)_(\d+)$/);
    if(!m) continue;
    const tip=m[1], sNo=parseInt(m[2]), aNo=parseInt(m[3]);
    const k=sNo+':'+aNo;
    if(!notlar[k]) notlar[k]={sNo,aNo,notListesi:[]};
    notlar[k][tip]=localStorage.getItem(key);
  }

  // Yeni çoklu not sistemi (an_)
  for(let key in localStorage){
    const m = key.match(/^an_(\d+)_(\d+)$/);
    if(!m) continue;
    const sNo=parseInt(m[1]), aNo=parseInt(m[2]);
    const k=sNo+':'+aNo;
    if(!notlar[k]) notlar[k]={sNo,aNo};
    try {
      notlar[k].notListesi = JSON.parse(localStorage.getItem(key)) || [];
    } catch(e) { notlar[k].notListesi = []; }
  }

  const anahtarlar=Object.keys(notlar);
  if(anahtarlar.length===0){ bosMsg.style.display='block'; return; }
  bosMsg.style.display='none';

  const sureGruplari={};
  anahtarlar.forEach(k=>{
    const n=notlar[k];
    if(!sureGruplari[n.sNo]) sureGruplari[n.sNo]=[];
    sureGruplari[n.sNo].push(n);
  });

  Object.keys(sureGruplari).map(Number).sort((a,b)=>a-b).forEach(sNo=>{
    const sure=SURELER[sNo-1];
    if(!sure) return;
    const ayetler=sureGruplari[sNo].sort((a,b)=>a.aNo-b.aNo);

    const grup=document.createElement('div');
    grup.className='notlar-sure-grup';

    const baslik=document.createElement('div');
    baslik.className='notlar-sure-baslik';
    baslik.onclick=()=>grup.classList.toggle('open');
    baslik.innerHTML=`
      <div class="notlar-sure-no">${sNo}</div>
      <div class="notlar-sure-isim">${sure.isim}</div>
      <span class="notlar-sure-sayi">${ayetler.length} not</span>
      <span class="notlar-sure-chevron">▾</span>`;
    grup.appendChild(baslik);

    const ic=document.createElement('div');
    ic.className='notlar-sure-ic';

    const tematikler=TEMATIK[sNo]||[];
    const konuSirasi=[];
    const konuGruplari={};

    ayetler.forEach(n=>{
      let konuAdi='Diğer';
      for(const b of tematikler){
        if(n.aNo>=b.bas && n.aNo<=b.bit){ konuAdi=b.konu; break; }
      }
      if(!konuGruplari[konuAdi]){
        konuGruplari[konuAdi]=[];
        konuSirasi.push(konuAdi);
      }
      konuGruplari[konuAdi].push(n);
    });

    konuSirasi.forEach(konuAdi=>{
      const konuNolar=konuGruplari[konuAdi];

      const konuGrup=document.createElement('div');
      konuGrup.className='notlar-konu-grup';

      const konuBas=document.createElement('div');
      konuBas.className='notlar-konu-baslik';
      konuBas.onclick=()=>konuGrup.classList.toggle('open');
      konuBas.innerHTML=`
        <span class="notlar-konu-ikon">📂</span>
        <span class="notlar-konu-metin">${konuAdi}</span>
        <span class="notlar-konu-sayi">${konuNolar.length}</span>
        <span class="notlar-konu-chevron">▾</span>`;
      konuGrup.appendChild(konuBas);

      const konuIc=document.createElement('div');
      konuIc.className='notlar-konu-ic';

      konuNolar.forEach(n=>{
        const kart=document.createElement('div');
        kart.className='notlar-ayet-kart';
        // Not içerikleri kapalı başlar
        let kartAcik = false;

        const ayBas=document.createElement('div');
        ayBas.className='notlar-ayet-baslik';
        ayBas.style.cursor = 'pointer';

        const noCircle=document.createElement('div');
        noCircle.className='notlar-ayet-no';
        noCircle.textContent=n.aNo;

        // Ayet ismine tıklayınca modal açılır
        const arOniz=document.createElement('div');
        arOniz.className='notlar-ayet-ar';
        arOniz.style.cursor = 'pointer';
        arOniz.title = sure.isim + ' ' + sNo + ':' + n.aNo + ' — Âyeti görüntüle';
        const ck=sNo+':'+n.aNo;
        arOniz.textContent=onizlemeCache[ck]?onizlemeCache[ck].ar.substring(0,40)+'…':'← ' + sure.isim + ' ' + sNo + ':' + n.aNo + ' →';
        arOniz.onclick=()=>ayetDetayAc(sNo,n.aNo);

        // Hover efekti
        arOniz.addEventListener('mouseenter', () => { arOniz.style.opacity = '0.7'; });
        arOniz.addEventListener('mouseleave', () => { arOniz.style.opacity = '1'; });

        const gitBtn=document.createElement('button');
        gitBtn.className='notlar-git-btn';
        gitBtn.textContent='→ Git';
        gitBtn.onclick=()=>ayetDetayAc(sNo,n.aNo);

        ayBas.appendChild(noCircle); ayBas.appendChild(arOniz); ayBas.appendChild(gitBtn);
        kart.appendChild(ayBas);

        // Not metinleri — kapalı başlar, ayBas tıklanınca açılır
        const notlarIc = document.createElement('div');
        notlarIc.className = 'notlar-icerik-wrap'; // gizli başlar
        ayBas.onclick = () => {
          kartAcik = !kartAcik;
          notlarIc.style.display = kartAcik ? 'block' : 'none';
          ayBas.querySelector('.notlar-ayet-chevron').textContent = kartAcik ? '▾' : '›';
        };

        // Yeni çoklu not sistemi — klasör görünümü
        if (n.notListesi && n.notListesi.length > 0) {
          n.notListesi.forEach((not, ni) => {
            const blok = document.createElement('div');
            blok.className = 'notlar-not-blok';
            blok.style.cssText = 'cursor:pointer;';

            const etiket = document.createElement('div');
            etiket.className = 'notlar-not-etiket';
            etiket.style.cssText = 'display:flex;align-items:center;gap:6px;';
            const ikon = document.createElement('span');
            ikon.textContent = '📁';
            ikon.style.fontSize = '14px';
            const isimSpan = document.createElement('span');
            isimSpan.textContent = not.isim || ('Klasör ' + (ni + 1));
            etiket.appendChild(ikon);
            etiket.appendChild(isimSpan);

            const metin = document.createElement('div');
            metin.className = 'notlar-not-metin';
            metin.style.display = 'none';
            metin.appendChild(atifMetniParsele(not.icerik || ''));

            etiket.onclick = () => {
              const acik = metin.style.display === 'none';
              metin.style.display = acik ? 'block' : 'none';
              ikon.textContent = acik ? '📂' : '📁';
            };

            blok.appendChild(etiket);
            blok.appendChild(metin);
            notlarIc.appendChild(blok);
          });
        }

        // Eski tek not sistemi (geriye dönük uyumluluk)
        if(n.t){
          const blok=document.createElement('div');
          blok.className='notlar-not-blok';
          blok.style.cssText='cursor:pointer;';
          const etiket = document.createElement('div');
          etiket.className = 'notlar-not-etiket';
          etiket.style.cssText='display:flex;align-items:center;gap:6px;';
          const ikon2 = document.createElement('span');
          ikon2.textContent = '📁';
          ikon2.style.fontSize = '14px';
          const isimSpan2 = document.createElement('span');
          isimSpan2.textContent = 'Not';
          etiket.appendChild(ikon2);
          etiket.appendChild(isimSpan2);
          const metin = document.createElement('div');
          metin.className = 'notlar-not-metin';
          metin.style.display = 'none';
          metin.appendChild(atifMetniParsele(n.t));
          etiket.onclick = () => {
            const acik = metin.style.display === 'none';
            metin.style.display = acik ? 'block' : 'none';
            ikon2.textContent = acik ? '📂' : '📁';
          };
          blok.appendChild(etiket);
          blok.appendChild(metin);
          notlarIc.appendChild(blok);
        }

        kart.appendChild(notlarIc);
        // Chevron ekle
        const chevEl = document.createElement('span');
        chevEl.className = 'notlar-ayet-chevron';
        chevEl.textContent = '›';
        chevEl.style.cssText = 'margin-left:auto;color:var(--muted);font-size:14px;';
        ayBas.appendChild(chevEl);

        konuIc.appendChild(kart);
      });

      konuGrup.appendChild(konuIc);
      ic.appendChild(konuGrup);
    });

    grup.appendChild(ic);
    liste.appendChild(grup);
  });
}

// ════════════════════════════════════════
//  OKUNANLAR
// ════════════════════════════════════════
const ONERILEN_SURELER = [36,49,48,55,78,56,67,62];

function okunanlarRender(){
  const wrap = document.getElementById('okunanlar-ic');
  wrap.innerHTML = '';

  // ── FAVORİLER KLASÖRÜ ──────────────────────────────────────
  const favKlasör = document.createElement('div');
  favKlasör.className = 'okun-klasor open';

  const favHdr = document.createElement('div');
  favHdr.className = 'okun-klasor-hdr';
  const favSayisi = _favoriListesiGetir().length;
  favHdr.innerHTML = '<span class="okun-kl-ikon">⭐</span><span class="okun-kl-baslik">Favori Âyetler' + (favSayisi > 0 ? ' (' + favSayisi + ')' : '') + '</span><span class="okun-kl-chev">▾</span>';
  favHdr.onclick = () => { favKlasör.classList.toggle('open'); };

  const favIc = document.createElement('div');
  favIc.className = 'okun-klasor-ic';
  favIc.id = 'favori-klasor-ic';
  _favorilerRender(favIc);

  favKlasör.appendChild(favHdr);
  favKlasör.appendChild(favIc);
  wrap.appendChild(favKlasör);

  // ── ÖNERİLEN SURELER ──────────────────────────────────────
  const onKlasör = document.createElement('div');
  onKlasör.className = 'okun-klasor open';

  const onHdr = document.createElement('div');
  onHdr.className = 'okun-klasor-hdr';
  onHdr.innerHTML = '<span class="okun-kl-ikon">✦</span><span class="okun-kl-baslik">Önerilen Sûreler</span><span class="okun-kl-chev">▾</span>';
  onHdr.onclick = () => { onKlasör.classList.toggle('open'); };

  const onIc = document.createElement('div');
  onIc.className = 'okun-klasor-ic';

  ONERILEN_SURELER.forEach(sNo => {
    onIc.appendChild(okununSureKart(sNo, false));
  });

  onKlasör.appendChild(onHdr);
  onKlasör.appendChild(onIc);
  wrap.appendChild(onKlasör);

  // ── OKUDUKLARIM ──────────────────────────────────────────
  const okKlasör = document.createElement('div');
  okKlasör.className = 'okun-klasor open';

  const okHdr = document.createElement('div');
  okHdr.className = 'okun-klasor-hdr';
  okHdr.innerHTML = '<span class="okun-kl-ikon">📖</span><span class="okun-kl-baslik">Okuduklarım</span><span class="okun-kl-chev">▾</span>';
  okHdr.onclick = () => { okKlasör.classList.toggle('open'); };

  const okIc = document.createElement('div');
  okIc.className = 'okun-klasor-ic';

  const okunanlar = getOkunanlar();
  if(okunanlar.length === 0){
    okIc.innerHTML = '<div style="padding:16px 14px;color:var(--muted);font-size:13px;">Henüz sure eklemediniz.</div>';
  } else {
    okunanlar.forEach(entry => {
      okIc.appendChild(okununSureKart(entry.sNo, true, entry));
    });
  }

  okKlasör.appendChild(okHdr);
  okKlasör.appendChild(okIc);
  wrap.appendChild(okKlasör);

  const form = document.createElement('div');
  form.className = 'okun-form';
  form.innerHTML = `
    <div class="okun-form-baslik">📚 Okunan Sure Ekle</div>
    <div class="form-row" style="margin-bottom:8px">
      <select class="finput" id="okun-sure-sec">
        <option value="">Sure seçin…</option>
        ${SURELER.map((s,i)=>`<option value="${i+1}">${i+1}. ${s.isim}</option>`).join('')}
      </select>
    </div>
    <div class="form-row" style="margin-bottom:8px">
      <input class="finput" id="okun-son-ayet" type="number" min="1" placeholder="Son okunan âyet (opsiyonel)">
    </div>
    <button class="fkaydet" onclick="okunanEkle()">✦ Ekle</button>
  `;
  wrap.appendChild(form);
}

function okununSureKart(sNo, silinebilir, entry){
  const sure = SURELER[sNo-1];
  const kart = document.createElement('div');
  kart.className = 'okun-sure-kart';
  kart.style.cssText = 'flex-direction:column;align-items:stretch;gap:0;padding:0;overflow:hidden;';

  // Üst satır — sure bilgisi
  const ustSatir = document.createElement('div');
  ustSatir.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer;';

  const sol = document.createElement('div');
  sol.className = 'okun-sure-sol';

  const noEl = document.createElement('div');
  noEl.className = 'okun-sure-no';
  noEl.textContent = sNo;

  const bilgi = document.createElement('div');
  bilgi.className = 'okun-sure-bilgi';

  const isim = document.createElement('div');
  isim.className = 'okun-sure-isim';
  isim.textContent = sure.isim;

  const meta = document.createElement('div');
  meta.className = 'okun-sure-meta';
  let metaText = sure.ayet + ' âyet · ' + sure.tip;
  if(entry && entry.sonAyet) metaText += ' · ' + entry.sonAyet + '. âyete kadar';
  if(entry && entry.tarih) metaText += ' · ' + entry.tarih;
  meta.textContent = metaText;

  bilgi.appendChild(isim); bilgi.appendChild(meta);
  sol.appendChild(noEl); sol.appendChild(bilgi);

  const aksiyonlar = document.createElement('div');
  aksiyonlar.className = 'okun-aksiyonlar';

  const devamBtn = document.createElement('button');
  devamBtn.className = 'okun-devam-btn';
  devamBtn.textContent = '▶ Oku';
  devamBtn.onclick = (e) => {
    e.stopPropagation();
    const bas = (entry && entry.sonAyet) ? entry.sonAyet : 1;
    kumeOkuDirekt({ konu: sure.isim, sure: sNo, bas: bas, bit: sure.ayet });
  };
  aksiyonlar.appendChild(devamBtn);

  if(silinebilir){
    const silBtn = document.createElement('button');
    silBtn.className = 'okun-sil-btn';
    silBtn.textContent = 'Sil';
    silBtn.onclick = (e) => { e.stopPropagation(); okunanSil(sNo); };
    aksiyonlar.appendChild(silBtn);
  }

  // Genişlet/Daralt oku
  const chevEl = document.createElement('span');
  chevEl.textContent = '›';
  chevEl.style.cssText = 'font-size:18px;color:var(--muted);transition:transform 0.2s;margin-left:4px;';

  ustSatir.appendChild(sol);
  ustSatir.appendChild(aksiyonlar);
  ustSatir.appendChild(chevEl);
  kart.appendChild(ustSatir);

  // Ayet listesi — genişletilebilir
  const ayetListeWrap = document.createElement('div');
  ayetListeWrap.style.cssText = 'display:none;border-top:1px solid var(--border);background:var(--paper2);';

  let yuklendi = false;

  ustSatir.onclick = () => {
    const acik = ayetListeWrap.style.display !== 'none';
    ayetListeWrap.style.display = acik ? 'none' : 'block';
    chevEl.style.transform = acik ? '' : 'rotate(90deg)';
    if (!yuklendi && !acik) {
      yuklendi = true;
      _sureAyetleriniYukle(sNo, ayetListeWrap);
    }
  };

  kart.appendChild(ayetListeWrap);
  return kart;
}

function _sureAyetleriniYukle(sNo, wrap) {
  wrap.innerHTML = '<div style="padding:12px 14px;color:var(--muted);font-size:12px;text-align:center;"><span class="spin" style="display:inline-block;margin-right:6px;"></span>Âyetler yükleniyor…</div>';

  _okuyanSureAl(sNo).then(okuyanAyetler => {
    _kurancilarArAl(sNo).then(arData => {
      wrap.innerHTML = '';

      if (!okuyanAyetler || okuyanAyetler.length === 0) {
        wrap.innerHTML = '<div style="padding:12px 14px;color:var(--rust);font-size:12px;">Yüklenemedi.</div>';
        return;
      }

      okuyanAyetler.forEach((ay, i) => {
        const aNo = ay.verse_number || (i + 1);
        const arAyet = arData ? arData.find(a => a.verse === aNo) : null;
        const arMetin = arAyet ? arAyet.arabic : '';
        const mealMetin = ay.translation ? (ay.translation.text || '') : '';
        const dipnotlar = ay.translation ? (ay.translation.footnotes || []) : [];

        // Cache'e yaz
        const ck = sNo + ':' + aNo;
        if (!onizlemeCache[ck]) onizlemeCache[ck] = { ar: arMetin, meal: mealMetin, dipnotlar };

        const ayetBlok = document.createElement('div');
        ayetBlok.style.cssText = 'padding:10px 14px;border-bottom:1px solid var(--border);';

        // Arapça metin
        const arDiv = document.createElement('div');
        arDiv.style.cssText = 'font-family:var(--ar-font);font-size:20px;color:var(--ink);direction:rtl;text-align:right;line-height:2;margin-bottom:8px;';
        arDiv.textContent = arMetin;
        ayetBlok.appendChild(arDiv);

        // Meal — dipnot numaralı
        const mealDiv = document.createElement('div');
        mealDiv.style.cssText = 'font-family:"Source Serif 4",serif;font-size:13px;color:var(--text);line-height:1.7;margin-bottom:8px;';
        const noSpan = document.createElement('span');
        noSpan.style.cssText = 'font-size:10px;font-weight:700;color:var(--gold);margin-right:4px;';
        noSpan.textContent = aNo + '.';
        mealDiv.appendChild(noSpan);

        if (dipnotlar.length > 0) {
          mealMetin.split(/(\[\d+\])/g).forEach(parca => {
            const m = parca.match(/^\[(\d+)\]$/);
            if (m) {
              const link = document.createElement('button');
              link.className = 'dipnot-ref-btn';
              link.textContent = '[' + m[1] + ']';
              link.onclick = (e) => { e.stopPropagation(); _dipnotToggle(sNo, aNo, parseInt(m[1])); };
              mealDiv.appendChild(link);
            } else if (parca) {
              mealDiv.appendChild(document.createTextNode(parca));
            }
          });
        } else {
          mealDiv.appendChild(document.createTextNode(mealMetin));
        }
        ayetBlok.appendChild(mealDiv);

        // Dipnot kutuları
        if (dipnotlar.length > 0) {
          const dipWrap = document.createElement('div');
          dipWrap.id = 'dipnot-wrap-' + sNo + '_' + aNo;
          dipnotlar.forEach(dn => {
            const kutu = document.createElement('div');
            kutu.className = 'dipnot-kutu';
            kutu.id = 'dipnot-' + sNo + '_' + aNo + '_' + dn.number;
            kutu.style.cssText = 'display:none;background:var(--paper2);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:10px 12px;margin:4px 0;font-size:12px;color:var(--ink);line-height:1.7;';
            const numSpan = document.createElement('span');
            numSpan.style.cssText = 'font-weight:700;color:var(--gold);margin-right:6px;';
            numSpan.textContent = '[' + dn.number + ']';
            kutu.appendChild(numSpan);
            kutu.appendChild(atifMetniParsele(dn.text || ''));
            dipWrap.appendChild(kutu);
          });
          ayetBlok.appendChild(dipWrap);
        }

        // Buton satırı — Müellif + İlişkili Âyet dahil
        ayetBlok.appendChild(ayetButonSatiri(sNo, aNo));
        ayetBlok.appendChild(notAlaniOlustur(sNo, aNo, 'okunanlar'));

        wrap.appendChild(ayetBlok);
      });
    });
  }).catch(() => {
    wrap.innerHTML = '<div style="padding:12px 14px;color:var(--rust);font-size:12px;">Bağlantı hatası.</div>';
  });
}

function getOkunanlar(){
  try { return JSON.parse(localStorage.getItem('okunanlar')||'[]'); } catch(e){ return []; }
}

function okunanEkle(){
  const sNoStr = document.getElementById('okun-sure-sec').value;
  const sonAyet = parseInt(document.getElementById('okun-son-ayet').value)||0;
  if(!sNoStr){ alert('Lütfen bir sure seçin.'); return; }
  const sNo = parseInt(sNoStr);
  const liste = getOkunanlar();
  const mevcut = liste.findIndex(e => e.sNo === sNo);
  const entry = { sNo, sonAyet: sonAyet||0, tarih: new Date().toLocaleDateString('tr-TR') };
  if(mevcut >= 0) liste[mevcut] = entry;
  else liste.push(entry);
  localStorage.setItem('okunanlar', JSON.stringify(liste));
  okunanlarRender();
}

function okunanSil(sNo){
  if(!confirm('Bu sure listeden çıkarılsın mı?')) return;
  const liste = getOkunanlar().filter(e => e.sNo !== sNo);
  localStorage.setItem('okunanlar', JSON.stringify(liste));
  okunanlarRender();
}

function kumeOkuDirekt(k, _tumAyetler) {
  const sure = SURELER[k.sure - 1];
  const ekran = document.getElementById('okuma-ic');
  const _ayetAraliklari = _tumAyetler || k.ayetler || [{ sure: k.sure, bas: k.bas, bit: k.bit }];

  const kumeId = k.konu + '|' + _ayetAraliklari.length;
  const yenidenKur = ekran.dataset.kumeId !== kumeId;

  if (yenidenKur) {
    ekran.innerHTML = '';
    ekran.dataset.kumeId = kumeId;

    const baslikDiv = document.createElement('div');
    baslikDiv.className = 'okuma-baslik';
    baslikDiv.textContent = k.konu;

    const refDiv = document.createElement('div');
    refDiv.className = 'okuma-ref';
    refDiv.textContent = _ayetAraliklari.length > 1
      ? _ayetAraliklari.length + ' farklı aralık'
      : (sure ? sure.isim : 'Sûre') + ' ' + k.sure + ':' + k.bas + '–' + k.bit;

    const yerImiKey = 'yerimi_kume_' + k.konu.replace(/\s/g, '_');
    const mevcutYerImi = localStorage.getItem(yerImiKey);
    const yerImiBtn = document.createElement('button');
    yerImiBtn.style.cssText = 'display:block;width:calc(100% - 24px);margin:0 12px 10px;padding:9px;background:var(--paper);border:1.5px solid var(--border);border-radius:9px;font-family:"Source Serif 4",serif;font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;text-align:left;';
    yerImiBtn.innerHTML = mevcutYerImi ? '🔖 ' + mevcutYerImi : '🔖 Yer imi yok';
    if (mevcutYerImi) { yerImiBtn.style.borderColor = 'var(--gold)'; yerImiBtn.style.color = 'var(--gold)'; }
    yerImiBtn.onclick = () => {
      const yeni = prompt('Yer imi notu (örn: Nisâ 45. âyete kadar)', mevcutYerImi || '');
      if (yeni !== null) {
        localStorage.setItem(yerImiKey, yeni.trim());
        yerImiBtn.innerHTML = yeni.trim() ? '🔖 ' + yeni.trim() : '🔖 Yer imi yok';
        yerImiBtn.style.borderColor = yeni.trim() ? 'var(--gold)' : 'var(--border)';
        yerImiBtn.style.color = yeni.trim() ? 'var(--gold)' : 'var(--muted)';
      }
    };

    ekran.appendChild(baslikDiv);
    ekran.appendChild(refDiv);

    // ── Katmanlı Okuma Mod Butonları ──
    const modBar = document.createElement('div');
    modBar.id = 'katmanli-mod-bar';
    modBar.style.cssText = 'display:flex;gap:6px;padding:0 12px 10px;';
    const modlar = [
      { id:'hafiza',   ikon:'🕌', lbl:'Hafıza',  aciklama:'Sadece Arapça' },
      { id:'anlama',   ikon:'📖', lbl:'Anlama',   aciklama:'Arapça + Meal + Not' },
      { id:'derinlik', ikon:'🔬', lbl:'Derinlik', aciklama:'Tam görünüm' },
      { id:'mealler',  ikon:'📚', lbl:'Mealler',  aciklama:'Tüm mealler karşılaştırmalı' },
    ];
    const aktifMod = localStorage.getItem('okumaMod') || 'derinlik';
    modlar.forEach(m => {
      const btn = document.createElement('button');
      btn.dataset.mod = m.id;
      btn.title = m.aciklama;
      btn.style.cssText = 'flex:1;padding:7px 4px;border-radius:10px;border:1.5px solid var(--border);font-size:11px;font-weight:700;cursor:pointer;transition:all 0.15s;font-family:"Source Serif 4",serif;';
      btn.innerHTML = m.ikon + ' ' + m.lbl;
      if (m.id === aktifMod) {
        btn.style.background = 'var(--gold)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--gold)';
      } else {
        btn.style.background = 'var(--paper)';
        btn.style.color = 'var(--muted)';
      }
      btn.onclick = () => {
        localStorage.setItem('okumaMod', m.id);
        modBar.querySelectorAll('button').forEach(b => {
          b.style.background = 'var(--paper)';
          b.style.color = 'var(--muted)';
          b.style.borderColor = 'var(--border)';
        });
        btn.style.background = 'var(--gold)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--gold)';
        _okumaModUygula(m.id, ekran);
      };
      modBar.appendChild(btn);
    });
    ekran.appendChild(modBar);

    ekran.appendChild(yerImiBtn);

    // Çoklu aralık butonları — kalıcı, silinmez
    if (_ayetAraliklari.length > 1) {
      const arWrap = document.createElement('div');
      arWrap.id = 'kume-aralik-butonlar';
      arWrap.style.cssText = 'padding:4px 12px 10px;display:flex;flex-wrap:wrap;gap:6px;';

      _ayetAraliklari.forEach((ar, arIdx) => {
        const s = SURELER[ar.sure - 1];
        const arBtn = document.createElement('button');
        arBtn.dataset.arIdx = arIdx;
        arBtn.style.cssText = 'padding:5px 12px;background:' + (arIdx === 0 ? 'var(--gold)' : 'var(--paper2)') + ';color:' + (arIdx === 0 ? '#fff' : 'var(--ink)') + ';border:1px solid var(--border);border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;';
        arBtn.textContent = (s ? s.isim : ar.sure) + ' ' + ar.sure + ':' + ar.bas + '–' + ar.bit;
        arBtn.onclick = () => {
          arWrap.querySelectorAll('button').forEach(b => {
            b.style.background = 'var(--paper2)';
            b.style.color = 'var(--ink)';
          });
          arBtn.style.background = 'var(--gold)';
          arBtn.style.color = '#fff';
          _kumeAyetleriYukle(ar, ekran);
        };
        arWrap.appendChild(arBtn);
      });
      ekran.appendChild(arWrap);
    }
  }

  tabGec('okuma');
  _kumeAyetleriYukle({ sure: k.sure, bas: k.bas, bit: k.bit }, ekran);
}

function _kumeAyetleriYukle(aralik, ekran) {
  Array.from(ekran.children).forEach(el => {
    if (el.classList && (el.classList.contains('okuma-ayet-blok') || el.classList.contains('yukleniyor'))) {
      el.remove();
    }
  });

  const yukDiv = document.createElement('div');
  yukDiv.className = 'yukleniyor';
  yukDiv.innerHTML = '<div class="spin"></div>Âyetler yükleniyor…';
  ekran.appendChild(yukDiv);

  _okuyanSureAl(aralik.sure).then(okuyanAyetler => {
    _kurancilarArAl(aralik.sure).then(arData => {
      if (ekran.contains(yukDiv)) ekran.removeChild(yukDiv);

      if (!okuyanAyetler) {
        const hata = document.createElement('div');
        hata.style.cssText = 'text-align:center;padding:30px;color:var(--rust);';
        hata.textContent = 'Bağlantı hatası.';
        ekran.appendChild(hata);
        return;
      }

      for (let x = aralik.bas - 1; x < aralik.bit && x < okuyanAyetler.length; x++) {
        const ay = okuyanAyetler[x];
        const aNo = ay.verse_number || (x + 1);
        const arAyet = arData ? arData.find(a => a.verse === aNo) : null;
        const arMetin = arAyet ? arAyet.arabic : (ay.verse || '');
        const mealMetin = ay.translation ? (ay.translation.text || '') : '';
        const dipnotlar = ay.translation ? (ay.translation.footnotes || []) : [];

        const blok = document.createElement('div');
        blok.className = 'okuma-ayet-blok';
        blok.dataset.sno = aralik.sure;
        blok.dataset.ano = aNo;

        const arDiv = document.createElement('div');
        arDiv.className = 'okuma-arapca';
        arDiv.textContent = arMetin;

        const meDiv = document.createElement('div');
        meDiv.className = 'okuma-meal';
        const noSpan = document.createElement('span');
        noSpan.className = 'okuma-no';
        noSpan.textContent = aNo + '.';
        meDiv.appendChild(noSpan);

        // Dipnot numaralarını tıklanabilir yap
        if (dipnotlar.length > 0) {
          const parcalar = mealMetin.split(/(\[\d+\])/g);
          parcalar.forEach(parca => {
            const m = parca.match(/^\[(\d+)\]$/);
            if (m) {
              const dipNo = parseInt(m[1]);
              const link = document.createElement('button');
              link.className = 'dipnot-ref-btn';
              link.textContent = '[' + dipNo + ']';
              link.onclick = (e) => { e.stopPropagation(); _dipnotToggle(aralik.sure, aNo, dipNo); };
              meDiv.appendChild(link);
            } else if (parca) {
              meDiv.appendChild(document.createTextNode(parca));
            }
          });
        } else {
          meDiv.appendChild(document.createTextNode(mealMetin));
        }

        blok.appendChild(arDiv);
        blok.appendChild(meDiv);

        // Dipnot kutuları
        if (dipnotlar.length > 0) {
          const dipWrap = document.createElement('div');
          dipWrap.id = 'dipnot-wrap-' + aralik.sure + '_' + aNo;
          dipnotlar.forEach(dn => {
            const kutu = document.createElement('div');
            kutu.className = 'dipnot-kutu';
            kutu.id = 'dipnot-' + aralik.sure + '_' + aNo + '_' + dn.number;
            kutu.style.cssText = 'display:none;background:var(--paper2);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:10px 12px;margin:4px 0;font-size:12px;color:var(--ink);line-height:1.7;animation:fadeIn 0.15s ease;';
            const numSpan = document.createElement('span');
            numSpan.style.cssText = 'font-weight:700;color:var(--gold);margin-right:6px;';
            numSpan.textContent = '[' + dn.number + ']';
            kutu.appendChild(numSpan);
            kutu.appendChild(atifMetniParsele(dn.text || ''));
            dipWrap.appendChild(kutu);
          });
          blok.appendChild(dipWrap);
        }

        const btnSatirEl = ayetButonSatiri(aralik.sure, aNo);
        const notWrap = notAlaniOlustur(aralik.sure, aNo, 'okuma', 't');
        // Not Ekle butonunu aynı satıra ekle
        const notBtn = notWrap.querySelector('.inline-not-btn');
        if (notBtn) {
          notBtn.dataset.goster = 'derinlik';
          btnSatirEl.appendChild(notBtn);
        }
        blok.appendChild(btnSatirEl);
        ekran.appendChild(blok);

        const ck = aralik.sure + ':' + aNo;
        onizlemeCache[ck] = { ar: arMetin, meal: mealMetin, dipnotlar };
      }

      // Yükleme sonrası aktif modu uygula
      const aktifMod = localStorage.getItem('okumaMod') || 'derinlik';
      if (aktifMod !== 'derinlik') _okumaModUygula(aktifMod, ekran);
    });
  }).catch(() => {
    if (ekran.contains(yukDiv)) ekran.removeChild(yukDiv);
    const hata = document.createElement('div');
    hata.style.cssText = 'text-align:center;padding:30px;color:var(--rust);';
    hata.textContent = 'Bağlantı hatası.';
    ekran.appendChild(hata);
  });
}

// ════════════════════════════════════════
//  SURE BİLGİ VERİSİ
// ════════════════════════════════════════
// ════════════════════════════════════════
//  AYET BUTON SATIRI
// ════════════════════════════════════════
// ── Katmanlı Okuma Mod Uygulama ──
function _okumaModUygula(mod, ekran) {
  if (!ekran) ekran = document.getElementById('okuma-ic');

  // Mealler modu
  if (mod === 'mealler') {
    ekran.querySelectorAll('.okuma-ayet-blok').forEach(b => b.style.display = 'none');
    let mDiv = ekran.querySelector('.mealler-mod-div');
    if (mDiv) { mDiv.style.display = ''; return; }
    mDiv = document.createElement('div');
    mDiv.className = 'mealler-mod-div';
    mDiv.style.cssText = 'padding:8px 4px;';
    mDiv.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;"><div class="spin" style="margin:0 auto 10px;"></div>Mealler yükleniyor…</div>';
    ekran.appendChild(mDiv);

    const bloklar = ekran.querySelectorAll('.okuma-ayet-blok');
    const ayetler = [];
    bloklar.forEach(b => {
      const sNo = parseInt(b.dataset.sno);
      const aNo = parseInt(b.dataset.ano);
      if (sNo && aNo) ayetler.push({ sNo, aNo });
    });

    if (!ayetler.length) { mDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);">Ayet bulunamadı.</div>'; return; }

    Promise.all(ayetler.map(a =>
      Promise.all([
        fetch(`https://api.acikkuran.com/surah/${a.sNo}/verse/${a.aNo}/translations`).then(r=>r.json()).catch(()=>({data:[]})),
        _fawazAyetAl(a.sNo, a.aNo)
      ]).then(([acikData, diyanet]) => ({ sNo:a.sNo, aNo:a.aNo, ceviriler:acikData.data||[], diyanet }))
    )).then(sonuclar => {
      mDiv.innerHTML = '';
      sonuclar.forEach(({ sNo, aNo, ceviriler, diyanet }) => {
        const kart = document.createElement('div');
        kart.style.cssText = 'background:var(--paper);border-radius:14px;margin:8px 6px;overflow:hidden;box-shadow:0 1px 4px var(--shadow);';
        const baslik = document.createElement('div');
        baslik.style.cssText = 'padding:10px 14px 6px;font-family:"Source Serif 4",serif;font-size:12px;font-weight:700;color:var(--gold);border-bottom:1px solid var(--border);';
        baslik.textContent = (SURELER[sNo-1]?.isim || '') + ' ' + sNo + ':' + aNo;
        kart.appendChild(baslik);

        const istenilenIdler = CEVIRMEN_LISTESI.filter(c=>!c.harici).map(c=>c.id);
        const filtrelenmis = ceviriler.filter(c => istenilenIdler.includes(c.author?.id));
        const sirali = CEVIRMEN_LISTESI.filter(c=>!c.harici)
          .map(cm => filtrelenmis.find(c => c.author?.id === cm.id)).filter(Boolean);

        sirali.forEach((c, i) => {
          const satirDiv = document.createElement('div');
          satirDiv.style.cssText = 'padding:10px 14px;' + (i < sirali.length-1 ? 'border-bottom:1px solid var(--border);' : '');

          const yazarEl = document.createElement('div');
          yazarEl.style.cssText = 'font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;';
          yazarEl.textContent = c.author?.name || '';

          // Meal metni — dipnot sayılarını tıklanabilir yap
          const metinEl = document.createElement('div');
          metinEl.style.cssText = 'font-family:"Source Serif 4",serif;font-size:var(--tr-fs,14px);color:var(--ink);line-height:1.8;';
          const dipnotlar = c.footnotes || [];

          if (dipnotlar.length > 0) {
            // [1], [2] referanslarını tıklanabilir span'e çevir
            const metinHTML = (c.text || '').replace(/\[(\d+)\]/g, (m, num) => {
              return `<span class="meal-dipnot-ref" data-num="${num}" style="color:var(--gold);font-weight:700;cursor:pointer;font-size:0.85em;vertical-align:super;">[${num}]</span>`;
            });
            metinEl.innerHTML = metinHTML;

            // Dipnot container (gizli, açılır)
            const dipContainer = document.createElement('div');
            dipContainer.style.cssText = 'margin-top:6px;';

            dipnotlar.forEach(dn => {
              const dipDiv = document.createElement('div');
              dipDiv.dataset.dipNo = dn.number;
              dipDiv.style.cssText = 'display:none;background:var(--paper2);border-left:3px solid var(--gold);padding:8px 10px;border-radius:0 8px 8px 0;margin-bottom:4px;font-size:12px;color:var(--ink);line-height:1.7;';
              dipDiv.innerHTML = `<span style="font-weight:700;color:var(--gold);margin-right:5px;">[${dn.number}]</span>${dn.text || ''}`;
              dipContainer.appendChild(dipDiv);
            });

            satirDiv.appendChild(yazarEl);
            satirDiv.appendChild(metinEl);
            satirDiv.appendChild(dipContainer);

            // Dipnot ref tıklama
            metinEl.querySelectorAll('.meal-dipnot-ref').forEach(ref => {
              ref.addEventListener('click', (e) => {
                e.stopPropagation();
                const num = ref.dataset.num;
                const dipDiv = dipContainer.querySelector(`[data-dip-no="${num}"]`);
                if (dipDiv) dipDiv.style.display = dipDiv.style.display === 'none' ? 'block' : 'none';
              });
            });
          } else {
            metinEl.textContent = c.text || '';
            satirDiv.appendChild(yazarEl);
            satirDiv.appendChild(metinEl);
          }

          kart.appendChild(satirDiv);
        });
        mDiv.appendChild(kart);
      });
    }).catch(() => {
      mDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--rust);">Mealler yüklenemedi. İnternet bağlantısını kontrol edin.</div>';
    });
    return;
  }

  // Diğer modlarda mealler div'ini gizle
  const mDiv2 = ekran.querySelector('.mealler-mod-div');
  if (mDiv2) mDiv2.style.display = 'none';
  ekran.querySelectorAll('.okuma-ayet-blok').forEach(b => b.style.removeProperty('display'));

  ekran.querySelectorAll('.okuma-ayet-blok').forEach(blok => {
    const ar   = blok.querySelector('.okuma-arapca');
    const meal = blok.querySelector('.okuma-meal');
    const dip  = blok.querySelector('[id^="dipnot-wrap"]');

    blok.querySelectorAll('.ayet-ekstra-btn, .inline-not-btn').forEach(btn => {
      const goster = btn.dataset.goster || 'derinlik';
      btn.style.display = goster.includes(mod) ? '' : 'none';
    });

    const btnSatir = blok.querySelector('[style*="display:flex;gap:6px;margin:8px"]');

    if (mod === 'hafiza') {
      if (ar)       ar.style.display = '';
      if (meal)     meal.style.display = 'none';
      if (dip)      dip.style.display = 'none';
      if (btnSatir) btnSatir.style.display = 'none';
    } else if (mod === 'anlama') {
      if (ar)       ar.style.display = '';
      if (meal)     meal.style.display = '';
      if (dip)      dip.style.display = '';
      if (btnSatir) btnSatir.style.display = 'flex';
    } else {
      if (ar)       ar.style.removeProperty('display');
      if (meal)     meal.style.removeProperty('display');
      if (dip)      dip.style.removeProperty('display');
      if (btnSatir) btnSatir.style.removeProperty('display');
    }
  });
}

function ayetButonSatiri(sNo, aNo) {
  const satir = document.createElement('div');
  satir.style.cssText = 'display:flex;gap:6px;margin:8px 0 4px;flex-wrap:wrap;';

  // Favori butonu — yıldız
  const favBtn = document.createElement('button');
  favBtn.className = 'ayet-ekstra-btn';
  favBtn.id = 'fav-btn-' + sNo + '-' + aNo;
  favBtn.dataset.goster = 'derinlik'; // sadece derinlikte
  const _favMi = _ayetFavoriMi(sNo, aNo);
  favBtn.textContent = _favMi ? '⭐ Favori' : '☆ Favori';
  if (_favMi) { favBtn.style.background = 'var(--gold)'; favBtn.style.color = '#fff'; favBtn.style.borderColor = 'var(--gold)'; }
  favBtn.onclick = () => _favoriToggle(sNo, aNo);

  // Çeviriler butonu
  const cevBtn = document.createElement('button');
  cevBtn.className = 'ayet-ekstra-btn';
  cevBtn.dataset.goster = 'anlama derinlik'; // anlama ve derinlikte
  cevBtn.textContent = '📚 Çeviriler';
  cevBtn.onclick = () => cevirilerAc(sNo, aNo);

  // PDF Tefsir butonu
  // Notlar butonu
  const notlarBtn = document.createElement('button');
  notlarBtn.className = 'ayet-ekstra-btn';
  notlarBtn.id = 'notlar-modal-btn-' + sNo + '-' + aNo;
  notlarBtn.dataset.goster = 'derinlik';
  const notSayisi = ayetNotlariniGetir(sNo, aNo).length;
  notlarBtn.textContent = notSayisi > 0 ? '📂 Notlar (' + notSayisi + ')' : '📁 Notlar';
  notlarBtn.onclick = () => notlarModalAc(sNo, aNo);

  // Müellifler butonu
  const muellifBtn = document.createElement('button');
  muellifBtn.className = 'ayet-ekstra-btn';
  muellifBtn.id = 'muellifbtn-' + sNo + '-' + aNo;
  muellifBtn.dataset.goster = 'derinlik';
  const _jsonSayisi = _ayetIcinJsonTefsirler(sNo, aNo).length;
  const _muellifSayisi = _jsonTefsirKayitlariGetir().filter(k => parseInt(k.sure_no) === parseInt(sNo)).length;
  const _muellifLabel = _muellifSayisi > 0 ? '📝 Müellifler (' + _muellifSayisi + ')' : '📝 Müellifler';
  muellifBtn.textContent = _muellifLabel;
  if (_muellifSayisi > 0) { muellifBtn.style.borderColor = 'var(--teal)'; muellifBtn.style.color = 'var(--teal)'; }
  muellifBtn.onclick = () => muellifModalAc(sNo, aNo);

  // İlişkili Ayetler butonu
  const iliskiliBtn = document.createElement('button');
  iliskiliBtn.className = 'ayet-ekstra-btn';
  iliskiliBtn.id = 'iliskili-btn-' + sNo + '-' + aNo;
  iliskiliBtn.dataset.goster = 'anlama derinlik'; // anlama ve derinlikte
  const _iliskiliSayisi = iliskiliAyetleriGetir(sNo, aNo).length;
  iliskiliBtn.textContent = _iliskiliSayisi > 0 ? '🔗 İlişkili (' + _iliskiliSayisi + ')' : '🔗 İlişkili Âyet';
  if (_iliskiliSayisi > 0) { iliskiliBtn.style.borderColor = 'var(--teal)'; iliskiliBtn.style.color = 'var(--teal)'; iliskiliBtn.style.borderStyle = 'solid'; }
  iliskiliBtn.onclick = () => iliskiliAyetModalAc(sNo, aNo);

  satir.appendChild(favBtn);
  satir.appendChild(cevBtn);
  satir.appendChild(muellifBtn);
  satir.appendChild(iliskiliBtn);
  return satir;
}



// ════════════════════════════════════════
//  FAVORİ SİSTEMİ
// ════════════════════════════════════════
function _favoriListesiGetir() {
  try { return JSON.parse(localStorage.getItem('favori_ayetler') || '[]'); } catch(e) { return []; }
}

function _ayetFavoriMi(sNo, aNo) {
  return _favoriListesiGetir().some(f => f.sNo === sNo && f.aNo === aNo);
}

function _favoriToggle(sNo, aNo) {
  const liste = _favoriListesiGetir();
  const idx = liste.findIndex(f => f.sNo === sNo && f.aNo === aNo);
  const sure = SURELER[sNo - 1];

  if (idx >= 0) {
    liste.splice(idx, 1);
  } else {
    liste.push({
      sNo, aNo,
      sure: sure ? sure.isim : String(sNo),
      ar: sure ? sure.ar : '',
      tarih: new Date().toLocaleDateString('tr-TR')
    });
  }
  localStorage.setItem('favori_ayetler', JSON.stringify(liste));

  // Butonu güncelle
  const btn = document.getElementById('fav-btn-' + sNo + '-' + aNo);
  if (btn) {
    const favMi = idx < 0; // idx < 0 ise yeni eklendi
    btn.textContent = favMi ? '⭐ Favori' : '☆ Favori';
    btn.style.background = favMi ? 'var(--gold)' : '';
    btn.style.color = favMi ? '#fff' : '';
    btn.style.borderColor = favMi ? 'var(--gold)' : '';
  }

  // Okunanlar ekranı açıksa yenile
  const favWrap = document.getElementById('favori-klasor-ic');
  if (favWrap) _favorilerRender(favWrap);
}

function _favorilerRender(ic) {
  ic.innerHTML = '';
  const liste = _favoriListesiGetir();

  if (liste.length === 0) {
    ic.innerHTML = '<div style="padding:16px 14px;color:var(--muted);font-size:13px;">Henüz favori âyet eklemediniz.<br>Âyetlerin altındaki ☆ butonunu kullanın.</div>';
    return;
  }

  // Surelere göre grupla
  const gruplar = {};
  liste.forEach(f => {
    const key = f.sNo;
    if (!gruplar[key]) gruplar[key] = { sNo: f.sNo, sure: f.sure, ar: f.ar, ayetler: [] };
    gruplar[key].ayetler.push(f);
  });

  // Sure sırasına göre sırala
  Object.values(gruplar).sort((a, b) => a.sNo - b.sNo).forEach(grup => {
    const sureBlok = document.createElement('div');
    sureBlok.style.cssText = 'margin-bottom:10px;';

    // Sure başlığı
    const sureHdr = document.createElement('div');
    sureHdr.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 14px;background:var(--paper2);border-radius:10px 10px 0 0;border:1px solid var(--border);border-bottom:none;cursor:pointer;';
    sureHdr.innerHTML = `
      <div style="width:28px;height:28px;border-radius:7px;background:var(--gold);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;">${grup.sNo}</div>
      <div style="flex:1;">
        <div style="font-family:'Playfair Display',serif;font-size:14px;font-weight:600;color:var(--ink);">${grup.sure}</div>
        <div style="font-size:10px;color:var(--muted);">${grup.ayetler.length} favori âyet</div>
      </div>
      <div style="font-family:var(--ar-font);font-size:18px;color:var(--gold);">${grup.ar}</div>
    `;

    const ayetlerIc = document.createElement('div');
    ayetlerIc.style.cssText = 'border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px;overflow:hidden;';

    // Ayet kartları — ayet numarasına göre sırala
    grup.ayetler.sort((a, b) => a.aNo - b.aNo).forEach((f, idx) => {
      const ayetSatir = document.createElement('div');
      ayetSatir.style.cssText = 'padding:10px 14px;' + (idx < grup.ayetler.length - 1 ? 'border-bottom:1px solid var(--border);' : '') + 'background:var(--paper);';

      // Ayet ref + Arapça önizleme
      const refRow = document.createElement('div');
      refRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;';

      const refEl = document.createElement('div');
      refEl.style.cssText = 'font-size:12px;font-weight:700;color:var(--gold);';
      refEl.textContent = f.sure + ' ' + f.sNo + ':' + f.aNo;

      const arOniz = document.createElement('div');
      arOniz.style.cssText = 'font-family:var(--ar-font);font-size:15px;color:var(--ink);direction:rtl;';
      const ck = f.sNo + ':' + f.aNo;
      arOniz.textContent = onizlemeCache[ck] ? onizlemeCache[ck].ar.substring(0, 40) + '…' : '﴿ ' + f.sNo + ':' + f.aNo + ' ﴾';

      refRow.appendChild(refEl);
      refRow.appendChild(arOniz);
      ayetSatir.appendChild(refRow);

      // Meal önizleme
      if (onizlemeCache[ck] && onizlemeCache[ck].meal) {
        const mealEl = document.createElement('div');
        mealEl.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:8px;';
        mealEl.textContent = onizlemeCache[ck].meal.substring(0, 100) + (onizlemeCache[ck].meal.length > 100 ? '…' : '');
        ayetSatir.appendChild(mealEl);
      }

      // Buton satırı
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

      // Ayet detay butonu
      const detayBtn = document.createElement('button');
      detayBtn.style.cssText = 'padding:5px 10px;background:var(--ink);border:none;border-radius:6px;color:var(--gold2);font-size:11px;font-weight:700;cursor:pointer;';
      detayBtn.textContent = '▶ Ayet';
      detayBtn.onclick = () => ayetDetayAc(f.sNo, f.aNo);

      const cevBtn2 = document.createElement('button');
      cevBtn2.style.cssText = 'padding:5px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--ink);font-size:11px;cursor:pointer;';
      cevBtn2.textContent = '📚 Çeviriler';
      cevBtn2.onclick = () => cevirilerAc(f.sNo, f.aNo);

      const iliskiliBtn2 = document.createElement('button');
      iliskiliBtn2.style.cssText = 'padding:5px 10px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--ink);font-size:11px;cursor:pointer;';
      iliskiliBtn2.textContent = '🔗 İlişkili';
      iliskiliBtn2.onclick = () => iliskiliAyetModalAc(f.sNo, f.aNo);

      const silBtn = document.createElement('button');
      silBtn.style.cssText = 'padding:5px 10px;background:none;border:1px solid #f0c0b8;border-radius:6px;color:var(--rust);font-size:11px;cursor:pointer;margin-left:auto;';
      silBtn.textContent = '★ Çıkar';
      silBtn.onclick = () => _favoriToggle(f.sNo, f.aNo);

      btnRow.appendChild(detayBtn);
      btnRow.appendChild(cevBtn2);
      btnRow.appendChild(iliskiliBtn2);
      btnRow.appendChild(silBtn);
      ayetSatir.appendChild(btnRow);
      ayetlerIc.appendChild(ayetSatir);
    });

    sureHdr.onclick = () => {
      ayetlerIc.style.display = ayetlerIc.style.display === 'none' ? 'block' : 'none';
    };

    sureBlok.appendChild(sureHdr);
    sureBlok.appendChild(ayetlerIc);
    ic.appendChild(sureBlok);
  });

  // Toplam sayı
  const toplamEl = document.createElement('div');
  toplamEl.style.cssText = 'text-align:center;padding:10px;font-size:11px;color:var(--muted);';
  toplamEl.textContent = 'Toplam ' + liste.length + ' favori âyet · ' + Object.keys(gruplar).length + ' sûre';
  ic.appendChild(toplamEl);
}

// ════════════════════════════════════════
//  KAVRAM ARAMASI
// ════════════════════════════════════════
let kavramAramaTimer = null;
const kavramCache = {};

function kavramAramaGecikme(q) {
  clearTimeout(kavramAramaTimer);
  if (!q || q.trim().length < 2) {
    document.getElementById('kavram-sonuclar').innerHTML = '';
    return;
  }
  kavramAramaTimer = setTimeout(() => kavramAra(q), 400);
}

async function kavramAra(q) {
  q = q.trim();
  if (!q || q.length < 2) return;
  const el = document.getElementById('kavram-sonuclar');
  el.innerHTML = '<div class="yukleniyor"><div class="spin"></div>Aranıyor…</div>';

  if (kavramCache[q]) {
    _kavramRender(kavramCache[q], q, el);
    return;
  }

  try {
    const r = await fetch('https://api.acikkuran.com/search?q=' + encodeURIComponent(q) + '&author_id=107');
    const d = await r.json();
    const sonuclar = d.data || d.results || [];
    kavramCache[q] = sonuclar;
    _kavramRender(sonuclar, q, el);
  } catch(e) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--rust)">Arama başarısız. İnternet bağlantısını kontrol edin.</div>';
  }
}

function _kavramRender(sonuclar, q, el) {
  el.innerHTML = '';
  if (!sonuclar || sonuclar.length === 0) {
    el.innerHTML = '<div class="kavram-sonuc-info">Sonuç bulunamadı.</div>';
    return;
  }

  const info = document.createElement('div');
  info.className = 'kavram-sonuc-info';
  info.textContent = sonuclar.length + ' âyet bulundu';
  el.appendChild(info);

  sonuclar.slice(0, 30).forEach(item => {
    const verse = item.verse || item;
    const sNo = verse.surah_id || verse.surah?.id;
    const aNo = verse.verse_number || verse.id;
    if (!sNo || !aNo) return;

    const sure = SURELER[sNo - 1];
    const kart = document.createElement('div');
    kart.className = 'kavram-ayet-kart';
    kart.onclick = () => {
      tabGec('kuran');
      setTimeout(() => ayetDetayAc(sNo, aNo), 300);
    };

    const ref = document.createElement('div');
    ref.className = 'kavram-ref';
    ref.textContent = (sure ? sure.isim : 'Sûre ' + sNo) + ' · ' + sNo + ':' + aNo;

    const ar = document.createElement('div');
    ar.className = 'kavram-ar';
    ar.textContent = verse.verse || verse.arabic || '';

    const meal = document.createElement('div');
    meal.className = 'kavram-meal';
    const mealTxt = verse.translation?.text || verse.text || verse.meal || '';
    // Aranan kelimeyi vurgula
    if (mealTxt && q) {
      const regex = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      meal.innerHTML = mealTxt.replace(regex, '<span class="kavram-highlight">$1</span>');
    } else {
      meal.textContent = mealTxt;
    }

    kart.appendChild(ref);
    if (ar.textContent) kart.appendChild(ar);
    kart.appendChild(meal);
    el.appendChild(kart);
  });

  if (sonuclar.length > 30) {
    const more = document.createElement('div');
    more.className = 'kavram-sonuc-info';
    more.textContent = '+ ' + (sonuclar.length - 30) + ' sonuç daha — aramayı daraltın';
    el.appendChild(more);
  }
}



// ════════════════════════════════════════
//  PDF TEFSİR VERİTABANI — Gömülü JSON
