/* Stok Sayım & Kapıdan Teslimat — PROTOTİP
   Veriler bu cihazda (localStorage) tutulur. Gerçek sürümde: Supabase (login+veri) + yerel Netsis ajanı. */
'use strict';

/* ---------- Depolama ---------- */
const KEY = 'ys_stok_v1';
const DEFAULTS = {
  users: { sayim: { pass: '1234', rol: 'user', ad: 'Sayım Kullanıcısı' }, admin: { pass: 'admin123', rol: 'admin', ad: 'Yönetici' } },
  settings: {
    provider: 'demo', geminiKey: '', geminiModel: 'gemini-3.8-flash', claudeKey: '', claudeModel: 'claude-opus-5-5',
    depolar: ['Merkez Depo', 'Fittings Deposu', 'Sac Deposu', 'Açık Saha'],
    musteriler: [['120.01.001', 'DEMO İNŞAAT LTD. ŞTİ.'], ['120.01.002', 'ÖRNEK METAL SAN. TİC. A.Ş.'], ['120.01.003', 'TEST TESİSAT – AHMET YILMAZ'], ['120.01.004', 'PERAKENDE MÜŞTERİ']]
  },
  sayim: {}, teslimat: [], aiLog: [], seq: {}
};
let S;
function load() { try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  S = Object.assign(structuredClone(DEFAULTS), S); S.settings = Object.assign(structuredClone(DEFAULTS.settings), S.settings || {}); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {
  // kota dolarsa eski küçük resimleri at
  S.aiLog.forEach((r, i) => { if (i < S.aiLog.length - 30) delete r.thumb; });
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e2) { toast('Cihaz hafızası dolu – CSV dışa aktarıp kayıtları temizleyin'); } } }
let user = null;
try { user = JSON.parse(sessionStorage.getItem('ys_user')); } catch (e) {}

/* ---------- Ürün verisi ---------- */
let GROUPS = [], PRODUCTS = [], P_BY = {}, G_BY = {};
const REFS = {
  te: ['te-1', 'te-2', 'te-3'], flans: ['flans-1', 'flans-2'], kep: ['kep-1'],
  siyah_sac: ['siyah_sac-1', 'siyah_sac-2', 'siyah_sac-3', 'siyah_sac-4'], galv_sac: ['galv_sac-1', 'galv_sac-2', 'galv_sac-3']
};
const SAC = ['siyah_sac', 'galv_sac', 'al_sac', 'krom_sac', 'cati', 'rulo_sac'];
const UZUN = ['profil_siyah', 'profil_boyali', 'profil_galv', 'siyah_boru', 'galv_boru', 'sdm', 'dogalgaz', 'ozel_boru'];
const PARCA = ['te', 'dirsek', 'reduksiyon', 'kep', 'manson', 'kelepce', 'vana'];
function countHint(gid) {
  if (gid === 'flans') return 'Flanşlar dikey kolonlar halinde üst üste dizilidir. Her kolondaki flanşları kenar halkalarından tek tek say ve her flanşın görünen kenarına bir nokta koy. Kolonların üzerine el ile yazılmış sayıları (ör. "241 Adet") okunan_yazilar alanına yaz ama sayımına karıştırma.';
  if (SAC.includes(gid)) return 'Sac levhalar yan görünüşte üst üste istiflenmiştir. Her levhanın yan kenar çizgisini say; her kenar çizgisine (sol tarafına yakın) bir nokta koy. Alttaki palet, tahta veya karton sayılmaz.';
  if (UZUN.includes(gid)) return 'Boru/profil demetini uç (kesit) tarafından say; her boru veya profil ağzının merkezine bir nokta koy.';
  if (PARCA.includes(gid)) return 'Raftaki parçaları say; her parçanın görünen ağzına veya gövdesine bir nokta koy. Arka sıralarda kısmen görünenleri de say; hiç görünmeyenleri tahmin etme, not alanında belirt.';
  return 'Görünen her bir ürüne bir nokta koy.';
}

/* ---------- Yardımcılar ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ');
const fmt = n => (n == null || n === '') ? '–' : Number(n).toLocaleString('tr-TR');
const now = () => new Date().toISOString();
const dt = iso => new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
const normX = s => norm(s).replace(/\s*[x×*]\s*/g, 'x').replace(/\s*-\s*/g, ' ');
function match(p, q) { const n = ' ' + normX(p[1] + ' ' + p[0]);
  return normX(q).split(' ').filter(Boolean).every(t => { const i = n.indexOf(t); return i >= 0 && (/^\d/.test(t) ? new RegExp('(^|[^0-9,])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(n) : true); }); }
function csv(name, rows) {
  const body = rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- Basit gezinme ---------- */
const stack = [];
function go(fn, ...args) { stack.push([fn, args]); render(); }
function back() { if (stack.length > 1) { stack.pop(); render(); } }
function home() { stack.length = 0; go(vHome); }
function render() {
  const [fn, args] = stack[stack.length - 1]; window.scrollTo(0, 0);
  $('#btnBack').hidden = stack.length <= 1;
  $('#btnUser').hidden = !user; if (user) $('#btnUser').textContent = user.id + ' · çıkış';
  fn(...args);
}
function setTitle(t) { $('#title').textContent = t; }
const V = () => $('#view');

/* ---------- Giriş ---------- */
function vLogin() {
  setTitle('Stok Sayım – Giriş');
  V().innerHTML = `
  <div class="card">
    <h2>Giriş</h2>
    <label>Kullanıcı adı</label><input id="u" autocapitalize="none" autocomplete="username" placeholder="sayim veya admin">
    <label>Şifre</label><input id="p" type="password" autocomplete="current-password">
    <div class="btns"><button class="btn" id="go">Giriş yap</button></div>
  </div>
  <div class="alert warn small"><b>Prototip:</b> Şifre kontrolü bu cihazda yapılır, gerçek güvenlik sağlamaz. Canlı sürümde giriş bulut (Supabase) üzerinden yapılacak. Varsayılan: <code>sayim / 1234</code>, <code>admin / admin123</code></div>`;
  const doLogin = () => {
    const id = norm($('#u').value).trim(), u = S.users[id];
    if (!u || u.pass !== $('#p').value) return toast('Kullanıcı adı veya şifre hatalı');
    user = { id, rol: u.rol, ad: u.ad }; try { sessionStorage.setItem('ys_user', JSON.stringify(user)); } catch (e) {}
    home();
  };
  $('#go').onclick = doLogin; $('#p').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
}

/* ---------- Ana sayfa ---------- */
function vHome() {
  setTitle('Stok Sayım');
  const bekleyen = S.teslimat.filter(t => t.durum === 'etiket').length;
  V().innerHTML = `
  <p class="muted">Merhaba ${esc(user.ad)} · ${PRODUCTS.length.toLocaleString('tr-TR')} stok kartı, ${GROUPS.length} ürün grubu</p>
  <div class="grid">
    <button class="tile" id="t1"><span class="ic">📋</span><b>Stok Sayım</b><span class="muted small">Depo → grup → ürün</span></button>
    <button class="tile" id="t2"><span class="ic">🚚</span><b>Kapıdan Teslimat</b><span class="muted small">Müşteri → ürün → etiket</span></button>
    <button class="tile" id="t3"><span class="ic">📷</span><b>AI Sayım Testi</b><span class="muted small">Fotoğraftan adet + ürün doğrulama</span></button>
    <button class="tile" id="t4"><span class="ic">🏷️</span><b>Teslimatlar</b><span class="muted small">${bekleyen} etiket depoda bekliyor</span></button>
    ${user.rol === 'admin' ? `<button class="tile wide" id="t5"><span class="ic">⚙️</span><b>Yönetim</b><span class="muted small">Netsis fark raporu · AI başarı istatistiği · ayarlar</span></button>` : ''}
  </div>
  ${S.settings.provider === 'demo' ? `<div class="alert info small">AI şu an <b>DEMO</b> modunda (rastgele sonuç). Gerçek sayım için Yönetim → Ayarlar'dan Gemini veya Claude API anahtarı girin.</div>` : ''}`;
  $('#t1').onclick = () => go(vDepo, 'sayim'); $('#t2').onclick = () => go(vTeslimat, {});
  $('#t3').onclick = () => go(vPickGroup, { mode: 'test' }); $('#t4').onclick = () => go(vTeslimatList);
  if ($('#t5')) $('#t5').onclick = () => go(vAdmin, 'rapor');
}

/* ---------- Sayım: depo → grup → ürün ---------- */
function vDepo() {
  setTitle('Sayım – Depo seçin');
  V().innerHTML = `<h2>Depo seçin</h2><div class="list">${S.settings.depolar.map((d, i) => {
    const n = Object.keys(S.sayim[d] || {}).length;
    return `<button class="row" data-i="${i}"><div class="grow"><div class="name">${esc(d)}</div><div class="meta">${n} kalem sayıldı</div></div><span class="chev">›</span></button>`; }).join('')}</div>`;
  V().querySelectorAll('.row').forEach(b => b.onclick = () => go(vPickGroup, { mode: 'sayim', depo: S.settings.depolar[b.dataset.i] }));
}
function vPickGroup(ctx) {
  setTitle(ctx.mode === 'sayim' ? ctx.depo + ' – Ürün grubu' : ctx.mode === 'teslimat' ? 'Teslimat – Ürün grubu' : 'AI Test – Ürün grubu');
  const counted = ctx.mode === 'sayim' ? (S.sayim[ctx.depo] || {}) : {};
  V().innerHTML = `<h2>Ürün grubu seçin</h2>
  ${ctx.mode === 'test' ? `<div class="alert info small">Fotoğraf örneği olan gruplar 📷 ile işaretli. Önce bu gruplarla deneyin.</div>` : ''}
  <div class="list">${GROUPS.map(g => {
    const items = PRODUCTS.filter(p => p[2] === g.id), c = items.filter(p => counted[p[0]]).length;
    return `<button class="row" data-g="${g.id}"><div class="grow"><div class="name">${REFS[g.id] ? '📷 ' : ''}${esc(g.ad)}</div>
      <div class="meta">${items.length} ürün${ctx.mode === 'sayim' ? ` · ${c} sayıldı` : ''}</div>
      ${ctx.mode === 'sayim' ? `<div class="progress"><i style="width:${items.length ? c / items.length * 100 : 0}%"></i></div>` : ''}</div><span class="chev">›</span></button>`; }).join('')}</div>`;
  V().querySelectorAll('.row').forEach(b => b.onclick = () => go(vProducts, Object.assign({}, ctx, { gid: b.dataset.g })));
}
function vProducts(ctx) {
  const g = G_BY[ctx.gid], items = PRODUCTS.filter(p => p[2] === ctx.gid);
  setTitle(g.ad);
  const isSayim = ctx.mode === 'sayim', counted = isSayim ? (S.sayim[ctx.depo] = S.sayim[ctx.depo] || {}) : {};
  V().innerHTML = `<div class="search"><input id="q" type="search" placeholder="Ara: ölçü, kalınlık, kod… (ör. 40x40 2,00)" value="${esc(ctx.q || '')}"></div>
    ${isSayim ? `<p class="muted small">Kör sayım: Netsis miktarı sayım ekranında gösterilmez. Adet = ${'parça / boy / levha'}. 📷 ile fotoğraftan AI sayımı yapabilirsiniz.</p>` : ''}
    <div class="list" id="L"></div>`;
  const L = $('#L');
  const draw = () => {
    const q = $('#q').value; ctx.q = q;
    const list = (q ? items.filter(p => match(p, q)) : items).slice(0, 150);
    L.innerHTML = list.map(p => {
      const c = counted[p[0]];
      if (isSayim) return `<div class="row" data-c="${esc(p[0])}"><div class="grow"><div class="name">${esc(p[1])}</div><div class="meta">${esc(p[0])} · ${esc(p[3])}${p[4] ? '/' + esc(p[4]) : ''}${c && c.ai != null ? ` · AI: ${c.ai}` : ''}</div></div>
        <input class="qty ${c ? 'filled' : ''}" inputmode="numeric" pattern="[0-9]*" placeholder="adet" value="${c ? c.q : ''}"><button class="cam" title="Fotoğrafla say">📷</button></div>`;
      return `<button class="row" data-c="${esc(p[0])}"><div class="grow"><div class="name">${esc(p[1])}</div><div class="meta">${esc(p[0])} · ${esc(p[3])}${p[4] ? '/' + esc(p[4]) : ''}</div></div><span class="chev">›</span></button>`;
    }).join('') + (list.length === 150 ? `<p class="muted small">İlk 150 sonuç gösteriliyor, aramayı daraltın.</p>` : '') + (!list.length ? `<p class="muted">Sonuç yok.</p>` : '');
    L.querySelectorAll('.row').forEach(r => {
      const code = r.dataset.c;
      if (isSayim) {
        const inp = r.querySelector('.qty');
        inp.onchange = () => { const v = inp.value.trim();
          if (v === '') delete counted[code]; else counted[code] = Object.assign(counted[code] || {}, { q: Number(v.replace(',', '.')), t: now(), u: user.id });
          inp.classList.toggle('filled', v !== ''); save(); };
        r.querySelector('.cam').onclick = () => go(vAI, { mode: 'sayim', depo: ctx.depo, gid: ctx.gid, code });
      } else r.onclick = () => ctx.onPick ? ctx.onPick(code) : go(vAI, { mode: 'test', gid: ctx.gid, code });
    });
  };
  $('#q').oninput = draw; draw();
}

/* ---------- Kapıdan teslimat ---------- */
function vTeslimat(f) {
  setTitle('Kapıdan Teslimat');
  const cari = f.cari ? S.settings.musteriler.find(m => m[0] === f.cari) : null, p = f.code ? P_BY[f.code] : null;
  V().innerHTML = `
  <div class="card"><h3 style="margin-top:0">1 · Müşteri</h3>
    ${cari ? `<div class="row" id="cariSel"><div class="grow"><div class="name">${esc(cari[1])}</div><div class="meta">${esc(cari[0])}</div></div><span class="pill">değiştir</span></div>`
      : `<input id="cq" type="search" placeholder="Müşteri ara (ünvan veya cari kod)"><div class="list" id="CL" style="margin-top:8px;max-height:280px;overflow:auto"></div>`}
  </div>
  <div class="card"><h3 style="margin-top:0">2 · Ürün</h3>
    ${p ? `<div class="row" id="urSel"><div class="grow"><div class="name">${esc(p[1])}</div><div class="meta">${esc(p[0])} · ${esc(G_BY[p[2]].ad)}</div></div><span class="pill">değiştir</span></div>`
      : `<button class="btn sec" id="urPick">Ürün grubu ve ürün seç</button>`}
  </div>
  <div class="card"><h3 style="margin-top:0">3 · Miktar</h3>
    <label>Adet (${p ? esc(p[3]) : 'birim'})</label><input id="qty" inputmode="decimal" value="${f.qty || ''}" placeholder="0">
    <label>Not (opsiyonel)</label><input id="note" value="${esc(f.note || '')}" placeholder="Araç plakası, teslim alan…">
  </div>
  <div class="btns"><button class="btn" id="ok" ${cari && p ? '' : 'disabled'}>🏷️ Etiket bas & Netsis'e işle</button></div>
  <p class="muted small">Prototipte Netsis hareketi "kuyrukta" olarak simüle edilir; canlıda yerel ajan stok çıkış hareketini Netsis'e yazar.</p>`;
  const keep = () => { f.qty = $('#qty').value; f.note = $('#note').value; };
  if (cari) $('#cariSel').onclick = () => { keep(); f.cari = null; vTeslimat(f); };
  else { const draw = () => { const q = norm($('#cq').value);
      $('#CL').innerHTML = S.settings.musteriler.filter(m => !q || norm(m.join(' ')).includes(q)).slice(0, 60)
        .map(m => `<button class="row" data-k="${esc(m[0])}"><div class="grow"><div class="name">${esc(m[1])}</div><div class="meta">${esc(m[0])}</div></div></button>`).join('') || '<p class="muted">Müşteri bulunamadı</p>';
      $('#CL').querySelectorAll('.row').forEach(b => b.onclick = () => { keep(); f.cari = b.dataset.k; vTeslimat(f); }); };
    $('#cq').oninput = draw; draw(); }
  const pick = () => { keep(); go(vPickGroup, { mode: 'teslimat', onPick: code => { f.code = code; stack.splice(stack.length - 2, 2); render(); } }); };
  if (p) $('#urSel').onclick = pick; else $('#urPick').onclick = pick;
  // vPickGroup → vProducts zinciri onPick'i taşır
  $('#ok').onclick = () => {
    keep(); const q = Number(String(f.qty).replace(',', '.'));
    if (!(q > 0)) return toast('Geçerli bir adet girin');
    const d = new Date(), ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
    S.seq[ymd] = (S.seq[ymd] || 0) + 1;
    const rec = { no: `TS${ymd}-${String(S.seq[ymd]).padStart(3, '0')}`, t: now(), u: user.id, cari: cari[0], cariAd: cari[1], code: p[0], ad: p[1], birim: p[3], qty: q, note: f.note,
      durum: 'etiket', netsis: { durum: 'kuyrukta', t: now() } };
    S.teslimat.unshift(rec); save();
    stack.pop(); go(vLabel, rec.no, true);
  };
}
function labelHTML(r) {
  return `<div class="label"><div class="lq"><div class="qr" data-no="${esc(r.no)}"></div><div style="font-size:8pt">${esc(r.code)}</div></div>
    <div class="lt"><div class="no">${esc(r.no)}</div><div class="pn">${esc(r.ad)}</div><div class="cu">${esc(r.cariAd)}</div>
    <div style="font-size:8pt">${dt(r.t)} · ${esc(r.u)}</div><div class="qq">${fmt(r.qty)} ${esc(r.birim)}</div></div></div>`;
}
function fillQR(root, r) { root.querySelectorAll('.qr').forEach(el => { el.innerHTML = '';
  if (window.QRCode) new QRCode(el, { text: JSON.stringify({ no: r.no, k: r.code, a: r.qty, c: r.cari }), width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
  else el.textContent = r.no; }); }
function printLabel(r) { const pa = $('#print-area'); pa.innerHTML = labelHTML(r); fillQR(pa, r); setTimeout(() => window.print(), 300); }
function vLabel(no, auto) {
  const r = S.teslimat.find(t => t.no === no); setTitle('Etiket ' + no);
  V().innerHTML = `<div class="alert ok">Teslimat oluşturuldu. Netsis hareketi: <b>${r.netsis.durum}</b> (prototip)</div>
    <div style="display:flex;justify-content:center;margin:12px 0">${labelHTML(r)}</div>
    <div class="btns"><button class="btn" id="pr">🖨️ Etiketi yazdır</button></div>
    <div class="btns"><button class="btn sec" id="dv">📷 Depoda teslim et (foto ile doğrula)</button></div>
    <div class="btns"><button class="btn ghost" id="nw">Yeni teslimat</button></div>
    <p class="muted small">Etiket 100×60 mm. iPhone'dan AirPrint yazıcıya basılabilir; canlıda yerel ajan Zebra/ZPL yazıcıya doğrudan gönderecek.</p>`;
  fillQR(V(), r);
  $('#pr').onclick = () => printLabel(r);
  $('#dv').onclick = () => go(vAI, { mode: 'teslimat', no: r.no, gid: P_BY[r.code][2], code: r.code });
  $('#nw').onclick = () => { stack.pop(); go(vTeslimat, {}); };
  if (auto) setTimeout(() => printLabel(r), 400);
}
function vTeslimatList() {
  setTitle('Teslimatlar');
  const st = { etiket: ['Depoda bekliyor', 'warn'], teslim: ['Teslim edildi', 'ok'], iptal: ['İptal', 'bad'] };
  V().innerHTML = `<h2>Teslimatlar</h2>${S.teslimat.length ? '' : '<p class="muted">Henüz teslimat yok.</p>'}
  <div class="list">${S.teslimat.slice(0, 200).map(r => `<div class="row" data-no="${esc(r.no)}"><div class="grow"><div class="name">${esc(r.no)} · ${fmt(r.qty)} ${esc(r.birim)}</div>
    <div class="meta">${esc(r.ad)}<br>${esc(r.cariAd)} · ${dt(r.t)}${r.dogrulama ? ` · AI: ${r.dogrulama.uyum ? '✓ ürün uyumlu' : '⚠ ürün uyumsuz'}` : ''}</div></div>
    <span class="pill ${st[r.durum][1]}">${st[r.durum][0]}</span></div>`).join('')}</div>`;
  V().querySelectorAll('.row').forEach(b => b.onclick = () => {
    const r = S.teslimat.find(t => t.no === b.dataset.no);
    if (r.durum === 'etiket') go(vLabel, r.no); else printLabel(r);
  });
}

/* ---------- AI: fotoğraftan sayım + ürün doğrulama ---------- */
function prepImage(file, max) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', 0.85)); };
    img.onerror = rej; img.src = typeof file === 'string' ? file : URL.createObjectURL(file); });
}
async function urlToB64(u) { const b = await (await fetch(u)).blob(); return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }
function buildPrompt(p) {
  const g = G_BY[p[2]];
  return `Sen bir çelik ürünleri deposunda stok sayım asistanısın.
Kullanıcının seçtiği ürün: "${p[1]}" (stok kodu ${p[0]}, ürün grubu: ${g.ad}, grup_id: ${g.id}).

GÖREV 1 – ÜRÜN DOĞRULAMA: Fotoğraftaki ürünün hangi gruba ait olduğunu aşağıdaki listeden seç. Seçilen ürünle aynı grupta değilse grup_uyumlu=false yap. Görselden ölçü/çap/kalınlık/DN/PN okunabiliyorsa (kabartma, etiket veya el yazısı) seçilen ürünün ölçüsüyle karşılaştır.
Grup listesi (id: ad):
${GROUPS.map(x => x.id + ': ' + x.ad).join('\n')}
${REFS[g.id] ? 'İkinci görsel, seçilen grubun bu depodan çekilmiş ÖRNEK fotoğrafıdır (sadece karşılaştırma için; onu sayma).' : ''}

GÖREV 2 – SAYIM (yalnızca ilk görselde): ${countHint(g.id)}
Her ürün için tam olarak bir nokta koy. Noktalar [y, x] biçiminde, görüntü boyutuna göre 0-1000 arası normalize. "adet" nokta sayısına eşit olmalı.

Yalnızca şu JSON'u döndür, başka metin yazma:
{"tespit_grup_id":"<listeden id veya diger>","grup_uyumlu":true,"olcu_uyumlu":"evet|hayir|belirsiz","gorulen":"<kısa açıklama>","okunan_yazilar":"<görselde okunan yazı/sayılar>","adet":0,"noktalar":[[y,x]],"guven":0.0,"not":"<gizli/kısmi görünen ürünler, sayımı zorlaştıran durumlar>"}`;
}
function parseJSON(t) { t = String(t).replace(/```json|```/g, ''); const a = t.indexOf('{'), b = t.lastIndexOf('}'); return JSON.parse(t.slice(a, b + 1)); }
async function callAI(dataUrl, p) {
  const s = S.settings, prompt = buildPrompt(p), img = dataUrl.split(',')[1];
  let ref = null; if (REFS[p[2]]) { try { ref = (await urlToB64('ref/' + REFS[p[2]][0] + '.jpg')).split(',')[1]; } catch (e) {} }
  const t0 = performance.now();
  if (s.provider === 'demo') {
    await new Promise(r => setTimeout(r, 900));
    const n = 8 + Math.floor(Math.random() * 30), pts = Array.from({ length: n }, () => [100 + Math.random() * 800, 100 + Math.random() * 800]);
    const bad = Math.random() < .2;
    return { model: 'DEMO', ms: performance.now() - t0, r: { tespit_grup_id: bad ? 'galv_sac' : p[2], grup_uyumlu: !bad, olcu_uyumlu: 'belirsiz', gorulen: 'DEMO sonuç – gerçek analiz değil', okunan_yazilar: '', adet: n, noktalar: pts, guven: .5, not: 'Ayarlardan API anahtarı girin.' } };
  }
  if (s.provider === 'gemini') {
    if (!s.geminiKey) throw new Error('Gemini API anahtarı girilmemiş (Yönetim → Ayarlar)');
    const parts = [{ inline_data: { mime_type: 'image/jpeg', data: img } }]; if (ref) parts.push({ inline_data: { mime_type: 'image/jpeg', data: ref } }); parts.push({ text: prompt });
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.geminiModel)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) });
    const j = await res.json(); if (!res.ok) throw new Error('Gemini: ' + (j.error?.message || res.status));
    const txt = (j.candidates?.[0]?.content?.parts || []).map(x => x.text || '').join('');
    return { model: s.geminiModel, ms: performance.now() - t0, r: parseJSON(txt), usage: j.usageMetadata };
  }
  if (s.provider === 'claude') {
    if (!s.claudeKey) throw new Error('Claude API anahtarı girilmemiş (Yönetim → Ayarlar)');
    const content = [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } }];
    if (ref) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: ref } });
    content.push({ type: 'text', text: prompt });
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': s.claudeKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: s.claudeModel, max_tokens: 8000, messages: [{ role: 'user', content }] }) });
    const j = await res.json(); if (!res.ok) throw new Error('Claude: ' + (j.error?.message || res.status));
    return { model: s.claudeModel, ms: performance.now() - t0, r: parseJSON(j.content.map(c => c.text || '').join('')), usage: j.usage };
  }
}
function vAI(ctx) {
  const p = P_BY[ctx.code], g = G_BY[p[2]];
  setTitle(ctx.mode === 'sayim' ? 'Fotoğrafla say' : ctx.mode === 'teslimat' ? 'Teslimat doğrulama' : 'AI Sayım Testi');
  const st = { img: null, res: null, pts: [], err: null, busy: false, productOk: true };
  const refs = REFS[g.id] || [];
  const paint = () => {
    const r = st.res?.r;
    const uyum = r ? (r.grup_uyumlu !== false && (r.tespit_grup_id === g.id || !r.tespit_grup_id)) : null;
    V().innerHTML = `
    <div class="card"><div class="name" style="font-weight:650">${esc(p[1])}</div><div class="muted small">${esc(p[0])} · ${esc(g.ad)}${ctx.depo ? ' · ' + esc(ctx.depo) : ''}${ctx.no ? ' · ' + esc(ctx.no) : ''}</div>
      ${refs.length ? `<label>Bu grubun örnek fotoğrafları</label><div class="refs">${refs.map(x => `<img src="ref/${x}.jpg" alt="">`).join('')}</div>` : ''}</div>
    <input id="file" type="file" accept="image/*" capture="environment" hidden>
    <input id="file2" type="file" accept="image/*" hidden>
    ${!st.img ? `<div class="btns"><button class="btn" id="shot">📷 Fotoğraf çek</button><button class="btn sec" id="gal">🖼️ Galeriden</button></div>
      <div class="alert info small">İpucu: Ürünlere dik ve yeterince yakından çekin; istifin tamamı kadraja girsin, flaş yansımasından kaçının. Sacları yan kenarından, boru/profilleri uç tarafından çekin.</div>` : `
    <div class="photo" id="ph"><img src="${st.img}" alt="">${st.pts.map((q, i) => `<span class="dot ${q[2] ? 'user' : ''}" data-i="${i}" style="top:${q[0] / 10}%;left:${q[1] / 10}%">${st.pts.length <= 99 ? i + 1 : ''}</span>`).join('')}</div>
    ${st.busy ? `<div class="card" style="margin-top:12px"><span class="spinner"></span> Yapay zekâ sayıyor…</div>` : ''}
    ${st.err ? `<div class="alert bad">${esc(st.err)}</div>` : ''}
    ${!r && !st.busy ? `<div class="btns"><button class="btn" id="run">🤖 Yapay zekâ ile say</button><button class="btn ghost" id="re">Yeniden çek</button></div>` : ''}
    ${r ? `
      ${uyum ? `<div class="alert ok">✓ Ürün grubu uyumlu: ${esc(r.gorulen || '')}${r.olcu_uyumlu === 'hayir' ? ' — <b>ölçü farklı görünüyor!</b>' : ''}</div>`
        : `<div class="alert bad"><b>⚠ YANLIŞ ÜRÜN OLABİLİR.</b> Seçilen: ${esc(g.ad)}. Fotoğrafta görülen: ${esc(G_BY[r.tespit_grup_id]?.ad || r.tespit_grup_id || '?')} — ${esc(r.gorulen || '')}</div>`}
      <div class="kpis"><div class="kpi"><b>${fmt(r.adet)}</b><span>AI adedi</span></div><div class="kpi"><b>${st.pts.length}</b><span>İşaretli nokta</span></div><div class="kpi"><b>${Math.round((r.guven || 0) * 100)}%</b><span>AI güveni</span></div></div>
      ${r.okunan_yazilar ? `<p class="small"><b>Okunan yazılar:</b> ${esc(r.okunan_yazilar)}</p>` : ''}
      ${r.not ? `<p class="small muted"><b>Not:</b> ${esc(r.not)}</p>` : ''}
      <p class="small muted">${esc(st.res.model)} · ${(st.res.ms / 1000).toFixed(1)} sn. Fotoğrafa dokunarak eksik ürüne nokta ekleyin, yanlış noktaya dokunarak silin.</p>
      <div class="card"><h3 style="margin-top:0">Doğrulama</h3>
        <label>Gerçek adet (sizin saydığınız)</label><input id="tq" inputmode="numeric" value="${st.tq ?? st.pts.length}">
        <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="pok" style="width:auto" ${st.productOk ? 'checked' : ''}> Fotoğraftaki ürün gerçekten seçilen ürün</label>
        <div class="btns"><button class="btn ok" id="save">${ctx.mode === 'sayim' ? 'Kaydet ve sayıma yaz' : ctx.mode === 'teslimat' ? 'Teslim edildi olarak işaretle' : 'Sonucu kaydet'}</button></div>
        <div class="btns"><button class="btn ghost" id="re2">Yeni fotoğraf</button></div>
      </div>` : ''}`}`;
    const f1 = $('#file'), f2 = $('#file2');
    const onFile = async e => { const f = e.target.files[0]; if (!f) return; st.img = await prepImage(f, 1600); st.res = null; st.pts = []; st.err = null; st.tq = null; paint(); };
    f1.onchange = onFile; f2.onchange = onFile;
    if ($('#shot')) { $('#shot').onclick = () => f1.click(); $('#gal').onclick = () => f2.click(); }
    if ($('#re')) $('#re').onclick = () => { st.img = null; paint(); };
    if ($('#re2')) $('#re2').onclick = () => { st.img = null; st.res = null; st.pts = []; paint(); };
    if ($('#run')) $('#run').onclick = async () => {
      st.busy = true; st.err = null; paint();
      try { st.res = await callAI(st.img, p); st.pts = (st.res.r.noktalar || []).filter(q => Array.isArray(q) && q.length >= 2).map(q => [Number(q[0]), Number(q[1])]); }
      catch (e) { st.err = e.message || String(e); }
      st.busy = false; paint();
    };
    const ph = $('#ph');
    if (ph && st.res) ph.onclick = e => {
      if (e.target.classList.contains('dot')) st.pts.splice(+e.target.dataset.i, 1);
      else { const b = ph.getBoundingClientRect(); st.pts.push([(e.clientY - b.top) / b.height * 1000, (e.clientX - b.left) / b.width * 1000, 1]); }
      st.tq = null; const y = window.scrollY; paint(); window.scrollTo(0, y);
    };
    if ($('#tq')) { $('#tq').oninput = e => st.tq = e.target.value; $('#pok').onchange = e => st.productOk = e.target.checked; }
    if ($('#save')) $('#save').onclick = async () => {
      const tq = Number(String($('#tq').value).replace(',', '.')); if (!(tq >= 0)) return toast('Gerçek adedi girin');
      const thumb = await prepImage(st.img, 220).catch(() => null);
      const log = { t: now(), u: user.id, mode: ctx.mode, code: p[0], ad: p[1], gid: g.id, model: st.res.model, ms: Math.round(st.res.ms),
        ai: Number(r.adet) || 0, isaret: st.pts.length, eklenen: st.pts.filter(q => q[2]).length, gercek: tq, guven: r.guven,
        tespit: r.tespit_grup_id, aiUyum: uyum, urunDogru: st.productOk, olcu: r.olcu_uyumlu, yazi: r.okunan_yazilar, not: r.not, thumb };
      S.aiLog.unshift(log);
      if (ctx.mode === 'sayim') { const d = S.sayim[ctx.depo] = S.sayim[ctx.depo] || {}; d[p[0]] = { q: tq, t: now(), u: user.id, ai: log.ai }; }
      if (ctx.mode === 'teslimat') { const tr = S.teslimat.find(x => x.no === ctx.no); tr.durum = 'teslim'; tr.teslimT = now(); tr.dogrulama = { uyum, ai: log.ai, gercek: tq };
        if (tq !== tr.qty) toast(`Dikkat: etikette ${tr.qty}, sayılan ${tq}`); }
      save(); toast('Kaydedildi'); back();
    };
  };
  paint();
}

/* ---------- Yönetim ---------- */
function vAdmin(tab) {
  setTitle('Yönetim');
  V().innerHTML = `<div class="seg"><button data-t="rapor">Netsis fark</button><button data-t="ai">AI başarı</button><button data-t="ayar">Ayarlar</button></div><div id="A"></div>`;
  V().querySelectorAll('.seg button').forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => { stack[stack.length - 1][1] = [b.dataset.t]; vAdmin(b.dataset.t); }; });
  ({ rapor: aRapor, ai: aStats, ayar: aAyar })[tab]($('#A'));
}
function aRapor(A) {
  const depo = aRapor.depo || S.settings.depolar[0]; const d = S.sayim[depo] || {};
  const rows = Object.entries(d).map(([code, c]) => { const p = P_BY[code] || [code, '?', '', '', '', 0]; return { p, c, fark: c.q - (p[5] || 0) }; })
    .sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark));
  const esit = rows.filter(r => r.fark === 0).length;
  A.innerHTML = `<label>Depo</label><select id="dp">${S.settings.depolar.map(x => `<option ${x === depo ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
    <div class="kpis" style="margin-top:12px"><div class="kpi"><b>${rows.length}</b><span>Sayılan kalem</span></div><div class="kpi"><b>${esit}</b><span>Netsis ile eşit</span></div><div class="kpi"><b>${rows.length - esit}</b><span>Farklı</span></div></div>
    <div class="alert info small">Netsis miktarı şimdilik Excel'deki "Adet" sütunundan geliyor (göstermelik). Canlıda yerel ajan depo bazlı bakiyeyi Netsis'ten okuyacak.</div>
    <div class="btns"><button class="btn sec" id="ex">⬇️ Excel (CSV) indir</button></div>
    <div class="tablewrap card" style="margin-top:12px;padding:6px"><table><thead><tr><th>Ürün</th><th class="n">Netsis</th><th class="n">Sayım</th><th class="n">Fark</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(r.p[1])}<div class="muted small">${esc(r.p[0])} · ${esc(r.c.u)} · ${dt(r.c.t)}</div></td><td class="n">${fmt(r.p[5])}</td><td class="n">${fmt(r.c.q)}</td>
      <td class="n"><span class="pill ${r.fark === 0 ? 'ok' : 'bad'}">${r.fark > 0 ? '+' : ''}${fmt(r.fark)}</span></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Bu depoda sayım yok.</td></tr>'}</tbody></table></div>`;
  $('#dp').onchange = e => { aRapor.depo = e.target.value; aRapor(A); };
  $('#ex').onclick = () => csv(`sayim-fark-${depo}-${new Date().toISOString().slice(0, 10)}.csv`,
    [['Depo', 'Stok Kodu', 'Stok Adı', 'Grup', 'Birim', 'Netsis Miktar', 'Sayılan', 'Fark', 'AI Adedi', 'Sayan', 'Zaman']]
      .concat(rows.map(r => [depo, r.p[0], r.p[1], G_BY[r.p[2]]?.ad || '', r.p[3], r.p[5], r.c.q, r.fark, r.c.ai ?? '', r.c.u, r.c.t])));
}
function stats(list) {
  const n = list.length; if (!n) return null;
  const err = list.map(l => Math.abs(l.ai - l.gercek) / Math.max(l.gercek, 1));
  const tanima = list.filter(l => l.aiUyum === l.urunDogru).length;
  return { n, tam: list.filter(l => l.ai === l.gercek).length / n, yakin: err.filter(e => e <= .05).length / n, mape: err.reduce((a, b) => a + b, 0) / n, tanima: tanima / n,
    yanlisYakalandi: list.filter(l => !l.urunDogru).length ? list.filter(l => !l.urunDogru && !l.aiUyum).length / list.filter(l => !l.urunDogru).length : null };
}
const pct = x => x == null ? '–' : Math.round(x * 100) + '%';
function aStats(A) {
  const all = stats(S.aiLog);
  const byG = GROUPS.map(g => ({ g, s: stats(S.aiLog.filter(l => l.gid === g.id)) })).filter(x => x.s);
  const verdict = s => s.yakin >= .9 ? ['AI yeterli – sadece onay', 'ok'] : s.yakin >= .6 ? ['AI + kullanıcı düzeltme', 'warn'] : ['Elle sayım / tartı', 'bad'];
  A.innerHTML = !all ? '<p class="muted">Henüz AI testi yok. Ana sayfa → AI Sayım Testi ile başlayın.</p>' : `
    <div class="kpis"><div class="kpi"><b>${all.n}</b><span>Test</span></div><div class="kpi"><b>${pct(all.yakin)}</b><span>±%5 içinde</span></div><div class="kpi"><b>${pct(all.tanima)}</b><span>Ürün tanıma</span></div></div>
    <div class="tablewrap card" style="margin-top:12px;padding:6px"><table><thead><tr><th>Grup</th><th class="n">Test</th><th class="n">Tam</th><th class="n">±%5</th><th class="n">Ort. sapma</th><th class="n">Tanıma</th><th>Öneri</th></tr></thead><tbody>
    ${byG.map(({ g, s }) => { const v = verdict(s); return `<tr><td>${esc(g.ad)}</td><td class="n">${s.n}</td><td class="n">${pct(s.tam)}</td><td class="n">${pct(s.yakin)}</td><td class="n">${pct(s.mape)}</td><td class="n">${pct(s.tanima)}</td><td><span class="pill ${v[1]}">${v[0]}</span></td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="muted small">Tanıma: AI'nın "uyumlu/uyumsuz" kararının kullanıcının işaretiyle örtüşme oranı. Yanlış ürünle bilerek test yapın ki uyarının çalıştığını ölçelim${all.yanlisYakalandi != null ? ` (yanlış ürün yakalama: ${pct(all.yanlisYakalandi)})` : ''}.</p>
    <div class="btns"><button class="btn sec" id="ex">⬇️ Test kayıtlarını indir (CSV)</button></div>
    <h3>Son testler</h3><div class="list">${S.aiLog.slice(0, 30).map(l => `<div class="row">${l.thumb ? `<img src="${l.thumb}" style="width:56px;height:56px;object-fit:cover;border-radius:8px">` : ''}<div class="grow"><div class="name">${esc(l.ad)}</div>
      <div class="meta">AI ${l.ai} · gerçek ${l.gercek} · ${esc(l.model)} · ${dt(l.t)}</div></div><span class="pill ${l.ai === l.gercek ? 'ok' : Math.abs(l.ai - l.gercek) / Math.max(l.gercek, 1) <= .05 ? 'warn' : 'bad'}">${l.ai - l.gercek > 0 ? '+' : ''}${l.ai - l.gercek}</span></div>`).join('')}</div>`;
  if ($('#ex')) $('#ex').onclick = () => csv(`ai-sayim-testleri-${new Date().toISOString().slice(0, 10)}.csv`,
    [['Zaman', 'Kullanıcı', 'Mod', 'Stok Kodu', 'Stok Adı', 'Grup', 'Model', 'Süre ms', 'AI Adet', 'İşaretli', 'Elle Eklenen', 'Gerçek', 'Sapma %', 'AI Güven', 'AI Tespit Grup', 'AI Uyumlu', 'Ürün Gerçekten Doğru', 'Ölçü', 'Okunan Yazı', 'Not']]
      .concat(S.aiLog.map(l => [l.t, l.u, l.mode, l.code, l.ad, l.gid, l.model, l.ms, l.ai, l.isaret, l.eklenen, l.gercek, Math.round((l.ai - l.gercek) / Math.max(l.gercek, 1) * 1000) / 10, l.guven, l.tespit, l.aiUyum, l.urunDogru, l.olcu, l.yazi, l.not])));
}
function aAyar(A) {
  const s = S.settings;
  A.innerHTML = `
  <div class="card"><h3 style="margin-top:0">Yapay zekâ</h3>
    <label>Sağlayıcı</label><select id="pv"><option value="demo">DEMO (anahtarsız, rastgele)</option><option value="gemini">Google Gemini</option><option value="claude">Anthropic Claude</option></select>
    <div id="gm"><label>Gemini API anahtarı</label><input id="gk" type="password" value="${esc(s.geminiKey)}" placeholder="AIza…">
      <label>Gemini modeli</label><input id="gmo" value="${esc(s.geminiModel)}" list="gml"><datalist id="gml"><option value="gemini-3.8-flash"><option value="gemini-3.5-flash-lite"><option value="gemini-3.1-pro-preview"><option value="gemini-4-argon"></datalist></div>
    <div id="cm"><label>Claude API anahtarı</label><input id="ck" type="password" value="${esc(s.claudeKey)}" placeholder="sk-ant-…">
      <label>Claude modeli</label><input id="cmo" value="${esc(s.claudeModel)}"></div>
    <div class="alert warn small">Anahtar yalnızca bu cihazın tarayıcısında saklanır. Test için uygundur; canlıda anahtar sunucuda (Supabase Edge Function) tutulacak. Kısıtlı/bütçe limitli bir anahtar kullanın.</div>
  </div>
  <div class="card"><h3 style="margin-top:0">Depolar</h3><label>Her satıra bir depo</label><textarea id="dp">${esc(s.depolar.join('\n'))}</textarea></div>
  <div class="card"><h3 style="margin-top:0">Müşteriler (${s.musteriler.length})</h3><label>Excel'den yapıştırın: Cari Kod [TAB veya ;] Ünvan — her satıra bir müşteri</label><textarea id="mu">${esc(s.musteriler.map(m => m.join('\t')).join('\n'))}</textarea></div>
  <div class="card"><h3 style="margin-top:0">Şifreler</h3><label>sayim kullanıcısı</label><input id="p1" value="${esc(S.users.sayim.pass)}"><label>admin</label><input id="p2" value="${esc(S.users.admin.pass)}"></div>
  <div class="btns"><button class="btn" id="sv">Kaydet</button></div>
  <div class="btns"><button class="btn ghost" id="clr">Sayım ve test kayıtlarını sıfırla</button></div>`;
  $('#pv').value = s.provider;
  const vis = () => { $('#gm').hidden = $('#pv').value !== 'gemini'; $('#cm').hidden = $('#pv').value !== 'claude'; }; $('#pv').onchange = vis; vis();
  $('#sv').onclick = () => {
    Object.assign(s, { provider: $('#pv').value, geminiKey: $('#gk').value.trim(), geminiModel: $('#gmo').value.trim(), claudeKey: $('#ck').value.trim(), claudeModel: $('#cmo').value.trim(),
      depolar: $('#dp').value.split('\n').map(x => x.trim()).filter(Boolean),
      musteriler: $('#mu').value.split('\n').map(l => l.split(/\t|;/).map(x => x.trim())).filter(x => x[0]).map(x => [x[0], x[1] || x[0]]) });
    if ($('#p1').value) S.users.sayim.pass = $('#p1').value; if ($('#p2').value) S.users.admin.pass = $('#p2').value;
    save(); toast('Ayarlar kaydedildi');
  };
  $('#clr').onclick = () => { if (confirm('Tüm sayım, teslimat ve AI test kayıtları silinsin mi?')) { S.sayim = {}; S.teslimat = []; S.aiLog = []; save(); toast('Temizlendi'); } };
}

/* ---------- Başlat ---------- */
$('#btnBack').onclick = back;
$('#btnUser').onclick = () => { if (confirm('Çıkış yapılsın mı?')) { user = null; try { sessionStorage.removeItem('ys_user'); } catch (e) {} stack.length = 0; go(vLogin); } };
(async () => {
  load();
  try { const d = await (await fetch('data/urunler.json')).json(); GROUPS = d.gruplar; PRODUCTS = d.urunler; }
  catch (e) { V().innerHTML = '<div class="alert bad">Ürün listesi yüklenemedi (data/urunler.json).</div>'; return; }
  GROUPS.forEach(g => G_BY[g.id] = g); PRODUCTS.forEach(p => P_BY[p[0]] = p);
  user && S.users[user.id] ? home() : go(vLogin);
})();
