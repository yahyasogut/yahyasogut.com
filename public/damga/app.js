/* Elmaslar Damga Takip · yahyasogut.com/damga · v1 */
(function(){
"use strict";
const CFG = window.DAMGA_CONFIG || {};
const APP_URL = CFG.APP_URL || (location.origin + "/damga/");
const PUBLIC_QR_URL = CFG.PUBLIC_QR_URL || (location.origin + "/damga/c/");
const DEPOT = Object.assign({ k: "_depot", n: "Elmaslar — Atölye", a: "Muratpaşa Mah. 567 Sok. Tezcan Apt. No:57/A", i: "MURATPAŞA", lat: 36.8915, lng: 30.7165 }, CFG.DEPOT || {});
const CAT = {
  tamam:{l:"Tamamlandı",c:"var(--ok)"}, bekliyor:{l:"Bekliyor",c:"var(--wait)"}, tekrar:{l:"Tekrar ziyaret",c:"var(--retry)"},
  tutanak:{l:"Tutanak",c:"var(--tut)"}, islenecek:{l:"Yapıldı · sisteme işlenecek",c:"var(--brand)"}, cihazyok:{l:"Cihaz yok",c:"var(--off)"}, kapsamdisi:{l:"Kapandı / iptal",c:"var(--off)"}, baskasi:{l:"Başkası damgaladı",c:"var(--off)"}
};
const REASONS = [
  ["yapilmadi","Yapılmadı","YAPILMADI"],["yoktu","Cihaz yoktu","YOK"],["sonra","Sonra gelinecek","SONRA GELİNECEK"],
  ["kapali","İşyeri kapalı","MAĞAZA KAPALI"],["ulasilamadi","Yetkili yoktu / ulaşılamadı","ULAŞILAMADI"],["istemedi","Müşteri istemedi","İSTEMEDİ"],["diger","Diğer","DİĞER"]
];
const RL = Object.fromEntries(REASONS.map(r => [r[0], r]));
const ILCE_C = {"MURATPAŞA":[36.884,30.722],"KEPEZ":[36.93,30.705],"KONYAALTI":[36.872,30.64],"DÖŞEMEALTI":[37.02,30.6],"AKSU":[36.945,30.84],"ALANYA":[36.545,32.0],"MANAVGAT":[36.787,31.443],"SERİK":[36.917,31.1],"KORKUTELİ":[37.065,30.196],"ELMALI":[36.737,29.917],"KUMLUCA":[36.37,30.291],"FİNİKE":[36.3,30.146],"KAŞ":[36.2,29.638],"KEMER":[36.598,30.56],"GAZİPAŞA":[36.269,32.317],"BUCAK":[37.459,30.595],"DEMRE":[36.245,29.985]};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => Number(n).toLocaleString("tr-TR");
const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
const titleTR = s => String(s||"").toLocaleLowerCase("tr-TR").replace(/(^|[\s\-\/(.])(\S)/g,(m,a,b)=>a+b.toLocaleUpperCase("tr-TR"));
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const hm = m => { m = Math.round(m); const h = Math.floor(m/60), mm = m%60; return h ? `${h} sa ${mm} dk` : `${mm} dk`; };
const clock = (start, add) => { const [h,m] = start.split(":").map(Number); let t = h*60+m+Math.round(add); return `${String(Math.floor(t/60)%24).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`; };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} };
const TEAM_C = ["var(--brand)","var(--retry)","var(--tut)","var(--wait)","var(--ok)"];
const YEAR = new Date().getFullYear();

/* ---------------- Supabase ---------------- */
const configured = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
const sb = configured ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "elmaslar-damga" } }) : null;
async function q(p){ const { data, error } = await p; if (error) throw error; return data; }
async function fetchAll(table, select = "*", order = "id"){
  let out = [], from = 0; const N = 1000;
  for (;;){ const rows = await q(sb.from(table).select(select).order(order).range(from, from + N - 1)); out = out.concat(rows); if (rows.length < N) break; from += N; }
  return out;
}

/* ---------------- data (filled after login) ---------------- */
let LOCS = [], BY = {}, DEVS = [], DEVBY = {}, DEVID = {}, S = null;
// device tuple: [0 id,1 cins,2 marka,3 model,4 seri,5 maxHam,6 sonDamga,7 yer,8 grup,9 durumHam,10 fatura,11 qrNo,12 max,13 kimeAit,14 bilgi,15 seriFlag,16 sinif,17 excelRow,18 e,19 qrKey,20 tip,21 min,22 d,23 aktif]
function devTuple(r){ return [r.id, r.cins||"", r.marka||"", r.model||"", r.seri_no||"", r.max_cap||"", r.son_damga_yili ? String(r.son_damga_yili) : "", r.kullanim_yeri||"", r.aktif === false ? "kapsamdisi" : (r.durum_grup||"bekliyor"), r.durum_ham||"", r.fatura_notu||"", r.qr_no||("ID"+r.id), r.max_cap||"", r.kime_ait||"", r.bilgi||"", r.seri_flag||"", r.sinif||"III", r.excel_row||"", r.e||"", r.qr_key||"", r.tip||"", r.min_cap||"", r.d||"", r.aktif !== false]; }
const PREC = { google: "ok", elle: "ok", "yaklasik-mah": "mah" };
function buildData(biz, devs){
  BY = {}; LOCS = biz.map(b => { const l = { k: b.id, n: b.unvan || "", a: b.adres || "", i: b.ilce || "", il: b.il || "ANTALYA", t: b.tel || b.gsm || "", lat: b.lat ?? ILCE_C[b.ilce]?.[0] ?? DEPOT.lat, lng: b.lng ?? ILCE_C[b.ilce]?.[1] ?? DEPOT.lng, p: PREC[b.geo_src] || "ilce", src: b.geo_src, dep: !!b.is_depot, d: [] }; BY[l.k] = l; return l; });
  DEVS = []; DEVBY = {}; DEVID = {};
  devs.forEach(r => { const l = BY[r.business_id]; if (!l) return; const d = devTuple(r); l.d.push(d); const o = { d, l }; DEVS.push(o); DEVBY[d[11]] = o; DEVID[d[0]] = o; });
  LOCS = LOCS.filter(l => l.d.length || l.dep);
  S = computeSummary();
}
function computeSummary(){
  const tru = s => String(s||"").toLocaleUpperCase("tr-TR").trim();
  const all = DEVS, dep = all.filter(o => o.l.dep), fo = all.filter(o => !o.l.dep);
  const cnt = (arr, f) => arr.reduce((m, o) => { const k = f(o); if (k !== null && k !== undefined && k !== "") m[k] = (m[k]||0) + 1; return m; }, {});
  const open = ["bekliyor","tekrar","tutanak"];
  const ilce = Object.entries(fo.reduce((m, o) => { (m[o.l.i] = m[o.l.i] || []).push(o); return m; }, {})).filter(([i]) => i).map(([i, g]) => ({ i, n: g.length,
    tamam: g.filter(o => o.d[8]==="tamam").length, bek: g.filter(o => o.d[8]==="bekliyor").length, tek: g.filter(o => o.d[8]==="tekrar").length, tut: g.filter(o => o.d[8]==="tutanak").length,
    dis: g.filter(o => ["cihazyok","kapsamdisi","baskasi"].includes(o.d[8])).length })).sort((a,b) => b.n - a.n);
  const tc = {}; fo.filter(o => open.includes(o.d[8])).forEach(o => { const k = o.l.n; const t = tc[k] = tc[k] || { n: k, d: 0, locs: new Set(), b: 0, t: 0, u: 0 }; t.d++; t.locs.add(o.l.k); if (o.d[8]==="bekliyor") t.b++; if (o.d[8]==="tekrar") t.t++; if (o.d[8]==="tutanak") t.u++; });
  const topOpen = Object.values(tc).map(t => ({ n: t.n, d: t.d, l: t.locs.size, b: t.b, t: t.t, u: t.u })).sort((a,b) => b.d - a.d).slice(0, 12);
  const raw = Object.entries(cnt(all.filter(o => o.d[8] !== "tamam"), o => o.d[8] + "|" + (tru(o.d[9]) || "(boş)"))).map(([k, n]) => { const [c, v] = k.split("|"); return { c, v, n }; });
  const yrs = all.map(o => +o.d[6] || null); const yil = {}; yrs.forEach(y => { if (y >= YEAR - 11 && y <= YEAR) yil[y] = (yil[y]||0) + 1; });
  const fatura = Object.fromEntries(Object.entries(cnt(all, o => tru(o.d[10]).replace(/FATURASI KESİLDİ|FATURA KESİDİ|^KESİLDİ$/, "FATURA KESİLDİ").replace(/^CEZA$/, "CEZALI"))).sort((a,b) => b[1]-a[1]).slice(0, 8));
  const locOpen = new Set(fo.filter(o => ["bekliyor","tekrar"].includes(o.d[8])).map(o => o.l.k));
  return { total: all.length, locs: LOCS.filter(l => !l.dep).length, cust: new Set(LOCS.map(l => tru(l.n))).size,
    cat: Object.assign({ tamam:0,islenecek:0,bekliyor:0,tekrar:0,tutanak:0,cihazyok:0,kapsamdisi:0,baskasi:0 }, cnt(all, o => o.d[8])),
    dep: { n: dep.length, cats: cnt(dep, o => o.d[8]) }, fieldOpenDev: fo.filter(o => open.includes(o.d[8])).length, fieldOpenLocPure: locOpen.size,
    ilce, topOpen, raw, fatura, yil, yilOld: yrs.filter(y => y && y < YEAR - 11).length, yilNA: yrs.filter(y => !y).length,
    dq: { durumBos: all.filter(o => !o.d[9]).length, durumYazim: new Set(all.map(o => tru(o.d[9])).filter(Boolean)).size,
      ilTel: 0, markaVar: new Set(all.map(o => o.d[2]).filter(Boolean)).size, adresKisa: LOCS.filter(l => l.a.length < 20).length,
      seriYok: all.filter(o => o.d[15] === "seri-yok").length, seriTekrar: all.filter(o => o.d[15] === "seri-tekrar").length,
      konumYaklasik: LOCS.filter(l => !l.dep && l.p !== "ok").length } };
}

/* ---------------- state ---------------- */
const st = {
  view: "ozet", role: "admin", isAdmin: false, me: null, profile: null, ready: false,
  plans: [], results: {}, events: {}, staff: [], regions: [], invites: [], names: {},
  df: { q: "", ilce: "", s: [], next: "", flag: false, dep: false, page: 0 }, dsel: new Set(), devCode: null, cardAs: null, evReason: null,
  f: { q: "", ilce: [], cust: [], cats: { bekliyor: true, tekrar: true, tutanak: false }, showDone: false, region: "" },
  dd: null, ddq: { ilce: "", cust: "" }, poolView: "liste",
  sel: [], routes: null, editing: null, confirmDel: null, shared: null, showMsg: null,
  cfg: { date: todayISO(), start: "08:30", end: "18:00", svc: 15, costKm: 6, ret: true, teams: 1, perLink: 10 },
  fieldPlan: null, open: null, reasonFor: null, draft: {}, imp: null, geoRun: null,
  rp: { view: "musteri", il: "", ilce: "", durum: "", q: "", page: 0 }
};

/* ---------------- store ---------------- */
const planRow = p => { const { id, gid, team, teams, date, staffId, staffName, phone, ...data } = p; return { id, gid, team, teams, date, staff_id: staffId || null, staff_name: staffName || "", phone: phone || "", data }; };
const planFrom = r => ({ ...(r.data || {}), id: r.id, gid: r.gid, team: r.team, teams: r.teams, date: r.date, staffId: r.staff_id || "", staffName: r.staff_name, phone: r.phone });
const resultFrom = r => ({ planId: r.plan_id, k: r.business_id, st: r.st, done: (r.done || []).map(Number), note: r.note || "", by: r.by, at: r.at });
const eventFrom = r => ({ id: r.id, devId: r.device_id, code: DEVID[r.device_id]?.d[11], type: r.type, year: r.year, e: r.e, reason: r.reason, note: r.note || "", by: r.by, at: r.at });
const staffFrom = r => ({ id: r.id, name: r.ad || r.email || "İsimsiz", phone: r.tel || "", email: r.email || "", rol: r.rol, bolge: r.bolge_id, aktif: r.aktif });
async function loadDynamic(){
  const [plans, results, events, staff, regions, invites] = await Promise.all([
    q(sb.from("plans").select("*").order("date", { ascending: false }).limit(1000)),
    q(sb.from("results").select("*").limit(5000)),
    q(sb.from("events").select("*").order("at", { ascending: false }).limit(5000)),
    q(sb.from("profiles").select("*").order("ad")),
    q(sb.from("regions").select("*").order("ad")),
    st.isAdmin ? q(sb.from("invites").select("*").order("ad")).catch(() => []) : Promise.resolve([])]);
  st.plans = plans.map(planFrom);
  st.results = Object.fromEntries(results.map(r => [r.id, resultFrom(r)]));
  st.events = Object.fromEntries(events.map(r => [r.id, eventFrom(r)]));
  st.staff = staff.filter(s => s.aktif !== false).map(staffFrom); st.staffAll = staff.map(staffFrom);
  st.regions = regions; st.invites = invites || [];
}
async function loadAll(){
  const [biz, devs] = await Promise.all([fetchAll("businesses"), fetchAll("devices")]);
  buildData(biz, devs); await loadDynamic();
}
async function reloadDevices(){ const [biz, devs] = await Promise.all([fetchAll("businesses"), fetchAll("devices")]); buildData(biz, devs); }
async function savePlan(p){ await q(sb.from("plans").upsert(planRow(p))); const i = st.plans.findIndex(x => x.id === p.id); i >= 0 ? st.plans[i] = p : st.plans.push(p); }
async function deletePlan(id){ await q(sb.from("plans").delete().eq("id", id)); st.plans = st.plans.filter(p => p.id !== id); }
async function saveResult(r){
  const id = r.planId + "__" + r.k;
  await q(sb.from("results").upsert({ id, plan_id: r.planId, business_id: r.k, st: r.st, done: r.done, note: r.note, at: r.at }));
  st.results[id] = r; r.done.forEach(x => { const o = DEVID[x]; if (o){ o.d[8] = "tamam"; o.d[6] = String(Math.max(+o.d[6] || 0, YEAR)); } }); render();
}
async function clearResult(planId, k){ const id = planId + "__" + k; await q(sb.from("results").delete().eq("id", id)); delete st.results[id]; render(); }
async function saveGeo(k, lat, lng, src = "elle"){ await q(sb.rpc("set_business_location", { p_id: k, p_lat: lat, p_lng: lng, p_src: src })); const l = BY[k]; if (l){ l.lat = lat; l.lng = lng; l.p = "ok"; l.src = src; } }
async function addEvent(ev){
  const o = DEVBY[ev.code]; if (!o) throw new Error("cihaz bulunamadı");
  await q(sb.rpc("record_device_event", { p_device: o.d[0], p_type: ev.type, p_year: ev.year ?? null, p_e: ev.e ?? null, p_reason: ev.reason ?? null, p_note: ev.note || "" }));
  if (ev.type === "damga"){ o.d[6] = String(Math.max(+o.d[6] || 0, ev.year)); o.d[8] = "tamam"; }
  if (ev.type === "hassasiyet") o.d[18] = ev.e;
  const id = "local" + Date.now(); st.events[id] = { ...ev, devId: o.d[0], by: st.me, at: new Date().toISOString() };
}
const staffBy = id => (st.staffAll || st.staff).find(s => s.id === id);
function waPhone(t){ let d = String(t||"").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("00")) d = d.slice(2); if (d.startsWith("0")) d = "90" + d.slice(1); if (d.length === 10 && d[0] === "5") d = "90" + d; return d; }
function downloadFile(name, data, type = "text/csv;charset=utf-8"){
  const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------------- Google Maps (isteğe bağlı) ---------------- */
let gmapsP = null;
function loadGoogle(){
  if (!CFG.GOOGLE_MAPS_KEY) return Promise.reject(new Error("Google anahtarı tanımlı değil"));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (gmapsP) return gmapsP;
  gmapsP = new Promise((res, rej) => { window.__gmapsReady = () => res(window.google.maps);
    const s = document.createElement("script"); s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(CFG.GOOGLE_MAPS_KEY)}&v=weekly&language=tr&region=TR&callback=__gmapsReady`;
    s.async = true; s.onerror = () => { gmapsP = null; rej(new Error("Google Maps yüklenemedi")); }; document.head.appendChild(s); });
  return gmapsP;
}
/* ---------------- geo + routing ---------------- */
function pos(l){ if (l.k === "_depot") return { lat: DEPOT.lat, lng: DEPOT.lng, p: "ok" }; return { lat: l.lat, lng: l.lng, p: l.p }; }
function hav(a, b){ const R = 6371, r = Math.PI/180; const dLa = (b.lat-a.lat)*r, dLo = (b.lng-a.lng)*r;
  const x = Math.sin(dLa/2)**2 + Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
const ROAD = 1.35;
const road = (a, b) => hav(a, b) * ROAD;
const driveMin = km => km / (km > 20 ? 70 : km > 6 ? 45 : 26) * 60;
function tourLen(seq, P, ret){ let s = 0; for (let i = 0; i < seq.length - 1; i++) s += road(P[seq[i]], P[seq[i+1]]); if (ret && seq.length > 1) s += road(P[seq[seq.length-1]], P[0]); return s; }
function optimize(keys, ret){
  const P = [pos(DEPOT), ...keys.map(k => pos(BY[k]))], n = P.length;
  const D = P.map(a => P.map(b => road(a, b)));
  // nearest neighbour from depot
  const seen = new Array(n).fill(false); seen[0] = true; let r = [0];
  for (let s = 1; s < n; s++){ const last = r[r.length-1]; let best = -1, bd = 1e9;
    for (let j = 1; j < n; j++) if (!seen[j] && D[last][j] < bd){ bd = D[last][j]; best = j; }
    seen[best] = true; r.push(best); }
  // 2-opt (start fixed at depot; end at depot when ret)
  let improved = true, guard = 0;
  while (improved && guard++ < 200){ improved = false;
    for (let i = 1; i < n - 1; i++) for (let k = i + 1; k < n; k++){
      const a = r[i-1], b = r[i], c = r[k], d = k + 1 < n ? r[k+1] : (ret ? 0 : -1);
      const delta = D[a][c] - D[a][b] + (d >= 0 ? D[b][d] - D[c][d] : 0);
      if (delta < -1e-9){ r = r.slice(0, i).concat(r.slice(i, k+1).reverse(), r.slice(k+1)); improved = true; }
    } }
  return r.slice(1).map(i => keys[i-1]);
}
function schedule(stops, cfg){
  let t = 0, km = 0, drive = 0, svcT = 0, prev = pos(DEPOT); const legs = [];
  const [eh, em] = cfg.end.split(":").map(Number), [sh, sm] = cfg.start.split(":").map(Number);
  const limit = (eh*60+em) - (sh*60+sm);
  stops.forEach(s => { const p = pos(BY[s.k]); const d = road(prev, p), dm = driveMin(d);
    t += dm; km += d; drive += dm; const arr = t; const sv = cfg.svc * Math.max(1, s.dev.length); t += sv; svcT += sv;
    legs.push({ k: s.k, km: d, arr, dep: t, over: t > limit }); prev = p; });
  let back = 0; if (cfg.ret && stops.length){ back = road(prev, pos(DEPOT)); km += back; const bm = driveMin(back); drive += bm; t += bm; }
  return { legs, km, drive, svc: svcT, total: t, back, over: t > limit, limit };
}

/* ---------------- pool ---------------- */
function lastResult(k){ let best = null; for (const id in st.results){ const r = st.results[id]; if (r.k === k && (!best || r.at > best.at)) best = r; } return best; }
function openDevs(l){ return l.d.filter(d => st.f.cats[d[8]]); }
const custKey = l => l.n.toLocaleUpperCase("tr-TR").replace(/\s+/g, " ").trim();
function basePool(skip){
  const q = st.f.q.trim().toLocaleUpperCase("tr-TR");
  return LOCS.filter(l => {
    if (l.dep || !openDevs(l).length) return false;
    const lr = lastResult(l.k); if (lr && lr.st === "tamam" && !st.f.showDone) return false;
    if (skip !== "ilce" && st.f.ilce.length && !st.f.ilce.includes(l.i)) return false;
    if (skip !== "cust" && st.f.cust.length && !st.f.cust.includes(custKey(l))) return false;
    if (skip !== "q" && q && !(l.n.toLocaleUpperCase("tr-TR").includes(q) || l.a.toLocaleUpperCase("tr-TR").includes(q))) return false;
    return true;
  });
}
function poolList(){ return basePool().sort((a, b) => a.i.localeCompare(b.i, "tr") || a.n.localeCompare(b.n, "tr")); }
function ddOptions(kind){
  const m = new Map();
  basePool(kind).forEach(l => { const v = kind === "ilce" ? l.i : custKey(l); const o = m.get(v) || { v, label: titleTR(kind === "ilce" ? l.i : l.n), loc: 0, dev: 0 }; o.loc++; o.dev += openDevs(l).length; m.set(v, o); });
  st.f[kind].forEach(v => { if (!m.has(v)) m.set(v, { v, label: titleTR(v), loc: 0, dev: 0 }); });
  return [...m.values()].sort((a, b) => kind === "ilce" ? a.label.localeCompare(b.label, "tr") : b.dev - a.dev || a.label.localeCompare(b.label, "tr"));
}

/* ---------------- render ---------------- */
function softRender(){ const a = document.activeElement; if (a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /text|search|number|time|date|email|password/.test(a.type)))) { if (st.view === "planla") renderPool(true); return; } if (st.view === "planla") hydratePlanner(); else render(); }
function render(){
  if (!st.ready) return;
  const tabs = st.isAdmin && st.role === "admin"
    ? [["ozet","Yönetici özeti"],["planla","Rota planla"],["planlar","Planlar & ekip"],["cihazlar","Cihazlar & QR"],["raporlar","Raporlar"],["veri","Veri & ayarlar"]]
    : [["saha","Bugünkü rotam"],["cihazlar","Cihaz bul"]];
  if (st.view !== "cihaz" && !tabs.some(t => t[0] === st.view)) st.view = tabs[0][0];
  const cur = st.view === "cihaz" ? "cihazlar" : st.view;
  $("#tabs").innerHTML = tabs.map(t => `<button class="tab" data-act="view" data-v="${t[0]}" aria-current="${cur===t[0]}">${t[1]}</button>`).join("");
  const nm = st.profile?.ad || st.profile?.email || "";
  $("#who").innerHTML = `${st.isAdmin ? `<button class="btn sm" data-act="role" title="Görünümü değiştir">${st.role==="admin"?"Saha görünümü":"Yönetici görünümü"}</button>` : ""}
    <span class="pill ${st.isAdmin && st.role==="admin"?"admin":""}" title="${esc(st.profile?.email||"")}">${esc(nm.split(" ")[0] || "Hesap")} · ${st.isAdmin ? (st.role==="admin" ? "Yönetici" : "Saha önizleme") : "Saha"}</span>
    <button class="btn sm" data-act="logout">Çıkış</button>`;
  const v = { ozet: viewSummary, planla: viewPlanner, planlar: viewPlans, saha: viewField, cihazlar: viewDevices, cihaz: viewDevice, veri: viewData, raporlar: viewReports }[st.view];
  if (!LOCS.length && st.view !== "veri"){
    $("#main").innerHTML = st.isAdmin ? `<div class="card empty" style="max-width:640px;margin:40px auto">Henüz cihaz verisi yok. <button class="link" data-act="view" data-v="veri">Veri & ayarlar</button> sekmesinden 2026 damga Excel'ini içe aktarın.</div>`
      : `<div class="card empty" style="max-width:640px;margin:40px auto">Henüz veri yok. Yöneticiniz cihaz listesini yüklediğinde burada görünecek.</div>`;
    return;
  }
  $("#main").innerHTML = v();
  if (st.view === "planla") hydratePlanner();
}
function viewSummary(){
  const C = S.cat, tot = S.total, depN = S.dep.n;
  const fieldTot = tot - depN, fieldDone = C.tamam - (S.dep.cats.tamam || 0);
  const out = (C.cihazyok||0) + (C.kapsamdisi||0) + (C.baskasi||0);
  const fieldWait = (C.bekliyor||0) - (S.dep.cats.bekliyor||0);
  const order = ["tamam","islenecek","bekliyor","tekrar","tutanak","cihazyok","kapsamdisi","baskasi"].filter(c => C[c]);
  const bar = order.map(c => `<i style="width:${C[c]/tot*100}%;background:${CAT[c].c};${["cihazyok","kapsamdisi","baskasi"].includes(c)?`opacity:${c==="cihazyok"?1:c==="kapsamdisi"?.7:.45}`:""}" title="${CAT[c].l}: ${C[c]}"></i>`).join("");
  const leg = order.map(c => `<span style="--c:${CAT[c].c}">${CAT[c].l} <b class="num">${fmt(C[c])}</b></span>`).join("");
  const il = S.ilce.filter(x => x.n >= 4);
  const ilRows = il.map(x => { const open = x.bek + x.tek + x.tut;
    return `<tr><td>${esc(titleTR(x.i))}</td><td class="r">${fmt(x.n)}</td><td class="r">${pct(x.tamam,x.n)}%</td>
    <td style="width:40%"><div class="minibar">${["tamam","bek","tek","tut","dis"].map((f,i)=>`<i style="width:${x[f]/x.n*100}%;background:${["var(--ok)","var(--wait)","var(--retry)","var(--tut)","var(--off)"][i]}"></i>`).join("")}</div></td>
    <td class="r"><b>${open||"–"}</b></td></tr>`; }).join("");
  const top = S.topOpen.slice(0,10).map(t => `<tr><td>${esc(titleTR(t.n))}</td><td class="r">${t.l}</td><td class="r"><b>${t.d}</b></td>
    <td>${t.b?`<span class="st bekliyor">${t.b}</span> `:""}${t.t?`<span class="st tekrar">${t.t}</span> `:""}${t.u?`<span class="st tutanak">${t.u}</span>`:""}</td></tr>`).join("");
  const yrs = Object.entries(S.yil); const ymax = Math.max(S.yilOld, ...yrs.map(y => y[1]));
  const vb = [[`<${YEAR-11}`, S.yilOld], ...yrs].map(([y,n]) => `<div><small>${n}</small><i style="height:${n/ymax*100}%"></i><em>${y}</em></div>`).join("");
  const fat = Object.entries(S.fatura).map(([k,n]) => `<tr><td>${esc(titleTR(k))}</td><td class="r">${n}</td></tr>`).join("");
  const rawRows = S.raw.slice().sort((a,b)=>a.c.localeCompare(b.c)||b.n-a.n).map(r => `<tr><td><span class="st ${r.c}">${CAT[r.c].l}</span></td><td class="mono">${esc(r.v)}</td><td class="r">${r.n}</td></tr>`).join("");
  // live field results
  const rs = Object.values(st.results); const rc = {};
  rs.forEach(r => { rc[r.st] = (rc[r.st]||0) + 1; });
  const live = rs.length ? `<div class="row">${Object.entries(rc).map(([k,n]) => `<span class="st ${k==="tamam"?"tamam":"eksik"}">${k==="tamam"?"Tamamlandı":(RL[k]?RL[k][1]:k)} · ${n}</span>`).join("")}</div>`
    : `<p class="muted" style="margin:0">Henüz sahadan sonuç gelmedi. Saha çalışanı bir durağı tamamladığında burada görünür ve cihazın damga yılı otomatik güncellenir.</p>`;
  const q = S.dq;
  const openOf = x => x.bek + x.tek + x.tut;
  const byOpen = S.ilce.slice().sort((a,b) => openOf(b) - openOf(a));
  const metroSet = ["KEPEZ","MURATPAŞA","KONYAALTI","DÖŞEMEALTI","AKSU"];
  const metro = S.ilce.filter(x => metroSet.includes(x.i)).reduce((a,x) => a + openOf(x), 0);
  const top1 = byOpen[0] || { i: "—", bek: 0, tek: 0, tut: 0 };
  const yor = S.topOpen[0] || { n: "—", d: 0, l: 0, b: 0, u: 0 };
  const worst = S.ilce.filter(x => x.n >= 8).sort((a,b) => a.tamam/a.n - b.tamam/b.n)[0] || { i: "—", tamam: 0, n: 1 };
  const isl = C.islenecek || 0;
  return `
  <section class="hero">
    <div><div class="eyebrow">${YEAR} periyodik damga programı · canlı veri</div>
      <h1>Sahada tamamlanma %${fmt(pct(fieldDone, fieldTot))}. ${fmt(S.fieldOpenLocPure)} lokasyon rota bekliyor.</h1>
      <p>${fmt(tot)} cihaz, ${fmt(S.locs)} adres, ${fmt(S.cust)} müşteri. Atölyedeki stok cihazları (${fmt(depN)}) saha rotasının dışında tutuldu. ${q.konumYaklasik ? `${fmt(q.konumYaklasik)} lokasyonun konumu henüz yaklaşık.` : "Tüm konumlar doğrulandı."}</p></div>
    <div class="card pad"><div class="eyebrow" style="margin-bottom:8px">Durum dağılımı · ${fmt(tot)} cihaz</div><div class="bar100">${bar}</div><div class="legend">${leg}</div></div>
  </section>
  <section class="kpis" style="margin-bottom:16px">
    <div class="card kpi" style="--c:var(--ok)"><span>Damgalandı (saha)</span><b>${fmt(fieldDone)}</b><small>${fmt(fieldTot)} saha cihazı içinde %${fmt(pct(fieldDone,fieldTot))}</small></div>
    <div class="card kpi" style="--c:var(--wait)"><span>Rota bekliyor</span><b>${fmt(fieldWait + (C.tekrar||0))}</b><small>bekliyor ${fmt(fieldWait)} · tekrar ziyaret ${fmt(C.tekrar||0)}</small></div>
    ${isl ? `<div class="card kpi" style="--c:var(--brand)"><span>Yapıldı · sisteme işlenecek</span><b>${fmt(isl)}</b><small>muayene kartı girilmeli</small></div>` : `<div class="card kpi" style="--c:var(--retry)"><span>Tekrar ziyaret</span><b>${fmt(C.tekrar||0)}</b><small>ulaşılamadı, getirecek, süresi geçmiş…</small></div>`}
    <div class="card kpi" style="--c:var(--tut)"><span>Tutanak</span><b>${fmt(C.tutanak)}</b><small>takip kararı bekliyor</small></div>
    <div class="card kpi" style="--c:var(--off)"><span>Kapsam dışı</span><b>${fmt(out)}</b><small>cihaz yok · kapandı · başkası damgaladı</small></div>
  </section>
  <section class="stack" style="margin-bottom:16px">
    <div><div class="eyebrow" style="margin-bottom:8px">Öne çıkanlar</div>
    <ul class="findings">
      <li class="card" style="--c:var(--brand)"><b>Merkez ilçelerin açık işteki payı %${fmt(pct(metro, S.fieldOpenDev))}</b><p>Kepez, Muratpaşa, Konyaaltı, Döşemealtı ve Aksu'da ${metro} açık cihaz var; günlük rotalar atölyeden 15 km çevrede kurulabilir.</p></li>
      <li class="card" style="--c:var(--wait)"><b>En yoğun ilçe: ${esc(titleTR(top1.i))}</b><p>${openOf(top1)} açık cihaz (${top1.bek} bekliyor, ${top1.tek} tekrar, ${top1.tut} tutanak). Rota planlamaya buradan başlanabilir.</p></li>
      <li class="card" style="--c:var(--retry)"><b>${esc(titleTR(yor.n).split(" ").slice(0,3).join(" "))}: ${yor.d} cihaz, ${yor.l} lokasyon</b><p>En çok açık cihazı olan müşteri. ${yor.b} bekleyen, ${yor.u} tutanaklı cihaz.</p></li>
      ${isl ? `<li class="card" style="--c:var(--brand)"><b>${fmt(isl)} cihaz sahada yapılmış, sistemde açık</b><p>Sahadan notlara göre muayenesi yapılmış ama kaydı kapanmamış. Rota gerekmez; muayene kartı sisteme girilmeli.</p></li>`
        : `<li class="card" style="--c:var(--off)"><b>En düşük tamamlanma: ${esc(titleTR(worst.i))} %${fmt(pct(worst.tamam, worst.n))}</b><p>${worst.n} cihazdan ${worst.tamam}'i tamamlandı. Kapsam dışı kayıtlar ve açık işler birlikte incelenmeli.</p></li>`}
    </ul></div>
  </section>
  <section class="grid3" style="margin-bottom:16px">
    <div class="card pad"><h2 style="margin-bottom:10px">İlçe bazında ilerleme</h2>
      <div class="tbl-wrap"><table><thead><tr><th>İlçe</th><th class="r">Cihaz</th><th class="r">Tamam</th><th>Dağılım</th><th class="r">Açık</th></tr></thead><tbody>${ilRows}</tbody></table></div>
      <p class="muted" style="font-size:.8rem;margin:.6rem 0 0">Açık = bekliyor + tekrar ziyaret + tutanak. Atölye stoku dahil değil.</p></div>
    <div class="stack">
      <div class="card pad"><h2 style="margin-bottom:10px">En çok açık cihazı olan müşteriler</h2>
        <div class="tbl-wrap"><table><thead><tr><th>Müşteri</th><th class="r">Lok.</th><th class="r">Cihaz</th><th>Durum</th></tr></thead><tbody>${top}</tbody></table></div></div>
      <div class="card pad"><h3 style="margin-bottom:6px">Sahadan gelen sonuçlar</h3>${live}</div>
    </div>
  </section>
  <section class="grid2" style="margin-bottom:16px">
    <div class="card pad"><h2>Son damga yılı</h2><p class="muted" style="margin:.2rem 0 0;font-size:.85rem">Cihazların güncel son damga yılı; ${fmt(S.yilNA)} cihazda bilinmiyor.</p><div class="vbars">${vb}</div></div>
    <div class="card pad"><h2 style="margin-bottom:8px">Fatura / ödeme notları</h2><p class="muted" style="margin:0 0 8px;font-size:.85rem">Başlıksız Q sütunundan. ${S.fatura["FATURA KESİLECEK"]||0} cihaz için fatura henüz kesilmemiş.</p>
      <div class="tbl-wrap"><table><tbody>${fat}</tbody></table></div></div>
  </section>
  <section class="grid2">
    <div class="card pad"><h2 style="margin-bottom:8px">Veri kalitesi</h2>
      <ul style="margin:0;padding-left:1.1rem;display:flex;flex-direction:column;gap:6px;font-size:.9rem">
        <li><b>${q.durumBos}</b> satırda durum boş; ${S.dep.cats.bekliyor||0} tanesi atölye stoku (Elmaslar adresi).</li>
        <li>Durum sütununda <b>${q.durumYazim}</b> farklı yazım var (YAPILDI / tutanak / yok / YOKK…). Sabit seçim listesine geçilmeli.</li>
        <li>Marka sütununda <b>${q.markaVar}</b> yazım var (BİZERBA, BIZERBA, BİZERBAA gibi).</li>
        <li>Seri no: <b>${q.seriYok}</b> cihazda boş, <b>${q.seriTekrar}</b> cihazda tekrar ediyor.</li>
        <li><b>${q.adresKisa}</b> satırda adres 20 karakterden kısa (“KAŞ”, “DEPO”, “BELEK”). “Veri & ayarlar” sekmesinden Google ile konum bulunabilir.</li>
        <li>Q–T sütunlarının başlığı yok (fatura, ödeme şekli, tutar). Başlık verilmeli.</li>
      </ul></div>
    <div class="card pad"><h2 style="margin-bottom:8px">Durum eşleme tablosu</h2>
      <details><summary>Ham değer → grup (${S.raw.length} satır)</summary>
      <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Grup</th><th>Excel'deki değer</th><th class="r">Cihaz</th></tr></thead><tbody>${rawRows}</tbody></table></div></details>
      <p class="muted" style="font-size:.85rem;margin:.6rem 0 0">“Tutanak” rotaya varsayılan olarak alınmadı; planlayıcıda tek tıkla eklenebilir. Bu eşleme tartışmaya açık.</p></div>
  </section>`;
}

/* ---- Planner ---- */
function viewPlanner(){
  return `<div class="planner">
    <section class="card">
      <div class="pool-head">
        <div class="row" style="justify-content:space-between"><h2>Bekleyen lokasyonlar</h2><span class="muted mono" id="poolCount"></span></div>
        <div class="row">${st.regions.length ? `<select id="fregion" aria-label="Bölge" style="flex:1 1 140px"><option value="">Tüm bölgeler</option>${st.regions.map(r=>`<option value="${r.id}" ${String(st.f.region)===String(r.id)?"selected":""}>${esc(r.ad)}</option>`).join("")}</select>` : ""}
          <div class="seg" role="group" aria-label="Görünüm"><button class="segb" data-act="poolview" data-v="liste" aria-pressed="${st.poolView==="liste"}">Liste</button><button class="segb" data-act="poolview" data-v="harita" aria-pressed="${st.poolView==="harita"}">Harita</button></div></div>
        <input id="fq" type="search" placeholder="Müşteri veya adres ara" value="${esc(st.f.q)}">
        <div id="ddWrap" class="stack" style="gap:10px"></div>
      </div>
      <div class="pool" id="pool"></div>
    </section>
    <section class="stack" id="planPanel"></section>
  </div>`;
}
function hydratePlanner(){ renderPool(); renderPlanPanel(); }
function renderPlannerHead(){ document.querySelectorAll('[data-act="poolview"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.v === st.poolView)); }
function ddListHTML(kind){
  const q = st.ddq[kind].trim().toLocaleUpperCase("tr-TR");
  const opts = ddOptions(kind).filter(o => !q || o.label.toLocaleUpperCase("tr-TR").includes(q) || o.v.includes(q));
  return opts.length ? opts.map(o => `<label class="ddopt"><input type="checkbox" data-act="ddpick" data-kind="${kind}" data-v="${esc(o.v)}" ${st.f[kind].includes(o.v)?"checked":""}>
      <span class="ddl">${esc(o.label)}</span><span class="mono muted">${o.loc} lok · ${o.dev}</span></label>`).join("")
    : `<div class="empty" style="padding:12px">Eşleşen kayıt yok</div>`;
}
function ddHTML(kind, label){
  const sel = st.f[kind], open = st.dd === kind;
  return `<div class="dd">
    <button class="ddbtn" data-act="dd" data-kind="${kind}" aria-expanded="${open}">${label}: <b>${sel.length ? sel.length + " seçili" : "Tümü"}</b><span aria-hidden="true">▾</span></button>
    ${open ? `<div class="ddpanel" role="dialog" aria-label="${label} seç">
      <input id="ddq-${kind}" type="search" placeholder="${label} ara" value="${esc(st.ddq[kind])}">
      <div class="ddlist" id="ddlist-${kind}">${ddListHTML(kind)}</div>
      <div class="row" style="justify-content:space-between"><button class="link" data-act="ddall" data-kind="${kind}">Görünenleri seç</button><span class="row"><button class="link" data-act="ddclear" data-kind="${kind}">Temizle</button><button class="btn sm primary" data-act="ddclose">Tamam</button></span></div>
    </div>` : ""}
  </div>`;
}
function renderPool(keepDD){
  const list = poolList(); const sel = new Set(st.sel.map(s => s.k));
  $("#poolCount").textContent = `${list.length} lokasyon · ${list.reduce((a,l)=>a+openDevs(l).length,0)} cihaz`;
  const chips = [...st.f.ilce.map(v => ["ilce", v, titleTR(v)]), ...st.f.cust.map(v => ["cust", v, titleTR(v)])];
  const inList = list.filter(l => sel.has(l.k)).length;
  const rest = `
    ${chips.length ? `<div class="chips">${chips.map(([k,v,lab]) => `<button class="chip sel" data-act="ddrm" data-kind="${k}" data-v="${esc(v)}" title="Filtreden çıkar">${esc(lab.length>34?lab.slice(0,33)+"…":lab)} ✕</button>`).join("")}<button class="link" data-act="ddreset" style="font-size:.82rem">Filtreleri temizle</button></div>` : ""}
    <div class="chips">${["bekliyor","tekrar","tutanak"].map(c=>`<button class="chip" data-act="cat" data-c="${c}" aria-pressed="${!!st.f.cats[c]}">${CAT[c].l}</button>`).join("")}
      <button class="chip" data-act="showdone" aria-pressed="${st.f.showDone}">Sahada tamamlananlar</button></div>
    <div class="row" style="justify-content:space-between">
      <button class="btn sm primary" data-act="selall" ${list.length && inList < list.length ? "" : "disabled"}>Listedeki ${list.length - inList} lokasyonu rotaya ekle</button>
      <button class="link" data-act="selnone" style="font-size:.85rem">Seçimi temizle (${st.sel.length})</button></div>`;
  if (keepDD && $("#ddRest")){ $("#ddRest").innerHTML = rest; ["ilce","cust"].forEach(k => { const b = document.querySelector(`.ddbtn[data-kind="${k}"] b`); if (b) b.textContent = st.f[k].length ? st.f[k].length + " seçili" : "Tümü"; }); }
  else $("#ddWrap").innerHTML = `<div class="row" style="gap:8px">${ddHTML("ilce","İlçe")}${ddHTML("cust","Müşteri")}</div><div id="ddRest" class="stack" style="gap:10px">${rest}</div>`;
  if (st.poolView === "harita"){ renderPoolMap(list, sel); return; }
  $("#pool").innerHTML = list.length ? list.map(l => { const od = openDevs(l); const c = {}; od.forEach(d => c[d[8]] = (c[d[8]]||0)+1);
    const lr = lastResult(l.k);
    return `<label class="loc"><input type="checkbox" data-act="pick" data-k="${l.k}" ${sel.has(l.k)?"checked":""}>
      <div style="min-width:0"><div class="nm">${esc(titleTR(l.n))}</div><div class="ad">${esc(titleTR(l.a))} · <b>${esc(titleTR(l.i))}</b></div>
      <div class="tags">${Object.entries(c).map(([k,n])=>`<span class="st ${k}">${CAT[k].l} ${n}</span>`).join("")}${lr?`<span class="st ${lr.st==="tamam"?"tamam":"eksik"}">Son ziyaret: ${lr.st==="tamam"?"Tamamlandı":RL[lr.st]?.[1]||lr.st} · ${lr.at.slice(5,10).split("-").reverse().join(".")}</span>`:""}</div></div>
      <div class="cnt">${od.length} cihaz</div></label>`; }).join("")
    : `<div class="empty">Bu filtrelerle bekleyen lokasyon yok. Filtreleri genişletin.</div>`;
}

/* routes: [{keys:[...], staffId}] — null until optimized */
const selObj = k => st.sel.find(s => s.k === k);
function insertCheapest(keys, k){
  const P = x => x === null ? pos(DEPOT) : pos(BY[x]); let best = 0, bd = 1e9;
  for (let i = 0; i <= keys.length; i++){ const a = i ? keys[i-1] : null, b = i < keys.length ? keys[i] : (st.cfg.ret ? null : undefined);
    const d = road(P(a), pos(BY[k])) + (b !== undefined ? road(pos(BY[k]), P(b)) - road(P(a), P(b)) : 0);
    if (d < bd){ bd = d; best = i; } }
  keys.splice(best, 0, k); return bd;
}
function syncRoutes(){
  if (!st.routes) return [{ keys: st.sel.map(s => s.k), staffId: st.cfg.staff0 || "", unopt: true }];
  const ks = new Set(st.sel.map(s => s.k));
  st.routes.forEach(r => r.keys = r.keys.filter(k => ks.has(k)));
  const placed = new Set(st.routes.flatMap(r => r.keys));
  st.sel.forEach(s => { if (placed.has(s.k)) return;
    let bi = 0, bd = 1e9; st.routes.forEach((r, i) => { const t = r.keys.slice(); const d = insertCheapest(t, s.k); if (d < bd){ bd = d; bi = i; } });
    insertCheapest(st.routes[bi].keys, s.k); });
  return st.routes;
}
function splitTeams(keys, k){
  if (k <= 1 || keys.length <= 1) return [keys.slice()];
  const d0 = pos(DEPOT), kx = Math.cos(d0.lat*Math.PI/180);
  const it = keys.map(key => { const p = pos(BY[key]); return { key, a: Math.atan2(p.lat - d0.lat, (p.lng - d0.lng)*kx), w: st.cfg.svc * Math.max(1, selObj(key).dev.length) + driveMin(road(d0, p)) }; }).sort((x, y) => x.a - y.a);
  let gi = 0, gmax = -1; it.forEach((x, i) => { const nx = it[(i+1) % it.length]; const g = ((nx.a - x.a) + 2*Math.PI) % (2*Math.PI) || 2*Math.PI; if (g > gmax){ gmax = g; gi = (i+1) % it.length; } });
  const ring = it.slice(gi).concat(it.slice(0, gi)); const total = ring.reduce((a, x) => a + x.w, 0);
  const out = Array.from({ length: k }, () => []); let acc = 0;
  ring.forEach(x => { const g = Math.min(k - 1, Math.floor((acc + x.w/2) / (total / k))); out[g].push(x.key); acc += x.w; });
  return out.filter(g => g.length);
}
function runOptimize(){
  const keys = st.sel.map(s => s.k); const prev = st.routes || [];
  const groups = splitTeams(keys, st.cfg.teams);
  let R = groups.map(g => optimize(g, st.cfg.ret));
  // balance: move stops off the longest route while the longest day gets shorter
  const T = r => schedule(r.map(selObj), st.cfg).total;
  for (let it = 0; it < 60 && R.length > 1; it++){
    const times = R.map(T); const L = times.indexOf(Math.max(...times)); let best = null;
    R[L].forEach(k => R.forEach((r, j) => { if (j === L) return;
      const a = R[L].filter(x => x !== k), b = r.slice(); insertCheapest(b, k);
      const m = Math.max(T(a), T(b), ...times.filter((_, q) => q !== L && q !== j));
      if (m < times[L] - 1 && (!best || m < best.m)) best = { m, k, j, a, b }; }));
    if (!best) break; R[L] = optimize(best.a, st.cfg.ret); R[best.j] = optimize(best.b, st.cfg.ret);
  }
  st.routes = R.filter(r => r.length).map((r, i) => ({ keys: r, staffId: prev[i]?.staffId || (i === 0 ? st.cfg.staff0 || "" : "") }));
}
function staffOpts(sel){ const inv = (st.invites || []).filter(v => !v.used_by);
  return `<option value="">Personel seçin…</option>` + st.staff.map(s => `<option value="${esc(s.id)}" ${sel===s.id?"selected":""}>${esc(s.name)}${s.phone?" · "+esc(s.phone):""}</option>`).join("")
    + (inv.length ? `<optgroup label="Henüz giriş yapmadı (SMS)">${inv.map(v => `<option value="inv:${esc(v.phone)}" ${sel==="inv:"+v.phone?"selected":""}>${esc(v.ad)} · 0${esc(v.phone)}</option>`).join("")}</optgroup>` : ""); }
function chunkInfo(n, per, ret){ const total = n + (ret ? 1 : 0); return Math.max(1, Math.ceil(total / per)); }

function renderPlanPanel(){
  const cfg = st.cfg; const routes = syncRoutes(); const multi = routes.length > 1;
  const scs = routes.map(r => schedule(r.keys.map(selObj), cfg));
  const allKm = scs.reduce((a, s) => a + s.km, 0);
  const naiveKeys = st.sel.map(s => s.k);
  const naive = naiveKeys.length ? tourLen([0, ...naiveKeys.map((_,i)=>i+1)], [pos(DEPOT), ...naiveKeys.map(k=>pos(BY[k]))], cfg.ret) : 0;
  const sugg = suggestions(routes.flatMap(r => r.keys));
  const share = st.shared ? st.shared.map(id => st.plans.find(p => p.id === id)).filter(Boolean) : [];
  $("#planPanel").innerHTML = `
  ${share.length ? `<div class="card pad stack sharebox"><div class="row" style="justify-content:space-between"><h2>Plan kaydedildi · personele gönderin</h2><button class="link" data-act="closeshare">Kapat</button></div>
     ${share.map(shareCard).join("")}</div>` : ""}
  <div class="card pad stack">
    <div class="row" style="justify-content:space-between"><h2>${st.editing?"Planı düzenle":"Günlük rota"}</h2>${st.editing||st.sel.length?`<button class="btn sm" data-act="newplan">Yeni plan</button>`:""}</div>
    <div class="cfg">
      <label class="f">Tarih<input id="c-date" type="date" value="${cfg.date}"></label>
      <label class="f">Başlangıç<input id="c-start" type="time" value="${cfg.start}"></label>
      <label class="f">Mesai bitişi<input id="c-end" type="time" value="${cfg.end}"></label>
      <label class="f">Cihaz başı süre (dk)<input id="c-svc" type="number" min="3" max="90" value="${cfg.svc}"></label>
      <label class="f">Km maliyeti (₺)<input id="c-cost" type="number" min="0" step="0.5" value="${cfg.costKm}"></label>
      <label class="f">Ekip / araç sayısı<select id="c-teams">${[1,2,3,4,5].map(n=>`<option ${cfg.teams===n?"selected":""} value="${n}">${n} ${n===1?"ekip":"ekip (rotayı böl)"}</option>`).join("")}</select></label>
      <label class="f">Google link başına durak<select id="c-per"><option value="10" ${cfg.perLink===10?"selected":""}>10 · Maps uygulaması</option><option value="4" ${cfg.perLink===4?"selected":""}>4 · telefon tarayıcısı</option></select></label>
    </div>
    <label class="row" style="font-size:.88rem"><input id="c-ret" type="checkbox" ${cfg.ret?"checked":""}> Gün sonunda atölyeye dön</label>
    <div class="row"><button class="btn primary" data-act="optimize" ${st.sel.length<2?"disabled":""}>${cfg.teams>1?`Rotayı ${cfg.teams} ekibe böl ve optimize et`:"Rotayı optimize et"}</button>
      <span class="muted" style="font-size:.85rem">${st.sel.length} durak seçili · başlangıç: Elmaslar atölyesi</span></div>
  </div>
  ${st.sel.length ? `
  <div class="card pad stack">
    ${routes[0].unopt ? `<div class="warnbox">Duraklar seçim sırasında. Sıralamak için “Rotayı optimize et”e basın.</div>` : ""}
    ${!routes[0].unopt && naive > allKm + 0.05 && !multi ? `<div class="savings">Seçim sırasına göre ${naive.toFixed(1)} km → optimize ${allKm.toFixed(1)} km. ${(naive-allKm).toFixed(1)} km ve yaklaşık ₺${fmt(Math.round((naive-allKm)*cfg.costKm))} tasarruf.</div>`:""}
    ${multi ? `<div class="metrics"><div><b>${routes.length}</b><span>ekip</span></div><div><b>${st.sel.length}</b><span>durak</span></div><div><b>${allKm.toFixed(1)}</b><span>toplam km</span></div>
      <div><b>₺${fmt(Math.round(allKm*cfg.costKm))}</b><span>toplam yol maliyeti</span></div><div><b>${clock(cfg.start, Math.max(...scs.map(s=>s.total)))}</b><span>en geç bitiş</span></div><div><b>${scs.reduce((a,s)=>a+s.legs.length,0)}</b><span>ziyaret</span></div></div>` : ""}
    ${mapSVG(routes, scs)}
    <div class="muted" style="font-size:.8rem">${routes.some(r=>r.g) ? "Google ile hesaplanan rotalar gerçek yol süresini gösterir." : "Mesafeler kuş uçuşu tahmini. Gerçek yol süresi için rota kartındaki “Google ile hesapla”yı kullanın."}</div>
  </div>
  ${routes.map((r, t) => routeCard(r, t, scs[t], multi, routes.length)).join("")}
  ${sugg.length ? `<div class="card pad"><div class="eyebrow" style="margin-bottom:6px">Rotaya 3 km içinde bekleyen diğer lokasyonlar</div>
      <div class="stack" style="gap:6px">${sugg.map(x=>`<div class="row" style="justify-content:space-between;font-size:.88rem"><span style="min-width:0;flex:1">${esc(titleTR(x.l.n))} <span class="muted">· ${esc(titleTR(x.l.i))} · ${x.d.toFixed(1)} km · ${openDevs(x.l).length} cihaz</span></span><button class="btn sm" data-act="add" data-k="${x.l.k}">Ekle</button></div>`).join("")}</div></div>`:""}
  <div class="card pad save-row"><span class="muted" style="font-size:.82rem;flex:1 1 260px">Kaydedince her ekip için ayrı plan oluşur; panel linki ve Google Maps rota linkleri WhatsApp mesajına hazırlanır. Mesafeler kuş uçuşu × ${ROAD} ile tahmini.</span>
    <button class="btn primary" data-act="saveplan">${st.editing?"Planı güncelle ve gönder":"Planla ve gönder"}</button></div>`
  : `<div class="card empty">Soldan ilçe ve müşteri seçin, listeyi rotaya ekleyin. Birden fazla ekip çıkacaksa “Ekip / araç sayısı”nı artırın; sistem durakları ekiplere bölüp her biri için ayrı rota çıkarır.</div>`}`;
}
function routeCard(r, t, sc, multi, n){
  const cfg = st.cfg, devN = r.keys.reduce((a,k)=>a+selObj(k).dev.length,0), links = chunkInfo(r.keys.length, cfg.perLink, cfg.ret);
  return `<div class="card pad stack" style="border-top:3px solid ${TEAM_C[t%5]}">
    <div class="row" style="justify-content:space-between;align-items:flex-end">
      <div><div class="eyebrow">${multi?`Ekip ${t+1}`:"Rota"}</div><h3>${r.keys.length} durak · ${devN} cihaz · ${sc.km.toFixed(1)} km · bitiş ${clock(cfg.start, sc.total)}</h3></div>
      <label class="f" style="min-width:200px;flex:0 1 260px">Saha personeli<select data-act="rstaff" data-t="${t}">${staffOpts(r.staffId)}</select></label>
    </div>
    ${!st.staff.length ? `<div class="muted" style="font-size:.84rem">Personel listesi boş. <button class="link" data-act="view" data-v="planlar">Planlar & saha</button> sekmesinden ad ve WhatsApp numarası ekleyin.</div>` : ""}
    ${r.g ? `<div class="savings">Google: ${r.g.km.toFixed(1)} km · ${hm(r.g.min)} sürüş · servis dahil bitiş ${clock(cfg.start, r.g.min + sc.svc)}${r.g.reordered?" · sıra Google'a göre güncellendi":""}</div>` : ""}
    <div class="row" style="gap:6px;font-size:.84rem">${CFG.GOOGLE_MAPS_KEY && r.keys.length && r.keys.length <= 25 && !r.unopt ? `<button class="btn sm" data-act="groute" data-t="${t}">Google ile hesapla</button>` : ""}<span class="pill">Google Maps: ${links} link</span><span class="muted">${links>1?`Rota 1–${links} olarak zincirlenir; her link öncekinin son durağından başlar.`:"Tek linkte açılır."}</span></div>
    ${sc.over ? `<div class="warnbox">Mesai sonunu ${hm(sc.total - sc.limit)} aşıyor. Turuncu duraklar yarına bırakılabilir${multi?" ya da başka ekibe taşınabilir":""}.</div>`:""}
    <ol class="seq">${r.keys.map((k,i) => { const l = BY[k], lg = sc.legs[i], p = pos(l), s = selObj(k);
      const linkNo = Math.floor(i / cfg.perLink) + 1;
      return `<li class="${lg.over?"over":""}"><span class="no" style="${lg.over?"":`background:${TEAM_C[t%5]}`}">${i+1}</span>
        <div style="min-width:0"><div style="font-weight:600;font-size:.92rem">${esc(titleTR(l.n))}</div>
        <div class="leg">${esc(titleTR(l.a))} · ${esc(titleTR(l.i))}</div>
        <div class="leg mono">+${lg.km.toFixed(1)} km · varış ${clock(cfg.start, lg.arr)} · ${s.dev.length} cihaz${links>1?` · Rota ${linkNo}`:""} · <span class="prec ${p.p==="ok"?"ok":""}">${p.p==="ok"?"konum doğrulandı":"adresle aranacak"}</span></div>
        <div class="row" style="gap:10px;margin-top:3px;font-size:.8rem"><a href="${esc(searchURL(l))}" target="_blank" rel="noopener">Haritada kontrol et ↗</a><button class="link" data-act="geoedit" data-k="${k}">${p.p==="ok"?"Konumu değiştir":"Konumu sabitle"}</button></div>
        ${st.geoEdit===k?`<div class="row" style="margin-top:6px"><input id="geo-${k}" type="text" placeholder="36.8841, 30.7056" style="flex:1 1 160px;font-size:.84rem"><button class="btn sm" data-act="savegeo" data-k="${k}">Kaydet</button></div><div class="muted" style="font-size:.76rem;margin-top:3px">Google Haritalar'da mağazaya sağ tıklayın, en üstteki koordinatı kopyalayıp buraya yapıştırın.</div>`:""}</div>
        <div class="acts">${n>1?`<select class="mv" data-act="mv" data-t="${t}" data-k="${k}" aria-label="Ekibe taşı">${Array.from({length:n},(_,j)=>`<option value="${j}" ${j===t?"selected":""}>E${j+1}</option>`).join("")}</select>`:""}<button class="ib" title="Yukarı" aria-label="Yukarı taşı" data-act="up" data-t="${t}" data-i="${i}">↑</button><button class="ib" title="Aşağı" aria-label="Aşağı taşı" data-act="down" data-t="${t}" data-i="${i}">↓</button><button class="ib" title="Çıkar" aria-label="Rotadan çıkar" data-act="rm" data-k="${k}">✕</button></div></li>`; }).join("")}
      ${cfg.ret?`<li><span class="no" style="background:var(--sunk);color:var(--ink)">◆</span><div><div style="font-weight:600;font-size:.92rem">Atölyeye dönüş</div><div class="leg mono">+${sc.back.toFixed(1)} km · ${clock(cfg.start, sc.total)}</div></div><div></div></li>`:""}
    </ol></div>`;
}
function suggestions(keys){
  if (!keys.length) return [];
  const pts = keys.map(k=>pos(BY[k])); const sel = new Set(keys);
  return LOCS.filter(l => !l.dep && !sel.has(l.k) && openDevs(l).length && !(lastResult(l.k)?.st === "tamam"))
    .map(l => { const p = pos(l); return { l, d: Math.min(...pts.map(q => road(p, q))) }; })
    .filter(x => x.d <= 3).sort((a,b) => a.d - b.d).slice(0, 6);
}
function mapSVG(routes, scs){
  const W = 640, H = 400, pad = 34;
  const all = [pos(DEPOT), ...routes.flatMap(r => r.keys.map(k => pos(BY[k])))];
  const lat0 = all.reduce((a,p)=>a+p.lat,0)/all.length, kx = Math.cos(lat0*Math.PI/180);
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9; all.forEach(p=>{const x=p.lng*kx,y=p.lat; minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);});
  const spanX = Math.max(maxX-minX, .01), spanY = Math.max(maxY-minY, .01);
  const s = Math.min((W-2*pad)/spanX, (H-2*pad)/spanY), ox = (W - spanX*s)/2, oy = (H - spanY*s)/2;
  const P = p => [ox + (p.lng*kx - minX)*s, H - (oy + (p.lat - minY)*s)];
  const kmPerPx = 111.32 / s; const nice = [0.5,1,2,5,10,20,50,100].find(v => v/kmPerPx > 60) || 100; const sbw = nice/kmPerPx;
  const labels = Object.entries(ILCE_C).map(([n,[la,lo]]) => { const [x,y] = P({lat:la,lng:lo}); return (x>10&&x<W-10&&y>10&&y<H-10) ? `<text x="${x}" y="${y}" text-anchor="middle" font-size="12" font-weight="700" letter-spacing="2" fill="var(--muted)" opacity=".45">${esc(n)}</text>` : ""; }).join("");
  const [dx, dy] = P(all[0]);
  const lines = routes.map((r, t) => { const path = [P(all[0]), ...r.keys.map(k => P(pos(BY[k])))]; if (st.cfg.ret) path.push(P(all[0]));
    const c = r.unopt ? "var(--muted)" : TEAM_C[t%5];
    return `<polyline points="${path.map(p=>p.join(",")).join(" ")}" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" opacity=".75" ${r.unopt?'stroke-dasharray="4 4"':""}/>` +
      r.keys.map((k,i) => { const [x,y] = P(pos(BY[k])); const ov = scs[t].legs[i].over; return `<g><circle cx="${x}" cy="${y}" r="11" fill="${ov?"var(--retry)":TEAM_C[t%5]}" stroke="var(--surface)" stroke-width="2"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--brand-ink)">${i+1}</text></g>`; }).join(""); }).join("");
  return `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rota haritası">
    <rect width="${W}" height="${H}" fill="var(--sunk)"/>${labels}${lines}
    <path d="M${dx-9} ${dy-4} L${dx-4} ${dy-10} L${dx+4} ${dy-10} L${dx+9} ${dy-4} L${dx} ${dy+9} Z" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/>
    <text x="${dx+13}" y="${dy+4}" font-size="11" font-weight="700" fill="var(--ink)">Atölye</text>
    <g transform="translate(${W-pad-sbw},${H-16})"><rect width="${sbw}" height="4" fill="var(--ink)"/><text x="${sbw/2}" y="-5" text-anchor="middle" font-size="10" fill="var(--muted)">${nice} km</text></g>
  </svg>`;
}


let gmap = null, gmarkers = [];
const MCOL = { bekliyor: "#B98000", tekrar: "#D35B22", tutanak: "#11807A", sel: "#2D2A8E" };
async function renderPoolMap(list, sel){
  const box = $("#pool");
  if (!CFG.GOOGLE_MAPS_KEY){ box.innerHTML = `<div class="empty">Harita için config.js dosyasına Google Maps anahtarı eklenmeli.</div>`; return; }
  if (!box.querySelector("#gmap")) box.innerHTML = `<div id="gmap" class="gmap"></div><div class="legend" style="padding:8px 16px 12px"><span style="--c:${MCOL.bekliyor}">Bekliyor</span><span style="--c:${MCOL.tekrar}">Tekrar ziyaret</span><span style="--c:${MCOL.tutanak}">Tutanak</span><span style="--c:${MCOL.sel}">Rotada</span><span class="muted">≈ konumlar yaklaşık</span></div>`;
  let maps; try { maps = await loadGoogle(); } catch(e){ box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const el = $("#gmap"); if (!el) return;
  if (!gmap || gmap.getDiv() !== el) gmap = new maps.Map(el, { center: { lat: DEPOT.lat, lng: DEPOT.lng }, zoom: 11, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
  gmarkers.forEach(m => m.setMap(null)); gmarkers = [];
  const bounds = new maps.LatLngBounds(); bounds.extend({ lat: DEPOT.lat, lng: DEPOT.lng });
  gmarkers.push(new maps.Marker({ map: gmap, position: { lat: DEPOT.lat, lng: DEPOT.lng }, title: "Atölye", label: { text: "◆", color: "#fff" } }));
  list.forEach(l => { const od = openDevs(l); const c = od.some(d => d[8]==="tekrar") ? "tekrar" : od.some(d => d[8]==="bekliyor") ? "bekliyor" : "tutanak"; const on = sel.has(l.k);
    const m = new maps.Marker({ map: gmap, position: { lat: l.lat, lng: l.lng }, title: `${titleTR(l.n)} · ${od.length} cihaz${l.p!=="ok"?" (yaklaşık konum)":""}`,
      icon: { path: maps.SymbolPath.CIRCLE, scale: on ? 9 : 6, fillColor: on ? MCOL.sel : MCOL[c], fillOpacity: l.p === "ok" ? 1 : .55, strokeColor: "#fff", strokeWeight: 2 } });
    m.addListener("click", () => { pickLoc(l.k, !st.sel.find(s => s.k === l.k)); renderPool(true); renderPlanPanel(); });
    gmarkers.push(m); bounds.extend(m.getPosition()); });
  if (list.length && !gmap.__fitted){ gmap.fitBounds(bounds, 40); gmap.__fitted = true; }
}
async function googleRoute(t){
  const r = st.routes?.[t]; if (!r || !r.keys.length) return;
  try { await loadGoogle(); } catch(e){ toast(e.message); return; }
  let Route; try { ({ Route } = await google.maps.importLibrary("routes")); } catch(e){ toast("Google rota kütüphanesi yüklenemedi"); return; }
  const P = k => { const p = pos(BY[k]); return p.p === "ok" ? { lat: p.lat, lng: p.lng } : normAddr(BY[k].a, BY[k].i); };
  const depot = { lat: DEPOT.lat, lng: DEPOT.lng }; const keys = r.keys.slice();
  const movable = st.cfg.ret ? keys : keys.slice(0, -1); const dest = st.cfg.ret ? depot : P(keys[keys.length - 1]);
  const base = { origin: depot, destination: dest, travelMode: "DRIVING", optimizeWaypointOrder: movable.length > 1,
    fields: ["distanceMeters", "durationMillis", "optimizedIntermediateWaypointIndices", "legs"] };
  toast("Google rotası hesaplanıyor…");
  try {
    let res;
    try { res = await Route.computeRoutes({ ...base, intermediates: movable.map(k => ({ location: P(k) })) }); }
    catch(e1){ res = await Route.computeRoutes({ ...base, intermediates: movable.map(k => P(k)) }); }
    const rt = res.routes?.[0]; if (!rt) throw new Error("rota bulunamadı");
    const order = rt.optimizedIntermediateWaypointIndices?.length ? rt.optimizedIntermediateWaypointIndices : movable.map((_, i) => i);
    const newKeys = order.map(i => movable[i]).concat(st.cfg.ret ? [] : [keys[keys.length - 1]]);
    const km = (rt.distanceMeters || 0) / 1000, min = (rt.durationMillis || 0) / 60000;
    r.g = { km, min, reordered: newKeys.join() !== keys.join() }; r.keys = newKeys; renderPlanPanel(); toast(`Google: ${km.toFixed(1)} km, ${hm(min)} sürüş`);
  } catch(e){ toast("Google rotası alınamadı: " + (e.message || e.code || "bilinmeyen hata") + ". Routes API açık mı?"); }
}
/* ---- Plans & share ---- */
function planProgress(p){ let done = 0, miss = 0; p.stops.forEach(s => { const r = st.results[p.id+"__"+s.k]; if (r) r.st === "tamam" ? done++ : miss++; }); return { done, miss, n: p.stops.length }; }
function personName(p){ const s = staffBy(p.staffId); return (s && s.name) || p.staffName || "Atanmadı"; }
function personPhone(p){ const s = staffBy(p.staffId); return (s && s.phone) || p.phone || ""; }
const dTR = d => d.split("-").reverse().join(".");
function gmapsDir(dest){ return "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(dest); }
function normAddr(a, ilce){
  const W = "0-9A-ZÇĞİÖŞÜ", L = `(?<![${W}])`, R = `(?![${W}])`, re = (p, f = "g") => new RegExp(p, f);
  let s = " " + String(a || "") + " ";
  s = s.replace(/ı/g, "I").replace(/i̇/g, "İ").toLocaleUpperCase("tr-TR");
  s = s.replace(/\.(?=[^\s\d])/g, ". ").replace(/(\d)\.(?=[A-ZÇĞİÖŞÜ])/g, "$1. ").replace(/,(?=\S)/g, ", ");
  s = s.replace(re(`${L}NO\\s*[:.]?\\s*(\\d+)[A-ZÇĞİÖŞÜ]*(?:\\s*[-\\/]\\s*[0-9A-ZÇĞİÖŞÜ\\/\\-]+)*`), " NO:$1 ");
  s = s.replace(/(NO:\d+)(\s+[A-ZÇĞİÖŞÜ](?![0-9A-ZÇĞİÖŞÜ]))+/g, "$1");
  s = s.replace(re(`${L}[0-9A-Z]{1,3}\\s*BLOK${R}`), " ").replace(re(`${L}[A-Z]\\d{1,2}\\s*\\/\\s*\\d+${R}`), " ")
       .replace(re(`${L}(D|İÇ KAPI|DAİRE|DAIRE|KAT)\\s*:\\s*[0-9A-Z]+${R}`), " ");
  const ab = [["(MAHALLESİ|MAHALLESI|MAH|MH)", "MAHALLESİ"], ["(CADDESİ|CADDESI|CAD|CD)", "CADDESİ"], ["(SOKAĞI|SOKAGI|SOKAK|SOK|SK)", "SOKAK"], ["(BULVARI|BULV|BLV|BLVD)", "BULVARI"], ["(MEVKİİ|MEVKII|MEVKİ|MEVKI)", "MEVKİİ"]];
  ab.forEach(([p, r]) => { s = s.replace(re(`${L}${p}${R}\\.?`), ` ${r} `); });
  s = s.replace(re(`${L}(ANTALYA|TÜRKİYE)${R}`), " ").replace(re(`${L}${ilce}${R}\\s*\\/?`), " ");
  s = s.replace(/\s+,/g, ",").replace(/\s+/g, " ").replace(/^[\s,.\/-]+|[\s,.\/-]+$/g, "");
  return `${s}, ${ilce}/ANTALYA, TÜRKİYE`;
}

function destOf(l){ return l.p === "ok" ? `${l.lat},${l.lng}` : normAddr(l.a, l.i); }
const searchURL = l => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(destOf(l));
const DEPOT_Q = `${DEPOT.a}, Muratpaşa, Antalya`;
function routeLinks(p){
  const per = p.perLink || 10;
  const pts = p.stops.map((s, i) => ({ q: destOf(BY[s.k]), no: i + 1 }));
  if (p.ret) pts.push({ q: DEPOT_Q, no: 0 });
  const out = []; let origin = DEPOT_Q;
  for (let i = 0; i < pts.length; i += per){
    const g = pts.slice(i, i + per); const dest = g[g.length - 1];
    const url = "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=" + encodeURIComponent(origin) + "&destination=" + encodeURIComponent(dest.q) +
      (g.length > 1 ? "&waypoints=" + encodeURIComponent(g.slice(0, -1).map(x => x.q).join("|")) : "");
    const nums = g.filter(x => x.no).map(x => x.no);
    out.push({ url, label: `Rota ${out.length + 1}`, range: nums.length ? `durak ${nums[0]}${nums.length>1?"–"+nums[nums.length-1]:""}${g.some(x=>!x.no)?" + atölye":""}` : "atölyeye dönüş" });
    origin = dest.q;
  }
  return out;
}
function planMsg(p){
  const links = routeLinks(p); const nm = personName(p);
  const lines = [`*Elmaslar damga rotası · ${dTR(p.date)}${p.teams>1?` · Ekip ${p.team}/${p.teams}`:""}*`,
    `${nm !== "Atanmadı" ? "Merhaba " + nm + ", " : ""}${p.stops.length} durak, ${p.dev} cihaz, yaklaşık ${Math.round(p.km)} km. Başlangıç ${p.start}, atölyeden.`, "",
    "Panel (durakları buradan tamamlayın / eksik girin):", `${APP_URL}#plan-${p.id}`, "",
    "Google Maps rotası:", ...links.map(l => `${l.label} (${l.range}): ${l.url}`), "Rota açılmazsa paneldeki her durağın “Yol tarifi” düğmesini kullanın.", "", "Duraklar:",
    ...p.stops.map((s, i) => { const l = BY[s.k]; const n = titleTR(l.n); return `${i+1}. ${n.length>42?n.slice(0,41)+"…":n} · ${titleTR(l.i)} (${s.dev.length} cihaz)`; })];
  return lines.join("\n");
}
function waLink(p){ const ph = waPhone(personPhone(p)); return `https://wa.me/${ph}?text=${encodeURIComponent(planMsg(p))}`; }
function shareCard(p){
  const links = routeLinks(p), ph = personPhone(p);
  return `<div class="share">
    <div class="row" style="justify-content:space-between"><div><b>${esc(personName(p))}</b>${p.teams>1?` <span class="muted">· Ekip ${p.team}</span>`:""}<div class="muted mono" style="font-size:.8rem">${ph?esc(ph):"WhatsApp numarası yok, mesajı kişiyi seçerek gönderin"}</div></div>
      <div class="row"><a class="btn sm wa" href="${esc(waLink(p))}" target="_blank" rel="noopener">WhatsApp ile gönder ↗</a><button class="btn sm" data-act="copymsg" data-id="${p.id}">Mesajı kopyala</button></div></div>
    <div class="row" style="gap:6px">${links.map(l => `<a class="pill linkpill" href="${esc(l.url)}" target="_blank" rel="noopener">${l.label} · ${l.range} ↗</a>`).join("")}<a class="pill linkpill" href="#plan-${p.id}" data-act="field" data-id="${p.id}">Panel ↗</a></div>
    ${(() => { const u = p.stops.filter(s => BY[s.k] && BY[s.k].p !== "ok").length; return u ? `<div class="warnbox" style="font-size:.8rem">${u}/${p.stops.length} durağın konumu doğrulanmadı; bu duraklar adresle aranıyor. Göndermeden önce rota linkini açıp kontrol edin. Google bir adresi bulamazsa tüm rota açılmaz; “Google ile konum bul” ya da planlayıcıdaki “Konumu sabitle” ile düzeltin.</div>` : `<div class="savings" style="font-size:.8rem">Tüm durakların konumu doğrulandı; rota linkleri koordinatla gidiyor.</div>`; })()}
    ${st.showMsg === p.id ? `<textarea id="msg-${p.id}" readonly rows="8" style="font-family:var(--f-mono);font-size:.78rem">${esc(planMsg(p))}</textarea>` : ""}
  </div>`;
}
function viewPlans(){
  const staffCard = viewTeam();
  const plans = st.plans.slice().sort((a,b) => b.date.localeCompare(a.date) || (a.team||1) - (b.team||1));
  const list = plans.length ? plans.map(p => { const g = planProgress(p);
    return `<div class="card pad stack" style="gap:10px;${p.teams>1?`border-top:3px solid ${TEAM_C[(p.team-1)%5]}`:""}">
      <div class="plan"><div style="min-width:0"><div class="eyebrow">${dTR(p.date)}${p.teams>1?` · Ekip ${p.team}/${p.teams}`:""}</div>
        <h3 style="margin-top:2px">${p.stops.length} durak · ${p.dev} cihaz · ${p.km.toFixed(1)} km</h3></div>
        <div class="row">${st.confirmDel===p.id?`<span class="muted" style="font-size:.85rem">Silinsin mi?</span><button class="btn sm warn" data-act="delyes" data-id="${p.id}">Sil</button><button class="btn sm" data-act="delno">Vazgeç</button>`
          :`<button class="btn sm" data-act="edit" data-id="${p.id}">Düzenle</button><button class="btn sm" data-act="del" data-id="${p.id}">Sil</button>`}</div></div>
      ${shareCard(p)}
      <div class="prog"><i style="width:${g.done/g.n*100}%;background:var(--ok)"></i><i style="width:${g.miss/g.n*100}%;background:var(--retry)"></i></div>
      <div class="muted" style="font-size:.84rem">${g.done} tamamlandı · ${g.miss} eksik/yapılamadı · ${g.n-g.done-g.miss} bekliyor</div>
      <details><summary>Durak detayları</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${p.stops.map((s,i)=>{ const l = BY[s.k]; const r = st.results[p.id+"__"+s.k];
        return `<tr><td class="mono">${i+1}</td><td>${esc(titleTR(l?.n))}<div class="muted" style="font-size:.78rem">${esc(titleTR(l?.i))}</div></td>
        <td>${r?`<span class="st ${r.st==="tamam"?"tamam":"eksik"}">${r.st==="tamam"?"Tamamlandı":RL[r.st]?.[1]||r.st}</span>`:`<span class="st bekliyor">Bekliyor</span>`}</td>
        <td style="font-size:.82rem">${r?`${r.done.length}/${s.dev.length} cihaz${r.note?` · ${esc(r.note)}`:""}`:""}</td></tr>`; }).join("")}</tbody></table></div></details>
    </div>`; }).join("")
    : `<div class="card empty">Henüz kayıtlı plan yok. “Rota planla” sekmesinden lokasyon seçip “Planla ve gönder”e basın.</div>`;
  return `<div class="stack"><div class="row" style="justify-content:space-between"><h2>Planlar ve saha sonuçları</h2><button class="btn" data-act="export">Sonuçları CSV indir</button></div>${staffCard}${list}</div>`;
}


function viewTeam(){
  const ROL = { admin: "Yönetici", bolge: "Bölge yöneticisi", saha: "Saha" };
  const ilceler = [...new Set(LOCS.filter(l=>!l.dep).map(l=>l.i))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"tr"));
  const regionName = id => st.regions.find(r => r.id === id)?.ad || "—";
  const people = (st.staffAll || []).slice().sort((a,b) => (a.aktif === b.aktif ? 0 : a.aktif ? -1 : 1) || a.name.localeCompare(b.name, "tr"));
  return `<div class="grid2">
  <div class="card pad stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h2>Ekip</h2><span class="muted" style="font-size:.84rem">WhatsApp mesajı buradaki numaraya gider</span></div>
    <div class="tbl-wrap"><table><thead><tr><th>Ad</th><th>Telefon</th><th>Rol</th><th>Bölge</th><th></th></tr></thead><tbody>${people.map(s => `<tr style="${s.aktif===false?"opacity:.5":""}">
      <td><b>${esc(s.name)}</b><div class="muted" style="font-size:.76rem">${esc(s.email)}</div></td>
      <td><input type="text" class="inl" data-act="pf" data-id="${s.id}" data-f="tel" value="${esc(s.phone)}" placeholder="05xx…" aria-label="Telefon"></td>
      <td><select class="inl" data-act="pf" data-id="${s.id}" data-f="rol" ${s.id===st.me?"disabled":""}>${Object.entries(ROL).map(([k,v])=>`<option value="${k}" ${s.rol===k?"selected":""}>${v}</option>`).join("")}</select></td>
      <td><select class="inl" data-act="pf" data-id="${s.id}" data-f="bolge_id"><option value="">—</option>${st.regions.map(r=>`<option value="${r.id}" ${s.bolge==r.id?"selected":""}>${esc(r.ad)}</option>`).join("")}</select></td>
      <td class="r">${s.id===st.me?"":`<button class="btn sm" data-act="pactive" data-id="${s.id}">${s.aktif===false?"Etkinleştir":"Pasifleştir"}</button>`}</td></tr>`).join("")}</tbody></table></div>
    <div class="stack" style="gap:6px"><h3>Telefonla giriş listesi (SMS)</h3>
      ${(st.invites||[]).length ? `<div class="tbl-wrap"><table><tbody>${st.invites.map(v => `<tr><td><b>${esc(v.ad)}</b></td><td class="mono">0${esc(v.phone.slice(0,3))} ${esc(v.phone.slice(3,6))} ${esc(v.phone.slice(6,8))} ${esc(v.phone.slice(8))}</td><td>${ROL[v.rol]||v.rol}</td>
        <td>${v.used_by ? `<span class="st tamam">Giriş yaptı</span>` : `<span class="st bekliyor">İlk giriş bekleniyor</span>`}</td>
        <td class="r">${st.confirmDel==="i:"+v.phone?`<button class="btn sm warn" data-act="invdelyes" data-id="${v.phone}">Sil</button> <button class="btn sm" data-act="delno">Vazgeç</button>`:`<button class="btn sm" data-act="invdel" data-id="${v.phone}">Sil</button>`}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted" style="margin:0;font-size:.88rem">Listede kimse yok. Eklenen numara, giriş ekranında “Telefon (SMS)” ile kod alıp girebilir; ilk girişte hesabı otomatik açılır.</p>`}
      <form class="row" id="inviteForm"><input id="iv-ad" type="text" placeholder="Ad Soyad" required style="flex:1 1 150px"><input id="iv-tel" type="tel" inputmode="tel" placeholder="05xx xxx xx xx" required style="flex:1 1 130px">
        <select id="iv-rol"><option value="saha">Saha</option><option value="bolge">Bölge yöneticisi</option><option value="admin">Yönetici</option></select><button class="btn primary" type="submit">Listeye ekle</button></form>
      <details><summary style="font-size:.86rem">Birden fazla kişiyi yapıştırarak ekle</summary><div class="stack" style="gap:6px;margin-top:6px"><textarea id="iv-bulk" rows="5" placeholder="Yasin YALÇIN - 0507 220 71 07&#10;Anıl GÜÇ - 0553 966 03 01"></textarea><div><button class="btn" data-act="invbulk">Hepsini saha olarak ekle</button></div></div></details>
    </div>
    <details><summary>E-posta ve şifreyle hesap aç</summary>
    <form class="stack" id="staffForm" style="gap:8px;margin-top:8px">
      <div class="row"><input id="sf-name" type="text" placeholder="Ad Soyad" required style="flex:1 1 160px"><input id="sf-phone" type="text" inputmode="tel" placeholder="05xx xxx xx xx" style="flex:1 1 140px"></div>
      <div class="row"><input id="sf-email" type="email" placeholder="E-posta (giriş adı)" required style="flex:1 1 200px"><input id="sf-pass" type="text" placeholder="Geçici şifre (en az 8)" minlength="8" required style="flex:1 1 140px"></div>
      <div class="row"><select id="sf-rol"><option value="saha">Saha</option><option value="bolge">Bölge yöneticisi</option><option value="admin">Yönetici</option></select><button class="btn primary" type="submit">Hesabı aç</button></div>
      <p class="muted" style="font-size:.8rem;margin:0">Kişi bu e-posta ve şifreyle yahyasogut.com/damga adresinden girer; ilk girişte şifresini değiştirmesini isteyin.</p>
    </form></details></div>
  <div class="card pad stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h2>Bölgeler</h2><span class="muted" style="font-size:.84rem">Rota planlayıcı bölgeyle açılır</span></div>
    ${st.regions.length ? st.regions.map(r => `<div class="share" style="gap:4px"><div class="row" style="justify-content:space-between"><b>${esc(r.ad)}</b><span class="row">
      <span class="muted" style="font-size:.82rem">Sorumlu: ${esc(staffBy(r.sorumlu)?.name || "—")}</span>${st.confirmDel==="r:"+r.id?`<button class="btn sm warn" data-act="regdelyes" data-id="${r.id}">Sil</button><button class="btn sm" data-act="delno">Vazgeç</button>`:`<button class="btn sm" data-act="regdel" data-id="${r.id}">Sil</button>`}</span></div>
      <div class="muted" style="font-size:.84rem">${(r.ilceler||[]).map(titleTR).join(", ") || "İlçe yok"}</div></div>`).join("") : `<p class="muted" style="margin:0">Henüz bölge yok. Örn. Merkez: Kepez, Muratpaşa, Konyaaltı.</p>`}
    <details><summary>Bölge ekle</summary><form class="stack" id="regionForm" style="gap:8px;margin-top:8px">
      <div class="row"><input id="rg-ad" type="text" placeholder="Bölge adı" required style="flex:1 1 160px"><select id="rg-sor" style="flex:1 1 160px"><option value="">Sorumlu personel</option>${st.staff.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div>
      <div class="ilcegrid">${ilceler.map(i=>`<label class="row" style="gap:6px;font-size:.86rem"><input type="checkbox" name="rg-ilce" value="${esc(i)}">${esc(titleTR(i))}</label>`).join("")}</div>
      <div><button class="btn primary" type="submit">Bölgeyi kaydet</button></div></form></details></div>
  </div>`;
}
/* ---- Field ---- */
function myPlans(){ return st.plans.slice().sort((a,b)=>a.date.localeCompare(b.date) || (a.team||1)-(b.team||1)); }
function viewField(){
  const plans = myPlans();
  if (!plans.length) return `<div class="field card empty">Size atanmış rota yok. Yönetici bir plan gönderdiğinde WhatsApp'taki panel linki sizi doğrudan bu ekrana getirir.</div>`;
  const today = todayISO();
  if (!st.fieldPlan || !plans.find(p => p.id === st.fieldPlan)) st.fieldPlan = (plans.find(p => p.date >= today) || plans[plans.length-1]).id;
  const p = plans.find(x => x.id === st.fieldPlan); const g = planProgress(p); const links = routeLinks(p);
  return `<div class="field stack">
    <div class="card pad stack" style="gap:10px">
      <div class="row" style="justify-content:space-between"><div><div class="eyebrow">${esc(personName(p))}${p.teams>1?` · Ekip ${p.team}`:""}</div><h2>${p.date===today?"Bugün":dTR(p.date)} · ${p.stops.length} durak</h2></div>
        ${plans.length>1?`<select id="fplan" aria-label="Plan seç">${plans.map(x=>`<option value="${x.id}" ${x.id===p.id?"selected":""}>${dTR(x.date)} · ${esc(personName(x))} · ${x.stops.length} durak</option>`).join("")}</select>`:""}</div>
      <div class="prog"><i style="width:${g.done/g.n*100}%;background:var(--ok)"></i><i style="width:${g.miss/g.n*100}%;background:var(--retry)"></i></div>
      <div class="muted" style="font-size:.88rem">${g.done} tamam · ${g.miss} eksik · ${g.n-g.done-g.miss} kaldı · ${p.km.toFixed(0)} km</div>
      <div class="row" style="gap:6px">${links.map(l=>`<a class="btn sm" href="${esc(l.url)}" target="_blank" rel="noopener">${l.label} · ${l.range} ↗</a>`).join("")}</div>
    </div>
    ${p.stops.map((s,i) => stopCard(p, s, i)).join("")}
  </div>`;
}

/* ---- Devices & QR ---- */
const qrURL = code => { const o = DEVBY[code]; return o && o.d[19] ? `${PUBLIC_QR_URL}?k=${code}-${o.d[19]}` : `${APP_URL}#c-${code}`; };
function qrSVG(text){ if (!window.qrcode) return `<div class="qr-miss">QR kütüphanesi yüklenemedi</div>`;
  const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: "QR: " + text }); }
function devEvents(code){ return Object.values(st.events).filter(e => e.code === code).sort((a, b) => b.at.localeCompare(a.at)); }
function stampedByRoute(row){ for (const id in st.results){ const r = st.results[id]; if (r.done && r.done.includes(row)) return r; } return null; }
function stampInfo(o){
  const d = o.d; let last = /^(19|20)\d\d$/.test(d[6]) ? +d[6] : null; let src = last ? (d[9] ? `Dönem listesi · ${d[9]}` : "Cihaz kaydı") : "";
  const rr = stampedByRoute(d[0]); if (rr && YEAR >= (last || 0)){ last = YEAR; src = "Saha rotası · " + rr.at.slice(0,10).split("-").reverse().join("."); }
  const ev = devEvents(d[11]).find(e => e.type === "damga"); if (ev && ev.year >= (last || 0)){ last = ev.year; src = "QR kaydı · " + ev.at.slice(0,10).split("-").reverse().join("."); }
  const next = last ? last + 2 : null;
  let s, label, sub;
  if (["cihazyok","kapsamdisi"].includes(d[8]) && (!last || next <= YEAR)){ s = "pasif"; label = "Kapsam dışı"; sub = `Kayıt: ${d[9] || "—"}`; }
  else if (!last){ s = "bilinmiyor"; label = "Damga bilgisi yok"; sub = "Son damga yılı kayıtlı değil"; }
  else if (next > YEAR){ s = "gecerli"; label = "Damga geçerli"; sub = `Sonraki periyodik muayene ${next} · başvuru Ocak–Şubat ${next}`; }
  else { const left = Math.ceil((new Date(YEAR, 11, 31) - new Date()) / 864e5);
    s = next === YEAR ? "buyil" : "gecikmis"; label = next === YEAR ? `${YEAR} damgası bekliyor` : `${YEAR} damgası bekliyor · periyot aşılmış (son damga ${last})`;
    sub = left > 0 ? `Başvurusu yapılan cihaz 31.12.${YEAR} tarihine kadar damgalanmalı · ${left} gün kaldı` : "Damgalama süresi doldu"; }
  return { last, next, s, label, sub, src };
}
const SCLS = { gecerli: "tamam", buyil: "bekliyor", gecikmis: "tekrar", bilinmiyor: "kapsamdisi", pasif: "kapsamdisi" };
function precOf(o){ return o.d[18] || ""; }

function devFilter(){
  const f = st.df, q = f.q.trim().toLocaleUpperCase("tr-TR");
  return DEVS.filter(o => { const l = o.l, d = o.d;
    if (l.dep && !f.dep) return false;
    if (f.ilce && l.i !== f.ilce) return false;
    if (q && !(l.n.toLocaleUpperCase("tr-TR").includes(q) || d[4].toLocaleUpperCase("tr-TR").includes(q) || d[2].toLocaleUpperCase("tr-TR").includes(q) || d[11].includes(q))) return false;
    if (f.flag && !d[15]) return false;
    if (f.s.length || f.next){ const si = stampInfo(o); if (f.s.length && !f.s.includes(si.s)) return false; if (f.next && String(si.next) !== f.next) return false; }
    return true; });
}
function viewDevices(){
  const all = DEVS.filter(o => !o.l.dep).map(o => [o, stampInfo(o)]);
  const c = k => all.filter(x => x[1].s === k).length;
  const nx = {}; all.forEach(([o, si]) => { if (si.next && si.s !== "pasif") nx[si.next] = (nx[si.next] || 0) + 1; });
  const nextYears = Object.keys(nx).sort();
  const list = devFilter(); const page = list.slice(st.df.page * 50, st.df.page * 50 + 50); const pages = Math.max(1, Math.ceil(list.length / 50));
  const ilceler = [...new Set(LOCS.filter(l=>!l.dep).map(l=>l.i))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"tr"));
  const flagN = DEVS.filter(o => o.d[15]).length;
  return `<div class="stack">
  <div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">Cihaz sicili · seri numarasıyla takip</div><h2>Cihazlar ve QR etiketleri</h2></div>
    <span class="muted" style="font-size:.85rem">Damga 2 yılda bir · başvuru Ocak–Şubat · damgalama yıl sonuna kadar</span></div>
  <section class="kpis">
    <div class="card kpi" style="--c:var(--ok)"><span>Damga geçerli</span><b>${fmt(c("gecerli"))}</b><small>sonraki muayene ${YEAR+1} veya sonrası</small></div>
    <div class="card kpi" style="--c:var(--wait)"><span>${YEAR} damgası bekliyor</span><b>${fmt(c("buyil")+c("gecikmis"))}</b><small>31 Aralık'a kadar damgalanmalı</small></div>
    <div class="card kpi" style="--c:var(--retry)"><span>Bunların periyodu aşılmış</span><b>${fmt(c("gecikmis"))}</b><small>son damga ${YEAR-2}'den önce</small></div>
    <div class="card kpi" style="--c:var(--brand)"><span>Ocak–Şubat ${YEAR+1} başvurusu</span><b>${fmt(nx[YEAR+1]||0)}</b><small>son damgası ${YEAR-1} olan cihazlar</small></div>
    <div class="card kpi" style="--c:var(--off)"><span>Seri no sorunlu</span><b>${fmt(flagN)}</b><small>boş veya tekrar eden · QR öncesi düzeltin</small></div>
  </section>
  <div class="card">
    <div class="pool-head">
      <div class="row"><input id="dq" type="search" placeholder="Firma, seri no, marka veya QR kodu" value="${esc(st.df.q)}" style="flex:2 1 220px">
        <select id="dilce" aria-label="İlçe" style="flex:1 1 140px"><option value="">Tüm ilçeler</option>${ilceler.map(i=>`<option ${st.df.ilce===i?"selected":""} value="${esc(i)}">${esc(titleTR(i))}</option>`).join("")}</select>
        <select id="dnext" aria-label="Sonraki damga yılı" style="flex:1 1 140px"><option value="">Sonraki damga: tümü</option>${nextYears.map(y=>`<option ${st.df.next===y?"selected":""} value="${y}">Sonraki damga ${y} (${nx[y]})</option>`).join("")}</select></div>
      <div class="chips">${[["gecerli","Damga geçerli"],["buyil",`${YEAR} bekliyor (periyodunda)`],["gecikmis","Periyodu aşılmış"],["bilinmiyor","Bilgi yok"],["pasif","Kapsam dışı"]].map(([k,lab])=>`<button class="chip" data-act="dfs" data-v="${k}" aria-pressed="${st.df.s.includes(k)}">${lab}</button>`).join("")}
        <button class="chip" data-act="dflag" aria-pressed="${st.df.flag}">Seri no sorunlu</button><button class="chip" data-act="ddep" aria-pressed="${st.df.dep}">Atölye stoku</button></div>
      <div class="row" style="justify-content:space-between">
        <span class="muted mono">${fmt(list.length)} cihaz · ${st.dsel.size} seçili</span>
        <span class="row"><button class="btn sm" data-act="dselall" ${list.length?"":"disabled"}>Filtredekileri seç${list.length>600?" (ilk 600)":""}</button><button class="link" data-act="dselnone">Temizle</button>
          <button class="btn sm primary" data-act="labels" ${st.dsel.size?"":"disabled"}>QR etiketlerini indir (${st.dsel.size})</button>
          <button class="btn sm" data-act="applist">Başvuru listesi CSV</button></span></div>
    </div>
    <div class="tbl-wrap"><table class="devtbl"><thead><tr><th></th><th>Firma</th><th>Cihaz</th><th>Seri no</th><th>Max / e / sınıf</th><th class="r">Son</th><th class="r">Sonraki</th><th>Durum</th></tr></thead><tbody>
    ${page.map(o => { const d = o.d, si = stampInfo(o), e = precOf(o);
      return `<tr><td><input type="checkbox" data-act="dpick" data-c="${d[11]}" ${st.dsel.has(d[11])?"checked":""} aria-label="Seç"></td>
        <td style="min-width:180px"><button class="link rowlink" data-act="dev" data-c="${d[11]}">${esc(titleTR(o.l.n))}</button><div class="muted" style="font-size:.76rem">${esc(titleTR(o.l.i))}</div></td>
        <td>${esc(d[2]||"—")} ${esc(d[3])}<div class="muted" style="font-size:.76rem">${esc(titleTR(d[1]))}</div></td>
        <td class="mono">${esc(d[4]||"—")}${d[15]?` <span class="st tekrar">${d[15]==="seri-yok"?"yok":"tekrar"}</span>`:""}</td>
        <td class="mono">${esc(d[12]||"?")} / ${e?esc(e):"<span class=muted>e ?</span>"} / ${esc(d[16])}</td>
        <td class="r mono">${si.last||"—"}</td><td class="r mono">${si.next||"—"}</td>
        <td><span class="st ${SCLS[si.s]}">${esc(si.s==="buyil"?`${YEAR} bekliyor`:si.s==="gecikmis"?`${YEAR} bekliyor · gecikmiş`:si.label)}</span></td></tr>`; }).join("")}
    </tbody></table></div>
    ${pages>1?`<div class="row" style="justify-content:center;padding:12px"><button class="btn sm" data-act="dpage" data-p="${st.df.page-1}" ${st.df.page?"":"disabled"}>‹ Önceki</button><span class="mono muted">${st.df.page+1} / ${pages}</span><button class="btn sm" data-act="dpage" data-p="${st.df.page+1}" ${st.df.page<pages-1?"":"disabled"}>Sonraki ›</button></div>`:""}
  </div></div>`;
}

function cardRole(){ if (st.isAdmin) return st.cardAs || "admin"; return st.cardAs === "musteri" ? "musteri" : "saha"; }
function viewDevice(){
  const o = DEVBY[st.devCode];
  if (!o) return `<div class="field card empty">Bu QR koduna ait cihaz bulunamadı (${esc(st.devCode)}). Etiketteki kodu Elmaslar'a iletin.</div>`;
  const d = o.d, l = o.l, si = stampInfo(o), role = cardRole(), e = precOf(o), evs = devEvents(d[11]);
  const spec = [["Cinsi", titleTR(d[1]) || "—"],["Marka / model", `${d[2]||"—"} ${d[3]}`],["Seri no", d[4] || "Kayıtlı değil"],["Kapasite (Max)", d[12] || "—"],
    ["Hassasiyet (e)", e || "Girilmedi"],["Doğruluk sınıfı", d[16]],["Son damga", si.last || "—"],["Sonraki damga", si.next ? `${si.next} · başvuru Oca–Şub ${si.next}` : "—"]];
  const rr = Object.values(st.results).filter(r => r.done && (BY[r.k]?.d || []).some(x => x[0] === d[0]));
  const hist = [
    ...evs.map(ev => ({ at: ev.at, t: ev.type === "damga" ? `Damgalandı (${ev.year})` : ev.type === "hassasiyet" ? `Hassasiyet: ${ev.e}` : ev.type === "eksik" ? (RL[ev.reason]?.[1] || "Eksik") : "Not", n: ev.note, c: ev.type === "damga" ? "tamam" : ev.type === "eksik" ? "eksik" : "kapsamdisi" })),
    ...rr.map(r => ({ at: r.at, t: r.done.includes(d[0]) ? "Saha rotasında damgalandı" : (RL[r.st]?.[1] || r.st), n: r.note, c: r.done.includes(d[0]) ? "tamam" : "eksik" })),
    { at: "0000", t: `İlk kayıt (Excel): ${d[9] || "durum boş"}`, n: "", c: CAT[d[8]] ? d[8] : "kapsamdisi", xl: 1 }
  ].sort((a, b) => b.at.localeCompare(a.at));
  return `<div class="field stack devcard">
    ${st.isAdmin ? `<div class="row" style="justify-content:space-between"><button class="btn sm" data-act="view" data-v="cihazlar">‹ Cihazlar</button>
      <div class="chips" role="group" aria-label="Görünüm">${[["musteri","Müşteri / denetçi"],["saha","Saha"],["admin","Yönetici"]].map(([k,lab])=>`<button class="chip" data-act="cardas" data-v="${k}" aria-pressed="${role===k}">${lab}</button>`).join("")}</div></div>` : ""}
    <article class="card">
      <div class="dc-head"><div class="mk"></div><div style="min-width:0"><div class="eyebrow">Periyodik muayene kartı · ${esc(d[11])}</div><h2>${esc(titleTR(l.n))}</h2><div class="muted" style="font-size:.88rem">${esc(titleTR(l.i))} · ${esc(titleTR(d[7]||""))}</div></div></div>
      <div class="dc-status s-${si.s}"><b>${esc(si.label)}</b><span>${esc(si.sub)}</span></div>
      <dl class="specgrid">${spec.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${d[15] ? `<div class="warnbox" style="margin:0 16px 16px">${d[15]==="seri-yok"?"Bu cihazın seri numarası kayıtlı değil. Etiket satır numarasıyla üretildi.":"Bu seri numarası listede birden fazla cihazda geçiyor. Kontrol edin."}</div>` : ""}
      <div class="muted" style="font-size:.78rem;padding:0 16px 14px">Kaynak: ${esc(si.src || "—")}</div>
    </article>
    ${role !== "musteri" ? `<article class="card pad stack" style="gap:10px"><h3>Sahada işlem</h3>
      <div class="row"><button class="btn ok" data-act="evdamga" data-c="${d[11]}">✓ ${YEAR} damgası yapıldı</button></div>
      <div class="row"><label class="f" style="flex:1 1 160px">Hassasiyet (e)<input id="ev-e" type="text" placeholder="örn. 5 g" value="${esc(e)}"></label><button class="btn" data-act="evprec" data-c="${d[11]}" style="align-self:flex-end">Hassasiyeti kaydet</button></div>
      <div class="eyebrow">Yapılamadıysa</div>
      <div class="reasons">${REASONS.map(([k,lab])=>`<button class="chip" data-act="evreason" data-v="${k}" aria-pressed="${st.evReason===k}">${lab}</button>`).join("")}</div>
      <textarea id="ev-note" placeholder="Not (örn. cihaz arızalı, yetkili Pazartesi burada)"></textarea>
      <div class="row"><button class="btn warn" data-act="evmiss" data-c="${d[11]}" ${st.evReason?"":"disabled"}>Eksikliği kaydet</button></div>
    </article>
    <article class="card pad stack" style="gap:8px"><h3>Geçmiş</h3>
      <ol class="hist">${hist.map(h=>`<li><span class="st ${h.c}">${h.xl?"Excel":h.at.slice(0,10).split("-").reverse().join(".")}</span><div><b>${esc(h.t)}</b>${h.n?`<div class="muted" style="font-size:.84rem">${esc(h.n)}</div>`:""}</div></li>`).join("")}</ol></article>` : ""}
    ${role === "admin" ? `<article class="card pad dc-admin">
      <div class="qrbox">${qrSVG(qrURL(d[11]))}<div class="mono" style="font-size:.75rem;text-align:center">${esc(d[11])}</div></div>
      <div class="stack" style="gap:8px;min-width:0"><h3>Yönetici bilgileri</h3>
        <dl class="specgrid spec-sm">${[["Excel satırı", d[17]||"—"],["İlk aktarım durumu", d[9]||"boş"],["Fatura / ödeme notu", d[10]||"—"],["Kime ait", d[13]||"—"],["Bilgi", d[14]||"—"],["Telefon", l.t||"—"],["Adres", titleTR(l.a)],["QR kodu", d[11]]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <div class="row"><button class="btn primary" data-act="label1" data-c="${d[11]}">Bu cihazın etiketini indir</button><button class="btn" data-act="labelfirm" data-c="${d[11]}">Firmanın tüm cihaz etiketleri</button></div>
        <div class="muted" style="font-size:.8rem">QR adresi: <span class="mono" style="word-break:break-all">${esc(qrURL(d[11]))}</span></div></div>
    </article>` : ""}
    <p class="muted" style="font-size:.8rem;text-align:center;margin:0">Elmaslar Elektronik Tartı Sistemleri ve Kalibrasyon Hizmetleri · Bu kart tartı aletinin periyodik muayene (damga) durumunu gösterir.</p>
  </div>`;
}
function labelDoc(codes){
  const items = codes.map(c => DEVBY[c]).filter(Boolean);
  const lab = o => { const d = o.d, si = stampInfo(o), e = precOf(o), n = titleTR(o.l.n);
    return `<div class="lb"><div class="q">${qrSVG(qrURL(d[11]))}</div><div class="t"><div class="b">ELMASLAR · DAMGA TAKİP</div>
      <div class="f">${esc(n.length>46?n.slice(0,45)+"…":n)}</div>
      <div>${esc(d[2])} ${esc(d[3])}</div><div>S/N <b>${esc(d[4]||"—")}</b></div>
      <div>Max ${esc(d[12]||"?")} · e ${esc(e||"____")} · Sınıf ${esc(d[16])}</div>
      <div>Son damga <b>${si.last||"—"}</b> · Sonraki <b>${si.next||"—"}</b></div><div class="c">${esc(d[11])}</div></div></div>`; };
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Elmaslar QR etiketleri (${items.length})</title><style>
  @page{size:A4;margin:12mm 7mm}*{box-sizing:border-box}body{margin:0;font:7.2pt/1.25 Arial,Helvetica,sans-serif;color:#000}
  .sheet{display:grid;grid-template-columns:repeat(3,63.5mm);grid-auto-rows:38.1mm;gap:0 2.5mm;justify-content:center}
  .lb{display:flex;gap:2mm;padding:2mm;border:0.2mm dashed #bbb;overflow:hidden;break-inside:avoid}
  .q{width:24mm;flex:none}.q svg{width:24mm;height:24mm;display:block}.t{min-width:0;display:flex;flex-direction:column;gap:.4mm}
  .b{font-weight:700;letter-spacing:.06em;color:#2D2A8E;font-size:6.4pt}.f{font-weight:700;font-size:7.6pt}.c{font-family:monospace;color:#444;margin-top:auto}
  .hint{font:10pt Arial;margin:0 0 4mm;color:#555}@media print{.hint{display:none}.lb{border-color:transparent}}
  </style></head><body><p class="hint">${items.length} etiket · A4, 3×7 (63,5×38,1 mm, L7160 uyumlu). Yazdırırken ölçek %100 seçin.</p><div class="sheet">${items.map(lab).join("")}</div></body></html>`;
}
async function downloadLabels(codes){
  if (!codes.length) return; if (!window.qrcode){ toast("QR kütüphanesi yüklenemedi; sayfayı yenileyin"); return; }
  const html = labelDoc(codes).replace("</body>", "<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body>");
  const w = window.open("", "_blank");
  if (w){ w.document.open(); w.document.write(html); w.document.close(); toast("Etiket sayfası açıldı; yazdırma penceresinde ölçek %100 seçin"); }
  else { downloadFile(`elmaslar-qr-etiket-${codes.length}-${todayISO()}.html`, labelDoc(codes), "text/html;charset=utf-8"); toast("Açılır pencere engellendi; etiket dosyası indirildi"); }
}
async function downloadAppList(){
  const y = YEAR + 1; const rows = [["Firma","İlçe","Adres","Telefon","Cinsi","Marka","Model","Seri No","Kapasite","Hassasiyet","Sınıf","Son damga","Sonraki damga","QR kodu"]];
  DEVS.forEach(o => { const si = stampInfo(o); if (o.l.dep || si.s === "pasif" || si.next !== y) return; const d = o.d;
    rows.push([o.l.n, o.l.i, o.l.a, o.l.t, d[1], d[2], d[3], d[4], d[12], precOf(o), d[16], si.last, si.next, d[11]]); });
  const csv = "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(";")).join("\r\n");
  downloadFile(`damga-basvuru-ocak-subat-${y}.csv`, csv); toast(`${rows.length-1} cihazlık ${y} başvuru listesi indirildi`);
}

function stopCard(p, s, i){
  const l = BY[s.k]; if (!l) return "";
  const r = st.results[p.id+"__"+s.k]; const open = st.open === s.k;
  const devs = l.d.filter(d => s.dev.includes(d[0]));
  const dr = st.draft[s.k] || (st.draft[s.k] = { done: r ? r.done.slice() : devs.map(d=>d[0]), reason: r && r.st!=="tamam" ? r.st : "", note: r?.note || "" });
  const cls = r ? (r.st === "tamam" ? "done" : "miss") : "";
  const allChecked = dr.done.length === devs.length;
  return `<article class="card stop ${cls}">
    <div class="stop-h" data-act="toggle" data-k="${s.k}"><span class="no">${r&&r.st==="tamam"?"✓":i+1}</span>
      <div style="min-width:0"><div style="font-weight:700">${esc(titleTR(l.n))}</div><div class="muted" style="font-size:.85rem">${esc(titleTR(l.a))} · ${esc(titleTR(l.i))}</div>
        <div class="row" style="margin-top:4px;gap:6px">${r?`<span class="st ${r.st==="tamam"?"tamam":"eksik"}">${r.st==="tamam"?"Tamamlandı":RL[r.st]?.[1]||r.st}</span>`:""}<span class="muted mono">${devs.length} cihaz</span></div></div>
      <span class="muted" aria-hidden="true">${open?"▾":"▸"}</span></div>
    ${open ? `<div class="stop-b">
      <div class="row"><a class="btn sm" href="${gmapsDir(destOf(l))}" target="_blank" rel="noopener">Yol tarifi ↗</a>
        ${l.t?`<span class="muted" style="font-size:.88rem">Tel: <a class="tel mono" href="tel:${esc(l.t.replace(/\s/g,""))}">${esc(l.t)}</a></span>`:`<span class="muted" style="font-size:.85rem">Telefon kayıtlı değil</span>`}</div>
      <div class="stack" style="gap:6px">${devs.map(d => `<label class="dev"><input type="checkbox" data-act="devchk" data-k="${s.k}" data-r="${d[0]}" ${dr.done.includes(d[0])?"checked":""}>
        <div style="min-width:0"><div style="font-weight:600;font-size:.9rem">${esc(d[2]||"Marka yok")} ${esc(d[3])} <span class="st ${d[8]}">${CAT[d[8]].l}</span> <button class="link" data-act="dev" data-c="${d[11]}" style="font-size:.8rem">Cihaz kartı</button></div>
        <div class="spec mono">S/N ${esc(d[4]||"—")} · Max ${esc(d[12]||"?")} · e ${esc(precOf({d})||"?")} · Sınıf ${esc(d[16])} · son damga ${esc(d[6]||"—")}${d[7]?` · ${esc(titleTR(d[7]))}`:""}</div></div></label>`).join("")}</div>
      ${st.reasonFor === s.k ? `<div class="stack" style="gap:8px"><div class="eyebrow">${allChecked?"Neden yapılamadı?":`${devs.length-dr.done.length} cihaz için neden?`}</div>
        <div class="reasons">${REASONS.map(([k,lab])=>`<button class="chip" data-act="reason" data-k="${s.k}" data-v="${k}" aria-pressed="${dr.reason===k}">${lab}</button>`).join("")}</div>
        <textarea id="note-${s.k}" placeholder="Açıklama (örn. Pazartesi 10:00'da tekrar gel, yetkili Ahmet Bey)">${esc(dr.note)}</textarea>
        <div class="row"><button class="btn primary" data-act="savemiss" data-k="${s.k}" ${dr.reason?"":"disabled"}>Kaydet</button><button class="btn" data-act="cancelmiss" data-k="${s.k}">Vazgeç</button></div></div>`
      : `<div class="big-acts"><button class="btn ok" data-act="complete" data-k="${s.k}" ${dr.done.length?"":"disabled"}>${allChecked?"✓ Tamamlandı":`✓ ${dr.done.length}/${devs.length} tamamlandı`}</button>
        <button class="btn warn" data-act="miss" data-k="${s.k}">Eksik / yapılamadı</button></div>`}
      ${r?`<div class="row" style="justify-content:space-between;font-size:.82rem"><span class="muted">Kaydedildi ${new Date(r.at).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}${r.note?` · ${esc(r.note)}`:""}</span><button class="link" data-act="undo" data-k="${s.k}">Geri al</button></div>`:""}
      <details><summary style="font-size:.85rem">Konum yanlış mı?</summary><div class="row" style="margin-top:6px"><input id="geo-${s.k}" type="text" placeholder="36.8841, 30.7056 (Google Haritalar'dan kopyalayın)" style="flex:1 1 200px"><button class="btn sm" data-act="savegeo" data-k="${s.k}">Konumu kaydet</button></div></details>
    </div>` : ""}
  </article>`;
}

/* ---------------- events ---------------- */
let toastT, cfgT;
function toast(m){ let t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
function readCfg(){
  const g = id => document.getElementById(id); if (!g("c-date")) return;
  st.cfg.date = g("c-date").value || todayISO(); st.cfg.start = g("c-start").value || "08:30"; st.cfg.end = g("c-end").value || "18:00";
  st.cfg.svc = Math.max(1, +g("c-svc").value || 15); st.cfg.costKm = Math.max(0, +g("c-cost").value || 0); st.cfg.ret = g("c-ret").checked;
  st.cfg.teams = +g("c-teams").value || 1; st.cfg.perLink = +g("c-per").value || 10;
}
function pickLoc(k, on){
  if (on){ if (!st.sel.find(s => s.k === k)) st.sel.push({ k, dev: openDevs(BY[k]).map(d => d[0]) }); }
  else st.sel = st.sel.filter(s => s.k !== k);
}
function resetPlanner(){ st.editing = null; st.editIds = null; st.editGid = null; st.sel = []; st.routes = null; st.cfg.staff0 = ""; }
document.addEventListener("click", async e => {
  if (st.dd && !e.target.closest(".dd")){ st.dd = null; if (st.view === "planla") renderPool(); }
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (["pick","devchk","ddpick","rstaff","mv","dpick","pf","impmap","pasel","duptgt","dupkeep"].includes(a)) return; // change handlers
  if (["optimize","saveplan","up","down","rm","add","newplan"].includes(a)) readCfg();
  switch (a){
    case "view": st.view = b.dataset.v; clearHash(); render(); window.scrollTo(0,0); break;
    case "dfs": { const v = b.dataset.v; st.df.s = st.df.s.includes(v) ? st.df.s.filter(x => x !== v) : [...st.df.s, v]; st.df.page = 0; render(); break; }
    case "dflag": st.df.flag = !st.df.flag; st.df.page = 0; render(); break;
    case "ddep": st.df.dep = !st.df.dep; st.df.page = 0; render(); break;
    case "dpage": st.df.page = Math.max(0, +b.dataset.p); render(); window.scrollTo(0, 0); break;
    case "dselall": devFilter().slice(0, 600).forEach(o => st.dsel.add(o.d[11])); render(); break;
    case "dselnone": st.dsel.clear(); render(); break;
    case "labels": downloadLabels([...st.dsel]); break;
    case "applist": downloadAppList(); break;
    case "dev": e.preventDefault(); st.devCode = b.dataset.c; st.view = "cihaz"; st.evReason = null; try { history.replaceState(null, "", "#c-" + b.dataset.c); } catch(_){} render(); window.scrollTo(0,0); break;
    case "cardas": st.cardAs = b.dataset.v; render(); break;
    case "label1": downloadLabels([b.dataset.c]); break;
    case "labelfirm": { const o = DEVBY[b.dataset.c]; const nm = custKey(o.l); downloadLabels(DEVS.filter(x => custKey(x.l) === nm).map(x => x.d[11])); break; }
    case "evreason": st.evReason = st.evReason === b.dataset.v ? null : b.dataset.v; { const n = document.getElementById("ev-note")?.value || ""; render(); const t = document.getElementById("ev-note"); if (t) t.value = n; } break;
    case "evdamga": case "evprec": case "evmiss": {
      const code = b.dataset.c, note = (document.getElementById("ev-note")?.value || "").trim();
      let evo;
      if (a === "evdamga") evo = { code, type: "damga", year: YEAR, note };
      else if (a === "evprec"){ const v = (document.getElementById("ev-e")?.value || "").trim(); if (!v){ toast("Hassasiyet değerini yazın, örn. 5 g"); break; } evo = { code, type: "hassasiyet", e: v, note: "" }; }
      else evo = { code, type: "eksik", reason: st.evReason, note };
      try { await addEvent(evo); st.evReason = null; render(); toast(a === "evdamga" ? "Damga kaydedildi" : a === "evprec" ? "Hassasiyet kaydedildi" : "Eksiklik kaydedildi"); }
      catch(err){ toast("Kaydedilemedi: " + (err.code === "not_granted" ? "yazma izniniz yok" : err.message || err.code)); }
      break; }
    case "role": st.role = st.role === "admin" ? "saha" : "admin"; st.view = st.role === "admin" ? "ozet" : "saha"; render(); break;
    case "dd": st.dd = st.dd === b.dataset.kind ? null : b.dataset.kind; renderPool(); if (st.dd) document.getElementById("ddq-" + st.dd)?.focus(); break;
    case "ddclose": st.dd = null; renderPool(); break;
    case "ddclear": st.f[b.dataset.kind] = []; renderPool(); break;
    case "ddall": { const k = b.dataset.kind, q = st.ddq[k].trim().toLocaleUpperCase("tr-TR");
      ddOptions(k).filter(o => !q || o.label.toLocaleUpperCase("tr-TR").includes(q) || o.v.includes(q)).forEach(o => { if (!st.f[k].includes(o.v)) st.f[k].push(o.v); }); renderPool(); break; }
    case "ddrm": st.f[b.dataset.kind] = st.f[b.dataset.kind].filter(v => v !== b.dataset.v); renderPool(); break;
    case "ddreset": st.f.ilce = []; st.f.cust = []; renderPool(); break;
    case "cat": st.f.cats[b.dataset.c] = !st.f.cats[b.dataset.c]; st.sel.forEach(s => s.dev = openDevs(BY[s.k]).map(d=>d[0])); st.sel = st.sel.filter(s => s.dev.length); hydratePlanner(); break;
    case "showdone": st.f.showDone = !st.f.showDone; renderPool(); break;
    case "selall": poolList().forEach(l => pickLoc(l.k, true)); hydratePlanner(); toast(`${st.sel.length} durak seçili`); break;
    case "selnone": resetPlanner(); hydratePlanner(); break;
    case "optimize": runOptimize(); st.shared = null; renderPlanPanel(); toast(st.routes.length > 1 ? `${st.routes.length} ekip rotası çıkarıldı` : "Rota optimize edildi"); break;
    case "up": case "down": { syncRoutes(); const r = st.routes ? st.routes[+b.dataset.t] : null; const seqKeys = r ? r.keys : st.sel.map(s=>s.k);
      const i = +b.dataset.i, j = a === "up" ? i-1 : i+1; if (j < 0 || j >= seqKeys.length) break; [seqKeys[i], seqKeys[j]] = [seqKeys[j], seqKeys[i]];
      if (!r){ st.sel = seqKeys.map(selObj); } else r.g = null; renderPlanPanel(); break; }
    case "rm": pickLoc(b.dataset.k, false); st.routes?.forEach(r => r.g = null); hydratePlanner(); break;
    case "add": pickLoc(b.dataset.k, true); st.routes?.forEach(r => r.g = null); hydratePlanner(); break;
    case "groute": googleRoute(+b.dataset.t); break;
    case "poolview": st.poolView = b.dataset.v; gmap = null; hydratePlanner(); renderPlannerHead(); break;
    case "logout": await sb.auth.signOut(); location.reload(); break;
    case "impgo": runImport(); break;
    case "pacheck": { const r = placeAudit(); st.pa = { ...r, sel: new Set(r.sug.map(x => x.l.k)), busy: false }; render(); break; }
    case "paall": st.pa.sel = new Set(st.pa.sug.map(x => x.l.k)); render(); break;
    case "panone": st.pa.sel = new Set(); render(); break;
    case "paapply": placeApply(); break;
    case "dupcheck": st.dup = { ...dupAudit(), target: {}, keep: {} }; initDupDefaults(); render(); break;
    case "dupmerge": dupMerge(+b.dataset.g); break;
    case "dupdev": dupDev(+b.dataset.g); break;
    case "dupskip": dupHide("c", +b.dataset.g); break;
    case "dupdskip": dupHide("d", +b.dataset.g); break;
    case "rpview": st.rp.view = b.dataset.v; st.rp.page = 0; render(); break;
    case "rppage": st.rp.page = Math.max(0, +b.dataset.p); render(); window.scrollTo(0, 0); break;
    case "rpcsv": rpCSV(); break;
    case "impreport": { const d = st.imp?.data; if (!d) break; const rows = [["Satır","Firma","Marka","Seri No","Durum"]];
      d.skipped.forEach(s => rows.push([s.row, s.unvan, s.marka, s.seri, "Atlandı · " + s.reason])); d.other.forEach(s => rows.push([s.row, s.unvan, s.marka, s.seri, (st.imp.includeOther ? "Eklendi · " : "Atlandı · ") + s.reason])); d.errors.forEach(s => rows.push([s.row, s.unvan, "", "", s.reason])); (d.noSerial||[]).forEach(s => rows.push([s.row, s.unvan, s.marka, s.seri, (st.imp.includeNoSerial ? "Eklendi · " : "Atlandı · ") + s.reason]));
      downloadFile(`ice-aktarma-raporu-${todayISO()}.csv`, "\ufeff" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(";")).join("\r\n")); break; }
    case "geocode": runGeocode(); break;
    case "assignqr": try { const n = await q(sb.rpc("assign_qr_numbers")); await reloadDevices(); toast(`${n} cihaza QR numarası verildi`); render(); } catch(err){ toast("Hata: " + err.message); } break;
    case "pactive": { const s = staffBy(b.dataset.id); if (!s) break; try { await q(sb.from("profiles").update({ aktif: s.aktif === false }).eq("id", s.id)); await loadDynamic(); render(); toast(s.aktif === false ? "Etkinleştirildi" : "Pasifleştirildi; artık giriş yapsa da veri göremez"); } catch(err){ toast("Hata: " + err.message); } break; }
    case "regdel": st.confirmDel = "r:" + b.dataset.id; render(); break;
    case "invdel": st.confirmDel = "i:" + b.dataset.id; render(); break;
    case "invdelyes": try { await q(sb.from("invites").delete().eq("phone", b.dataset.id)); await loadDynamic(); toast("Listeden çıkarıldı"); } catch(err){ toast("Silinemedi: " + err.message); } st.confirmDel = null; render(); break;
    case "invbulk": { const rows = ($("#iv-bulk")?.value || "").split(/\n+/).map(l => { const m = l.match(/^(.*?)[\s\-–:,;]*((?:\+?90|0)?\s*5\d{2}[\s.]?\d{3}[\s.]?\d{2}[\s.]?\d{2})/); if (!m || !m[1].trim()) return null; const p = m[2].replace(/\D/g, "").slice(-10); return p.length === 10 && p[0] === "5" ? { ad: m[1].trim(), phone: p, rol: "saha" } : null; }).filter(Boolean);
      if (!rows.length){ toast("Satırları “Ad Soyad - 05xx xxx xx xx” biçiminde yazın"); break; }
      try { await q(sb.from("invites").upsert(rows, { onConflict: "phone" })); await loadDynamic(); render(); toast(`${rows.length} kişi listeye eklendi`); } catch(err){ toast("Eklenemedi: " + err.message); } break; }
    case "regdelyes": try { await q(sb.from("regions").delete().eq("id", +b.dataset.id)); await loadDynamic(); toast("Bölge silindi"); } catch(err){ toast("Silinemedi: " + err.message); } st.confirmDel = null; render(); break;
    case "newplan": resetPlanner(); st.shared = null; st.cfg.date = todayISO(); hydratePlanner(); break;
    case "closeshare": st.shared = null; renderPlanPanel(); break;
    case "saveplan": {
      const routes = syncRoutes(); if (!st.sel.length) break;
      const stamp = Date.now().toString(36), gid = st.editGid || ("g" + stamp), n = routes.length;
      const plans = routes.filter(r => r.keys.length).map((r, t) => { const stops = r.keys.map(selObj); const sc = schedule(stops, st.cfg); const iv = String(r.staffId||"").startsWith("inv:") ? (st.invites||[]).find(v => "inv:" + v.phone === r.staffId) : null; const sf = iv ? { name: iv.ad, phone: "0" + iv.phone } : staffBy(r.staffId);
        return { id: (st.editIds && st.editIds[t]) || ("p" + stamp + t), gid, team: t + 1, teams: n, date: st.cfg.date,
          staffId: iv ? "" : (r.staffId || ""), staffName: sf ? sf.name : "", phone: sf ? sf.phone || "" : "",
          start: st.cfg.start, end: st.cfg.end, svc: st.cfg.svc, costKm: st.cfg.costKm, ret: st.cfg.ret, perLink: st.cfg.perLink,
          stops: stops.map(s => ({ k: s.k, dev: s.dev })), km: Math.round(sc.km*10)/10, min: Math.round(sc.total), dev: stops.reduce((x,s)=>x+s.dev.length,0),
          createdBy: st.me, updatedAt: new Date().toISOString() }; });
      try { for (const p of plans) await savePlan(p);
        for (const old of (st.editIds || [])) if (!plans.some(p => p.id === old)) await deletePlan(old);
        st.editIds = plans.map(p => p.id);
        st.shared = plans.map(p => p.id); st.editing = plans[0].id; st.editGid = gid; renderPlanPanel();
        toast(plans.length > 1 ? `${plans.length} ekip planı kaydedildi` : "Plan kaydedildi"); window.scrollTo({ top: 0, behavior: "smooth" }); }
      catch(err){ toast("Plan kaydedilemedi: " + (err.code === "not_granted" ? "plan kaydetme yetkiniz yok" : err.message || err.code)); }
      break; }
    case "edit": { const p = st.plans.find(x => x.id === b.dataset.id); if (!p) break;
      st.editing = p.id; st.editIds = [p.id]; st.editGid = p.gid || null; st.sel = p.stops.map(s => ({ k: s.k, dev: s.dev.slice() })); st.routes = [{ keys: p.stops.map(s => s.k), staffId: p.staffId || "" }];
      Object.assign(st.cfg, { date: p.date, start: p.start, end: p.end, svc: p.svc, costKm: p.costKm, ret: p.ret, teams: 1, perLink: p.perLink || 10 });
      st.shared = null; st.view = "planla"; render(); break; }
    case "editgroup": break;
    case "field": e.preventDefault(); st.fieldPlan = b.dataset.id; st.role = "saha"; st.view = "saha"; st.open = null; render(); window.scrollTo(0,0); break;
    case "del": st.confirmDel = b.dataset.id; render(); break;
    case "delno": st.confirmDel = null; render(); break;
    case "delyes": try { await deletePlan(b.dataset.id); toast("Plan silindi"); } catch(err){ toast("Silinemedi: " + (err.message||err.code)); } st.confirmDel = null; render(); break;
    case "copymsg": { const p = st.plans.find(x => x.id === b.dataset.id); if (!p) break; const txt = planMsg(p);
      try { await navigator.clipboard.writeText(txt); toast("Mesaj kopyalandı; WhatsApp'a yapıştırın"); }
      catch(err){ st.showMsg = p.id; st.view === "planla" ? renderPlanPanel() : render(); const ta = document.getElementById("msg-" + p.id); if (ta){ ta.focus(); ta.select(); } toast("Metni seçtim; kopyalayıp WhatsApp'a yapıştırın"); }
      break; }
    case "export": exportCSV(); break;
    case "toggle": st.open = st.open === b.dataset.k ? null : b.dataset.k; st.reasonFor = null; render(); break;
    case "miss": st.reasonFor = b.dataset.k; render(); break;
    case "cancelmiss": st.reasonFor = null; render(); break;
    case "reason": { const d = st.draft[b.dataset.k]; const n = document.getElementById("note-"+b.dataset.k); if (n) d.note = n.value; d.reason = b.dataset.v; render(); break; }
    case "complete": case "savemiss": {
      const k = b.dataset.k, p = st.plans.find(x => x.id === st.fieldPlan), s = p.stops.find(x => x.k === k), d = st.draft[k];
      const n = document.getElementById("note-"+k); if (n) d.note = n.value.trim();
      const all = d.done.length === s.dev.length;
      if (a === "complete" && !all && !d.reason){ st.reasonFor = k; render(); toast("Tamamlanmayan cihazlar için neden seçin"); break; }
      const r = { planId: p.id, k, st: a === "complete" && all ? "tamam" : d.reason, done: d.done.slice(), note: d.note || "", by: st.me, at: new Date().toISOString() };
      try { await saveResult(r); st.reasonFor = null; const nx = p.stops.find(x => !st.results[p.id+"__"+x.k] && x.k !== k); st.open = r.st === "tamam" && nx ? nx.k : k; render(); toast(r.st === "tamam" ? "Durak tamamlandı" : "Eksiklik kaydedildi"); }
      catch(err){ toast("Kaydedilemedi: " + (err.code === "not_granted" ? "bu sayfaya yazma izniniz yok" : err.message || err.code)); }
      break; }
    case "undo": try { await clearResult(st.fieldPlan, b.dataset.k); delete st.draft[b.dataset.k]; render(); } catch(err){ toast("Geri alınamadı"); } break;
    case "geoedit": st.geoEdit = st.geoEdit === b.dataset.k ? null : b.dataset.k; renderPlanPanel(); break;
    case "savegeo": { const v = (document.getElementById("geo-"+b.dataset.k)?.value || "").match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
      if (!v){ toast("Koordinatı “36.88, 30.70” biçiminde yapıştırın"); break; }
      const la = +v[1], lo = +v[2]; if (la < 35 || la > 39 || lo < 28 || lo > 33){ toast("Koordinat Antalya çevresinde değil"); break; }
      try { await saveGeo(b.dataset.k, la, lo); st.geoEdit = null; S = computeSummary(); if (st.view === "planla") renderPlanPanel(); else render(); toast("Konum kaydedildi; rota linkleri artık koordinatla gidiyor"); } catch(err){ toast("Konum kaydedilemedi"); } break; }
  }
});
document.addEventListener("change", e => {
  const t = e.target, a = t.dataset.act;
  if (a === "pick"){ pickLoc(t.dataset.k, t.checked); renderPool(); renderPlanPanel(); return; }
  if (a === "ddpick"){ const k = t.dataset.kind, v = t.dataset.v; st.f[k] = t.checked ? [...new Set([...st.f[k], v])] : st.f[k].filter(x => x !== v);
    renderPool(true); return; }
  if (a === "devchk"){ const d = st.draft[t.dataset.k]; const r = +t.dataset.r; d.done = t.checked ? [...new Set([...d.done, r])] : d.done.filter(x => x !== r); render(); return; }
  if (a === "rstaff"){ const i = +t.dataset.t; syncRoutes(); if (st.routes) st.routes[i].staffId = t.value; else st.cfg.staff0 = t.value; return; }
  if (a === "mv"){ syncRoutes(); if (!st.routes) return; const from = +t.dataset.t, to = +t.value, k = t.dataset.k; st.routes[from].keys = st.routes[from].keys.filter(x => x !== k); insertCheapest(st.routes[to].keys, k); st.routes[from].g = st.routes[to].g = null; renderPlanPanel(); return; }
  if (a === "dpick"){ t.checked ? st.dsel.add(t.dataset.c) : st.dsel.delete(t.dataset.c); const s = document.querySelector('[data-act="labels"]'); if (s){ s.disabled = !st.dsel.size; s.textContent = `QR etiketlerini indir (${st.dsel.size})`; } return; }
  if (t.id === "dilce"){ st.df.ilce = t.value; st.df.page = 0; render(); return; }
  if (t.id === "dnext"){ st.df.next = t.value; st.df.page = 0; render(); return; }
  if (t.id === "fregion"){ st.f.region = t.value; const r = st.regions.find(x => String(x.id) === t.value); st.f.ilce = r ? (r.ilceler || []).slice() : []; if (gmap) gmap.__fitted = false; renderPool(); return; }
  if (a === "pf"){ const f = t.dataset.f; let v = t.value; if (f === "bolge_id") v = v ? +v : null;
    q(sb.from("profiles").update({ [f]: v }).eq("id", t.dataset.id)).then(() => loadDynamic()).then(() => toast("Kaydedildi")).catch(err => toast("Kaydedilemedi: " + err.message)); return; }
  if (a === "impmap"){ const P = st.imp; if (!P?.data?.G) return; const G = P.data.G; if (t.value === "") delete G.map[t.dataset.k]; else G.map[t.dataset.k] = +t.value;
    P.data = parseGeneric(G, P.year || YEAR); render(); return; }
  if (t.id === "rp-il"){ st.rp.il = t.value; st.rp.ilce = ""; st.rp.page = 0; render(); return; }
  if (t.id === "rp-ilce"){ st.rp.ilce = t.value; st.rp.page = 0; render(); return; }
  if (t.id === "rp-durum"){ st.rp.durum = t.value; st.rp.page = 0; render(); return; }
  if (t.id === "impnosn"){ if (st.imp) st.imp.includeNoSerial = t.checked; return; }
  if (a === "duptgt"){ st.dup.target[+t.dataset.g] = t.value; return; }
  if (a === "dupkeep"){ st.dup.keep[+t.dataset.g] = +t.value; return; }
  if (a === "pasel"){ t.checked ? st.pa.sel.add(t.dataset.k) : st.pa.sel.delete(t.dataset.k); const b = document.querySelector('[data-act="paapply"]'); if (b) b.textContent = `Düzeltmeleri uygula (${fmt(st.pa.fix.length + st.pa.sel.size)} kayıt)`; return; }
  if (t.id === "impother"){ if (st.imp) st.imp.includeOther = t.checked; return; }
  if (t.id === "impfile" && t.files[0]){ const year = +($("#impyear")?.value) || YEAR; st.imp = { name: t.files[0].name, year };
    readImportFile(t.files[0], year).then(d => { st.imp.data = d; render(); }).catch(err => { st.imp.err = "Dosya okunamadı: " + err.message; render(); }); return; }
  if (t.id === "fplan"){ st.fieldPlan = t.value; st.open = null; render(); return; }
  if (t.id && t.id.startsWith("c-")){ readCfg();
    if ((t.id === "c-ret" || t.id === "c-teams") && st.routes) runOptimize();
    if (["c-ret","c-teams","c-per"].includes(t.id)) renderPlanPanel();
    else if (t.id !== "c-date"){ clearTimeout(cfgT); cfgT = setTimeout(() => { if (st.view === "planla") renderPlanPanel(); }, 400); } }
});
document.addEventListener("input", e => {
  const id = e.target.id || "";
  if (id === "rp-q"){ st.rp.q = e.target.value; st.rp.page = 0; clearTimeout(cfgT); cfgT = setTimeout(() => { const pos = e.target.selectionStart; render(); const n = document.getElementById("rp-q"); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(_){} } }, 250); }
  if (id === "dq"){ st.df.q = e.target.value; st.df.page = 0; clearTimeout(cfgT); cfgT = setTimeout(() => { const pos = e.target.selectionStart; render(); const n = document.getElementById("dq"); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(_){} } }, 250); }
  if (id === "fq"){ st.f.q = e.target.value; renderPool(); e.target.focus(); }
  if (id.startsWith("ddq-")){ const k = id.slice(4); st.ddq[k] = e.target.value; const el = document.getElementById("ddlist-" + k); if (el) el.innerHTML = ddListHTML(k); }
  if (id.startsWith("note-")){ const k = id.slice(5); if (st.draft[k]) st.draft[k].note = e.target.value; }
});
document.addEventListener("submit", async e => {
  if (e.target.id === "staffForm"){ e.preventDefault();
    const ad = $("#sf-name").value.trim(), tel = $("#sf-phone").value.trim(), email = $("#sf-email").value.trim(), password = $("#sf-pass").value, rol = $("#sf-rol").value;
    try {
      const tmp = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "elmaslar-damga-tmp" } });
      const { data, error } = await tmp.auth.signUp({ email, password, options: { data: { ad } } }); if (error) throw error;
      const uid = data.user?.id; if (!uid) throw new Error("Hesap oluşturulamadı");
      await new Promise(r => setTimeout(r, 600));
      await q(sb.from("profiles").update({ ad, tel, rol, aktif: true }).eq("id", uid));
      await loadDynamic(); render(); toast(`${ad} için hesap açıldı. Giriş: ${email}`);
    } catch(err){ toast("Hesap açılamadı: " + (/registered/i.test(err.message) ? "bu e-posta zaten kayıtlı" : err.message)); }
    return; }
  if (e.target.id === "inviteForm"){ e.preventDefault();
    const ad = $("#iv-ad").value.trim(), phone = $("#iv-tel").value.replace(/\D/g, "").slice(-10), rol = $("#iv-rol").value;
    if (phone.length !== 10 || phone[0] !== "5"){ toast("Cep numarasını 05xx xxx xx xx biçiminde yazın"); return; }
    try { await q(sb.from("invites").upsert({ ad, phone, rol }, { onConflict: "phone" })); await loadDynamic(); render(); toast(`${ad} eklendi; telefonla SMS kodu alarak girebilir`); } catch(err){ toast("Eklenemedi: " + err.message); }
    return; }
  if (e.target.id === "regionForm"){ e.preventDefault();
    const ad = $("#rg-ad").value.trim(), sorumlu = $("#rg-sor").value || null, ilceler = [...document.querySelectorAll('input[name="rg-ilce"]:checked')].map(x => x.value);
    try { await q(sb.from("regions").insert({ ad, sorumlu, ilceler })); await loadDynamic(); render(); toast("Bölge kaydedildi"); } catch(err){ toast("Kaydedilemedi: " + err.message); }
    return; }
});
function applyHash(){ const m = location.hash.match(/^#plan-([A-Za-z0-9]+)$/); if (m){ st.fieldPlan = m[1]; st.role = "saha"; st.view = "saha"; st.open = null; }
  const c = location.hash.match(/^#c-([A-Za-z0-9-]+)$/); if (c){ st.devCode = c[1]; st.view = "cihaz"; } }
function clearHash(){ if (location.hash) try { history.replaceState(null, "", location.pathname + location.search); } catch(_){} }
window.addEventListener("hashchange", () => { applyHash(); render(); });

async function exportCSV(){
  const rows = [["Excel satır","Müşteri","Adres","İlçe","Marka","Model","Seri No","Yeni durum","Açıklama","Tarih","Plan tarihi","Personel"]];
  st.plans.forEach(p => p.stops.forEach(s => { const r = st.results[p.id+"__"+s.k]; if (!r) return; const l = BY[s.k];
    l.d.filter(d => s.dev.includes(d[0])).forEach(d => { const ok = r.done.includes(d[0]);
      const durum = ok && (r.st === "tamam" || r.done.length) ? "YAPILDI" : (RL[r.st]?.[2] || r.st.toUpperCase());
      rows.push([d[17], l.n, l.a, l.i, d[2], d[3], d[4], durum, r.note, r.at.slice(0,16).replace("T"," "), p.date, personName(p)]); }); }));
  if (rows.length === 1){ toast("Dışa aktarılacak saha sonucu yok"); return; }
  const csv = "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(";")).join("\r\n");
  downloadFile(`damga-saha-sonuclari-${todayISO()}.csv`, csv); toast("CSV indirildi");
}

/* ---- Türkiye il / ilçe düzeltme (81 il, 973 ilçe; Antalya ve Burdur için mahalle → ilçe) ---- */
const YER = window.TR_YER || { iller: {}, mah: {} };
const FOLD = s => String(s ?? "").toLocaleUpperCase("tr-TR").replace(/[ÇĞİÖŞÜÂÎÛ]/g, ch => ({ Ç:"C", Ğ:"G", İ:"I", Ö:"O", Ş:"S", Ü:"U", Â:"A", Î:"I", Û:"U" }[ch])).replace(/[^A-Z0-9]/g, "");
const IL_F = {}; const ILCE_F = {};
Object.entries(YER.iller).forEach(([il, ds]) => { IL_F[FOLD(il)] = il; ds.forEach(d => (ILCE_F[FOLD(d)] = ILCE_F[FOLD(d)] || []).push({ il, ilce: d })); });
function lev(a, b){ if (Math.abs(a.length - b.length) > 2) return 9; const m = []; for (let i = 0; i <= a.length; i++){ m[i] = [i]; for (let j = 1; j <= b.length; j++) m[i][j] = i ? Math.min(m[i-1][j] + 1, m[i][j-1] + 1, m[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)) : j; } return m[a.length][b.length]; }
function nearest(f, cands){ let best = null, bd = 9; cands.forEach(c => { const d = lev(f, FOLD(c)); if (d < bd){ bd = d; best = c; } }); return bd <= (f.length >= 7 ? 2 : 1) ? best : null; }
function findIl(raw){ const f = FOLD(raw); if (!f || /^\d/.test(f)) return null; return IL_F[f] || nearest(f, Object.keys(YER.iller)); }
function findIlce(il, raw){
  const list = YER.iller[il] || []; const f = FOLD(raw); if (!f) return null;
  const ex = list.find(d => FOLD(d) === f); if (ex) return ex;
  const inc = list.filter(d => FOLD(d).length >= 4 && f.includes(FOLD(d))).sort((a, b) => FOLD(b).length - FOLD(a).length)[0]; if (inc) return inc;
  return nearest(f, list);
}
const MAH_RE = /([A-ZÇĞİÖŞÜ0-9.]+(?:\s[A-ZÇĞİÖŞÜ0-9.]+)?)\s*(MAHALLESİ|MAHALLESI|MAH|MH)(?![A-ZÇĞİÖŞÜ])/;
/* Adresteki mahallenin bağlı olduğu ilçeler. strict: yalnızca tam mahalle adı */
function mahCands(il, text, strict){
  const m = YER.mah[il]; if (!m) return [];
  const mh = TRU(text).match(MAH_RE); const keys = [];
  if (mh){ keys.push(FOLD(mh[1])); const w = mh[1].split(/\s+/); if (!strict && w.length > 1){ keys.push(FOLD(w[w.length - 1]), FOLD(w[0])); } }
  else if (!strict) keys.push(FOLD(text));
  for (const k of keys){ if (m[k]) return [...new Set(m[k])]; } return [];
}
function mahIlce(il, text){ const c = mahCands(il, text, false); return c.length === 1 ? c[0] : null; }
/* il/ilçe ham değerlerinden resmi adları bulur. suggest: ilçe geçerli ama adresteki mahalle başka ilçede. */
function placeFix(ilRaw, ilceRaw, adres){
  let il = findIl(ilRaw), how = [];
  if (!il){ const g = ILCE_F[FOLD(ilceRaw)]; il = g && g.length === 1 ? g[0].il : "ANTALYA"; if (cellStr(ilRaw)) how.push("il tanınmadı"); }
  let ilce = findIlce(il, ilceRaw);
  if (!ilce){ ilce = mahIlce(il, ilceRaw) || mahIlce(il, adres) || (YER.iller[il] || []).find(d => FOLD(d).length >= 4 && FOLD(adres).includes(FOLD(d))) || null; if (ilce) how.push("ilçe adresten bulundu"); }
  let suggest = null;
  if (ilce){ const loose = mahCands(il, adres, false), strict = mahCands(il, adres, true);
    if (strict.length === 1 && strict[0] !== ilce && !loose.includes(ilce) && !FOLD(adres).includes(FOLD(ilce))) suggest = { ilce: strict[0], reason: `Adresteki mahalle (${titleTR((TRU(adres).match(MAH_RE) || [])[1] || "")}) ${titleTR(strict[0])} ilçesinde` }; }
  return { il, ilce: ilce || TRU(ilceRaw), ok: !!ilce, how, suggest };
}
function placeAudit(){
  const fix = [], sug = [], bad = [];
  LOCS.filter(l => !l.dep).forEach(l => { const r = placeFix(l.il, l.i, l.a);
    if (!r.ok) bad.push({ l, r }); else if (r.il !== l.il || r.ilce !== l.i) fix.push({ l, r }); if (r.suggest) sug.push({ l, r }); });
  return { fix, sug, bad };
}
/* ---- Veri & ayarlar: Excel içe aktarma, Google konum, kurulum durumu ---- */
const MAHC = window.DAMGA_MAH || {};
const TRU = s => String(s ?? "").toLocaleUpperCase("tr-TR").replace(/ /g, " ").trim();
const STATUS_MAP = (() => { const m = {}; const add = (c, arr) => arr.forEach(v => m[v] = c);
  add("tamam", ["YAPILDI","MİGROS ÜZERİNDEN YAPILDI"]);
  add("tutanak", ["TUTANAK"]);
  add("baskasi", ["KAPTAN YAPMIŞ","KAPTAN DAMGALAMIŞ","2025 MÜHÜRLÜ","2025 DAMGALI","2025 YILI DAMGALI","2025 DAMGASI MEVCUT","BAŞKA YERE DAMGALATMIŞ","ODAYA YAPTIRILDI","GRUP AYARLAR DAMGALADI"]);
  add("cihazyok", ["YOK","YOKK","MAĞZADA YOK","MAĞADA YOK","FABRİKADA YOK","SATILMIŞ","KULLANIM DIŞI"]);
  add("kapsamdisi", ["İPTAL","KAPANMIŞ","MAĞZA KAPALI","FİRMA KAPANDI","İŞİ BIRAKMIŞ","PASİF","İSTEMEDİ"]);
  add("tekrar", ["ULAŞILAMADI","CVP YOK","GETİRECEK","SORUN VAR","DAMGASI GEÇMİŞ","SÜRESİ GEÇMİŞ","BUCAK MÜDAHALE EDİLEMİYOR","ÜCRET ÖDENMİYOR"]);
  return m; })();
function statusCat(raw){ const v = TRU(raw); if (!v) return "bekliyor"; if (STATUS_MAP[v]) return STATUS_MAP[v];
  if (/YAPILDI/.test(v)) return "tamam"; if (/TUTANAK/.test(v)) return "tutanak"; if (/DAMGAL|MÜHÜRLÜ|KAPTAN/.test(v)) return "baskasi"; if (/YOK|SATILMIŞ/.test(v)) return "cihazyok"; if (/KAPAN|İPTAL|PASİF|İSTEME/.test(v)) return "kapsamdisi"; return "tekrar"; }
function h32(s, seed){ let h = seed >>> 0; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
const hkey = s => h32(s, 2166136261).toString(16).padStart(8, "0") + h32(s, 3355443201).toString(16).padStart(8, "0");
function normIlce(s){ let v = TRU(s); v = v.replace("KONYAALTİ", "KONYAALTI"); if (/GAZİPAŞA/.test(v)) v = "GAZİPAŞA"; return v; }
function mahOf(a){ const m = TRU(a).match(/([A-ZÇĞİÖŞÜ0-9.]+(?:\s[A-ZÇĞİÖŞÜ0-9.]+)?)\s+(MAHALLESİ|MAH\.?|MH\.?)(?![A-ZÇĞİÖŞÜ])/); return m ? m[1] : ""; }
function approxCoord(ilce, mah, key){
  const t = MAHC[ilce] || MAHC[""] || { _: [36.89, 30.705] }; const exact = !!(mah && t[mah]); const [la, lo] = exact ? t[mah] : (t._ || [36.89, 30.705]);
  const h = h32(key, 99991); const r = (exact ? 0.0025 : 0.006) * ((h % 1000) / 1000 * 0.8 + 0.2); const a = (Math.floor(h / 1000) % 360) * Math.PI / 180;
  return { lat: +(la + r * Math.sin(a)).toFixed(5), lng: +(lo + r * Math.cos(a) / 0.8).toFixed(5), src: exact ? "yaklasik-mah" : "yaklasik-ilce" };
}
function normCap(v){ const s = String(v ?? "").trim(); const m = s.match(/^([\d.,]+)\s*(kg|g|ton|t)?$/i); if (!m) return s; const u = (m[2] || "kg").toLowerCase(); return `${m[1].replace(",", ".")} ${u === "t" ? "ton" : u}`; }
function cellStr(v){ if (v === null || v === undefined) return ""; if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v); return String(v).trim(); }

function parseWorkbook(wb, listYear){
  const ws = wb.Sheets[wb.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
  if (!rows.length) throw new Error("Sayfa boş");
  const head = rows[0].map(TRU);
  const col = (...names) => { for (const n of names){ const i = head.findIndex(h => h === n || h.startsWith(n)); if (i >= 0) return i; } return -1; };
  const C = { ad: col("MÜŞTERİ ADI","MÜŞTERİ","ÜNVAN"), adres: col("ADRES"), ilce: col("İLÇE"), il: col("İL"), tel: col("TELEFON"), cins: col("CİNSİ"), sinif: col("SINIFI","SINIF"),
    marka: col("MARKA"), model: col("MODEL"), seri: col("SERİ NO","SERİ"), ceker: col("ÇEKERİ","KAPASİTE"), yil: col("S. DAMGA YILI","DAMGA YILI"), yer: col("KULLANILDIĞI YER"),
    durum: col("DURUMU","DURUM"), bilgi: col("BİLGİ"), kime: col("KİME AİT") };
  if (C.ad < 0 || C.adres < 0 || C.durum < 0) throw new Error("Başlıklar bulunamadı (MÜŞTERİ ADI / ADRES / DURUMU)");
  const fatCol = C.kime >= 0 ? C.kime + 1 : -1;
  const biz = new Map(), devs = [], pairCount = {};
  const recs = rows.slice(1).map((r, i) => ({ r, row: i + 2 })).filter(x => cellStr(x.r[C.ad]));
  recs.forEach(({ r }) => { const k = TRU(r[C.marka]).replace(/İ/g, "I") + "|" + TRU(r[C.seri]).replace(/\s/g, ""); if (TRU(r[C.seri])) pairCount[k] = (pairCount[k] || 0) + 1; });
  recs.forEach(({ r, row }) => {
    const ad = cellStr(r[C.ad]), adres = cellStr(r[C.adres]), ilceKey = normIlce(r[C.ilce]), pf = placeFix(r[C.il], r[C.ilce], adres), ilce = pf.ilce;
    const bk = TRU(ad) + "|" + TRU(adres) + "|" + ilceKey, bid = "b" + hkey(bk);
    if (!biz.has(bid)){ const c = approxCoord(ilce, mahOf(adres), bid);
      biz.set(bid, { id: bid, unvan: ad, adres, mahalle: mahOf(adres), ilce, il: pf.il, tel: cellStr(r[C.tel]), lat: c.lat, lng: c.lng, geo_src: c.src, is_depot: TRU(ad).startsWith("ELMASLAR") }); }
    else if (!biz.get(bid).tel && cellStr(r[C.tel])) biz.get(bid).tel = cellStr(r[C.tel]);
    const durum = cellStr(r[C.durum]), cat = statusCat(durum), seri = cellStr(r[C.seri]), marka = cellStr(r[C.marka]);
    const yRaw = cellStr(r[C.yil]); let son = /^(19|20)\d\d$/.test(yRaw) ? +yRaw : null;
    if (cat === "tamam") son = Math.max(son || 0, listYear);
    if (cat === "baskasi"){ const m = TRU(durum).match(/(20\d\d)/); if (m) son = Math.max(son || 0, +m[1]); }
    const pk = TRU(marka).replace(/İ/g, "I") + "|" + TRU(seri).replace(/\s/g, "");
    devs.push({ import_key: hkey(bid + "|" + row + "|" + pk), business_id: bid, cins: cellStr(r[C.cins]), marka, model: cellStr(r[C.model]), seri_no: seri,
      seri_flag: !seri ? "seri-yok" : (pairCount[pk] > 1 ? "seri-tekrar" : ""), sinif: (TRU(r[C.sinif]).replace(/I/g, "I") || "III").replace(/[^IV]/g, "") || "III",
      max_cap: normCap(r[C.ceker]), son_damga_yili: son, durum_grup: cat, durum_ham: durum, fatura_notu: fatCol >= 0 ? cellStr(r[fatCol]) : "",
      kime_ait: C.kime >= 0 ? cellStr(r[C.kime]) : "", bilgi: C.bilgi >= 0 ? cellStr(r[C.bilgi]) : "", kullanim_yeri: C.yer >= 0 ? cellStr(r[C.yer]) : "", excel_row: row });
  });
  const cats = devs.reduce((m, d) => (m[d.durum_grup] = (m[d.durum_grup] || 0) + 1, m), {});
  return { biz: [...biz.values()], devs, cats, rows: recs.length };
}

/* ---- Migros / YMS formatı (MAĞAZA ADI · ÜNVAN · DURUM · İŞLEM TARİHİ · MUAYENE KARTI NO + "kalanlar" YORUM sayfası) ---- */
const BLANK_SERI = new Set(["BILA","BİLA","-","YOK","0",""]);
const seriOf = v => { const x = cellStr(v); return BLANK_SERI.has(TRU(x)) ? "" : x; };
const devKey = (marka, seri) => { const s = TRU(seri).replace(/\s/g, ""); return s ? TRU(marka).replace(/İ/g, "I").replace(/[^A-Z]/g, "") + "|" + s : ""; };
function noteCat(y){ const u = TRU(y); if (!u) return null;
  if (/YAPILDI|DÜZELTİLDİ|GİDERİLDİ|YAPILMIŞ SİSTEM/.test(u) && !/YAPILMAMIŞ/.test(u)) return "islenecek";
  if (/TUTANAK/.test(u)) return "tutanak"; if (/MAĞZA KAPATILMIŞ|DEPO KAPANMIŞ|KAPANMIŞ|KAPANDI/.test(u)) return "kapsamdisi";
  if (/^YOK$|MAĞZADA YOK|ALIMSATIMDA|ALIM SATIMDA/.test(u)) return "cihazyok"; if (/DAMGASI 20\d\d/.test(u)) return "baskasi";
  if (/GÖNDERİLECEK|SONRA/.test(u)) return "tekrar"; return "bekliyor"; }
function fmtTel(v){ let d = String(v ?? "").replace(/\D/g, "").replace(/^90(?=\d{10}$)/, ""); if (!d) return ""; if (d.length === 10) d = "0" + d; return d.length === 11 ? `${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7,9)} ${d.slice(9)}` : d; }
function isMigrosFormat(wb){ return wb.SheetNames.some(n => { const h = (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, range: 0 })[0] || []).map(TRU); return h.includes("MAĞAZA ADI") && h.includes("DURUM"); }); }
function parseMigros(wb, listYear){
  const sheets = wb.SheetNames.map(n => { const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "", raw: true }); return { n, rows, head: (rows[0] || []).map(TRU) }; }).filter(s => s.head.includes("MAĞAZA ADI"));
  const main = sheets.filter(s => s.head.includes("DURUM")).sort((a, b) => (b.head.includes("İŞLEM TARİHİ") - a.head.includes("İŞLEM TARİHİ")) || b.rows.length - a.rows.length)[0];
  if (!main) throw new Error("MAĞAZA ADI / DURUM başlıklı sayfa bulunamadı");
  const notes = sheets.find(s => s !== main && s.head.includes("YORUM"));
  const ci = (s, ...names) => { for (const n of names){ const i = s.head.indexOf(n); if (i >= 0) return i; } return -1; };
  const jk = (m, se) => TRU(m) + "|" + TRU(se).replace(/\s/g, "");
  const note = new Map(); if (notes){ const m = ci(notes, "MAĞAZA ADI"), se = ci(notes, "SERİ","SERİ NO"), y = ci(notes, "YORUM"); notes.rows.slice(1).forEach(r => { if (cellStr(r[m])) note.set(jk(r[m], seriOf(r[se])), cellStr(r[y])); }); }
  const biz = new Map(), devs = [], seen = new Set();
  const addRow = (s, r, row, fromNotes) => {
    const g = n => { const i = ci(s, n); return i >= 0 ? r[i] : ""; };
    const mag = cellStr(g("MAĞAZA ADI")); if (!mag) return;
    const unvan = cellStr(g("ÜNVAN")), adres = cellStr(g("ADRES")), ilceKey = normIlce(g("İLÇE")), pf = placeFix(g("İL"), g("İLÇE"), adres), ilce = pf.ilce, seri = seriOf(g("SERİ")), marka = cellStr(g("MARKA"));
    const k = jk(mag, seri); if (fromNotes && seen.has(k)) return; seen.add(k);
    const code = unvan.replace(/\D/g, ""); const name = mag + (code ? ` · ${code}` : "");
    const bid = "b" + hkey(TRU(mag) + "|" + TRU(adres) + "|" + ilceKey);
    if (!biz.has(bid)){ const c = approxCoord(ilce, mahOf(adres), bid); biz.set(bid, { id: bid, unvan: name, adres, mahalle: mahOf(adres), ilce, il: pf.il, tel: fmtTel(g("TELEFON NO")) || fmtTel(g("CEP TELEFONU")), lat: c.lat, lng: c.lng, geo_src: c.src, is_depot: false }); }
    const durum = TRU(g("DURUM")) || "AÇIK", y = note.get(k) || (fromNotes ? cellStr(g("YORUM")) : "");
    const cat = durum === "TAMAMLANDI" ? "tamam" : durum === "İPTAL" ? "kapsamdisi" : (noteCat(y) || "bekliyor");
    const it = g("İŞLEM TARİHİ"); const itd = typeof it === "number" ? new Date(Math.round((it - 25569) * 864e5)) : (it ? new Date(it) : null); const itOk = itd && !isNaN(itd);
    let son = null; if (cat === "tamam") son = itOk ? itd.getFullYear() : listYear; if (cat === "islenecek") son = listYear;
    const ym = TRU(y).match(/(?:SON DAMGA YILI|DAMGASI)\s*(20\d\d)/); if (ym) son = Math.max(son || 0, +ym[1]);
    const kart = cellStr(g("MUAYENE KARTI NO")), bas = cellStr(g("BAŞVURU NO"));
    const bilgi = [kart && `Muayene kartı ${kart}`, itOk && `İşlem ${itd.toLocaleDateString("tr-TR")}`, bas && `Başvuru ${bas}`, fromNotes && "Kalanlar listesi"].filter(Boolean).join(" · ");
    const alet = TRU(g("ÖLÇÜ ALETİ")); const sin = cellStr(g("SINIF"));
    devs.push({ import_key: hkey("M|" + bid + "|" + (seri ? TRU(marka) + "|" + TRU(seri) : "row" + row + fromNotes)), business_id: bid,
      cins: alet === "NAWI" ? "Otomatik olmayan tartı aleti" : alet === "AWI" ? "Otomatik tartı aleti" : (alet || "Tartı aleti"), tip: alet === "AWI" ? "Otomatik tartı aleti" : "Otomatik olmayan tartı aleti",
      marka, model: cellStr(g("MODEL")), seri_no: seri, seri_flag: seri ? "" : "seri-yok", sinif: sin === "3" ? "III" : sin === "2" ? "II" : (TRU(sin).replace(/[^IV]/g, "") || "III"),
      max_cap: normCap(g("KAPASİTE")), uretim_yili: +cellStr(g("ÜRETİM YILI")) || null, son_damga_yili: son, durum_grup: cat, durum_ham: [durum, y].filter(Boolean).join(" · "),
      fatura_notu: cellStr(g("FATURA NO")), kime_ait: cellStr(g("KULLANICI")), bilgi, kullanim_yeri: unvan, excel_row: typeof row === "number" ? row : null });
  };
  main.rows.slice(1).forEach((r, i) => addRow(main, r, i + 2, false));
  if (notes) notes.rows.slice(1).forEach((r, i) => addRow(notes, r, i + 2, true));
  const pc = {}; devs.forEach(d => { const k = devKey(d.marka, d.seri_no); if (k) pc[k] = (pc[k] || 0) + 1; }); devs.forEach(d => { const k = devKey(d.marka, d.seri_no); if (k && pc[k] > 1) d.seri_flag = "seri-tekrar"; });
  const cats = devs.reduce((m, d) => (m[d.durum_grup] = (m[d.durum_grup] || 0) + 1, m), {});
  return { biz: [...biz.values()], devs, cats, rows: devs.length, format: "Migros / YMS listesi" + (notes ? ` + “${notes.n}” notları` : "") };
}
/* Sistemde zaten olan cihazlar (marka + seri no) yeni kayıt açılmadan güncellenir */
const RANK = { tamam: 3, islenecek: 3, baskasi: 2, cihazyok: 1, kapsamdisi: 1, tutanak: 0, tekrar: 0, bekliyor: 0 };
function splitMatches(data){
  const ex = new Map(); DEVS.forEach(o => { const k = devKey(o.d[2], o.d[4]); if (k && !ex.has(k)) ex.set(k, o); });
  const ins = [], upd = [];
  data.devs.forEach(d => { const k = devKey(d.marka, d.seri_no); const o = k && ex.get(k);
    if (!o){ ins.push(d); return; }
    const cur = o.d[8], patch = {};
    if (RANK[d.durum_grup] >= RANK[cur] || (cur !== "tamam" && cur !== "islenecek")){ patch.durum_grup = d.durum_grup; patch.durum_ham = d.durum_ham; }
    if (d.son_damga_yili && d.son_damga_yili > (+o.d[6] || 0)) patch.son_damga_yili = d.son_damga_yili;
    if (d.bilgi) patch.bilgi = d.bilgi; if (d.fatura_notu) patch.fatura_notu = d.fatura_notu; if (d.max_cap && !o.d[12]) patch.max_cap = d.max_cap;
    upd.push({ id: o.d[0], patch }); });
  // Aynı mağaza iki listede farklı adla geçebilir: normalize adres aynıysa mevcut lokasyon kullanılır
  const byAddr = new Map(); LOCS.forEach(l => { if (!l.dep) byAddr.set(normAddr(l.a, l.i), l.k); });
  const remap = new Map(); data.biz.forEach(bz => { const k = byAddr.get(normAddr(bz.adres, bz.ilce)); if (k) remap.set(bz.id, k); });
  ins.forEach(d => { if (remap.has(d.business_id)) d.business_id = remap.get(d.business_id); });
  const bizUsed = new Set(ins.map(d => d.business_id));
  return { ...data, devs: ins, upd, biz: data.biz.filter(b => bizUsed.has(b.id)) };
}


/* ---- Esnek içe aktarma: başlıkları tanıyıp sistem alanlarına eşler (şablon, HTF listesi, farklı firmaların Excel'leri) ----
   Kural: sistemde aynı FİRMA + MARKA + SERİ NO varsa satır eklenmez. */
const HN = s => TRU(s).replace(/[^0-9A-ZÇĞİÖŞÜ]/g, "");
const GFIELDS = [
  ["unvan","Firma / mağaza adı",true,["FİRMAÜNVANI","ÜNVAN","UNVAN","MÜŞTERİADI","MÜŞTERİÜNVANI","MÜŞTERİ","FİRMA","FİRMAADI","CARİ","CARİADI","CARİÜNVANI","MAĞAZAİSMİ","MAĞAZAADI","MAĞAZA","İŞLETME","İŞLETMEADI"]],
  ["kod","Mağaza / cari kodu",false,["KOD","MAĞAZAKODU","ŞUBEKODU","CARİKOD","CARİKODU","MÜŞTERİKODU"]],
  ["sube","Şube adı",false,["ŞUBE","ŞUBEADI","ŞUBEMAĞAZAADI","LOKASYON"]],
  ["adres","Adres",true,["ADRES","AÇIKADRES","ADRESİ"]],
  ["ilce","İlçe",true,["İLÇE","ILCE"]],
  ["il","İl",false,["İL","IL","ŞEHİR"]],
  ["tel","Telefon",false,["TELEFON","TELEFONNO","TEL","TELNO","İŞTELEFONU"]],
  ["yetkili","Yetkili kişi",false,["YETKİLİKİŞİ","YETKİLİ","SORUMLU","İLGİLİKİŞİ"]],
  ["ycep","Yetkili cep",false,["YETKİLİCEP","CEPTELEFONU","CEP","GSM"]],
  ["vkn","Vergi no",false,["VERGİNO","VKN","TCKN","VERGİNUMARASI"]],
  ["tip","Cihaz tipi",false,["CİHAZTİPİ","TİP"]],
  ["cins","Cinsi",false,["CİNSİ","CİNS","ÖLÇÜALETİ","CİHAZ"]],
  ["marka","Marka",true,["MARKA","BRAND"]],
  ["model","Model",false,["MODEL"]],
  ["seri","Seri no",true,["SERİNO","SERİALNO","SERIALNO","SERİAL","SERIAL","SERİ","SN","SERİNUMARASI"]],
  ["sinif","Sınıf",false,["SINIF","SINIFI","DOĞRULUKSINIFI"]],
  ["max","Kapasite (Max)",false,["MAXKAPASİTE","KAPASİTE","MAX","ÇEKERİ","ÇEKER"]],
  ["min","Min",false,["MIN","MİN"]],
  ["e","e (doğrulama bölüntüsü)",false,["EDOĞRULAMABÖLÜNTÜSÜ","E"]],
  ["d","d (okuma bölüntüsü)",false,["DOKUMABÖLÜNTÜSÜ","D"]],
  ["uretim","Üretim yılı",false,["ÜRETİMYILI","ÜRETİM"]],
  ["son","Son damga yılı",false,["SONDAMGAYILI","SDAMGAYILI","DAMGAYILI"]],
  ["yer","Kullanım yeri",false,["KULLANIMYERİ","KULLANILDIĞIYER"]],
  ["not","Not",false,["NOT","AÇIKLAMA","YORUM"]]];
const CUST_STOP = new Set(["LTD","ŞTİ","STİ","AŞ","AS","SAN","TİC","VE","LİMİTED","ŞİRKETİ","ANONİM","SANAYİ","TİCARET","İNŞ","TUR"]);
const custNorm = n => TRU(String(n || "").split(" · ")[0]).replace(/[.,;:()\-'"/]/g, " ").split(/\s+/).filter(w => w && !CUST_STOP.has(w)).join(" ");
function autoMap(head){
  const hn = head.map(HN), used = new Set(), map = {};
  [true, false].forEach(exact => GFIELDS.forEach(([k,, , syn]) => { if (map[k] !== undefined) return;
    const idx = hn.findIndex((h, i) => !used.has(i) && h && syn.some(s => exact ? h === s : (s.length > 2 && h.startsWith(s))));
    if (idx >= 0){ map[k] = idx; used.add(idx); } }));
  return map;
}
function pickSheet(wb){
  let best = null;
  wb.SheetNames.forEach(n => { const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "", raw: true });
    for (let r = 0; r < Math.min(15, rows.length); r++){ const m = autoMap(rows[r] || []); const score = Object.keys(m).length + (m.marka !== undefined && m.seri !== undefined ? 5 : 0);
      if (!best || score > best.score) best = { sheet: n, rows, hr: r, score }; } });
  return best;
}
function prepGeneric(wb){ const b = pickSheet(wb); if (!b || b.score < 7) throw new Error("Başlık satırı tanınamadı. En az firma adı, marka ve seri no sütunları olmalı.");
  const head = (b.rows[b.hr] || []).map(cellStr); return { sheet: b.sheet, rows: b.rows, hr: b.hr, head, map: autoMap(head), sheets: wb.SheetNames }; }
function parseGeneric(G, listYear){
  const v = (r, k) => G.map[k] !== undefined && G.map[k] !== "" && G.map[k] >= 0 ? cellStr(r[G.map[k]]) : "";
  const exTriple = new Map(), exPair = new Map();
  DEVS.forEach(o => { const p = devKey(o.d[2], o.d[4]); if (!p) return; exTriple.set(custNorm(o.l.n) + "#" + p, o); if (!exPair.has(p)) exPair.set(p, o); });
  const locBy = new Map(); LOCS.forEach(l => { if (!l.dep) locBy.set(custNorm(l.n) + "#" + normAddr(l.a, l.i), l.k); });
  const biz = new Map(), devs = [], contacts = [], skipped = [], other = [], errors = [], noSerial = [], inFile = new Set(); let nRows = 0;
  const req = GFIELDS.filter(f => f[2]).map(f => f[0]);
  G.rows.slice(G.hr + 1).forEach((r, i) => {
    const row = G.hr + i + 2, unvan = v(r, "unvan");
    if (!unvan && !v(r, "marka") && !v(r, "seri")) return;
    if (/^ÖRNEK/.test(TRU(unvan)) || /ÖRNEK SATIR/.test(TRU(v(r, "not")))) return;
    nRows++;
    const miss = req.filter(k => k === "seri" ? !seriOf(v(r, k)) : !v(r, k)).map(k => GFIELDS.find(f => f[0] === k)[1]);
    const idOnly = miss.length && miss.every(m => m === "Seri no" || m === "Marka");
    if (miss.length && !idOnly){ errors.push({ row, unvan, reason: "Eksik: " + miss.join(", ") }); return; }
    const marka = v(r, "marka"), seri = seriOf(v(r, "seri")), cn = custNorm(unvan);
    const pk = idOnly ? "NOSN|" + row : devKey(marka, seri), tk = cn + "#" + pk;
    if (exTriple.has(tk)){ skipped.push({ row, unvan, marka, seri, reason: "Sistemde kayıtlı (" + (exTriple.get(tk).d[11] || "") + ")" }); return; }
    if (inFile.has(tk)){ skipped.push({ row, unvan, marka, seri, reason: "Dosyada tekrar eden satır" }); return; }
    inFile.add(tk);
    const adres = v(r, "adres"), pf = placeFix(v(r, "il"), v(r, "ilce"), adres), ilce = pf.ilce, ilceKey = normIlce(v(r, "ilce")), kod = v(r, "kod"), sube = v(r, "sube");
    const name = unvan + (kod ? " · " + kod : "") + (sube && TRU(sube) !== TRU(unvan) ? " · " + sube : "");
    const reuse = locBy.get(cn + "#" + normAddr(adres, ilce));
    const bid = reuse || ("b" + hkey(TRU(name) + "|" + TRU(adres) + "|" + ilceKey));
    const sonY = +v(r, "son"); const son = sonY >= 1990 && sonY <= YEAR + 1 ? sonY : null; const valid = son && son + 2 > YEAR;
    const sin = TRU(v(r, "sinif")).replace(/[^IV3]/g, "").replace(/^3$/, "III");
    const dev = { import_key: hkey("G|" + tk), business_id: bid, tip: v(r, "tip") || "Otomatik olmayan tartı aleti", cins: v(r, "cins") === "NAWI" ? "Otomatik olmayan tartı aleti" : (v(r, "cins") || "Terazi"),
      marka, model: v(r, "model"), seri_no: seri, seri_flag: "", sinif: sin || "III", max_cap: normCap(v(r, "max")), min_cap: v(r, "min"), e: v(r, "e"), d: v(r, "d"),
      uretim_yili: +v(r, "uretim") || null, son_damga_yili: son, durum_grup: valid ? "tamam" : "bekliyor",
      durum_ham: `Yeni kayıt (${G.fileName || "Excel"})` + (valid ? " · damga geçerli" : son ? ` · son damga ${son}` : ""), bilgi: v(r, "not"), kullanim_yeri: v(r, "yer"), excel_row: row };
    if (idOnly){ dev.seri_flag = "seri-yok"; dev.import_key = hkey("GN|" + cn + "|" + TRU(adres) + "|" + row + "|" + (G.fileName || "")); noSerial.push({ row, unvan, marka, seri: v(r, "seri"), reason: "Eksik: " + miss.join(", ") + " · mükerrer kontrolü yapılamaz", dev }); }
    else if (exPair.has(pk)){ const o = exPair.get(pk); other.push({ row, unvan, marka, seri, reason: `Aynı marka + seri “${titleTR(o.l.n)}” firmasında kayıtlı (devir olabilir)`, dev, bid, b: { name, adres, ilce, r } }); }
    else devs.push(dev);
    if (!reuse && !biz.has(bid)){ const c = approxCoord(ilce, mahOf(adres), bid);
      biz.set(bid, { id: bid, unvan: name, sube, adres, mahalle: mahOf(adres), ilce, il: pf.il, tel: fmtTel(v(r, "tel")), vkn: v(r, "vkn"), lat: c.lat, lng: c.lng, geo_src: c.src, is_depot: false });
      if (v(r, "yetkili") || v(r, "ycep")) contacts.push({ business_id: bid, ad: v(r, "yetkili"), tel: fmtTel(v(r, "ycep")) }); }
  });
  const cats = devs.reduce((m, d) => (m[d.durum_grup] = (m[d.durum_grup] || 0) + 1, m), {});
  const used = new Set(devs.map(x => x.business_id));
  return { biz: [...biz.values()].filter(b => used.has(b.id)), bizAll: [...biz.values()], devs, contacts, skipped, other, errors, noSerial, cats, rows: nRows, upd: [],
    format: G.sheet === "Cihazlar" && G.head.some(h => /FİRMA ÜNVANI/.test(TRU(h))) ? "Elmaslar yeni müşteri şablonu" : `Yeni müşteri listesi (“${G.sheet}” sayfası, ${G.hr + 1}. satır başlık)`, template: true, G };
}
function isElmaslarList(wb){ const ws = wb.Sheets[wb.SheetNames[0]]; const h = (XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 })[0] || []).map(TRU); return h.some(x => x.startsWith("MÜŞTERİ ADI")) && h.includes("DURUMU"); }

let xlsxP = null;
function loadXLSX(){ if (window.XLSX) return Promise.resolve(); if (xlsxP) return xlsxP;
  xlsxP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload = res; s.onerror = () => { xlsxP = null; rej(new Error("Excel okuyucu yüklenemedi")); }; document.head.appendChild(s); });
  return xlsxP; }
async function readImportFile(file, listYear){
  await loadXLSX(); const buf = await file.arrayBuffer(); const wb = XLSX.read(buf, { type: "array" });
  if (isMigrosFormat(wb)) return splitMatches(parseMigros(wb, listYear));
  if (isElmaslarList(wb)) return splitMatches({ ...parseWorkbook(wb, listYear), format: "Elmaslar damga listesi" });
  const G = prepGeneric(wb); G.fileName = file.name; return parseGeneric(G, listYear);
}
async function runImport(){
  const P = st.imp; if (!P || !P.data || P.busy) return; P.busy = true; P.log = []; render();
  const step = (m) => { P.log.push(m); const el = $("#implog"); if (el) el.textContent = P.log.join("\n"); };
  try {
    const D = P.data.devs.concat(P.data.template && P.includeOther ? (P.data.other || []).map(x => x.dev) : [], P.data.template && P.includeNoSerial ? (P.data.noSerial || []).map(x => x.dev) : []);
    const usedB = new Set(D.map(x => x.business_id)); const B = (P.data.bizAll || P.data.biz).filter(b => !P.data.template || usedB.has(b.id));
    if (P.data.contacts) P.data.contacts = P.data.contacts.filter(c => usedB.has(c.business_id));
    for (let i = 0; i < B.length; i += 500){ await q(sb.from("businesses").upsert(B.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true })); step(`İşletmeler: ${Math.min(i + 500, B.length)} / ${B.length}`); }
    if ((P.data.contacts || []).length){ try { await q(sb.from("contacts").insert(P.data.contacts)); step(`Yetkili kişi: ${P.data.contacts.length}`); } catch(e){ step("Yetkili kişiler eklenemedi: " + e.message); } }
    for (let i = 0; i < D.length; i += 500){ await q(sb.from("devices").upsert(D.slice(i, i + 500), { onConflict: "import_key", ignoreDuplicates: true })); step(`Cihazlar: ${Math.min(i + 500, D.length)} / ${D.length}`); }
    const U = P.data.upd || []; let done = 0;
    for (let i = 0; i < U.length; i += 8){ await Promise.all(U.slice(i, i + 8).filter(u => Object.keys(u.patch).length).map(u => q(sb.from("devices").update(u.patch).eq("id", u.id)))); done = Math.min(i + 8, U.length); if (done % 80 === 0 || done === U.length) step(`Mevcut cihaz güncellendi: ${done} / ${U.length}`); }
    const n = await q(sb.rpc("assign_qr_numbers")); step(`QR numarası verilen yeni cihaz: ${n}`);
    await reloadDevices(); step("Tamamlandı. Veriler yenilendi."); P.done = true; toast("İçe aktarma tamamlandı");
  } catch(e){ step("Hata: " + (e.message || e)); toast("İçe aktarma durdu: " + (e.message || e)); }
  P.busy = false; render();
}
async function runGeocode(){
  if (st.geoRun?.busy) { st.geoRun.stop = true; return; }
  let maps; try { maps = await loadGoogle(); } catch(e){ toast(e.message); return; }
  const gc = new maps.Geocoder(); const todo = LOCS.filter(l => !l.dep && l.p !== "ok");
  st.geoRun = { busy: true, stop: false, done: 0, ok: 0, miss: 0, total: todo.length }; render();
  const upd = () => { const el = $("#geoprog"); if (el) el.textContent = `${st.geoRun.done} / ${st.geoRun.total} · bulunan ${st.geoRun.ok} · bulunamayan ${st.geoRun.miss}`; };
  for (const l of todo){
    if (st.geoRun.stop) break;
    const address = `${l.a}, ${titleTR(l.i)}, Antalya, Türkiye`;
    let tries = 0, res = null;
    while (tries++ < 3){
      try { const out = await gc.geocode({ address, region: "tr", componentRestrictions: { country: "TR" } }); res = out.results?.[0]; break; }
      catch(e){ if (String(e.code || e.message).includes("OVER_QUERY_LIMIT")) await new Promise(r => setTimeout(r, 2000)); else break; }
    }
    st.geoRun.done++;
    if (res){ const loc = res.geometry.location; const lat = loc.lat(), lng = loc.lng(); const type = res.geometry.location_type;
      const inArea = lat > 35.8 && lat < 37.8 && lng > 29.1 && lng < 32.8;
      if (inArea && type !== "APPROXIMATE"){ try { await saveGeo(l.k, +lat.toFixed(6), +lng.toFixed(6), "google"); st.geoRun.ok++; } catch(e){ st.geoRun.miss++; } }
      else st.geoRun.miss++; }
    else st.geoRun.miss++;
    upd(); await new Promise(r => setTimeout(r, 120));
  }
  st.geoRun.busy = false; S = computeSummary(); render(); toast(`Konum bulma bitti: ${st.geoRun.ok} lokasyon doğrulandı`);
}
function viewData(){
  const P = st.imp || {}; const d = P.data;
  const prec = { ok: 0, mah: 0, ilce: 0 }; LOCS.filter(l => !l.dep).forEach(l => prec[l.p] = (prec[l.p] || 0) + 1);
  const G = st.geoRun;
  const noQR = DEVS.filter(o => !/^EL-/.test(o.d[11])).length;
  return `<div class="stack" style="max-width:980px;margin:0 auto">
  <div><div class="eyebrow">Yönetici</div><h2>Veri ve ayarlar</h2></div>
  <div class="card pad stack" style="gap:10px"><h3>Excel'den içe aktar</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Elmaslar damga listesi ya da Migros/YMS “kalanlar” listesi (.xlsx) seçin; biçim otomatik tanınır. Aynı satırlar ikinci kez eklenmez; daha önce bulunan konumlar ve QR numaraları korunur. Mevcut kayıt: ${fmt(DEVS.length)} cihaz, ${fmt(LOCS.length)} lokasyon.</p>
    <div class="row" style="font-size:.88rem"><a class="btn sm" href="elmaslar-yeni-musteri-sablonu.xlsx" download>Yeni müşteri şablonunu indir (.xlsx)</a><span class="muted">Yeni müşterileri bu şablonla gönderin; sistemde aynı firma + marka + seri no varsa satır eklenmez.</span></div>
    <div class="row"><input id="impfile" type="file" accept=".xlsx,.xls"><label class="f" style="flex-direction:row;align-items:center;gap:8px">Liste yılı <input id="impyear" type="number" value="${P.year || YEAR}" min="2020" max="2040" style="width:90px"></label></div>
    ${d ? `<div class="muted" style="font-size:.86rem">Biçim: <b>${esc(d.format||"")}</b>. ${d.upd?.length ? `${fmt(d.upd.length)} cihaz sistemde zaten var (marka + seri no); yeni kayıt açılmadan durumları güncellenecek.` : ""}</div>
      <div class="metrics"><div><b>${fmt(d.rows)}</b><span>satır</span></div><div><b>${fmt(d.biz.length)}</b><span>yeni lokasyon</span></div><div><b>${fmt(d.devs.length)}</b><span>yeni cihaz</span></div><div><b>${fmt(d.upd?.length||0)}</b><span>güncellenecek</span></div>
      ${Object.entries(d.cats).map(([k,n]) => `<div><b>${fmt(n)}</b><span>${CAT[k]?.l || k}</span></div>`).join("")}<div><b>${fmt(d.devs.filter(x=>x.seri_flag).length)}</b><span>seri no sorunlu</span></div></div>
      <div class="row"><button class="btn primary" data-act="impgo" ${P.busy||P.done?"disabled":""}>${P.busy ? "Aktarılıyor…" : P.done ? "Aktarıldı" : `İçe aktar (${fmt(d.devs.length)} yeni, ${fmt(d.upd?.length||0)} güncelleme)`}</button><span class="muted" style="font-size:.84rem">${esc(P.name||"")}</span></div>` : ""}
    ${d && d.G ? `<details ${d.errors.length > d.rows / 3 ? "open" : ""}><summary>Sütun eşleştirme (${Object.keys(d.G.map).length} alan tanındı) · yanlışsa buradan düzeltin</summary>
      <div class="mapgrid">${GFIELDS.map(([k, lab, rq]) => `<label class="f">${esc(lab)}${rq ? " *" : ""}<select data-act="impmap" data-k="${k}"><option value="">—</option>${d.G.head.map((h, i) => h ? `<option value="${i}" ${d.G.map[k] === i ? "selected" : ""}>${esc(h)}</option>` : "").join("")}</select></label>`).join("")}</div></details>` : ""}
    ${d && d.template ? `<div class="stack" style="gap:8px">
      ${d.skipped.length ? `<details><summary>${fmt(d.skipped.length)} satır atlanacak (aynı firma + marka + seri no zaten var)</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.skipped.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan))}</td><td>${esc(s.marka)}</td><td class="mono">${esc(s.seri)}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
      ${d.other.length ? `<details open><summary>${fmt(d.other.length)} cihazın marka + seri numarası başka firmada kayıtlı</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.other.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan))}</td><td>${esc(s.marka)}</td><td class="mono">${esc(s.seri)}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div>
        <label class="row" style="font-size:.86rem;margin-top:6px"><input id="impother" type="checkbox" ${P.includeOther?"checked":""}> Bunları da yeni kayıt olarak ekle (cihaz el değiştirmişse). İşaretsizse atlanır.</label></details>` : ""}
      ${(d.noSerial||[]).length ? `<details open><summary>${fmt(d.noSerial.length)} satırda seri no veya marka yok (“BILA” gibi)</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.noSerial.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan))}</td><td>${esc(s.marka||"—")}</td><td class="mono">${esc(s.seri||"—")}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div>
        <label class="row" style="font-size:.86rem;margin-top:6px"><input id="impnosn" type="checkbox" ${P.includeNoSerial?"checked":""}> Bunları da ekle (seri no sahada tamamlanır). İşaretsizse eklenmez.</label></details>` : ""}
      ${d.errors.length ? `<details open><summary class="warnbox" style="display:list-item">${fmt(d.errors.length)} satırda zorunlu alan eksik, eklenmeyecek</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.errors.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan||"—"))}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
      ${(d.skipped.length + d.errors.length + d.other.length + (d.noSerial||[]).length) ? `<div><button class="btn sm" data-act="impreport">Atlanan ve eksik satırları CSV indir</button></div>` : ""}
    </div>` : ""}
    ${P.err ? `<div class="warnbox">${esc(P.err)}</div>` : ""}
    <pre id="implog" class="log" ${P.log?.length ? "" : "hidden"}>${esc((P.log||[]).join("\n"))}</pre>
  </div>
  ${viewPlaceAudit()}
  ${viewDupes()}
  <div class="card pad stack" style="gap:10px"><h3>Konumlar</h3>
    <div class="metrics"><div><b>${fmt(prec.ok||0)}</b><span>doğrulanmış (Google / elle)</span></div><div><b>${fmt(prec.mah||0)}</b><span>≈ mahalle merkezi</span></div><div><b>${fmt(prec.ilce||0)}</b><span>≈ ilçe merkezi</span></div></div>
    <p class="muted" style="margin:0;font-size:.9rem">Google Geocoding ile adresler koordinata çevrilir. Bulunamayan adresler (“DEPO”, “KAŞ” gibi) sahadan “Konumu kaydet” ile düzeltilir. Google, ayda belirli bir sorguya kadar ücretsiz; ${fmt((prec.mah||0)+(prec.ilce||0))} sorgu bu sınırın çok altında.</p>
    <div class="row"><button class="btn ${G?.busy?"warn":"primary"}" data-act="geocode" ${CFG.GOOGLE_MAPS_KEY?"":"disabled"}>${G?.busy ? "Durdur" : `Google ile konum bul (${fmt((prec.mah||0)+(prec.ilce||0))})`}</button>
      <span class="mono muted" id="geoprog">${G ? `${G.done} / ${G.total} · bulunan ${G.ok} · bulunamayan ${G.miss}` : ""}</span></div>
    ${CFG.GOOGLE_MAPS_KEY ? "" : `<div class="warnbox">config.js dosyasında GOOGLE_MAPS_KEY boş. Kurulum rehberinin 4. adımına bakın.</div>`}
  </div>
  <div class="card pad stack" style="gap:10px"><h3>QR numaraları</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Her cihazın kalıcı bir QR numarası (EL-000123) ve tahmin edilemeyen bir anahtarı var. Herkese açık kart adresi: <span class="mono">${esc(PUBLIC_QR_URL)}?k=EL-000123-xxxxx</span></p>
    <div class="row"><button class="btn" data-act="assignqr" ${noQR?"":"disabled"}>${noQR ? `${fmt(noQR)} cihaza QR numarası ver` : "Tüm cihazların QR numarası var"}</button><button class="btn" data-act="view" data-v="cihazlar">Etiket basmak için Cihazlar & QR</button></div>
  </div>
  <div class="card pad stack" style="gap:6px"><h3>Kurulum durumu</h3>
    <div class="row" style="gap:16px;font-size:.9rem"><span class="st tamam">Supabase bağlı</span><span class="st ${CFG.GOOGLE_MAPS_KEY?"tamam":"tekrar"}">Google Maps ${CFG.GOOGLE_MAPS_KEY?"tanımlı":"tanımlı değil"}</span><span class="st ${window.qrcode?"tamam":"tekrar"}">QR kütüphanesi ${window.qrcode?"yüklü":"yüklenemedi"}</span></div>
    <div class="muted" style="font-size:.84rem">Panel: <span class="mono">${esc(APP_URL)}</span> · Atölye: ${esc(DEPOT.a)}</div>
  </div></div>`;
}

function viewPlaceAudit(){
  const A = st.pa;
  if (!A) return `<div class="card pad stack" style="gap:10px"><h3>İl / ilçe düzeltme</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Kayıtlardaki il ve ilçeleri Türkiye'nin resmi listesiyle (81 il, 973 ilçe) karşılaştırır. Yazım farklarını düzeltir (KONYAALTİ, konyaalti → KONYAALTI). Adresteki mahalle başka bir ilçedeyse bunu öneri olarak gösterir. Excel'den yeni gelen kayıtlar içe aktarılırken zaten otomatik düzeltiliyor.</p>
    <div><button class="btn primary" data-act="pacheck">Kayıtları kontrol et</button></div></div>`;
  const row = (x, kind) => `<tr><td>${kind === "sug" ? `<input type="checkbox" data-act="pasel" data-k="${x.l.k}" ${A.sel.has(x.l.k)?"checked":""} aria-label="Uygula">` : ""}</td><td>${esc(titleTR(x.l.n))}</td><td class="muted">${esc(titleTR(x.l.a))}</td>
    <td class="mono">${esc(x.l.il)} / ${esc(x.l.i || "—")}</td><td>→</td><td class="mono"><b>${esc(x.r.il)} / ${esc(kind === "sug" ? x.r.suggest.ilce : x.r.ilce)}</b></td><td class="muted">${esc(kind === "sug" ? x.r.suggest.reason : kind === "bad" ? "Tanınamadı; elle düzeltin" : (x.r.how.join(", ") || "Yazım düzeltmesi"))}</td></tr>`;
  const grp = (title, list, kind, open) => list.length ? `<details ${open ? "open" : ""}><summary>${title}</summary><div class="tbl-wrap" style="margin-top:6px"><table class="rptbl"><tbody>${list.slice(0, 300).map(x => row(x, kind)).join("")}</tbody></table>${list.length > 300 ? `<p class="muted" style="font-size:.8rem">İlk 300 kayıt gösteriliyor; uygulama tümünü kapsar.</p>` : ""}</div></details>` : "";
  const byPair = {}; A.fix.forEach(x => { const k = `${x.l.i || "(boş)"} → ${x.r.ilce}`; byPair[k] = (byPair[k] || 0) + 1; });
  return `<div class="card pad stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h3>İl / ilçe düzeltme</h3><button class="link" data-act="pacheck">Yeniden kontrol et</button></div>
    <div class="metrics"><div><b>${fmt(A.fix.length)}</b><span>yazım düzeltmesi</span></div><div><b>${fmt(A.sug.length)}</b><span>adresle uyuşmayan ilçe</span></div><div><b>${fmt(A.bad.length)}</b><span>tanınamayan</span></div></div>
    ${A.fix.length ? `<div class="muted" style="font-size:.84rem">${Object.entries(byPair).sort((a,b)=>b[1]-a[1]).slice(0, 12).map(([k,n]) => `${esc(k)} (${n})`).join(" · ")}</div>` : ""}
    ${grp(`${fmt(A.fix.length)} kayıtta yazım düzeltmesi (otomatik uygulanır)`, A.fix, "fix", false)}
    ${grp(`${fmt(A.sug.length)} kayıtta ilçe adresle uyuşmuyor (seçtikleriniz uygulanır)`, A.sug, "sug", true)}
    ${grp(`${fmt(A.bad.length)} kayıt tanınamadı`, A.bad, "bad", false)}
    ${A.sug.length ? `<div class="row" style="font-size:.85rem"><button class="link" data-act="paall">Tümünü seç</button><button class="link" data-act="panone">Hiçbirini seçme</button></div>` : ""}
    <div class="row"><button class="btn primary" data-act="paapply" ${A.busy || !(A.fix.length || A.sel.size) ? "disabled" : ""}>${A.busy ? "Uygulanıyor…" : `Düzeltmeleri uygula (${fmt(A.fix.length + A.sel.size)} kayıt)`}</button><span class="mono muted" id="paprog"></span></div>
    <p class="muted" style="font-size:.8rem;margin:0">Konumu doğrulanmamış kayıtların yaklaşık haritadaki yeri de yeni ilçeye taşınır. Google ile doğrulanmış konumlara dokunulmaz.</p></div>`;
}
async function placeApply(){
  const A = st.pa; if (!A || A.busy) return; A.busy = true; render();
  const ch = new Map();
  A.fix.forEach(x => ch.set(x.l.k, { l: x.l, il: x.r.il, ilce: x.r.ilce }));
  A.sug.forEach(x => { if (A.sel.has(x.l.k)) ch.set(x.l.k, { l: x.l, il: x.r.il, ilce: x.r.suggest.ilce }); });
  const items = [...ch.values()]; let done = 0, fail = 0;
  for (let i = 0; i < items.length; i += 8){
    await Promise.all(items.slice(i, i + 8).map(async x => { const patch = { il: x.il, ilce: x.ilce };
      if (x.l.p !== "ok"){ const c = approxCoord(x.ilce, mahOf(x.l.a), x.l.k); Object.assign(patch, { lat: c.lat, lng: c.lng, geo_src: c.src }); }
      try { await q(sb.from("businesses").update(patch).eq("id", x.l.k)); done++; } catch(e){ fail++; } }));
    const el = $("#paprog"); if (el) el.textContent = `${done + fail} / ${items.length}`;
  }
  await reloadDevices(); st.pa = null; render(); toast(`${fmt(done)} kayıt düzeltildi${fail ? `, ${fail} kayıt güncellenemedi` : ""}`);
}

/* ---- Mükerrer müşteri ve cihaz düzenleme ---- */
function dupAudit(){
  // Müşteri: aynı normalize adres ya da aynı firma adı + ilçe
  const locs = LOCS.filter(l => !l.dep && l.d.length);
  const parent = new Map(locs.map(l => [l.k, l.k])); const find = k => { while (parent.get(k) !== k) k = parent.get(k); return k; }; const join = (a, b) => parent.set(find(a), find(b));
  const by = (keyf) => { const m = new Map(); locs.forEach(l => { const k = keyf(l); if (!k) return; if (m.has(k)) join(l.k, m.get(k)); else m.set(k, l.k); }); };
  by(l => normAddr(l.a, l.i).length > 30 ? normAddr(l.a, l.i) : null);
  by(l => { const c = custNorm(l.n); return c.length > 3 ? c + "#" + l.i : null; });
  const g = new Map(); locs.forEach(l => { const r = find(l.k); (g.get(r) || g.set(r, []).get(r)).push(l); });
  const cust = [...g.values()].filter(x => x.length > 1).map(x => x.sort((a, b) => b.d.length - a.d.length)).sort((a, b) => b.length - a.length);
  // Cihaz: aynı marka + seri no (aktif kayıtlar)
  const dm = new Map(); DEVS.forEach(o => { if (o.d[23] === false || o.l.dep) return; const k = devKey(o.d[2], o.d[4]); if (!k) return; (dm.get(k) || dm.set(k, []).get(k)).push(o); });
  const dev = [...dm.values()].filter(x => x.length > 1);
  return { cust, dev };
}
function viewDupes(){
  const D = st.dup;
  if (!D) return `<div class="card pad stack" style="gap:10px"><h3>Mükerrer müşteri ve cihazlar</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Aynı adresteki ya da aynı adla aynı ilçede geçen müşterileri ve aynı marka + seri numarasıyla birden fazla kaydı olan cihazları bulur. Müşterileri tek kayıtta birleştirebilir, mükerrer cihazlardan birini tutup diğerlerini pasife alabilirsiniz.</p>
    <div><button class="btn primary" data-act="dupcheck">Mükerrerleri bul</button></div></div>`;
  const cust = D.cust.slice(0, 60).map((grp, gi) => `<div class="share" style="gap:6px"><div class="muted" style="font-size:.8rem">Grup ${gi + 1} · ${grp.length} kayıt · ana kaydı seçin</div>
    ${grp.map(l => `<label class="row" style="gap:8px;font-size:.86rem;align-items:flex-start"><input type="radio" name="dupc-${gi}" value="${l.k}" ${D.target[gi] === l.k ? "checked" : ""} data-act="duptgt" data-g="${gi}">
      <span style="flex:1;min-width:0"><b>${esc(titleTR(l.n))}</b> <span class="muted">· ${esc(titleTR(l.i))} · ${l.d.length} cihaz</span><br><span class="muted">${esc(titleTR(l.a))}</span></span></label>`).join("")}
    <div class="row"><button class="btn sm" data-act="dupmerge" data-g="${gi}">Seçili kayıtta birleştir</button><button class="link" data-act="dupskip" data-g="${gi}" style="font-size:.82rem">Mükerrer değil, gizle</button></div></div>`).join("");
  const dev = D.dev.slice(0, 80).map((grp, gi) => `<div class="share" style="gap:6px"><div class="muted" style="font-size:.8rem">${esc(grp[0].d[2])} · seri <span class="mono">${esc(grp[0].d[4])}</span> · ${grp.length} kayıt · tutulacak kaydı seçin</div>
    ${grp.map(o => { const si = stampInfo(o); return `<label class="row" style="gap:8px;font-size:.86rem;align-items:flex-start"><input type="radio" name="dupd-${gi}" value="${o.d[0]}" ${D.keep[gi] === o.d[0] ? "checked" : ""} data-act="dupkeep" data-g="${gi}">
      <span style="flex:1;min-width:0"><b>${esc(titleTR(o.l.n))}</b> <span class="muted">· ${esc(titleTR(o.l.i))}</span><br><span class="muted">${esc(o.d[3])} · Max ${esc(o.d[12]||"?")} · ${esc(CAT[o.d[8]]?.l || o.d[8])} · son damga ${si.last || "—"} · QR ${esc(o.d[11])}</span></span></label>`; }).join("")}
    <div class="row"><button class="btn sm" data-act="dupdev" data-g="${gi}">Seçiliyi tut, diğerlerini pasife al</button><button class="link" data-act="dupdskip" data-g="${gi}" style="font-size:.82rem">Mükerrer değil, gizle</button></div></div>`).join("");
  return `<div class="card pad stack" style="gap:10px"><div class="row" style="justify-content:space-between"><h3>Mükerrer müşteri ve cihazlar</h3><button class="link" data-act="dupcheck">Yeniden tara</button></div>
    <div class="metrics"><div><b>${fmt(D.cust.length)}</b><span>mükerrer müşteri grubu</span></div><div><b>${fmt(D.dev.length)}</b><span>mükerrer cihaz grubu</span></div></div>
    ${D.cust.length ? `<details open><summary>Müşteriler (${fmt(D.cust.length)} grup)</summary><p class="muted" style="font-size:.82rem;margin:6px 0">Birleştirince diğer kayıtların cihazları ana kayda taşınır. Eski kayıtlar silinmez, cihazsız kaldıkları için listelerde görünmez.</p><div class="stack" style="gap:8px">${cust}</div>${D.cust.length > 60 ? `<p class="muted">İlk 60 grup gösteriliyor.</p>` : ""}</details>` : `<p class="muted" style="margin:0">Mükerrer müşteri bulunmadı.</p>`}
    ${D.dev.length ? `<details ${D.cust.length ? "" : "open"}><summary>Cihazlar (${fmt(D.dev.length)} grup)</summary><p class="muted" style="font-size:.82rem;margin:6px 0">Tutulan kayda gruptaki en yeni damga yılı ve en iyi durum aktarılır. Diğerleri “mükerrer kayıt” nedeniyle pasife alınır; QR ve geçmişleri silinmez.</p><div class="stack" style="gap:8px">${dev}</div>${D.dev.length > 80 ? `<p class="muted">İlk 80 grup gösteriliyor.</p>` : ""}</details>` : `<p class="muted" style="margin:0">Mükerrer cihaz bulunmadı.</p>`}
  </div>`;
}
async function dupMerge(gi){
  const D = st.dup, grp = D.cust[gi], tgt = D.target[gi]; if (!grp || !tgt) return;
  const others = grp.filter(l => l.k !== tgt).map(l => l.k);
  try { for (const k of others) await q(sb.from("devices").update({ business_id: tgt }).eq("business_id", k));
    await reloadDevices(); toast(`${others.length} kayıt birleştirildi`); } catch(e){ toast("Birleştirilemedi: " + e.message); }
  st.dup = { ...dupAudit(), target: {}, keep: {} }; initDupDefaults(); render();
}
async function dupDev(gi){
  const D = st.dup, grp = D.dev[gi], keep = D.keep[gi]; if (!grp || !keep) return;
  const kept = grp.find(o => o.d[0] === keep), rest = grp.filter(o => o.d[0] !== keep);
  const maxSon = Math.max(...grp.map(o => +o.d[6] || 0)) || null; const best = grp.map(o => o.d[8]).sort((a, b) => (RANK[b] ?? 0) - (RANK[a] ?? 0))[0];
  try {
    const patch = {}; if (maxSon && maxSon > (+kept.d[6] || 0)) patch.son_damga_yili = maxSon; if ((RANK[best] ?? 0) > (RANK[kept.d[8]] ?? 0)) patch.durum_grup = best;
    if (Object.keys(patch).length) await q(sb.from("devices").update(patch).eq("id", keep));
    for (const o of rest) await q(sb.from("devices").update({ aktif: false, cikis_nedeni: `Mükerrer kayıt · tutulan ${kept.d[11]}` }).eq("id", o.d[0]));
    await reloadDevices(); toast(`${rest.length} mükerrer cihaz pasife alındı`);
  } catch(e){ toast("İşlem yapılamadı: " + e.message); }
  st.dup = { ...dupAudit(), target: {}, keep: {} }; initDupDefaults(); render();
}
function initDupDefaults(){ const D = st.dup; const hide = lsGet("damga.dupHide", []);
  D.cust = D.cust.filter(g => !hide.includes("c:" + g.map(l => l.k).sort().join(","))); D.dev = D.dev.filter(g => !hide.includes("d:" + g.map(o => o.d[0]).sort().join(",")));
  D.cust.forEach((g, i) => D.target[i] = g[0].k);
  D.dev.forEach((g, i) => D.keep[i] = g.slice().sort((a, b) => ((RANK[b.d[8]] ?? 0) - (RANK[a.d[8]] ?? 0)) || ((+b.d[6] || 0) - (+a.d[6] || 0)))[0].d[0]); }
function dupHide(kind, gi){ const D = st.dup; const key = kind === "c" ? "c:" + D.cust[gi].map(l => l.k).sort().join(",") : "d:" + D.dev[gi].map(o => o.d[0]).sort().join(",");
  const h = lsGet("damga.dupHide", []); h.push(key); lsSet("damga.dupHide", h); st.dup = { ...dupAudit(), target: {}, keep: {} }; initDupDefaults(); render(); }
/* ---- Raporlar: müşteri bazlı durum ve cihaz detayı (çarşaf), CSV ---- */
const RP_OUT = ["cihazyok","kapsamdisi","baskasi"];
function rpLocRow(l){
  const c = { tamam:0, islenecek:0, bekliyor:0, tekrar:0, tutanak:0, out:0 }; let nextMin = null;
  l.d.forEach(d => { const g = d[8]; if (RP_OUT.includes(g)) c.out++; else c[g] = (c[g] || 0) + 1; const si = stampInfo({ d, l }); if (si.next && si.s !== "pasif") nextMin = nextMin ? Math.min(nextMin, si.next) : si.next; });
  const open = c.bekliyor + c.tekrar + c.tutanak, act = l.d.length - c.out;
  const genel = !act ? "Kapsam dışı" : open ? (c.tamam + c.islenecek ? "Kısmen tamamlandı" : "Açık") : c.islenecek ? "Sisteme işlenecek" : "Tamamlandı";
  const lr = lastResult(l.k);
  return { l, c, n: l.d.length, open, genel, next: nextMin, last: lr ? `${lr.st === "tamam" ? "Tamamlandı" : (RL[lr.st]?.[1] || lr.st)} · ${lr.at.slice(0,10).split("-").reverse().join(".")}` : "" };
}
function rpData(){
  const f = st.rp, q = f.q.trim().toLocaleUpperCase("tr-TR");
  const locs = LOCS.filter(l => !l.dep && (!f.il || l.il === f.il) && (!f.ilce || l.i === f.ilce) && (!q || l.n.toLocaleUpperCase("tr-TR").includes(q) || l.a.toLocaleUpperCase("tr-TR").includes(q)))
    .sort((a, b) => a.il.localeCompare(b.il, "tr") || a.i.localeCompare(b.i, "tr") || a.n.localeCompare(b.n, "tr"));
  const okDev = d => !f.durum || (f.durum === "out" ? RP_OUT.includes(d[8]) : d[8] === f.durum);
  if (f.view === "musteri") return locs.filter(l => !f.durum || l.d.some(okDev)).map(rpLocRow);
  const out = []; locs.forEach(l => l.d.filter(okDev).forEach(d => out.push({ l, d, si: stampInfo({ d, l }), lr: lastResult(l.k) }))); return out;
}
const RP_GROUPS = [["","Tüm durumlar"],["tamam","Tamamlandı"],["islenecek","Yapıldı · sisteme işlenecek"],["bekliyor","Bekliyor"],["tekrar","Tekrar ziyaret"],["tutanak","Tutanak"],["out","Kapsam dışı"]];
function viewReports(){
  const f = st.rp, data = rpData(), per = 100, pages = Math.max(1, Math.ceil(data.length / per)); if (f.page >= pages) f.page = 0;
  const page = data.slice(f.page * per, f.page * per + per);
  const ils = [...new Set(LOCS.filter(l => !l.dep).map(l => l.il))].sort((a,b)=>a.localeCompare(b,"tr"));
  const ilces = [...new Set(LOCS.filter(l => !l.dep && (!f.il || l.il === f.il)).map(l => l.i))].filter(Boolean).sort((a,b)=>a.localeCompare(b,"tr"));
  let tot; if (f.view === "musteri"){ tot = data.reduce((a, r) => { a.n += r.n; a.tamam += r.c.tamam; a.isl += r.c.islenecek; a.open += r.open; a.out += r.c.out; return a; }, { n:0, tamam:0, isl:0, open:0, out:0 }); }
  const st_ = g => `<span class="st ${g==="out"?"kapsamdisi":g}">${esc(RP_GROUPS.find(x=>x[0]===g)?.[1] || CAT[g]?.l || g)}</span>`;
  const genelCls = { "Tamamlandı":"tamam", "Sisteme işlenecek":"islenecek", "Kısmen tamamlandı":"tekrar", "Açık":"bekliyor", "Kapsam dışı":"kapsamdisi" };
  const table = f.view === "musteri"
    ? `<table class="rptbl"><thead><tr><th>Müşteri</th><th>İl</th><th>İlçe</th><th>Adres</th><th>Telefon</th><th class="r">Cihaz</th><th class="r">Tamam</th><th class="r">İşlenecek</th><th class="r">Açık</th><th class="r">Kapsam dışı</th><th>Genel durum</th><th>Sonraki damga</th><th>Son saha sonucu</th></tr></thead><tbody>
      ${page.map(r => `<tr><td><b>${esc(titleTR(r.l.n))}</b></td><td>${esc(titleTR(r.l.il))}</td><td>${esc(titleTR(r.l.i))}</td><td class="muted">${esc(titleTR(r.l.a))}</td><td class="mono">${esc(r.l.t||"")}</td>
        <td class="r">${r.n}</td><td class="r">${r.c.tamam||""}</td><td class="r">${r.c.islenecek||""}</td><td class="r"><b>${r.open||""}</b></td><td class="r">${r.c.out||""}</td>
        <td><span class="st ${genelCls[r.genel]}">${r.genel}</span></td><td class="mono">${r.next||"—"}</td><td class="muted">${esc(r.last)}</td></tr>`).join("")}</tbody></table>`
    : `<table class="rptbl"><thead><tr><th>Müşteri</th><th>İl</th><th>İlçe</th><th>Marka</th><th>Model</th><th>Seri no</th><th>Max</th><th>Sınıf</th><th>Durum</th><th>Son damga</th><th>Sonraki</th><th>QR</th><th>Son saha sonucu</th></tr></thead><tbody>
      ${page.map(x => `<tr><td><button class="link rowlink" data-act="dev" data-c="${x.d[11]}">${esc(titleTR(x.l.n))}</button></td><td>${esc(titleTR(x.l.il))}</td><td>${esc(titleTR(x.l.i))}</td><td>${esc(x.d[2])}</td><td>${esc(x.d[3])}</td><td class="mono">${esc(x.d[4]||"—")}</td>
        <td class="mono">${esc(x.d[12]||"")}</td><td>${esc(x.d[16])}</td><td>${st_(RP_OUT.includes(x.d[8])?"out":x.d[8])}</td><td class="mono">${x.si.last||"—"}</td><td class="mono">${x.si.next||"—"}</td><td class="mono">${esc(x.d[11])}</td>
        <td class="muted">${x.lr ? esc((x.lr.st==="tamam"?"Tamamlandı":(RL[x.lr.st]?.[1]||x.lr.st)) + " · " + x.lr.at.slice(0,10).split("-").reverse().join(".")) : ""}</td></tr>`).join("")}</tbody></table>`;
  return `<div class="stack">
  <div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">Raporlar</div><h2>${f.view === "musteri" ? "Müşteri bazlı durum raporu" : "Cihaz bazlı durum raporu"}</h2></div>
    <div class="seg" role="group" aria-label="Rapor türü"><button class="segb" data-act="rpview" data-v="musteri" aria-pressed="${f.view==="musteri"}">Müşteri bazlı</button><button class="segb" data-act="rpview" data-v="cihaz" aria-pressed="${f.view==="cihaz"}">Cihaz bazlı</button></div></div>
  <div class="card pad stack" style="gap:10px">
    <div class="row">
      <select id="rp-il" aria-label="İl"><option value="">Tüm iller</option>${ils.map(x=>`<option ${f.il===x?"selected":""} value="${esc(x)}">${esc(titleTR(x))}</option>`).join("")}</select>
      <select id="rp-ilce" aria-label="İlçe"><option value="">Tüm ilçeler</option>${ilces.map(x=>`<option ${f.ilce===x?"selected":""} value="${esc(x)}">${esc(titleTR(x))}</option>`).join("")}</select>
      <select id="rp-durum" aria-label="Durum">${RP_GROUPS.map(([k,lab])=>`<option ${f.durum===k?"selected":""} value="${k}">${lab}</option>`).join("")}</select>
      <input id="rp-q" type="search" placeholder="Müşteri veya adres ara" value="${esc(f.q)}" style="flex:1 1 200px">
      <button class="btn primary" data-act="rpcsv">CSV indir (${fmt(data.length)} satır)</button>
    </div>
    ${f.view === "musteri" ? `<div class="row" style="gap:16px;font-size:.88rem"><span><b>${fmt(data.length)}</b> müşteri/lokasyon</span><span><b>${fmt(tot.n)}</b> cihaz</span><span class="st tamam">Tamam ${fmt(tot.tamam)}</span><span class="st islenecek">İşlenecek ${fmt(tot.isl)}</span><span class="st bekliyor">Açık ${fmt(tot.open)}</span><span class="st kapsamdisi">Kapsam dışı ${fmt(tot.out)}</span></div>`
      : `<div class="muted" style="font-size:.88rem">${fmt(data.length)} cihaz</div>`}
    ${f.durum && f.view === "musteri" ? `<div class="muted" style="font-size:.82rem">Seçili durumda en az bir cihazı olan müşteriler listeleniyor; sayılar müşterinin tüm cihazlarını gösterir.</div>` : ""}
  </div>
  <div class="card"><div class="tbl-wrap">${data.length ? table : `<div class="empty">Bu filtrelerle kayıt yok.</div>`}</div>
    ${pages>1?`<div class="row" style="justify-content:center;padding:12px"><button class="btn sm" data-act="rppage" data-p="${f.page-1}" ${f.page?"":"disabled"}>‹ Önceki</button><span class="mono muted">${f.page+1} / ${pages}</span><button class="btn sm" data-act="rppage" data-p="${f.page+1}" ${f.page<pages-1?"":"disabled"}>Sonraki ›</button></div>`:""}</div>
  </div>`;
}
function rpCSV(){
  const f = st.rp, data = rpData(); let rows;
  if (f.view === "musteri"){
    rows = [["Müşteri","İl","İlçe","Adres","Telefon","Cihaz","Tamamlandı","Sisteme işlenecek","Bekliyor","Tekrar ziyaret","Tutanak","Kapsam dışı","Genel durum","Sonraki damga","Son saha sonucu","Konum"]];
    data.forEach(r => rows.push([r.l.n, r.l.il, r.l.i, r.l.a, r.l.t, r.n, r.c.tamam, r.c.islenecek, r.c.bekliyor, r.c.tekrar, r.c.tutanak, r.c.out, r.genel, r.next || "", r.last, r.l.p === "ok" ? "Doğrulandı" : "Yaklaşık"]));
  } else {
    rows = [["Müşteri","İl","İlçe","Adres","Telefon","Cinsi","Marka","Model","Seri no","Max","e","Sınıf","Durum","Ham durum","Son damga","Sonraki damga","QR no","Son saha sonucu","Excel satır"]];
    data.forEach(x => rows.push([x.l.n, x.l.il, x.l.i, x.l.a, x.l.t, x.d[1], x.d[2], x.d[3], x.d[4], x.d[12], x.d[18], x.d[16], CAT[x.d[8]]?.l || x.d[8], x.d[9], x.si.last || "", x.si.next || "", x.d[11],
      x.lr ? (x.lr.st === "tamam" ? "Tamamlandı" : (RL[x.lr.st]?.[1] || x.lr.st)) + " " + x.lr.at.slice(0,10) : "", x.d[17]]));
  }
  const tag = [f.il, f.ilce, f.durum].filter(Boolean).map(s => s.toLocaleLowerCase("tr-TR")).join("-");
  downloadFile(`damga-${f.view === "musteri" ? "musteri" : "cihaz"}-raporu${tag ? "-" + tag : ""}-${todayISO()}.csv`, "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(";")).join("\r\n"));
  toast(`${fmt(rows.length - 1)} satır CSV olarak indirildi`);
}
/* ---------------- boot & giriş ---------------- */
function showScreen(id){ ["setup","login","loading","app"].forEach(s => { const el = document.getElementById("scr-" + s); if (el) el.hidden = s !== id; }); }
function loginMsg(m, ok){ const el = $("#lmsg"); if (el){ el.textContent = m || ""; el.className = "lmsg" + (ok ? " ok" : ""); } }
let rtTimer = null;
function scheduleRefresh(){ clearTimeout(rtTimer); rtTimer = setTimeout(async () => { try { await loadDynamic(); softRender(); } catch(e){} }, 600); }
async function start(session){
  showScreen("loading"); $("#loadmsg").textContent = "Veriler yükleniyor…";
  try {
    st.me = session.user.id;
    let prof = await q(sb.from("profiles").select("*").eq("id", st.me).maybeSingle());
    if (!prof){ await new Promise(r => setTimeout(r, 1200)); prof = await q(sb.from("profiles").select("*").eq("id", st.me).maybeSingle()); }
    if (!prof || prof.aktif === false){ showScreen("login"); loginMsg("Hesabınız henüz etkin değil. Yöneticinizin hesabı panelden etkinleştirmesi gerekiyor."); await sb.auth.signOut(); return; }
    st.profile = prof; st.isAdmin = ["admin","bolge"].includes(prof.rol); st.role = st.isAdmin ? "admin" : "saha"; st.view = st.isAdmin ? "ozet" : "saha";
    if (prof.rol === "bolge" && prof.bolge_id) st.f.region = String(prof.bolge_id);
    await loadAll();
    if (st.f.region){ const r = st.regions.find(x => String(x.id) === st.f.region); if (r) st.f.ilce = (r.ilceler || []).slice(); }
    st.ready = true; applyHash(); showScreen("app"); render();
    sb.channel("damga-canli")
      .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, scheduleRefresh)
      .subscribe();
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") scheduleRefresh(); });
  } catch(e){ showScreen("loading"); $("#loadmsg").innerHTML = `Veriler yüklenemedi: ${esc(e.message || e)}<br><button class="btn" onclick="location.reload()">Yeniden dene</button>`; }
}
(async () => {
  if (!configured){ showScreen("setup"); return; }
  $("#loginForm")?.addEventListener("submit", async e => { e.preventDefault(); loginMsg("Giriş yapılıyor…", true);
    const { data, error } = await sb.auth.signInWithPassword({ email: $("#lemail").value.trim(), password: $("#lpass").value });
    if (error){ loginMsg(/invalid/i.test(error.message) ? "E-posta veya şifre hatalı." : error.message); return; }
    start(data.session); });
  const toE164 = v => { const d = String(v || "").replace(/\D/g, "").slice(-10); return d.length === 10 && d[0] === "5" ? "+90" + d : null; };
  let otpPhone = null, resendT = null;
  const setTab = m => { $("#tab-phone").setAttribute("aria-pressed", m === "phone"); $("#tab-mail").setAttribute("aria-pressed", m === "mail");
    $("#phoneForm").hidden = m !== "phone" || !!otpPhone; $("#codeForm").hidden = m !== "phone" || !otpPhone; $("#loginForm").hidden = m !== "mail"; $("#newPassForm").hidden = true; loginMsg(""); lsSet("damga.loginTab", m); };
  $("#tab-phone")?.addEventListener("click", () => setTab("phone")); $("#tab-mail")?.addEventListener("click", () => setTab("mail"));
  setTab(lsGet("damga.loginTab", "phone"));
  const startResend = () => { let s = 60; const b = $("#resend"); b.disabled = true; clearInterval(resendT); b.textContent = `Kodu tekrar gönder (${s})`;
    resendT = setInterval(() => { s--; if (s <= 0){ clearInterval(resendT); b.disabled = false; b.textContent = "Kodu tekrar gönder"; } else b.textContent = `Kodu tekrar gönder (${s})`; }, 1000); };
  const sendCode = async phone => { loginMsg("Kod gönderiliyor…", true);
    const { error } = await sb.auth.signInWithOtp({ phone });
    if (error){ loginMsg(/provider|sms|phone.*(disabled|not enabled)/i.test(error.message) ? "SMS girişi henüz etkin değil. Yöneticinize başvurun." : /rate|seconds/i.test(error.message) ? "Çok sık denendi; biraz bekleyip tekrar deneyin." : error.message); return false; }
    otpPhone = phone; $("#codeInfo").textContent = `${phone.replace(/^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/, "0$1 $2 $3 $4")} numarasına SMS kodu gönderildi.`;
    setTab("phone"); loginMsg("", true); startResend(); setTimeout(() => $("#lcode")?.focus(), 50); return true; };
  $("#phoneForm")?.addEventListener("submit", async e => { e.preventDefault(); const p = toE164($("#lphone").value); if (!p){ loginMsg("Numarayı 05xx xxx xx xx biçiminde yazın."); return; } sendCode(p); });
  $("#resend")?.addEventListener("click", () => otpPhone && sendCode(otpPhone));
  $("#chgPhone")?.addEventListener("click", () => { otpPhone = null; clearInterval(resendT); setTab("phone"); });
  $("#codeForm")?.addEventListener("submit", async e => { e.preventDefault(); loginMsg("Doğrulanıyor…", true);
    const { data, error } = await sb.auth.verifyOtp({ phone: otpPhone, token: $("#lcode").value.trim(), type: "sms" });
    if (error){ loginMsg(/expired|invalid/i.test(error.message) ? "Kod hatalı ya da süresi doldu." : error.message); return; }
    start(data.session); });
  $("#forgot")?.addEventListener("click", async () => { const email = $("#lemail").value.trim(); if (!email){ loginMsg("Önce e-posta adresinizi yazın."); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: APP_URL }); loginMsg(error ? error.message : "Şifre yenileme bağlantısı e-postanıza gönderildi.", !error); });
  $("#newPassForm")?.addEventListener("submit", async e => { e.preventDefault(); const p = $("#npass").value;
    const { error } = await sb.auth.updateUser({ password: p }); if (error){ loginMsg(error.message); return; }
    $("#newPassForm").hidden = true; setTab("mail"); loginMsg("Şifreniz güncellendi.", true); const { data } = await sb.auth.getSession(); if (data.session) start(data.session); });
  sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY"){ showScreen("login"); $("#loginForm").hidden = true; $("#phoneForm").hidden = true; $("#codeForm").hidden = true; $("#newPassForm").hidden = false; loginMsg("Yeni şifrenizi belirleyin.", true); } });
  const { data } = await sb.auth.getSession();
  if (data.session && !/type=recovery/.test(location.hash)) start(data.session); else showScreen("login");
})();
})();
