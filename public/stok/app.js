/* Stok Sayım & Kapıdan Teslimat — PROTOTİP v3
   Yapı: Depo/Hol (Excel sayfası) → Ürün-Stok Grubu → Stok.
   Veriler bu cihazda (localStorage + görseller IndexedDB) tutulur. Canlıda: Supabase + yerel Netsis ajanı. */
'use strict';

/* ---------- Depolama ---------- */
const KEY = 'ys_stok_v3', OLD = 'ys_stok_v1';
const DEFAULTS = {
  users: { sayim: { pass: '1234', rol: 'user', ad: 'Sayım Kullanıcısı' }, admin: { pass: 'admin123', rol: 'admin', ad: 'Yönetici' } },
  settings: {
    provider: 'demo', geminiKey: '', geminiModel: 'gemini-3.8-flash', geminiFallback: 'gemini-3.5-flash-lite', claudeKey: '', claudeModel: 'claude-opus-5-5',
    hol: {},
    musteriler: [['120.01.001', 'DEMO İNŞAAT LTD. ŞTİ.'], ['120.01.002', 'ÖRNEK METAL SAN. TİC. A.Ş.'], ['120.01.003', 'TEST TESİSAT – AHMET YILMAZ'], ['120.01.004', 'PERAKENDE MÜŞTERİ']]
  },
  sayim: {}, kapali: {}, teslimat: [], aiLog: [], seq: {}, imgs: {}, aiGuven: {}
};
let S;
function load() {
  let raw = null; try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!raw) { // v1'den ayarları, kullanıcıları, teslimat ve AI kayıtlarını taşı (eski sayım yapısı uyumsuz → taşınmaz)
    try { const o = JSON.parse(localStorage.getItem(OLD)); if (o) raw = { users: o.users, settings: Object.assign({}, o.settings, { depolar: undefined }), teslimat: o.teslimat, aiLog: o.aiLog, seq: o.seq }; } catch (e) {} }
  S = Object.assign(structuredClone(DEFAULTS), raw || {});
  S.settings = Object.assign(structuredClone(DEFAULTS.settings), (raw && raw.settings) || {});
  ['sayim', 'kapali', 'imgs', 'seq', 'aiGuven'].forEach(k => S[k] = S[k] || {}); ['teslimat', 'aiLog'].forEach(k => S[k] = S[k] || []);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {
  S.aiLog.forEach((r, i) => { if (i < S.aiLog.length - 30) delete r.thumb; });
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e2) { toast('Cihaz hafızası dolu – CSV dışa aktarıp kayıtları temizleyin'); } } }
let user = null;
try { user = JSON.parse(sessionStorage.getItem('ys_user')); } catch (e) {}

/* ---------- Ürün görselleri (IndexedDB) ---------- */
const IDB = (() => { let p;
  const db = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open('ys_stok_img', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
  const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('img', mode), st = t.objectStore('img'), q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }); };
  return { get: k => tx('readonly', s => s.get(k)).catch(() => null), set: (k, v) => tx('readwrite', s => s.put(v, k)), del: k => tx('readwrite', s => s.delete(k)) };
})();
async function fillThumbs(root) {
  for (const el of root.querySelectorAll('[data-thumb]')) { const v = await IDB.get(el.dataset.thumb); if (v) el.style.backgroundImage = `url(${v.thumb})`; }
}

/* ---------- Ürün verisi ---------- */
let DEPOLAR = [], GROUPS = [], PRODUCTS = [], P_BY = {}, G_BY = {}, D_BY = {}, UYARI = {};
const BIRIMLER = ['AD', 'MT', 'M2', 'KG'];
const BIRIM_AD = { AD: 'Adet', MT: 'Metre', M2: 'm²', KG: 'Kg', PK: 'Paket' };
const holNo = d => S.settings.hol[d] ?? D_BY[d].hol;
const depoAd = d => `Hol ${holNo(d)} · ${D_BY[d].ad}`;
/* Kullanıcının çektiği örnek fotoğraflar → grup adına göre */
function refsFor(gid) {
  const g = G_BY[gid]; if (!g) return []; const a = g.ad;
  if (/FLANŞ/.test(a)) return ['flans-1', 'flans-2'];
  if (/\bTE\b/.test(a)) return ['te-1', 'te-2', 'te-3'];
  if (/KEP|KÖRTAPA/.test(a)) return ['kep-1'];
  if (/SİYAH SAC|DKP|BAKLAVA/.test(a)) return ['siyah_sac-1', 'siyah_sac-2', 'siyah_sac-3', 'siyah_sac-4'];
  if (/GALVANİZ.*SAC/.test(a) && g.depo === 'D6') return ['galv_sac-1', 'galv_sac-2', 'galv_sac-3'];
  return [];
}
function countHint(p) {
  const d = D_BY[p.depo].ad;
  if (/Flanş/i.test(d)) return 'Flanşlar dikey kolonlar halinde üst üste dizilidir. Her kolondaki flanşları kenar halkalarından tek tek say ve her flanşın görünen kenarına bir nokta koy. Kolonların üzerine el ile yazılmış sayıları (ör. "241 Adet") okunan_yazilar alanına yaz ama sayımına karıştırma.';
  if (/Sac/i.test(d)) return 'Sac levhalar yan görünüşte üst üste istiflenmiştir. Her levhanın yan kenar çizgisini say; her kenar çizgisine (sol tarafına yakın) bir nokta koy. Alttaki palet, tahta veya karton sayılmaz.';
  if (/Profil|Boru/i.test(d)) return 'Boru/profil demetini uç (kesit) tarafından say; her boru veya profil ağzının merkezine bir nokta koy.';
  if (/Fitting|Patent/i.test(d)) return 'Raftaki parçaları say; her parçanın görünen ağzına veya gövdesine bir nokta koy. Arka sıralarda kısmen görünenleri de say; hiç görünmeyenleri tahmin etme, not alanında belirt.';
  return 'Görünen her bir ürüne bir nokta koy.';
}

/* ---------- Yardımcılar ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ');
const fmt = n => (n == null || n === '') ? '–' : Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
const num = v => Number(String(v ?? '').trim().replace(/\./g, m => m).replace(',', '.'));
const now = () => new Date().toISOString();
const dt = iso => new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }
const normX = s => norm(s).replace(/\s*[x×*]\s*/g, 'x').replace(/\s*-\s*/g, ' ');
function match(p, q) { const n = ' ' + normX(p.ad + ' ' + p.kod);
  return normX(q).split(' ').filter(Boolean).every(t => { const i = n.indexOf(t); return i >= 0 && (/^\d/.test(t) ? new RegExp('(^|[^0-9,])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(n) : true); }); }
function csv(name, rows) {
  const body = rows.map(r => r.map(v => { v = v == null ? '' : String(v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
const birimSel = (cur, extra) => [...new Set(BIRIMLER.concat(extra ? [extra] : []))];

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
function sheet(html, mount) {
  const o = document.createElement('div'); o.className = 'sheet-bg';
  o.innerHTML = `<div class="sheet">${html}</div>`; document.body.appendChild(o);
  const close = () => o.remove(); o.onclick = e => { if (e.target === o) close(); };
  mount(o.querySelector('.sheet'), close);
}

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
  <div class="alert warn small"><b>Prototip:</b> Şifre kontrolü bu cihazda yapılır, gerçek güvenlik sağlamaz. Canlı sürümde giriş bulut (Supabase) üzerinden yapılacak.</div>`;
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
  <p class="muted">Merhaba ${esc(user.ad)} · ${DEPOLAR.length} hol, ${GROUPS.length} ürün grubu, ${PRODUCTS.length.toLocaleString('tr-TR')} stok kartı</p>
  <div class="grid">
    <button class="tile" id="t1"><span class="ic">📋</span><b>Stok Sayım</b><span class="muted small">Hol → ürün grubu → stok</span></button>
    <button class="tile" id="t2"><span class="ic">🚚</span><b>Kapıdan Teslimat</b><span class="muted small">Müşteri → ürün → etiket</span></button>
    <button class="tile" id="t3"><span class="ic">📷</span><b>AI Sayım Testi</b><span class="muted small">Fotoğraftan adet + ürün doğrulama</span></button>
    <button class="tile" id="t4"><span class="ic">🏷️</span><b>Teslimatlar</b><span class="muted small">${bekleyen} etiket depoda bekliyor</span></button>
    ${user.rol === 'admin' ? `<button class="tile wide" id="t5"><span class="ic">⚙️</span><b>Yönetim</b><span class="muted small">Netsis fark raporu · AI başarı · veri kontrolü · ayarlar</span></button>` : ''}
  </div>
  ${S.settings.provider === 'demo' ? `<div class="alert info small">AI şu an <b>DEMO</b> modunda (rastgele sonuç). Gerçek sayım için Yönetim → Ayarlar'dan Gemini veya Claude API anahtarı girin.</div>` : ''}`;
  $('#t1').onclick = () => go(vDepo, { mode: 'sayim' }); $('#t2').onclick = () => go(vTeslimat, {});
  $('#t3').onclick = () => go(vDepo, { mode: 'test' }); $('#t4').onclick = () => go(vTeslimatList);
  if ($('#t5')) $('#t5').onclick = () => go(vAdmin, 'rapor');
}

/* ---------- Sayım yardımcıları ----------
   c = { q: ana miktar, b: birim, ek: [{ m, b, yer, t, u }], t, u, ai } */
const isClosed = d => !!S.kapali[d];
const cnt = d => (S.sayim[d] = S.sayim[d] || {});
function totals(c) { const t = {}; if (!c) return t;
  if (c.q != null) t[c.b] = (t[c.b] || 0) + c.q; (c.ek || []).forEach(e => t[e.b] = (t[e.b] || 0) + e.m); return t; }
const totTxt = c => Object.entries(totals(c)).map(([b, v]) => `${fmt(v)} ${b}`).join(' + ');
const countedIn = (did, pid) => S.sayim[did] && S.sayim[did][pid];
const sonuc = c => !c || c.ai == null || c.q == null ? '' : (c.q === c.ai && c.b === 'AD' ? 'Başarılı' : 'Başarısız');
const sonucPill = c => { const s = sonuc(c); return s ? `<span class="pill ${s === 'Başarılı' ? 'ok' : 'bad'}">${s}</span>` : '<span class="muted">–</span>'; };
const isTrusted = id => { const g = S.aiGuven[id]; return !!(g && g.son === 'basarili' && g.ok >= 1); };

/* ---------- 1) Depo / Hol ---------- */
function vDepo(ctx) {
  const T = { sayim: 'Sayım – Hol seçin', teslimat: 'Teslimat – Hol seçin', test: 'AI Test – Hol seçin' };
  setTitle(T[ctx.mode]);
  V().innerHTML = `<h2>Depo / Hol seçin</h2><div class="list">${DEPOLAR.map(d => {
    const items = PRODUCTS.filter(p => p.depo === d.id), n = Object.keys(S.sayim[d.id] || {}).length, k = isClosed(d.id);
    return `<button class="row" data-d="${d.id}"><span class="holno">${esc(holNo(d.id))}</span><div class="grow"><div class="name">${esc(d.ad)}</div>
      <div class="meta">${GROUPS.filter(g => g.depo === d.id).length} grup · ${items.length} stok${ctx.mode === 'sayim' ? ` · ${n} sayıldı` : ''}</div>
      ${ctx.mode === 'sayim' ? `<div class="progress"><i style="width:${items.length ? Math.min(100, n / items.length * 100) : 0}%"></i></div>` : ''}</div>
      ${ctx.mode === 'sayim' ? `<span class="pill ${k ? 'bad' : 'ok'}">${k ? '🔒' : 'Açık'}</span>` : ''}<span class="chev">›</span></button>`; }).join('')}</div>`;
  V().querySelectorAll('.row').forEach(b => b.onclick = () => { const gs = GROUPS.filter(g => g.depo === b.dataset.d), c2 = Object.assign({}, ctx, { depo: b.dataset.d });
    go(vPickGroup, c2); if (gs.length === 1 && ctx.mode !== 'sayim') go(vProducts, Object.assign({}, c2, { gid: gs[0].id, q: '' })); });
}

/* ---------- 2) Ürün-Stok grubu ---------- */
function vPickGroup(ctx) {
  setTitle(depoAd(ctx.depo));
  const sayim = ctx.mode === 'sayim', counted = sayim ? cnt(ctx.depo) : {}, kap = sayim && isClosed(ctx.depo);
  const gs = GROUPS.filter(g => g.depo === ctx.depo);
  V().innerHTML = `<h2>Ürün – stok grubu</h2>
  ${sayim ? `
    ${kap ? `<div class="alert bad">🔒 Bu holün sayımı kapatıldı (${esc(S.kapali[ctx.depo].u)} · ${dt(S.kapali[ctx.depo].t)}).</div>` : `
    <div class="btns" style="margin-top:0"><button class="btn sec" id="extra">➕ Başka gruptan / başka yerden ürün ekle</button></div>`}
    <div class="btns"><button class="btn ghost" id="xl">⬇️ Bu holün sayım sonucu (Excel)</button></div>
    ${user.rol === 'admin' ? `<div class="btns"><button class="btn ${kap ? 'ghost' : 'bad'}" id="lock">${kap ? '🔓 Sayımı yeniden aç' : '🔒 Hol sayımını kapat'}</button></div>` : ''}<div style="height:10px"></div>` : ''}
  <div class="list">${gs.map(g => {
    const items = PRODUCTS.filter(p => p.gid === g.id), c = items.filter(p => counted[p.id]).length, r = refsFor(g.id).length;
    return `<button class="row" data-g="${g.id}"><div class="grow"><div class="name">${r ? '📷 ' : ''}${esc(g.ad)}</div>
      <div class="meta">${items.length} stok${sayim ? ` · ${c} sayıldı` : ''}</div>
      ${sayim ? `<div class="progress"><i style="width:${items.length ? c / items.length * 100 : 0}%"></i></div>` : ''}</div><span class="chev">›</span></button>`; }).join('')}</div>`;
  V().querySelectorAll('.row').forEach(b => b.onclick = () => go(vProducts, Object.assign({}, ctx, { gid: b.dataset.g, q: '' })));
  if ($('#xl')) $('#xl').onclick = () => exportXlsx([ctx.depo]);
  if ($('#extra')) $('#extra').onclick = () => go(vProducts, Object.assign({}, ctx, { gid: '*', q: '' }));
  if ($('#lock')) $('#lock').onclick = () => {
    if (kap) { if (!confirm('Sayım yeniden açılsın mı?')) return; delete S.kapali[ctx.depo]; }
    else { if (!confirm(`${depoAd(ctx.depo)} sayımı kapatılsın mı? Kapatınca kimse değişiklik/ek yapamaz.`)) return; S.kapali[ctx.depo] = { t: now(), u: user.id }; }
    save(); render();
  };
}

/* ---------- 3) Stok listesi: listeden seç veya yaz ---------- */
function vProducts(ctx) {
  const all = ctx.gid === '*', g = all ? null : G_BY[ctx.gid];
  const items = all ? PRODUCTS : PRODUCTS.filter(p => p.gid === ctx.gid);
  setTitle(all ? 'Tüm stoklarda ara' : g.ad);
  const sayim = ctx.mode === 'sayim', counted = sayim ? cnt(ctx.depo) : {}, kap = sayim && isClosed(ctx.depo);
  V().innerHTML = `<div class="search"><input id="q" type="search" enterkeyhint="search" placeholder="Stok adı veya kodu yazın (ör. 40x40 2,00)" value="${esc(ctx.q || '')}">
      <div class="small muted" style="margin-top:6px">${all ? 'En az 2 karakter yazın.' : `${items.length} stok · listeden seçin veya yazarak daraltın`}${sayim ? ' · <span id="cntInfo"></span>' : ''}</div></div>
    ${kap ? `<div class="alert bad small">🔒 Sayım kapalı – sadece görüntüleme.</div>` : ''}
    <div class="list" id="L"></div>`;
  const L = $('#L');
  const draw = () => {
    const q = $('#q').value; ctx.q = q;
    if (all && q.trim().length < 2) { L.innerHTML = ''; return; }
    const list = (q ? items.filter(p => match(p, q)) : items).slice(0, 150);
    if (sayim) $('#cntInfo').textContent = `${items.filter(p => counted[p.id]).length} sayıldı`;
    L.innerHTML = (sayim && list.length ? `<div class="colhead"><span class="grow">Stok adı</span><div class="cols"><span class="n">Yapay zekâ</span><span class="n">Kullanıcı sayım</span><span>Doğrulama</span></div></div>` : '') + list.map(p => {
      const c = counted[p.id];
      return `<button class="row" data-id="${esc(p.id)}">${S.imgs[p.id] ? `<span class="thumb" data-thumb="${esc(p.id)}"></span>` : ''}<div class="grow"><div class="name">${esc(p.ad)}</div>
        <div class="meta">${isTrusted(p.id) ? '🤖 ' : ''}${esc(p.kod || '⚠ kodsuz')}${p.dup ? ' ⚠' : ''} · ${esc(p.b1)}${p.b2 ? '/' + esc(p.b2) : ''}${all ? ' · ' + esc(G_BY[p.gid].ad) : ''}</div></div>
        ${sayim ? `<div class="cols"><span class="n">${c && c.ai != null ? fmt(c.ai) : '–'}</span><span class="n">${c ? esc(totTxt(c)) || '–' : '–'}</span><span>${sonucPill(c)}</span></div>` : '<span class="chev">›</span>'}</button>`;
    }).join('') + (list.length === 150 ? `<p class="muted small">İlk 150 sonuç gösteriliyor, yazarak daraltın.</p>` : '') + (!list.length ? `<p class="muted">Sonuç yok.</p>` : '');
    L.querySelectorAll('.row').forEach(r => r.onclick = () => {
      const p = P_BY[r.dataset.id];
      if (ctx.onPick) return ctx.onPick(p.id);
      if (sayim) return go(vUrun, { depo: ctx.depo, id: p.id });
      go(vAI, { mode: 'test', id: p.id });
    });
    fillThumbs(L);
  };
  $('#q').oninput = draw; draw();
}

/* ---------- 4) Stok kartı: birim (pasif + değiştir), miktar, görsel, AI, ek ---------- */
function vUrun(ctx) {
  const p = P_BY[ctx.id], d = ctx.depo, kap = isClosed(d);
  setTitle(p.ad);
  const st = ctx.st || (ctx.st = { b: null, edit: false });
  const paint = async () => {
    const c = cnt(d)[p.id];
    if (!st.b) st.b = (c && c.b) || p.b1;
    const other = p.depo !== d;
    V().innerHTML = `
    <div class="card">
      <div class="pimg" id="pimg">${S.imgs[p.id] ? '' : '<span>Görsel yok</span>'}</div>
      <input id="imgf" type="file" accept="image/*" hidden>
      <div class="btns" style="margin-top:10px"><button class="btn sec" id="up">🖼️ ${S.imgs[p.id] ? 'Görseli değiştir' : 'Görsel yükle'}</button>${S.imgs[p.id] && user.rol === 'admin' ? `<button class="btn ghost" id="imgdel" style="flex:0 0 auto;width:auto">🗑️</button>` : ''}</div>
      <h2 style="margin:14px 0 2px">${esc(p.ad)}</h2>
      <div class="muted small">${esc(p.kod || '⚠ kodsuz')}${p.dup ? ' · ⚠ mükerrer kod' : ''} · ${esc(G_BY[p.gid].ad)} · ${esc(depoAd(p.depo))}</div>
      ${c ? `<div class="cmp"><div><span>Yapay zekâ okuma</span><b>${c.ai != null ? fmt(c.ai) + ' AD' : '–'}</b></div><div><span>Kullanıcı sayım</span><b>${c.q != null ? fmt(c.q) + ' ' + esc(c.b) : '–'}</b></div><div><span>Doğrulama</span>${sonucPill(c)}</div></div>` : ''}
      ${isTrusted(p.id) ? `<p class="small" style="color:var(--ok)">🤖 Bu stok yapay zekâ ile doğrudan sayılabilir (${S.aiGuven[p.id].ok} başarılı / ${S.aiGuven[p.id].fail} başarısız).</p>` : ''}
      ${other ? `<div class="alert warn small">Bu stok normalde <b>${esc(depoAd(p.depo))}</b>'da. ${esc(depoAd(d))} sayımına ekleniyor.</div>` : ''}
    </div>
    <div class="card">
      <label>Stok kodu</label><input value="${esc(p.kod || 'kodsuz')}" disabled>
      <label>Ölçü birimi (Netsis Br1: ${esc(p.b1)}${p.b2 ? ' / Br2: ' + esc(p.b2) : ''})</label>
      <div class="unitrow"><input value="${esc(BIRIM_AD[st.b] || st.b)} (${esc(st.b)})" disabled><button class="btn ghost" id="chg" ${kap ? 'disabled' : ''}>Değiştir</button></div>
      ${st.edit ? `<div class="seg" style="margin-top:8px">${birimSel(st.b, p.b1).map(b => `<button data-b="${b}" class="${b === st.b ? 'on' : ''}">${BIRIM_AD[b] || b}</button>`).join('')}</div>` : ''}
      ${st.b !== p.b1 ? `<p class="small" style="color:var(--warn)">Netsis birimi ${esc(p.b1)}; sayım ${esc(st.b)} olarak kaydedilecek, raporda ayrı gösterilir.</p>` : ''}
      <label>Sayılan miktar (${esc(st.b)})</label>
      <input id="m" class="bigin" inputmode="decimal" placeholder="0" value="${c && c.q != null && c.b === st.b ? fmt(c.q).replace(/\./g, '') : ''}" ${kap ? 'disabled' : ''}>
      ${c && c.q != null && c.b !== st.b ? `<p class="small muted">Mevcut ana sayım: ${fmt(c.q)} ${esc(c.b)} – kaydederseniz ${esc(st.b)} ile değiştirilir.</p>` : ''}
      <div class="btns"><button class="btn" id="sv" ${kap ? 'disabled' : ''}>Kaydet</button></div>
    </div>
    <div class="card"><h3 style="margin-top:0">Ek girişler <span class="muted small">(başka yerde bulunan)</span></h3>
      ${c && (c.ek || []).length ? `<div class="list">${c.ek.map((e, i) => `<div class="row"><div class="grow"><div class="name">${fmt(e.m)} ${esc(e.b)}</div><div class="meta">${esc(e.yer || '–')} · ${esc(e.u)} · ${dt(e.t)}</div></div>${kap ? '' : `<button class="cam" data-del="${i}">🗑️</button>`}</div>`).join('')}</div>` : '<p class="muted small">Yok.</p>'}
      <div class="btns"><button class="btn sec" id="ek" ${kap ? 'disabled' : ''}>➕ Ek miktar ekle</button></div>
      ${c ? `<p class="small"><b>Toplam:</b> ${esc(totTxt(c))}</p>` : ''}
    </div>
    <input id="sayf" type="file" accept="image/*" hidden>
    ${kap ? '' : `<div class="sticky-foot"><div class="inner"><button class="btn ok saybtn" id="say">📷 Say${isTrusted(p.id) ? ' 🤖' : ''} <span>kamera veya fotoğraf kitaplığı · yapay zekâ adet sayar</span></button></div></div>`}`;
    if (S.imgs[p.id]) { const el = $('#pimg'); IDB.get(p.id).then(v => { if (v && el) el.style.backgroundImage = `url(${v.full})`; }); }
    $('#chg').onclick = () => { st.edit = !st.edit; paint(); };
    V().querySelectorAll('.seg [data-b]').forEach(b => b.onclick = () => { st.b = b.dataset.b; st.edit = false; paint(); });
    $('#up').onclick = () => $('#imgf').click();
    $('#imgf').onchange = async e => { const f = e.target.files[0]; if (!f) return; await saveImg(p.id, f); toast('Görsel kaydedildi'); paint(); };
    if ($('#imgdel')) $('#imgdel').onclick = async () => { if (!confirm('Görsel silinsin mi?')) return; await IDB.del(p.id); delete S.imgs[p.id]; save(); paint(); };
    $('#sv').onclick = () => {
      const v = $('#m').value.trim(), dd = cnt(d);
      if (v === '') { if (dd[p.id]) { if ((dd[p.id].ek || []).length) dd[p.id].q = null; else delete dd[p.id]; } save(); toast('Ana sayım silindi'); return back(); }
      const m = num(v); if (!(m >= 0)) return toast('Geçerli bir miktar girin');
      dd[p.id] = Object.assign(dd[p.id] || {}, { q: m, b: st.b, t: now(), u: user.id }); save(); toast(`${fmt(m)} ${st.b} kaydedildi`); back();
    };
    $('#m').onkeydown = e => { if (e.key === 'Enter') $('#sv').click(); };
    if ($('#say')) $('#say').onclick = () => $('#sayf').click();
    $('#sayf').onchange = async e => { const f = e.target.files[0]; if (!f) return; const img = await prepImage(f, 1280); go(vAI, { mode: 'sayim', depo: d, id: p.id, birim: st.b, img, auto: true }); };
    $('#ek').onclick = () => addSheet(d, p.id, paint);
    V().querySelectorAll('[data-del]').forEach(x => x.onclick = () => { if (!confirm('Bu ek giriş silinsin mi?')) return;
      const cc = cnt(d)[p.id]; cc.ek.splice(+x.dataset.del, 1); if (cc.q == null && !cc.ek.length) delete cnt(d)[p.id]; save(); paint(); });
    if (!kap && !(c && c.q != null)) setTimeout(() => $('#m') && $('#m').focus(), 50);
  };
  paint();
}
async function saveImg(id, file) {
  const full = await prepImage(file, 1000, .82), thumb = await prepImage(full, 160, .75);
  await IDB.set(id, { full, thumb, t: now(), u: user.id }); S.imgs[id] = 1; save();
}
function addSheet(depo, id, done) {
  const p = P_BY[id];
  sheet(`<h3 style="margin-top:0">➕ Ek miktar ekle</h3><div class="name" style="font-weight:650">${esc(p.ad)}</div><div class="muted small">${esc(p.kod)} · ${esc(depoAd(depo))}</div>
    <label>Birim</label><div class="seg" id="bs">${birimSel(p.b1, p.b1).map(b => `<button data-b="${b}" class="${b === p.b1 ? 'on' : ''}">${BIRIM_AD[b] || b}</button>`).join('')}</div>
    <label>Miktar</label><input id="em" inputmode="decimal" placeholder="0">
    <label>Bulunduğu yer / not</label><input id="ey" placeholder="ör. Arka saha, 3. raf alt göz">
    <div class="btns"><button class="btn ghost" id="ec">Vazgeç</button><button class="btn" id="es">Ekle</button></div>`,
  (el, close) => {
    let b = p.b1;
    el.querySelectorAll('#bs button').forEach(x => x.onclick = () => { b = x.dataset.b; el.querySelectorAll('#bs button').forEach(y => y.classList.toggle('on', y === x)); });
    el.querySelector('#ec').onclick = close;
    el.querySelector('#es').onclick = () => {
      const m = num(el.querySelector('#em').value); if (!(m > 0)) return toast('Miktar girin');
      const d = cnt(depo); d[id] = d[id] || { q: null, b: p.b1, t: now(), u: user.id };
      (d[id].ek = d[id].ek || []).push({ m, b, yer: el.querySelector('#ey').value.trim(), t: now(), u: user.id });
      d[id].t = now(); save(); close(); toast(`${fmt(m)} ${b} eklendi`); done && done();
    };
    setTimeout(() => el.querySelector('#em').focus(), 50);
  });
}

/* ---------- Kapıdan teslimat ---------- */
function vTeslimat(f) {
  setTitle('Kapıdan Teslimat');
  const cari = f.cari ? S.settings.musteriler.find(m => m[0] === f.cari) : null, p = f.id ? P_BY[f.id] : null;
  if (p && !f.b) f.b = p.b1;
  V().innerHTML = `
  <div class="card"><h3 style="margin-top:0">1 · Müşteri</h3>
    ${cari ? `<div class="row" id="cariSel"><div class="grow"><div class="name">${esc(cari[1])}</div><div class="meta">${esc(cari[0])}</div></div><span class="pill">değiştir</span></div>`
      : `<input id="cq" type="search" placeholder="Müşteri ara (ünvan veya cari kod)"><div class="list" id="CL" style="margin-top:8px;max-height:280px;overflow:auto"></div>`}
  </div>
  <div class="card"><h3 style="margin-top:0">2 · Ürün</h3>
    ${p ? `<div class="row" id="urSel"><div class="grow"><div class="name">${esc(p.ad)}</div><div class="meta">${esc(p.kod)} · ${esc(G_BY[p.gid].ad)} · ${esc(depoAd(p.depo))}</div></div><span class="pill">değiştir</span></div>`
      : `<button class="btn sec" id="urPick">Hol → grup → ürün seç</button>`}
  </div>
  <div class="card"><h3 style="margin-top:0">3 · Miktar</h3>
    <label>Birim</label><div class="unitrow"><input value="${p ? esc((BIRIM_AD[f.b] || f.b) + ' (' + f.b + ')') : '–'}" disabled><button class="btn ghost" id="chg" ${p ? '' : 'disabled'}>Değiştir</button></div>
    ${f.bedit && p ? `<div class="seg" style="margin-top:8px">${birimSel(f.b, p.b1).map(b => `<button data-b="${b}" class="${b === f.b ? 'on' : ''}">${BIRIM_AD[b] || b}</button>`).join('')}</div>` : ''}
    <label>Miktar</label><input id="qty" inputmode="decimal" value="${esc(f.qty || '')}" placeholder="0">
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
  const pick = () => { keep(); go(vDepo, { mode: 'teslimat', onPick: id => { f.id = id; f.b = P_BY[id].b1; while (stack.length && stack[stack.length - 1][0] !== vTeslimat) stack.pop(); render(); } }); };
  if (p) $('#urSel').onclick = pick; else $('#urPick').onclick = pick;
  $('#chg').onclick = () => { keep(); f.bedit = !f.bedit; vTeslimat(f); };
  V().querySelectorAll('.seg [data-b]').forEach(b => b.onclick = () => { keep(); f.b = b.dataset.b; f.bedit = false; vTeslimat(f); });
  $('#ok').onclick = () => {
    keep(); const q = num(f.qty);
    if (!(q > 0)) return toast('Geçerli bir miktar girin');
    const ymd = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    S.seq[ymd] = (S.seq[ymd] || 0) + 1;
    const rec = { no: `TS${ymd}-${String(S.seq[ymd]).padStart(3, '0')}`, t: now(), u: user.id, cari: cari[0], cariAd: cari[1], id: p.id, code: p.kod, ad: p.ad, birim: f.b, qty: q, note: f.note,
      durum: 'etiket', netsis: { durum: 'kuyrukta', t: now() } };
    S.teslimat.unshift(rec); save();
    stack.pop(); go(vLabel, rec.no, true);
  };
}
function labelHTML(r) {
  return `<div class="label"><div class="lq"><div class="qr"></div><div style="font-size:8pt">${esc(r.code)}</div></div>
    <div class="lt"><div class="no">${esc(r.no)}</div><div class="pn">${esc(r.ad)}</div><div class="cu">${esc(r.cariAd)}</div>
    <div style="font-size:8pt">${dt(r.t)} · ${esc(r.u)}</div><div class="qq">${fmt(r.qty)} ${esc(r.birim)}</div></div></div>`;
}
function fillQR(root, r) { root.querySelectorAll('.qr').forEach(el => { el.innerHTML = '';
  if (window.QRCode) new QRCode(el, { text: JSON.stringify({ no: r.no, k: r.code, a: r.qty, b: r.birim, c: r.cari }), width: 160, height: 160, correctLevel: QRCode.CorrectLevel.M });
  else el.textContent = r.no; }); }
function printLabel(r) { const pa = $('#print-area'); pa.innerHTML = labelHTML(r); fillQR(pa, r); setTimeout(() => window.print(), 300); }
function vLabel(no, auto) {
  const r = S.teslimat.find(t => t.no === no); setTitle('Etiket ' + no);
  const pid = r.id && P_BY[r.id] ? r.id : null;
  V().innerHTML = `<div class="alert ok">Teslimat oluşturuldu. Netsis hareketi: <b>${r.netsis.durum}</b> (prototip)</div>
    <div style="display:flex;justify-content:center;margin:12px 0">${labelHTML(r)}</div>
    <div class="btns"><button class="btn" id="pr">🖨️ Etiketi yazdır</button></div>
    ${pid ? `<div class="btns"><button class="btn sec" id="dv">📷 Depoda teslim et (foto ile doğrula)</button></div>` : ''}
    <div class="btns"><button class="btn ghost" id="nw">Yeni teslimat</button></div>
    <p class="muted small">Etiket 100×60 mm. iPhone'dan AirPrint yazıcıya basılabilir; canlıda yerel ajan Zebra/ZPL yazıcıya doğrudan gönderecek.</p>`;
  fillQR(V(), r);
  $('#pr').onclick = () => printLabel(r);
  if ($('#dv')) $('#dv').onclick = () => go(vAI, { mode: 'teslimat', no: r.no, id: pid });
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
function prepImage(file, max, q = 0.85) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); if (typeof file !== 'string') URL.revokeObjectURL(img.src);
      res(c.toDataURL('image/jpeg', q)); };
    img.onerror = rej; img.src = typeof file === 'string' ? file : URL.createObjectURL(file); });
}
/* box = [ymin, xmin, ymax, xmax] 0-1000 */
function cropImage(dataUrl, box, pad = 15) {
  return new Promise((res, rej) => { const img = new Image(); img.onload = () => {
    const W = img.naturalWidth, H = img.naturalHeight;
    const y0 = Math.max(0, box[0] - pad) / 1000 * H, x0 = Math.max(0, box[1] - pad) / 1000 * W, y1 = Math.min(1000, box[2] + pad) / 1000 * H, x1 = Math.min(1000, box[3] + pad) / 1000 * W;
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(x1 - x0)); c.height = Math.max(1, Math.round(y1 - y0));
    c.getContext('2d').drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.9)); };
    img.onerror = rej; img.src = dataUrl; });
}
async function urlToB64(u) { const b = await (await fetch(u)).blob(); return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }
async function refImage(p) {
  const own = await IDB.get(p.id); if (own) return { kind: 'urun', data: (await prepImage(own.full, 640, .75)).split(',')[1] };
  const r = refsFor(p.gid); if (r.length) { try { return { kind: 'grup', data: (await urlToB64('ref/' + r[0] + '.jpg')).split(',')[1] }; } catch (e) {} }
  return null;
}
function buildPrompt(p, cropped, ref) {
  const g = G_BY[p.gid];
  return `Sen bir çelik ürünleri deposunda stok sayım asistanısın.
Kullanıcının seçtiği ürün: "${p.ad}" (stok kodu ${p.kod}, ürün grubu: ${g.ad}, grup_id: ${g.id}, depo: ${D_BY[p.depo].ad}).
${cropped ? 'İlk görsel, kullanıcının sayılacak alan olarak İŞARETLEDİĞİ bölgedir; sadece bu bölgedeki ana ürünü say. Kenarlarda kalan başka ürün parçalarını sayma.' : ''}

GÖREV 1 – ÜRÜN DOĞRULAMA: Fotoğraftaki ana ürünün hangi gruba ait olduğunu aşağıdaki listeden seç. Seçilen ürünle aynı grupta değilse grup_uyumlu=false yap. Görselden ölçü/çap/kalınlık/DN/PN okunabiliyorsa (kabartma, etiket veya el yazısı) seçilen ürünün ölçüsüyle karşılaştır.
Grup listesi (id: depo › grup):
${GROUPS.map(x => `${x.id}: ${D_BY[x.depo].ad} › ${x.ad}`).join('\n')}
${ref ? (ref.kind === 'urun' ? 'İkinci görsel, BU stok kartı için daha önce yüklenmiş ÜRÜN FOTOĞRAFIDIR (karşılaştırma için; onu sayma).' : 'İkinci görsel, seçilen grubun bu depodan çekilmiş ÖRNEK fotoğrafıdır (karşılaştırma için; onu sayma).') : ''}

GÖREV 2 – BİRDEN FAZLA ÜRÜN/İSTİF KONTROLÜ: İlk görselde birbirinden ayrı birden fazla ürün istifi veya farklı ürün grubu varsa birden_fazla_urun=true yap ve her biri için "alanlar" listesine kutu [ymin, xmin, ymax, xmax] (0-1000 normalize) ekle. Seçilen ürüne en çok benzeyen alana secili_benzer=true ver.

GÖREV 3 – SAYIM (yalnızca ilk görselde): ${countHint(p)}
${cropped ? '' : 'Birden fazla istif varsa yalnızca seçilen ürüne en çok benzeyen alandakileri say.'}
Her ürün için tam olarak bir nokta koy. Noktalar [y, x] biçiminde, görüntü boyutuna göre 0-1000 arası normalize. "adet" nokta sayısına eşit olmalı.

Yalnızca şu JSON'u döndür, başka metin yazma:
{"tespit_grup_id":"<listeden id veya diger>","grup_uyumlu":true,"olcu_uyumlu":"evet|hayir|belirsiz","gorulen":"<kısa açıklama>","okunan_yazilar":"<görselde okunan yazı/sayılar>","birden_fazla_urun":false,"alanlar":[{"grup_id":"<id>","aciklama":"<kısa>","kutu":[0,0,1000,1000],"secili_benzer":true}],"adet":0,"noktalar":[[0,0]],"guven":0.0,"not":"<gizli/kısmi görünen ürünler, sayımı zorlaştıran durumlar>"}`;
}
function parseJSON(t) { t = String(t).replace(/```json|```/g, ''); const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a < 0) throw new SyntaxError('Yapay zekâ beklenen formatta yanıt vermedi'); return JSON.parse(t.slice(a, b + 1)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
class AIError extends Error { constructor(m, retry) { super(m); this.retry = retry; } }
async function fetchJSON(url, opt, ms) {
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), ms);
  let res;
  try { res = await fetch(url, Object.assign({ signal: ac.signal }, opt)); }
  catch (e) { throw new AIError(e.name === 'AbortError' ? `Zaman aşımı (${ms / 1000} sn) – sunucu yanıt vermedi` : 'Bağlantı kesildi (“Load failed”): sunucu yoğun olabilir veya internet zayıf', true); }
  finally { clearTimeout(to); }
  let j = null; try { j = await res.json(); } catch (e) {}
  if (!res.ok) { const m = j?.error?.message || ('HTTP ' + res.status);
    throw new AIError(m, [408, 429, 500, 502, 503, 504, 529].includes(res.status) || /overload|demand|unavailable|try again/i.test(m)); }
  return j;
}
async function callAI(dataUrl, p, cropped, onStatus = () => {}) {
  const s = S.settings, img = dataUrl.split(',')[1];
  const ref = s.provider === 'demo' ? null : await refImage(p), prompt = buildPrompt(p, cropped, ref);
  const t0 = performance.now();
  if (s.provider === 'demo') {
    await sleep(900);
    const n = 8 + Math.floor(Math.random() * 30), pts = Array.from({ length: n }, () => [150 + Math.random() * 300, 100 + Math.random() * 800]);
    const multi = !cropped && Math.random() < .5;
    return { model: 'DEMO', ms: performance.now() - t0, r: { tespit_grup_id: p.gid, grup_uyumlu: true, olcu_uyumlu: 'belirsiz', gorulen: 'DEMO sonuç – gerçek analiz değil', okunan_yazilar: '',
      birden_fazla_urun: multi, alanlar: multi ? [{ grup_id: p.gid, aciklama: 'Üst istif', kutu: [120, 20, 480, 820], secili_benzer: true }, { grup_id: p.gid, aciklama: 'Alt istif', kutu: [520, 0, 980, 1000] }] : [],
      adet: n, noktalar: pts, guven: .5, not: 'Ayarlardan API anahtarı girin.' } };
  }
  let models, send;
  if (s.provider === 'gemini') {
    if (!s.geminiKey) throw new Error('Gemini API anahtarı girilmemiş (Yönetim → Ayarlar)');
    models = [s.geminiModel].concat(String(s.geminiFallback || '').split(',').map(x => x.trim()).filter(Boolean));
    const parts = [{ inline_data: { mime_type: 'image/jpeg', data: img } }]; if (ref) parts.push({ inline_data: { mime_type: 'image/jpeg', data: ref.data } }); parts.push({ text: prompt });
    send = async m => { const j = await fetchJSON(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': s.geminiKey },
        body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) }, 150000);
      const c = j.candidates?.[0]; if (!c?.content) throw new AIError('Gemini boş yanıt verdi (' + (c?.finishReason || j.promptFeedback?.blockReason || '?') + ')', true);
      return { r: parseJSON(c.content.parts.map(x => x.text || '').join('')), usage: j.usageMetadata }; };
  } else {
    if (!s.claudeKey) throw new Error('Claude API anahtarı girilmemiş (Yönetim → Ayarlar)');
    models = [s.claudeModel];
    const content = [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } }];
    if (ref) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: ref.data } });
    content.push({ type: 'text', text: prompt });
    send = async m => { const j = await fetchJSON('https://api.anthropic.com/v1/messages', { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': s.claudeKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: m, max_tokens: 8000, messages: [{ role: 'user', content }] }) }, 150000);
      return { r: parseJSON(j.content.map(c => c.text || '').join('')), usage: j.usage }; };
  }
  const tries = [];
  for (const m of models) for (let a = 1; a <= 3; a++) {
    onStatus(`${m} ile sayılıyor${a > 1 ? ` – ${a}. deneme` : ''}…`);
    try { const out = await send(m); return Object.assign({ model: m, ms: performance.now() - t0, deneme: tries.length + 1, ref: ref && ref.kind }, out); }
    catch (e) { tries.push(`${m}: ${e.message}`); if (!e.retry) { if (e instanceof SyntaxError) continue; throw new Error(e.message); }
      if (a < 3) { onStatus(`Sunucu yoğun, ${a * 3} sn sonra tekrar denenecek…`); await sleep(a * 3000); } }
  }
  throw new Error('Yapay zekâ şu an yanıt vermiyor. Denemeler:\n' + tries.slice(-4).join('\n'));
}
function vAI(ctx) {
  const p = P_BY[ctx.id], g = G_BY[p.gid];
  setTitle(ctx.mode === 'sayim' ? 'Fotoğrafla say' : ctx.mode === 'teslimat' ? 'Teslimat doğrulama' : 'AI Sayım Testi');
  const st = { orig: ctx.img || null, img: ctx.img || null, box: null, res: null, pts: [], err: null, busy: false, status: '', productOk: true, mark: false, drag: null };
  if (ctx.img) { delete ctx.img; if (ctx.auto) { delete ctx.auto; setTimeout(() => run(), 0); } }
  const refs = refsFor(g.id);
  const run = async () => {
    st.busy = true; st.err = null; st.res = null; st.pts = []; paint();
    try { st.res = await callAI(st.img, p, !!st.box, m => { st.status = m; const el = $('#stt'); if (el) el.textContent = m; });
      st.pts = (st.res.r.noktalar || []).filter(q => Array.isArray(q) && q.length >= 2).map(q => [Number(q[0]), Number(q[1])]); }
    catch (e) { st.err = e.message || String(e); }
    st.busy = false; paint();
  };
  const useBox = async box => { st.box = box; st.img = await cropImage(st.orig, box); st.mark = false; st.drag = null; run(); };
  const paint = () => {
    const r = st.res?.r;
    const uyum = r ? (r.grup_uyumlu !== false && (r.tespit_grup_id === g.id || !r.tespit_grup_id)) : null;
    const alanlar = r && !st.box && r.birden_fazla_urun && Array.isArray(r.alanlar) ? r.alanlar.filter(a => Array.isArray(a.kutu) && a.kutu.length === 4) : [];
    const multi = alanlar.length > 1, aiN = r ? Math.round(Number(r.adet) || 0) : 0, trusted = isTrusted(p.id);
    V().innerHTML = `
    <div class="card"><div style="display:flex;gap:10px;align-items:center">${S.imgs[p.id] ? `<span class="thumb" data-thumb="${esc(p.id)}"></span>` : ''}<div><div class="name" style="font-weight:650">${esc(p.ad)}</div><div class="muted small">${esc(p.kod)} · ${esc(g.ad)} · ${esc(depoAd(ctx.depo || p.depo))}${ctx.no ? ' · ' + esc(ctx.no) : ''}</div></div></div>
      ${refs.length && !st.img ? `<label>Bu grubun örnek fotoğrafları</label><div class="refs">${refs.map(x => `<img src="ref/${x}.jpg" alt="">`).join('')}</div>` : ''}</div>
    <input id="file" type="file" accept="image/*" capture="environment" hidden>
    <input id="file2" type="file" accept="image/*" hidden>
    ${!st.img ? `<div class="btns"><button class="btn" id="shot">📷 Fotoğraf çek</button><button class="btn sec" id="gal">🖼️ Galeriden</button></div>
      <div class="alert info small">İpucu: Ürünlere dik ve yakından çekin, flaş yansımasından kaçının. Kadrajda birden fazla ürün/istif varsa çekimden sonra <b>✂️ Alan işaretle</b> ile sayılacak bölgeyi seçin.${S.imgs[p.id] ? ' Bu stoğun yüklü görseli yapay zekâya referans olarak gönderilir.' : ''}</div>` : `
    ${st.mark ? `<div class="alert warn small">✂️ Parmağınızla sayılacak alanın etrafına <b>dikdörtgen çizin</b>.</div>` : ''}
    ${st.box && !st.mark ? `<div class="alert info small">✂️ Sadece işaretli alan sayılıyor. <a href="#" id="full">Tüm fotoğrafa dön</a></div>` : ''}
    <div class="photo ${st.mark ? 'marking' : ''}" id="ph"><img src="${st.mark ? st.orig : st.img}" alt="">
      ${st.mark && st.drag ? `<span class="box sel" style="${boxCss(st.drag)}"></span>` : ''}
      ${multi && !st.mark ? alanlar.map((a, i) => `<span class="box ${a.secili_benzer ? 'sel' : ''}" style="${boxCss(a.kutu)}"><i>${i + 1}</i></span>`).join('') : ''}
      ${!st.mark ? st.pts.map((q, i) => `<span class="dot ${q[2] ? 'user' : ''}" data-i="${i}" style="top:${q[0] / 10}%;left:${q[1] / 10}%">${st.pts.length <= 99 ? i + 1 : ''}</span>`).join('') : ''}</div>
    ${st.mark ? `<div class="btns"><button class="btn ghost" id="mc">Vazgeç</button><button class="btn" id="mo" ${st.drag && st.drag[2] - st.drag[0] > 30 && st.drag[3] - st.drag[1] > 30 ? '' : 'disabled'}>Bu alanı say</button></div>` : ''}
    ${st.busy ? `<div class="card" style="margin-top:12px"><span class="spinner"></span> <span id="stt">${esc(st.status || 'Yapay zekâ sayıyor…')}</span></div>` : ''}
    ${st.err ? `<div class="alert bad" style="white-space:pre-line">${esc(st.err)}</div>` : ''}
    ${!r && !st.busy && !st.mark ? `<div class="btns"><button class="btn" id="run">🤖 ${st.err ? 'Tekrar dene' : st.box ? 'İşaretli alanı say' : 'Yapay zekâ ile say'}</button></div>
      <div class="btns"><button class="btn sec" id="mk">✂️ Alan işaretle</button><button class="btn ghost" id="re">Yeniden çek</button></div>` : ''}
    ${r && !st.mark ? `
      ${multi ? `<div class="alert warn"><b>⚠ Fotoğrafta ${alanlar.length} ayrı ürün/istif var.</b> Doğru sayım için sayılacak alanı seçin:
        <div class="btns" style="flex-wrap:wrap">${alanlar.map((a, i) => `<button class="btn ${a.secili_benzer ? '' : 'sec'}" data-al="${i}" style="flex:1 1 45%">${i + 1}. ${esc(a.aciklama || G_BY[a.grup_id]?.ad || 'alan')}${a.secili_benzer ? ' ✓' : ''}</button>`).join('')}</div>
        <div class="btns"><button class="btn ghost" id="mk2">✂️ Kendim işaretleyeceğim</button></div></div>` : ''}
      ${uyum ? `<div class="alert ok">✓ Ürün grubu uyumlu: ${esc(r.gorulen || '')}${r.olcu_uyumlu === 'hayir' ? ' — <b>ölçü farklı görünüyor!</b>' : ''}</div>`
        : `<div class="alert bad"><b>⚠ YANLIŞ ÜRÜN OLABİLİR.</b> Seçilen: ${esc(g.ad)}. Fotoğrafta görülen: ${esc(G_BY[r.tespit_grup_id]?.ad || r.tespit_grup_id || '?')} — ${esc(r.gorulen || '')}</div>`}
      <div class="kpis"><div class="kpi"><b>${fmt(r.adet)}</b><span>AI adedi</span></div><div class="kpi"><b>${st.pts.length}</b><span>İşaretli nokta</span></div><div class="kpi"><b>${Math.round((r.guven || 0) * 100)}%</b><span>AI güveni</span></div></div>
      ${r.okunan_yazilar ? `<p class="small"><b>Okunan yazılar:</b> ${esc(r.okunan_yazilar)}</p>` : ''}
      ${r.not ? `<p class="small muted"><b>Not:</b> ${esc(r.not)}</p>` : ''}
      <p class="small muted">${esc(st.res.model)} · ${(st.res.ms / 1000).toFixed(1)} sn${st.res.deneme > 1 ? ` · ${st.res.deneme}. denemede` : ''}${st.res.ref ? ` · referans: ${st.res.ref === 'urun' ? 'ürün görseli' : 'grup örneği'}` : ''}. Fotoğrafa dokunarak eksik ürüne nokta ekleyin, yanlış noktaya dokunarak silin.</p>
      <div class="card verify"><h3 style="margin-top:0">${trusted ? '🤖 AI onaylı ürün – sonucu kaydedin' : 'Sayım doğru mu?'}</h3>
        <div class="big">${fmt(aiN)} <small>adet (yapay zekâ)</small></div>
        ${trusted ? `<p class="small" style="color:var(--ok)">Bu stokta yapay zekâ daha önce ${S.aiGuven[p.id].ok} kez doğru saydı; doğrudan kaydedebilirsiniz.</p>` : ''}
        <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="pok" style="width:auto" ${st.productOk ? 'checked' : ''}> Fotoğraftaki ürün gerçekten seçilen ürün</label>
        ${ctx.mode !== 'teslimat' && !S.imgs[p.id] ? `<label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" id="asimg" style="width:auto" checked> Bu fotoğrafı ürün görseli olarak kaydet</label>` : ''}
        ${!st.manual ? `<div class="btns"><button class="btn ok" id="yes">✓ ${trusted ? 'Direkt kaydet' : 'Doğru'} – ${fmt(aiN)} adet</button></div>
          <div class="btns"><button class="btn bad" id="no">✗ Yanlış / eksik – elle adet gir</button></div>`
        : `<label>Doğru adet (elle giriş)</label><input id="tq" class="bigin" inputmode="numeric" value="${st.tq ?? st.pts.length}">
          <p class="small muted">Fotoğrafa dokunarak eksik ürüne nokta ekleyebilir, fazlayı silebilirsiniz; nokta sayısı kutuya yazılır. İsterseniz doğrudan sayıyı yazın.</p>
          <div class="btns"><button class="btn ghost" id="nocancel">Vazgeç</button><button class="btn" id="save">Düzeltilmiş adedi kaydet</button></div>`}
        <div class="btns"><button class="btn sec" id="mk3">✂️ Alan işaretle</button><button class="btn ghost" id="re2">Yeni fotoğraf</button></div>
      </div>` : ''}`}`;
    fillThumbs(V());
    const f1 = $('#file'), f2 = $('#file2');
    const onFile = async e => { const f = e.target.files[0]; if (!f) return; st.orig = st.img = await prepImage(f, 1280); st.box = null; st.res = null; st.pts = []; st.err = null; st.tq = null; paint(); };
    f1.onchange = onFile; f2.onchange = onFile;
    const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
    on('shot', () => f1.click()); on('gal', () => f2.click());
    on('re', () => { st.img = st.orig = null; st.box = null; paint(); });
    on('re2', () => { st.img = st.orig = null; st.box = null; st.res = null; st.pts = []; paint(); });
    on('run', run);
    const startMark = () => { st.mark = true; st.drag = null; paint(); };
    on('mk', startMark); on('mk2', startMark); on('mk3', startMark);
    on('mc', () => { st.mark = false; st.drag = null; paint(); });
    on('mo', () => useBox(st.drag));
    const full = $('#full'); if (full) full.onclick = e => { e.preventDefault(); st.box = null; st.img = st.orig; st.res = null; st.pts = []; paint(); };
    V().querySelectorAll('[data-al]').forEach(b => b.onclick = () => useBox(alanlar[+b.dataset.al].kutu));
    const ph = $('#ph');
    if (ph && st.mark) {
      let s0 = null; const pos = e => { const b = ph.getBoundingClientRect(); return [Math.min(1000, Math.max(0, (e.clientY - b.top) / b.height * 1000)), Math.min(1000, Math.max(0, (e.clientX - b.left) / b.width * 1000))]; };
      ph.onpointerdown = e => { e.preventDefault(); ph.setPointerCapture(e.pointerId); s0 = pos(e); };
      ph.onpointermove = e => { if (!s0) return; const q = pos(e); st.drag = [Math.min(s0[0], q[0]), Math.min(s0[1], q[1]), Math.max(s0[0], q[0]), Math.max(s0[1], q[1])];
        let bx = ph.querySelector('.box.sel'); if (!bx) { bx = document.createElement('span'); bx.className = 'box sel'; ph.appendChild(bx); } bx.style.cssText = boxCss(st.drag); };
      ph.onpointerup = () => { if (!s0) return; s0 = null; const y = window.scrollY; paint(); window.scrollTo(0, y); };
    } else if (ph && st.res) ph.onclick = e => {
      if (e.target.classList.contains('dot')) st.pts.splice(+e.target.dataset.i, 1);
      else { const b = ph.getBoundingClientRect(); st.pts.push([(e.clientY - b.top) / b.height * 1000, (e.clientX - b.left) / b.width * 1000, 1]); }
      st.tq = null; st.manual = true; const y = window.scrollY; paint(); window.scrollTo(0, y);
    };
    if ($('#tq')) $('#tq').oninput = e => st.tq = e.target.value;
    if ($('#pok')) $('#pok').onchange = e => st.productOk = e.target.checked;
    on('no', () => { st.manual = true; paint(); setTimeout(() => { const t = $('#tq'); if (t) { t.focus(); t.select(); } }, 50); });
    on('nocancel', () => { st.manual = false; st.tq = null; paint(); });
    on('yes', () => finish(aiN));
    on('save', () => { const tq = num($('#tq').value); if (!(tq >= 0) || $('#tq').value.trim() === '') return toast('Doğru adedi girin'); finish(tq); });
    async function finish(tq) {
      const basarili = tq === aiN;
      if ($('#asimg') && $('#asimg').checked) await saveImg(p.id, st.orig);
      const thumb = await prepImage(st.img, 220).catch(() => null);
      const log = { t: now(), u: user.id, mode: ctx.mode, code: p.kod, id: p.id, ad: p.ad, gid: g.id, gad: g.ad, model: st.res.model, ms: Math.round(st.res.ms), deneme: st.res.deneme || 1,
        alan: st.box ? 'isaretli' : 'tum', cokluUrun: !!r.birden_fazla_urun, ref: st.res.ref || '', sonuc: basarili ? 'Başarılı' : 'Başarısız', guvenli: trusted,
        ai: aiN, isaret: st.pts.length, eklenen: st.pts.filter(q => q[2]).length, gercek: tq, guven: r.guven,
        tespit: r.tespit_grup_id, aiUyum: uyum, urunDogru: st.productOk, olcu: r.olcu_uyumlu, yazi: r.okunan_yazilar, not: r.not, thumb };
      S.aiLog.unshift(log);
      if (st.productOk) { const gv = S.aiGuven[p.id] = S.aiGuven[p.id] || { ok: 0, fail: 0 }; basarili ? gv.ok++ : gv.fail++; gv.son = basarili ? 'basarili' : 'basarisiz'; gv.t = now(); }
      if (ctx.mode === 'sayim') { const d = cnt(ctx.depo); d[p.id] = Object.assign(d[p.id] || {}, { q: tq, b: 'AD', t: now(), u: user.id, ai: aiN, aiT: now() }); }
      if (ctx.mode === 'teslimat') { const tr = S.teslimat.find(x => x.no === ctx.no); tr.durum = 'teslim'; tr.teslimT = now(); tr.dogrulama = { uyum, ai: aiN, gercek: tq };
        if (tq !== tr.qty) toast(`Dikkat: etikette ${tr.qty}, sayılan ${tq}`); }
      save(); toast(basarili ? `✓ ${fmt(tq)} adet kaydedildi – AI başarılı` : `${fmt(tq)} adet kaydedildi – AI başarısız (${fmt(aiN)} okumuştu)`);
      back(); if (ctx.mode === 'sayim' && stack.length && stack[stack.length - 1][0] === vUrun) back();
    }
  };
  paint();
}
const boxCss = b => `top:${b[0] / 10}%;left:${b[1] / 10}%;height:${(b[2] - b[0]) / 10}%;width:${(b[3] - b[1]) / 10}%`;

/* ---------- Excel: envanter formatında sayım sonucu (her hol ayrı sayfa) ---------- */
function loadXLSX() { return window.XLSX ? Promise.resolve() : new Promise((res, rej) => { const sc = document.createElement('script');
  sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; sc.onload = res; sc.onerror = () => rej(new Error('Excel kütüphanesi yüklenemedi (internet?)')); document.head.appendChild(sc); }); }
async function exportXlsx(ids) {
  try { await loadXLSX(); } catch (e) { return toast(e.message); }
  const wb = XLSX.utils.book_new(), H = ['Stok Kodu', 'Stok - Ürün Grubu', 'Stok Adı', 'Ölçü Br1', 'Ölçü Br2', 'Birim Adet', 'Yapay Zeka Okuma (AD)', 'Kullanıcı Sayım', 'Sayım Birimi', 'Doğrulama', 'Ek Girişler', 'Toplam (Br1)', 'Fark (Br1)', 'Not', 'Sayan', 'Sayım Zamanı'];
  const ozet = [['Hol No', 'Depo', 'Durum', 'Stok Kartı', 'Sayılan', 'Yapay Zeka Okunan', 'Başarılı', 'Başarısız', 'Başarı %']];
  const row = (p, c, not) => { const t = totals(c), ana = c ? (t[p.b1] || 0) : '', ek = c ? (c.ek || []).map(e => `${fmt(e.m)} ${e.b}${e.yer ? ' (' + e.yer + ')' : ''}`).join('; ') : '';
    return [p.kod, G_BY[p.gid].ad, p.ad, p.b1, p.b2 || '', p.netsis, c && c.ai != null ? c.ai : '', c && c.q != null ? c.q : '', c ? c.b : '', sonuc(c), ek, ana, c ? ana - (p.netsis || 0) : '', not || '', c ? c.u : '', c ? new Date(c.t).toLocaleString('tr-TR') : '']; };
  ids.forEach(did => {
    const d = cnt(did), own = PRODUCTS.filter(p => p.depo === did), extra = Object.keys(d).map(id => P_BY[id]).filter(p => p && p.depo !== did);
    const rows = [H].concat(own.map(p => row(p, d[p.id])), extra.map(p => row(p, d[p.id], `Normalde Hol ${holNo(p.depo)} · ${D_BY[p.depo].ad}`)));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [12, 26, 44, 8, 8, 10, 12, 12, 9, 11, 28, 11, 10, 26, 10, 18].map(w => ({ wch: w })); ws['!autofilter'] = { ref: `A1:P${rows.length}` };
    XLSX.utils.book_append_sheet(wb, ws, (`${holNo(did)}-${D_BY[did].ad}`).replace(/[\\/?*[\]:]/g, '').slice(0, 31));
    const cs = Object.values(d), ai = cs.filter(c => c.ai != null && c.q != null), ok = ai.filter(c => sonuc(c) === 'Başarılı').length;
    ozet.push([holNo(did), D_BY[did].ad, isClosed(did) ? 'Kapalı' : 'Açık', own.length, cs.length, ai.length, ok, ai.length - ok, ai.length ? Math.round(ok / ai.length * 100) + '%' : '']);
  });
  const wo = XLSX.utils.aoa_to_sheet(ozet); wo['!cols'] = [7, 24, 8, 10, 9, 16, 9, 10, 9].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, wo, 'Özet'); wb.SheetNames.unshift(wb.SheetNames.pop());
  XLSX.writeFile(wb, `Stok Sayım Sonucu ${ids.length === 1 ? 'Hol ' + holNo(ids[0]) + ' ' : ''}${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ---------- Yönetim ---------- */
function vAdmin(tab) {
  setTitle('Yönetim');
  V().innerHTML = `<div class="seg"><button data-t="rapor">Netsis fark</button><button data-t="ai">AI başarı</button><button data-t="veri">Veri</button><button data-t="ayar">Ayarlar</button></div><div id="A"></div>`;
  V().querySelectorAll('.seg button').forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => { stack[stack.length - 1][1] = [b.dataset.t]; vAdmin(b.dataset.t); }; });
  ({ rapor: aRapor, ai: aStats, veri: aVeri, ayar: aAyar })[tab]($('#A'));
}
function aRapor(A) {
  const sel = aRapor.depo || 'ALL', ds = sel === 'ALL' ? DEPOLAR.map(d => d.id) : [sel];
  const rows = [];
  ds.forEach(did => Object.entries(S.sayim[did] || {}).forEach(([id, c]) => {
    const p = P_BY[id]; if (!p) return; const t = totals(c), ana = t[p.b1] || 0;
    const diger = Object.entries(t).filter(([b]) => b !== p.b1).map(([b, v]) => `${fmt(v)} ${b}`).join(', ');
    rows.push({ did, p, c, ana, diger, fark: ana - (p.netsis || 0) });
  }));
  rows.sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark));
  const esit = rows.filter(r => r.fark === 0 && !r.diger).length;
  A.innerHTML = `<label>Depo / Hol</label><select id="dp"><option value="ALL">Tüm holler</option>${DEPOLAR.map(d => `<option value="${d.id}" ${d.id === sel ? 'selected' : ''}>${esc(depoAd(d.id))}${isClosed(d.id) ? ' 🔒' : ''}</option>`).join('')}</select>
    <div class="kpis" style="margin-top:12px"><div class="kpi"><b>${rows.length}</b><span>Sayılan kalem</span></div><div class="kpi"><b>${esit}</b><span>Netsis ile eşit</span></div><div class="kpi"><b>${rows.length - esit}</b><span>Farklı / birim farklı</span></div></div>
    <div class="alert info small">Fark, Netsis Br1 birimi üzerinden hesaplanır. Farklı birimle sayılanlar (ör. MT stoğun KG sayımı) "Diğer birim" sütununda; canlıda Br2 katsayısıyla çevrilecek. Netsis miktarı şimdilik Excel'deki "Birim Adet" sütunu.</div>
    <div class="btns"><button class="btn" id="xl">⬇️ Sayım sonucu – Excel (envanter formatı)</button></div>
    <div class="btns"><button class="btn sec" id="ex">⬇️ Fark listesi (CSV)</button></div>
    <div class="tablewrap card" style="margin-top:12px;padding:6px"><table><thead><tr><th>Stok</th><th class="n">Netsis</th><th class="n">Yapay zekâ</th><th class="n">Kullanıcı</th><th>Doğrulama</th><th class="n">Diğer birim</th><th class="n">Fark</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(r.p.ad)}<div class="muted small">${esc(r.p.kod)} · Hol ${esc(holNo(r.did))} · ${esc(r.c.u)} · ${dt(r.c.t)}</div></td><td class="n">${fmt(r.p.netsis)} ${esc(r.p.b1)}</td><td class="n">${r.c.ai != null ? fmt(r.c.ai) : '–'}</td><td class="n">${fmt(r.ana)}</td><td>${sonucPill(r.c)}</td><td class="n">${esc(r.diger)}</td>
      <td class="n"><span class="pill ${r.fark === 0 ? 'ok' : 'bad'}">${r.fark > 0 ? '+' : ''}${fmt(r.fark)}</span></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Sayım yok.</td></tr>'}</tbody></table></div>`;
  $('#dp').onchange = e => { aRapor.depo = e.target.value; aRapor(A); };
  $('#xl').onclick = () => exportXlsx(sel === 'ALL' ? DEPOLAR.map(d => d.id) : [sel]);
  $('#ex').onclick = () => {
    const out = [['Hol No', 'Depo', 'Durum', 'Ürün Grubu', 'Stok Kodu', 'Stok Adı', 'Br1', 'Br2', 'Netsis Miktar', 'Sayım (Br1)', 'Diğer Birimler', 'Fark (Br1)', 'Ana Sayım', 'Ana Birim', 'AI Adedi', 'Sayan', 'Zaman']]
      .concat(rows.map(r => [holNo(r.did), D_BY[r.did].ad, isClosed(r.did) ? 'Kapalı' : 'Açık', G_BY[r.p.gid].ad, r.p.kod, r.p.ad, r.p.b1, r.p.b2 || '', r.p.netsis, r.ana, r.diger, r.fark, r.c.q ?? '', r.c.b, r.c.ai ?? '', r.c.u, r.c.t]));
    out.push([]); out.push(['EK GİRİŞ DETAYI']); out.push(['Hol No', 'Stok Kodu', 'Stok Adı', 'Miktar', 'Birim', 'Bulunduğu yer', 'Giren', 'Zaman']);
    rows.forEach(r => (r.c.ek || []).forEach(e => out.push([holNo(r.did), r.p.kod, r.p.ad, e.m, e.b, e.yer, e.u, e.t])));
    csv(`sayim-fark-${sel === 'ALL' ? 'tum' : 'hol' + holNo(sel)}-${new Date().toISOString().slice(0, 10)}.csv`, out);
  };
}
function stats(list) {
  const n = list.length; if (!n) return null;
  const err = list.map(l => Math.abs(l.ai - l.gercek) / Math.max(l.gercek, 1));
  const tanima = list.filter(l => l.aiUyum === l.urunDogru).length, yanlis = list.filter(l => !l.urunDogru);
  return { n, tam: list.filter(l => l.ai === l.gercek).length / n, yakin: err.filter(e => e <= .05).length / n, mape: err.reduce((a, b) => a + b, 0) / n, tanima: tanima / n,
    yanlisYakalandi: yanlis.length ? yanlis.filter(l => !l.aiUyum).length / yanlis.length : null };
}
const pct = x => x == null ? '–' : Math.round(x * 100) + '%';
function aStats(A) {
  const all = stats(S.aiLog);
  const keys = [...new Set(S.aiLog.map(l => l.gid))];
  const byG = keys.map(k => ({ ad: G_BY[k]?.ad || S.aiLog.find(l => l.gid === k).gad || k, s: stats(S.aiLog.filter(l => l.gid === k)) }));
  const verdict = s => s.yakin >= .9 ? ['AI yeterli – sadece onay', 'ok'] : s.yakin >= .6 ? ['AI + kullanıcı düzeltme', 'warn'] : ['Elle sayım / tartı', 'bad'];
  A.innerHTML = !all ? '<p class="muted">Henüz AI testi yok. Ana sayfa → AI Sayım Testi ile başlayın.</p>' : `
    <div class="kpis"><div class="kpi"><b>${all.n}</b><span>Test</span></div><div class="kpi"><b>${pct(all.yakin)}</b><span>±%5 içinde</span></div><div class="kpi"><b>${pct(all.tanima)}</b><span>Ürün tanıma</span></div></div>
    <div class="tablewrap card" style="margin-top:12px;padding:6px"><table><thead><tr><th>Grup</th><th class="n">Test</th><th class="n">Tam</th><th class="n">±%5</th><th class="n">Ort. sapma</th><th class="n">Tanıma</th><th>Öneri</th></tr></thead><tbody>
    ${byG.map(({ ad, s }) => { const v = verdict(s); return `<tr><td>${esc(ad)}</td><td class="n">${s.n}</td><td class="n">${pct(s.tam)}</td><td class="n">${pct(s.yakin)}</td><td class="n">${pct(s.mape)}</td><td class="n">${pct(s.tanima)}</td><td><span class="pill ${v[1]}">${v[0]}</span></td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="muted small">Tanıma: AI'nın "uyumlu/uyumsuz" kararının kullanıcının işaretiyle örtüşme oranı${all.yanlisYakalandi != null ? ` · yanlış ürün yakalama: ${pct(all.yanlisYakalandi)}` : ''}.</p>
    <div class="btns"><button class="btn sec" id="ex">⬇️ Test kayıtlarını indir (CSV)</button></div>
    <h3>Son testler</h3><div class="list">${S.aiLog.slice(0, 30).map(l => `<div class="row">${l.thumb ? `<img src="${l.thumb}" style="width:56px;height:56px;object-fit:cover;border-radius:8px">` : ''}<div class="grow"><div class="name">${esc(l.ad)}</div>
      <div class="meta">AI ${l.ai} · gerçek ${l.gercek} · ${esc(l.model)} · ${dt(l.t)}</div></div><span class="pill ${l.ai === l.gercek ? 'ok' : Math.abs(l.ai - l.gercek) / Math.max(l.gercek, 1) <= .05 ? 'warn' : 'bad'}">${l.ai - l.gercek > 0 ? '+' : ''}${l.ai - l.gercek}</span></div>`).join('')}</div>`;
  if ($('#ex')) $('#ex').onclick = () => csv(`ai-sayim-testleri-${new Date().toISOString().slice(0, 10)}.csv`,
    [['Zaman', 'Kullanıcı', 'Mod', 'Stok Kodu', 'Stok Adı', 'Grup', 'Model', 'Süre ms', 'Deneme', 'Alan', 'Referans', 'AI Adet', 'İşaretli', 'Elle Eklenen', 'Gerçek', 'Sapma %', 'AI Güven', 'AI Tespit Grup', 'AI Uyumlu', 'Ürün Gerçekten Doğru', 'Ölçü', 'Okunan Yazı', 'Not']]
      .concat(S.aiLog.map(l => [l.t, l.u, l.mode, l.code, l.ad, G_BY[l.gid]?.ad || l.gad || l.gid, l.model, l.ms, l.deneme, l.alan, l.ref, l.ai, l.isaret, l.eklenen, l.gercek, Math.round((l.ai - l.gercek) / Math.max(l.gercek, 1) * 1000) / 10, l.guven, l.tespit, l.aiUyum, l.urunDogru, l.olcu, l.yazi, l.not])));
}
function aVeri(A) {
  const lab = { mukerrer_kod: 'Mükerrer stok kodu (aynı kod birden fazla üründe)', kodsuz: 'Stok kodu boş', isimsiz: 'Stok adı boş', grup_duzeltme: 'Otomatik düzeltilen grup adı (Excel sürükle-doldur hatası)' };
  const nImg = Object.keys(S.imgs).length;
  A.innerHTML = `<div class="kpis"><div class="kpi"><b>${PRODUCTS.length}</b><span>Stok kartı</span></div><div class="kpi"><b>${(UYARI.mukerrer_kod || []).length}</b><span>Mükerrer kod satırı</span></div><div class="kpi"><b>${nImg}</b><span>Görseli olan</span></div></div>
    <div class="alert warn small">Netsis'e aktarımda stok kodları benzersiz olmalı. Aşağıdakiler "Stok Envanter v2.xlsx" dosyasında düzeltilmeli; uygulama şimdilik mükerrerleri ~2, ~3 ekiyle ayırıyor.</div>
    ${Object.entries(UYARI).map(([k, v]) => `<div class="card"><h3 style="margin-top:0">${esc(lab[k] || k)} <span class="pill warn">${v.length}</span></h3><div class="small" style="max-height:260px;overflow:auto">${v.map(x => `<div style="padding:3px 0;border-bottom:1px solid var(--line)">${esc(x)}</div>`).join('')}</div></div>`).join('')}
    <div class="btns"><button class="btn sec" id="ex">⬇️ Veri kontrol listesini indir (CSV)</button></div>`;
  $('#ex').onclick = () => csv('stok-veri-kontrol.csv', [['Tür', 'Detay']].concat(Object.entries(UYARI).flatMap(([k, v]) => v.map(x => [lab[k] || k, x]))));
}
function aAyar(A) {
  const s = S.settings;
  A.innerHTML = `
  <div class="card"><h3 style="margin-top:0">Yapay zekâ</h3>
    <label>Sağlayıcı</label><select id="pv"><option value="demo">DEMO (anahtarsız, rastgele)</option><option value="gemini">Google Gemini</option><option value="claude">Anthropic Claude</option></select>
    <div id="gm"><label>Gemini API anahtarı</label><input id="gk" type="password" value="${esc(s.geminiKey)}" placeholder="AIza…">
      <label>Gemini modeli</label><input id="gmo" value="${esc(s.geminiModel)}" list="gml"><datalist id="gml"><option value="gemini-3.8-flash"><option value="gemini-3.5-flash-lite"><option value="gemini-3.1-pro-preview"><option value="gemini-4-argon"></datalist>
      <label>Yedek modeller (yoğunlukta sırayla denenir, virgülle)</label><input id="gfb" value="${esc(s.geminiFallback || '')}" placeholder="gemini-3.5-flash-lite"></div>
    <div id="cm"><label>Claude API anahtarı</label><input id="ck" type="password" value="${esc(s.claudeKey)}" placeholder="sk-ant-…">
      <label>Claude modeli</label><input id="cmo" value="${esc(s.claudeModel)}"></div>
    <div class="alert warn small">Anahtar yalnızca bu cihazın tarayıcısında saklanır. Canlıda anahtar sunucuda (Supabase Edge Function) tutulacak. Bütçe limitli bir anahtar kullanın.</div>
  </div>
  <div class="card"><h3 style="margin-top:0">Hol numaraları</h3><p class="small muted">Depolar Excel sayfalarından gelir; hol numarasını depodaki fiili yerleşime göre verin.</p>
    ${DEPOLAR.map(d => `<div class="unitrow" style="margin-top:6px"><input value="${esc(d.ad)}" disabled><input class="holin" data-d="${d.id}" inputmode="numeric" value="${esc(holNo(d.id))}" style="width:80px;flex:none;text-align:center"></div>`).join('')}</div>
  <div class="card"><h3 style="margin-top:0">Müşteriler (${s.musteriler.length})</h3><label>Excel'den yapıştırın: Cari Kod [TAB veya ;] Ünvan — her satıra bir müşteri</label><textarea id="mu">${esc(s.musteriler.map(m => m.join('\t')).join('\n'))}</textarea></div>
  <div class="card"><h3 style="margin-top:0">Şifreler</h3><label>sayim kullanıcısı</label><input id="p1" value="${esc(S.users.sayim.pass)}"><label>admin</label><input id="p2" value="${esc(S.users.admin.pass)}"></div>
  <div class="btns"><button class="btn" id="sv">Kaydet</button></div>
  <div class="btns"><button class="btn ghost" id="clr">Sayım ve test kayıtlarını sıfırla</button></div>`;
  $('#pv').value = s.provider;
  const vis = () => { $('#gm').hidden = $('#pv').value !== 'gemini'; $('#cm').hidden = $('#pv').value !== 'claude'; }; $('#pv').onchange = vis; vis();
  $('#sv').onclick = () => {
    Object.assign(s, { provider: $('#pv').value, geminiKey: $('#gk').value.trim(), geminiModel: $('#gmo').value.trim(), geminiFallback: $('#gfb').value.trim(), claudeKey: $('#ck').value.trim(), claudeModel: $('#cmo').value.trim(),
      musteriler: $('#mu').value.split('\n').map(l => l.split(/\t|;/).map(x => x.trim())).filter(x => x[0]).map(x => [x[0], x[1] || x[0]]) });
    A.querySelectorAll('.holin').forEach(i => { const v = i.value.trim(); if (v) s.hol[i.dataset.d] = v; else delete s.hol[i.dataset.d]; });
    if ($('#p1').value) S.users.sayim.pass = $('#p1').value; if ($('#p2').value) S.users.admin.pass = $('#p2').value;
    save(); toast('Ayarlar kaydedildi');
  };
  $('#clr').onclick = () => { if (confirm('Tüm sayım, teslimat ve AI test kayıtları silinsin mi? (Ürün görselleri kalır)')) { S.sayim = {}; S.kapali = {}; S.teslimat = []; S.aiLog = []; save(); toast('Temizlendi'); } };
}

/* ---------- Başlat ---------- */
$('#btnBack').onclick = back;
$('#btnUser').onclick = () => { if (confirm('Çıkış yapılsın mı?')) { user = null; try { sessionStorage.removeItem('ys_user'); } catch (e) {} stack.length = 0; go(vLogin); } };
(async () => {
  load();
  try { const d = await (await fetch('data/urunler.json?v=3')).json();
    DEPOLAR = d.depolar; GROUPS = d.gruplar; UYARI = d.uyarilar || {};
    PRODUCTS = d.urunler.map(r => ({ id: r[0], kod: r[1], ad: r[2], depo: r[3], gid: r[4], b1: r[5], b2: r[6], netsis: r[7] }));
    const cc = {}; PRODUCTS.forEach(p => cc[p.kod] = (cc[p.kod] || 0) + 1); PRODUCTS.forEach(p => p.dup = p.kod && cc[p.kod] > 1);
  } catch (e) { V().innerHTML = '<div class="alert bad">Ürün listesi yüklenemedi (data/urunler.json).</div>'; return; }
  DEPOLAR.forEach(d => D_BY[d.id] = d); GROUPS.forEach(g => G_BY[g.id] = g); PRODUCTS.forEach(p => P_BY[p.id] = p);
  user && S.users[user.id] ? home() : go(vLogin);
})();
