/* Antka Damga Takip · yahyasogut.com/damga · v26 */
(function(){
"use strict";
const CFG = window.DAMGA_CONFIG || {};
const APP_URL = CFG.APP_URL || (location.origin + "/damga/");
const PUBLIC_QR_URL = CFG.PUBLIC_QR_URL || (location.origin + "/damga/c/");
const DEPOT = Object.assign({ k: "_depot", n: "Antka — Atölye", a: "Muratpaşa Mah. 567 Sk. Barış Apt. No:58/A", i: "MURATPAŞA", lat: 36.8915, lng: 30.7165 }, CFG.DEPOT || {});
const CAT = {
  tamam:{l:"Tamamlandı",c:"var(--ok)"}, bekliyor:{l:"Bekliyor",c:"var(--wait)"}, tekrar:{l:"Tekrar ziyaret",c:"var(--retry)"},
  tutanak:{l:"Tutanak",c:"var(--tut)"}, islenecek:{l:"Yapıldı · sisteme işlenecek",c:"var(--brand)"}, cihazyok:{l:"Cihaz yok",c:"var(--off)"}, kapsamdisi:{l:"Kapandı / iptal",c:"var(--off)"}, baskasi:{l:"Başkası damgaladı",c:"var(--off)"}
};
const REASONS = [
  ["yapilmadi","Yapılmadı","YAPILMADI"],["yoktu","Cihaz yoktu","YOK"],["sonra","Sonra gelinecek","SONRA GELİNECEK"],
  ["kapali","İşyeri kapalı","MAĞAZA KAPALI"],["ulasilamadi","Yetkili yoktu / ulaşılamadı","ULAŞILAMADI"],["istemedi","Müşteri istemedi","İSTEMEDİ"],["ertelendi","Ertelendi","ERTELENDİ"],["adresteyok","Adreste yok","ADRESTE YOK"],["diger","Diğer","DİĞER"]
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
const NOW_Y = new Date().getFullYear();
let YEAR = (() => { const y = +lsGet("damga.donem", 0); return y >= 2020 && y <= 2100 ? y : NOW_Y; })();   // seçili dönem

/* ---------------- Supabase ---------------- */
const configured = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
const sb = configured ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "elmaslar-damga" } }) : null;
async function q(p){ const { data, error } = await p; if (error) throw error; return data; }
async function fetchAll(table, select = "*", order = "id", eq = null){
  let out = [], from = 0; const N = 1000;
  for (;;){ let b = sb.from(table).select(select); if (eq) b = b.eq(eq[0], eq[1]); const rows = await q(b.order(order).range(from, from + N - 1)); out = out.concat(rows); if (rows.length < N) break; from += N; }
  return out;
}

/* ---------------- data (filled after login) ---------------- */
let LOCS = [], BY = {}, DEVS = [], DEVBY = {}, DEVID = {}, S = null;
// LOCS_P / DEVS_P: seçili dönemin tamamı · LOCS / DEVS: grup filtresi uygulanmış görünüm · BY / DEVID / DEVBY: tüm kayıtlar
let LOCS_P = [], DEVS_P = [], RAW = { biz: [], devs: [], items: null }, GROUPS = [];
const NOGRP = "(Grupsuz)";
// device tuple (24 itemId, 25 mukerrer, 26 sira): [0 id,1 cins,2 marka,3 model,4 seri,5 maxHam,6 sonDamga,7 yer,8 grup,9 durumHam,10 fatura,11 qrNo,12 max,13 kimeAit,14 bilgi,15 seriFlag,16 sinif,17 excelRow,18 e,19 qrKey,20 tip,21 min,22 d,23 aktif]
function devTuple(r){ return [r.id, r.cins||"", r.marka||"", r.model||"", r.seri_no||"", r.max_cap||"", r.son_damga_yili ? String(r.son_damga_yili) : "", r.kullanim_yeri||"", r.aktif === false ? "kapsamdisi" : (r.durum_grup||"bekliyor"), r.durum_ham||"", r.fatura_notu||"", r.qr_no||("ID"+r.id), r.max_cap||"", r.kime_ait||"", r.bilgi||"", r.seri_flag||"", r.sinif||"III", r.excel_row||"", r.e||"", r.qr_key||"", r.tip||"", r.min_cap||"", r.d||"", r.aktif !== false, null, false, r.sira || null, r.etiket || "", r.etiket_kaynak || "", r.sinif || ""]; }
const PREC = { google: "ok", elle: "ok", saha: "ok", "yaklasik-mah": "mah" };
function buildData(biz, devs, items){
  RAW = { biz, devs, items };
  BY = {}; const all = biz.map(b => { const l = { k: b.id, n: b.unvan || "", a: b.adres || "", i: b.ilce || "", il: b.il || "ANTALYA", t: b.tel || b.gsm || "", lat: b.lat ?? ILCE_C[b.ilce]?.[0] ?? DEPOT.lat, lng: b.lng ?? ILCE_C[b.ilce]?.[1] ?? DEPOT.lng, p: PREC[b.geo_src] || "ilce", src: b.geo_src, dep: !!b.is_depot, g: b.grup || "", no: b.sira || null, d: [], nAll: 0 }; BY[l.k] = l; return l; });
  const itemBy = items ? new Map(items.map(x => [x.device_id, x])) : null;
  DEVS_P = []; DEVBY = {}; DEVID = {};
  devs.forEach(r => { const l = BY[r.business_id]; if (!l) return; const d = devTuple(r); l.nAll++;
    const it = itemBy ? itemBy.get(r.id) : true;
    if (it && it !== true){ if (r.aktif !== false) d[8] = it.durum_grup || "bekliyor"; d[9] = it.durum_ham || ""; d[10] = it.fatura_notu || ""; d[14] = it.bilgi || d[14]; d[17] = it.excel_row || ""; d[24] = it.id; d[25] = !!it.mukerrer; }
    const o = { d, l, inP: !!it }; DEVBY[d[11]] = o; DEVID[d[0]] = o;
    if (it){ l.d.push(d); DEVS_P.push(o); } });
  LOCS_P = all.filter(l => l.d.length || l.dep);
  applyGroupFilter();
}
function applyGroupFilter(){
  const gf = (st.gf || []).filter(g => g === NOGRP || GROUPS.some(x => x.ad === g));
  if (!gf.length){ LOCS = LOCS_P; DEVS = DEVS_P; }
  else { const ok = l => l.dep || gf.includes(l.g || NOGRP); LOCS = LOCS_P.filter(ok); DEVS = DEVS_P.filter(o => ok(o.l)); }
  S = computeSummary();
}
const inPeriod = id => !!DEVID[id]?.inP;
const fatKey = s => String(s || "").toLocaleUpperCase("tr-TR").trim().replace(/\s+/g, " ").replace(/FATURASI KESİLDİ|FATURA KESİDİ|^KESİLDİ$/, "FATURA KESİLDİ").replace(/^CEZA$/, "CEZALI");
// Ödeme durumu: Excel'deki fatura / ödeme notu (Elmaslar listesinde başlıksız Q sütunu) sınıflandırılır
const ODEME = [["bakanlik","Sanayi Bakanlığı","SANAYİ BAKANLIĞI",/BAKANL/],["cezali","Cezalı","CEZALI",/CEZA/],["kesilecek","Fatura Kesilecek","FATURA KESİLECEK",/KES[İI]LECEK|KES[İI]LMED[İI]|KES[İI]LMEYECEK/],
  ["kesildi","Fatura Kesildi","FATURA KESİLDİ",/KES[İI]LD[İI]|KES[İI]D[İI]|^FATURA$|FATURALI/],["eft","EFT / Havale","EFT",/EFT|HAVALE/],["nakit","Nakit","NAKİT",/NAK[İI]T/],
  ["kart","Kredi Kartı","KREDİ KARTI",/KRED[İI]|KART/],["tamir","Tamir","TAMİR",/TAM[İI]R/],["perakende","Perakende","PERAKENDE",/PAREKENDE|PERAKENDE/],["diger","Diğer Not","",/./]];
const ODEME_BY = Object.fromEntries(ODEME.map(x => [x[0], x]));
const odemeCat = s => { const v = fatKey(s); if (!v) return ""; return ODEME.find(x => x[3].test(v))[0]; };
const odemeLab = k => ODEME_BY[k]?.[1] || k;
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
  const oc = cnt(all.filter(o => !o.l.dep), o => odemeCat(o.d[10])); const faturaAll = ODEME.filter(x => oc[x[0]]).map(x => [x[0], oc[x[0]]]);
  const fatura = Object.fromEntries(faturaAll.slice(0, 8));
  const locOpen = new Set(fo.filter(o => ["bekliyor","tekrar"].includes(o.d[8])).map(o => o.l.k));
  return { total: all.length, locs: LOCS.filter(l => !l.dep).length, cust: new Set(LOCS.map(l => tru(l.n))).size,
    cat: Object.assign({ tamam:0,islenecek:0,bekliyor:0,tekrar:0,tutanak:0,cihazyok:0,kapsamdisi:0,baskasi:0 }, cnt(all, o => o.d[8])),
    dep: { n: dep.length, cats: cnt(dep, o => o.d[8]) }, fieldOpenDev: fo.filter(o => open.includes(o.d[8])).length, fieldOpenLocPure: locOpen.size,
    ilce, topOpen, raw, fatura, faturaAll, yil, yilOld: yrs.filter(y => y && y < YEAR - 11).length, yilNA: yrs.filter(y => !y).length,
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
  rp: { view: "musteri", il: "", ilce: "", durum: "", q: "", page: 0 },
  gf: lsGet("damga.grup", []), gfOpen: false, periods: [], noPeriod: false,
  cu: { q: "", il: "", ilce: "", g: "", page: 0, sel: new Set(), scope: "donem" }, imp2: null
};

/* ---------------- store ---------------- */
const planRow = p => { const { id, gid, team, teams, date, staffId, staffName, phone, donem, createdAt, ...data } = p; const r = { id, gid, team, teams, date, staff_id: staffId || null, staff_name: staffName || "", phone: phone || "", data }; if (!st.noPeriod) r.donem = donem || YEAR; return r; };
const planFrom = r => ({ ...(r.data || {}), id: r.id, gid: r.gid, team: r.team, teams: r.teams, date: r.date, staffId: r.staff_id || "", staffName: r.staff_name, phone: r.phone, donem: r.donem || (+String(r.date || "").slice(0, 4) || null), createdAt: r.created_at || null });
const resultFrom = r => ({ planId: r.plan_id, k: r.business_id, st: r.st, done: (r.done || []).map(Number), note: r.note || "", by: r.by, at: r.at });
const eventFrom = r => ({ id: r.id, devId: r.device_id, code: DEVID[r.device_id]?.d[11], type: r.type, year: r.year, e: r.e, reason: r.reason, note: r.note || "", by: r.by, at: r.at });
const staffFrom = r => ({ id: r.id, name: r.ad || r.email || "İsimsiz", phone: r.tel || "", email: r.email || "", rol: r.rol, bolge: r.bolge_id, aktif: r.aktif });
async function loadDynamic(){
  const [plans, results, events, staff, regions, invites, reqs] = await Promise.all([
    q(sb.from("plans").select("*").order("date", { ascending: false }).limit(1000)),
    q(sb.from("results").select("*").limit(5000)),
    q(sb.from("events").select("*").order("at", { ascending: false }).limit(5000)),
    q(sb.from("profiles").select("*").order("ad")),
    q(sb.from("regions").select("*").order("ad")),
    st.isAdmin ? q(sb.from("invites").select("*").order("ad")).catch(() => []) : Promise.resolve([]),
    q(sb.from("device_requests").select("*").order("created_at", { ascending: false }).limit(500)).catch(() => [])]);
  st.plans = plans.map(planFrom).filter(p => !p.donem || p.donem === YEAR);
  st.results = Object.fromEntries(results.map(r => [r.id, resultFrom(r)]));
  st.events = Object.fromEntries(events.map(r => [r.id, eventFrom(r)]));
  st.staff = staff.filter(s => s.aktif !== false).map(staffFrom); st.staffAll = staff.map(staffFrom);
  st.regions = regions; st.invites = invites || []; st.reqs = reqs || [];
}
async function loadItems(){
  try { const it = await fetchAll("period_items", "*", "id", ["donem", YEAR]); st.noPeriod = false; return it; }
  catch(e){ st.noPeriod = true; return null; }   // damga-donem.sql henüz çalıştırılmadı: tüm cihazlar tek liste
}
async function loadMeta(){
  const [per, grp] = await Promise.all([q(sb.rpc("list_periods")).catch(() => []), q(sb.from("customer_groups").select("*").order("ad")).catch(() => [])]);
  st.periods = (per || []).map(p => ({ y: +p.donem, n: +p.cihaz })); GROUPS = grp || [];
}
async function loadAll(){
  const [biz, devs, items] = await Promise.all([fetchAll("businesses"), fetchAll("devices"), loadItems(), loadMeta()]);
  buildData(biz, devs, items); await loadDynamic();
}
async function reloadDevices(){ const [biz, devs, items] = await Promise.all([fetchAll("businesses"), fetchAll("devices"), loadItems(), loadMeta()]); buildData(biz, devs, items); }
async function switchPeriod(y){
  y = +y; if (!y || y === YEAR) return; YEAR = y; lsSet("damga.donem", y);
  st.imp = null; st.imp2 = null; st.sel = []; st.routes = null; st.fieldPlan = null; st.dsel = new Set();
  $("#main").innerHTML = `<div class="card empty" style="max-width:640px;margin:40px auto">${y} dönemi yükleniyor…</div>`;
  try { await loadAll(); } catch(e){ toast("Dönem yüklenemedi: " + e.message); }
  render();
}
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
function gmapsHelp(){ return `<b>Google Haritalar yüklenemedi: anahtar bu adrese izin vermiyor.</b><br>Google Cloud Console → APIs & Services → Credentials → ilgili API anahtarı:<br>
  1) <b>Website restrictions</b> listesinde <code>${esc(location.origin)}/*</code> ve <code>https://www.yahyasogut.com/*</code> olsun (yalnızca /damga/* yeterli değil, alt sayfalar için /* önerilir).<br>
  2) <b>API restrictions</b>: Maps JavaScript API, Geocoding API, Routes API seçili olsun.<br>3) Projede <b>faturalandırma (Billing)</b> açık olsun. Değişiklikten sonra 5 dakika bekleyip sayfayı yenileyin.`; }
function loadGoogle(){
  if (!CFG.GOOGLE_MAPS_KEY) return Promise.reject(new Error("Google anahtarı tanımlı değil"));
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (gmapsP) return gmapsP;
  window.gm_authFailure = () => { st.gmErr = true; const box = document.getElementById("gmap"); const msg = gmapsHelp();
    if (box) box.outerHTML = `<div class="warnbox" style="margin:16px">${msg}</div>`; toast("Google Maps anahtarı bu sayfaya izin vermiyor"); };
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
    ? [["ozet","Yönetici Özeti"],["planla","Rota Planla"],["planlar","Planlar & Ekip"],["musteriler","Müşteriler & Cihazlar"],["raporlar","Raporlar"],["veri","Veri & Ayarlar"]]
    : [["saha","Bugünkü Rotam"],["cihazlar","Cihaz Bul"]];
  if (st.view === "cihazlar" && tabs.some(t => t[0] === "musteriler")) st.view = "musteriler";
  if (st.view !== "cihaz" && !(st.view === "fatura" && st.isAdmin) && !tabs.some(t => t[0] === st.view)) st.view = tabs[0][0];
  syncPath();
  const cur = st.view === "cihaz" ? (tabs.some(t => t[0] === "musteriler") ? "musteriler" : "cihazlar") : st.view === "fatura" ? "ozet" : st.view;
  $("#tabs").innerHTML = tabs.map(t => `<a class="tab" href="${BASE_PATH}${SLUG[t[0]]}/" data-act="view" data-v="${t[0]}" aria-current="${cur===t[0]}">${t[1]}</a>`).join("");
  const nm = st.profile?.ad || st.profile?.email || "";
  $("#who").innerHTML = `${periodPicker()}${groupPicker()}${st.isAdmin ? `<button class="btn sm" data-act="role" title="Görünümü değiştir">${st.role==="admin"?"Saha Görünümü":"Yönetici Görünümü"}</button>` : ""}
    <span class="pill ${st.isAdmin && st.role==="admin"?"admin":""}" title="${esc(st.profile?.email||"")}">${esc(nm.split(" ")[0] || "Hesap")} · ${st.isAdmin ? (st.role==="admin" ? "Yönetici" : "Saha Önizleme") : "Saha"}</span>
    <button class="btn sm" data-act="logout">Çıkış</button>`;
  const v = { ozet: viewSummary, planla: viewPlanner, planlar: viewPlans, saha: viewField, cihazlar: viewDevices, cihaz: viewDevice, veri: viewData, raporlar: viewReports, musteriler: viewCustomers, fatura: viewFatura }[st.view];
  if (!DEVS_P.length && !["veri","musteriler"].includes(st.view)){
    $("#main").innerHTML = st.isAdmin ? viewEmptyPeriod()
      : `<div class="card empty" style="max-width:640px;margin:40px auto">${YEAR} döneminde henüz veri yok. Yöneticiniz dönem listesini yüklediğinde burada görünecek.</div>`;
    return;
  }
  $("#main").innerHTML = (st.view === "ozet" ? reqBanner() : "") + v() + viewHtf() + viewP80() + viewPurge() + viewScan();
  sigRestore();
  if (st.view === "planla") hydratePlanner();
}
/* ---- sayfa adresleri: /damga/ozet/, /damga/rota-planla/ … (her sekmenin kendi adresi; geri/ileri tuşları çalışır) ---- */
const BASE_PATH = (() => { try { return new URL(APP_URL).pathname.replace(/\/?$/, "/"); } catch(_){ return "/damga/"; } })();
const SLUG = { ozet: "ozet", planla: "rota-planla", planlar: "planlar-ekip", cihazlar: "cihazlar", cihaz: "cihazlar", musteriler: "musteriler", raporlar: "raporlar", veri: "veri-ayarlar", saha: "saha", fatura: "fatura" };
function viewFromPath(){ const s = decodeURIComponent(location.pathname.slice(BASE_PATH.length).split("/")[0] || ""); return Object.keys(SLUG).find(v => v !== "cihaz" && SLUG[v] === s) || null; }
function syncPath(){
  if (!st.ready || !SLUG[st.view] || !history.pushState) return;
  const qs = st.view === "fatura" && st.fk ? "?not=" + encodeURIComponent(st.fk) : "";
  const want = BASE_PATH + SLUG[st.view] + "/" + qs, keepHash = ["cihaz","saha"].includes(st.view) ? location.hash : "";
  if (location.pathname + location.search === want) return;
  try { history[st._routed && !st._pop ? "pushState" : "replaceState"](null, "", want + keepHash); } catch(_){}
  st._routed = true;
}
function routeFromPath(){
  const v = viewFromPath(); if (!v) return;
  if (st.isAdmin || ["saha","cihazlar"].includes(v)){ st.view = st.isAdmin && v === "cihazlar" ? "musteriler" : v; if (st.isAdmin && v === "saha") st.role = "saha"; }
  if (v === "fatura"){ st.fk = new URLSearchParams(location.search).get("not") || ""; }
}
window.addEventListener("popstate", () => { if (!st.ready) return; st._pop = true; routeFromPath(); if (!viewFromPath()) st.view = st.isAdmin && st.role === "admin" ? "ozet" : "saha"; render(); st._pop = false; });

/* ---- sağ üst: dönem ve grup seçimi ---- */
function periodList(){ const s = new Set([NOW_Y, NOW_Y + 1, YEAR]); st.periods.forEach(p => s.add(p.y)); return [...s].sort((a, b) => a - b); }
function periodPicker(){
  const n = y => st.periods.find(p => p.y === y)?.n;
  return `<label class="pickr" title="Çalışılan dönem (damga yılı)"><span>Dönem</span><select data-act="donem" aria-label="Dönem">${periodList().map(y => `<option value="${y}" ${y === YEAR ? "selected" : ""}>${y}${n(y) ? "" : " · boş"}</option>`).join("")}</select></label>`;
}
function groupPicker(){
  if (!GROUPS.length || !(st.isAdmin && st.role === "admin")) return "";
  const gf = st.gf || [], lab = !gf.length ? "Tüm Gruplar" : gf.length === 1 ? gf[0] : gf.length + " Grup";
  const opts = GROUPS.map(g => g.ad).concat([NOGRP]);
  return `<div class="gpick"><button class="btn sm ${gf.length ? "on" : ""}" data-act="gfopen" aria-expanded="${st.gfOpen}">Grup: ${esc(lab)} ▾</button>
    ${st.gfOpen ? `<div class="gpop card">${opts.map(g => `<label><input type="checkbox" data-act="gf" value="${esc(g)}" ${gf.includes(g) ? "checked" : ""}> ${esc(g)}</label>`).join("")}
      <div class="row" style="justify-content:space-between;margin-top:6px"><button class="link" data-act="gfclear">Filtreyi kaldır</button><button class="btn sm" data-act="gfopen">Kapat</button></div></div>` : ""}</div>`;
}
function viewEmptyPeriod(){
  const cand = RAW.devs.filter(r => r.aktif !== false && +r.son_damga_yili === YEAR - 2 && !["cihazyok","kapsamdisi"].includes(r.durum_grup)).length;
  return `<div class="card pad stack" style="max-width:680px;margin:40px auto;gap:12px">
    <div class="eyebrow">${YEAR} dönemi</div><h2 style="margin:0">Bu dönemde henüz cihaz yok</h2>
    ${st.noPeriod ? `<div class="warnbox">Dönem yapısı veritabanında kurulu değil. Supabase SQL Editor'de <b>supabase/damga-donem.sql</b> dosyasını çalıştırın.</div>` : `
    <p class="muted" style="margin:0">İki yol var: son damgası ${YEAR - 2} olan cihazlardan dönemi otomatik oluşturun ya da ${YEAR} damga listesini Excel'den içe aktarın.</p>
    <div class="row"><button class="btn primary" data-act="mkperiod" ${cand ? "" : "disabled"}>${YEAR - 2} damgalı ${fmt(cand)} cihazla dönemi oluştur</button>
    <button class="btn" data-act="view" data-v="veri">Excel'den içe aktar</button></div>`}
  </div>`;
}

document.addEventListener("click", e => { if (!e.target.closest(".logo") || !st.ready) return; st.view = st.isAdmin && st.role === "admin" ? "ozet" : "saha"; clearHash(); render(); window.scrollTo(0, 0); });
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
  const fat = S.faturaAll.slice(0, 10).map(([k,n]) => `<tr><td><button class="link rowlink" data-act="fatpage" data-k="${esc(k)}">${esc(odemeLab(k))}</button></td><td class="r"><button class="link" data-act="fatpage" data-k="${esc(k)}">${fmt(n)}</button></td></tr>`).join("")
    + (S.faturaAll.length > 10 ? `<tr><td colspan="2"><button class="link" data-act="fatpage" data-k="">Tüm notlar (${S.faturaAll.length}) →</button></td></tr>` : "");
  const rawRows = S.raw.slice().sort((a,b)=>a.c.localeCompare(b.c)||b.n-a.n).map(r => `<tr><td><span class="st ${r.c}">${CAT[r.c].l}</span></td><td class="mono">${esc(r.v)}</td><td class="r">${r.n}</td></tr>`).join("");
  // live field results
  const rs = Object.values(st.results); const rc = {};
  rs.forEach(r => { rc[r.st] = (rc[r.st]||0) + 1; });
  const live = dailyRoutesHTML() + (rs.length ? `<div class="row" style="margin-top:10px">${Object.entries(rc).map(([k,n]) => `<span class="st ${k==="tamam"?"tamam":"eksik"}">${k==="tamam"?"Tamamlandı":(RL[k]?RL[k][1]:k)} · ${n}</span>`).join("")}</div>`
    : `<p class="muted" style="margin:8px 0 0;font-size:.85rem">Henüz sahadan sonuç gelmedi. Saha çalışanı bir durağı tamamladığında burada görünür ve cihazın damga yılı otomatik güncellenir.</p>`);
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
    <div><div class="eyebrow">${YEAR} periyodik damga programı · canlı veri${(st.gf||[]).length ? " · grup: " + esc(st.gf.join(", ")) : ""}</div>
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
  <section class="grid2" style="align-items:start">
    <div class="stack" style="gap:16px">
      <div class="card pad"><h2>Son damga yılı</h2><p class="muted" style="margin:.2rem 0 0;font-size:.85rem">Cihazların güncel son damga yılı; ${fmt(S.yilNA)} cihazda bilinmiyor.</p><div class="vbars">${vb}</div></div>
      <div class="card pad"><h2 style="margin-bottom:8px">Veri kalitesi</h2>
      <ul style="margin:0;padding-left:1.1rem;display:flex;flex-direction:column;gap:6px;font-size:.9rem">
      <li><b>${q.durumBos}</b> satırda durum boş; ${S.dep.cats.bekliyor||0} tanesi atölye stoku (atölye adresi).</li>
      <li>Durum sütununda <b>${q.durumYazim}</b> farklı yazım var (YAPILDI / tutanak / yok / YOKK…). Sabit seçim listesine geçilmeli.</li>
      <li>Marka sütununda <b>${q.markaVar}</b> yazım var (BİZERBA, BIZERBA, BİZERBAA gibi).</li>
      <li>Seri no: <b>${q.seriYok}</b> cihazda boş, <b>${q.seriTekrar}</b> cihazda tekrar ediyor.</li>
      <li><b>${q.adresKisa}</b> satırda adres 20 karakterden kısa (“KAŞ”, “DEPO”, “BELEK”). “Veri & ayarlar” sekmesinden Google ile konum bulunabilir.</li>
      <li>Q–T sütunlarının başlığı yok (fatura, ödeme şekli, tutar). Başlık verilmeli.</li>
      </ul>
      <div class="row" style="margin-top:12px"><button class="btn primary" data-act="goeditor">Bu verileri düzenle</button><button class="btn sm" data-act="goeditor" data-mode="dupseri">Tekrar eden seri numaraları</button></div></div>
    </div>
    <div class="card pad"><h2 style="margin-bottom:8px">Ödeme durumu</h2><p class="muted" style="margin:0 0 8px;font-size:.85rem">Excel'deki fatura / ödeme notlarından (Q sütunu) sınıflandırıldı; tıklayıp düzenleyebilirsiniz. ${fmt(S.fatura.kesilecek || 0)} cihaz için fatura henüz kesilmemiş.</p>
    <div class="tbl-wrap"><table><tbody>${fat}</tbody></table></div></div>
  </section>`;
}


/* günlük rota özeti: rota tarihine göre planlanan / tamamlanan / eksik / kalan / gün içinde eklenen */
function dailyRoutesHTML(){
  const byDay = new Map();
  st.plans.forEach(p => { const d = String(p.date || "").slice(0, 10); if (!d) return; const x = byDay.get(d) || { d, rota: 0, durak: 0, cihaz: 0, done: 0, doneDev: 0, miss: 0, kalan: 0, yeni: 0, yeniDev: 0 };
    x.rota++; const stops = p.stops || []; x.durak += stops.length;
    const nDev = stops.reduce((s, sp) => s + (sp.dev || []).length, 0); x.cihaz += nDev;
    stops.forEach(sp => { const r = st.results[p.id + "__" + sp.k]; if (!r) x.kalan++; else if (r.st === "tamam"){ x.done++; } else x.miss++; if (r) x.doneDev += (r.done || []).length; });
    if (p.createdAt && String(p.createdAt).slice(0, 10) === d){ const created = new Date(p.createdAt), first = st.plans.filter(q => String(q.date).slice(0, 10) === d && q.createdAt).map(q => +new Date(q.createdAt)).sort((a, b) => a - b)[0];
      if (+created - first > 30 * 60 * 1000){ x.yeni++; x.yeniDev += nDev; } }
    byDay.set(d, x); });
  const days = [...byDay.values()].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 10);
  if (!days.length) return `<p class="muted" style="margin:0;font-size:.85rem">Henüz rota planı yok. Rota planla sekmesinden günlük rota verildiğinde tamamlanan, kalan ve gün içinde eklenen işler burada gün gün görünür.</p>`;
  const today = todayISO(), fd = d => d.split("-").reverse().join(".");
  const tot = days.reduce((a, x) => { Object.keys(x).forEach(k => { if (k !== "d") a[k] = (a[k] || 0) + x[k]; }); return a; }, {});
  const td = 'style="padding:6px 4px"';
  return `<div class="tbl-wrap"><table class="rptbl" style="font-size:.84rem;width:100%"><thead><tr><th ${td}>Gün</th><th class="r" ${td}>Rota</th><th class="r" ${td} title="Durak / cihaz">Durak</th><th class="r" ${td}>Tamam</th><th class="r" ${td}>Eksik</th><th class="r" ${td}>Kalan</th><th class="r" ${td} title="Gün başladıktan sonra (ilk rotadan 30 dk+ sonra) eklenen rotalar">Yeni</th></tr></thead><tbody>
    ${days.map(x => `<tr${x.d === today ? ` style="background:var(--brand-soft)"` : ""}><td class="mono" ${td}>${fd(x.d).slice(0, 5)}${x.d === today ? " <small>bugün</small>" : ""}</td><td class="r" ${td}><b>${x.rota}</b></td><td class="r" ${td}>${x.durak}<small class="muted">/${x.cihaz}</small></td>
      <td class="r" ${td}><b style="color:var(--ok)">${x.done}</b><small class="muted">/${x.doneDev}</small></td><td class="r" ${td}>${x.miss ? `<b style="color:var(--retry)">${x.miss}</b>` : "—"}</td><td class="r" ${td}><b>${x.kalan}</b></td><td class="r" ${td}>${x.yeni ? `${x.yeni}<small class="muted">/${x.yeniDev}</small>` : "—"}</td></tr>`).join("")}
    ${days.length > 1 ? `<tr style="border-top:2px solid var(--line)"><td ${td}><b>Toplam</b></td><td class="r" ${td}><b>${tot.rota}</b></td><td class="r" ${td}>${tot.durak}<small class="muted">/${tot.cihaz}</small></td><td class="r" ${td}><b>${tot.done}</b><small class="muted">/${tot.doneDev}</small></td><td class="r" ${td}>${tot.miss || "—"}</td><td class="r" ${td}><b>${tot.kalan}</b></td><td class="r" ${td}>${tot.yeni || "—"}</td></tr>` : ""}
  </tbody></table></div>
  <p class="muted" style="font-size:.78rem;margin:6px 0 0">Sayılar durak; eğik çizgiden sonrası cihaz. Tamam = durak tamamlandı, eksik = sorun bildirildi, kalan = henüz sonuç yok, yeni = o gün ilk rotadan sonra eklenen rotalar.</p>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="goeditor"]'); if (!b) return;
  const E = edState(); E.open = true; E.ids = null; E.page = 0; E.dupSeri = b.dataset.mode === "dupseri"; st.view = "musteriler"; st.cu.mode = "tablo"; render();
  setTimeout(() => $("#editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
});
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

function renderPlanPanel(){ renderPlanPanel0(); if (st.poolView === "harita") drawRouteLines(); }
function renderPlanPanel0(){
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
      <span class="muted" style="font-size:.85rem">${st.sel.length} durak seçili · başlangıç: Antka atölyesi</span></div>
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
const MCOL = { bekliyor: "#B98000", tekrar: "#D35B22", tutanak: "#11807A", sel: "#D71920" };
async function renderPoolMap(list, sel){
  const box = $("#pool");
  if (!CFG.GOOGLE_MAPS_KEY){ box.innerHTML = `<div class="empty">Harita için config.js dosyasına Google Maps anahtarı eklenmeli.</div>`; return; }
  if (!box.querySelector("#gmap")) box.innerHTML = `<div id="gmap" class="gmap"></div><div class="legend" style="padding:8px 16px 12px"><span style="--c:${MCOL.bekliyor}">Bekliyor</span><span style="--c:${MCOL.tekrar}">Tekrar ziyaret</span><span style="--c:${MCOL.tutanak}">Tutanak</span><span style="--c:${MCOL.sel}">Rotada</span><span class="muted">≈ soluk nokta = yaklaşık konum</span><button class="btn sm" data-act="mapfull" style="margin-left:auto">⤢ Büyük haritada aç</button></div>`;
  let maps; try { maps = await loadGoogle(); } catch(e){ box.innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  const el = $("#gmap"); if (!el) return;
  if (!gmap || gmap.getDiv() !== el) gmap = new maps.Map(el, { center: { lat: DEPOT.lat, lng: DEPOT.lng }, zoom: 11, mapTypeControl: false, streetViewControl: false, fullscreenControl: false });
  gmarkers.forEach(m => m.setMap(null)); gmarkers = [];
  const bounds = new maps.LatLngBounds(); bounds.extend({ lat: DEPOT.lat, lng: DEPOT.lng });
  gmarkers.push(new maps.Marker({ map: gmap, position: { lat: DEPOT.lat, lng: DEPOT.lng }, title: "Atölye", label: { text: "◆", color: "#fff" } }));
  list.forEach(l => { const od = openDevs(l); const c = od.some(d => d[8]==="tekrar") ? "tekrar" : od.some(d => d[8]==="bekliyor") ? "bekliyor" : "tutanak"; const on = sel.has(l.k);
    const m = new maps.Marker({ map: gmap, position: { lat: l.lat, lng: l.lng }, title: `${titleTR(l.n)} · ${od.length} cihaz${l.p!=="ok"?" (yaklaşık konum)":""}`,
      icon: { path: maps.SymbolPath.CIRCLE, scale: on ? 12 : 9, fillColor: on ? MCOL.sel : MCOL[c], fillOpacity: l.p === "ok" ? 1 : .75, strokeColor: on ? "#fff" : "#1b1b2f", strokeWeight: on ? 3 : 1.5 }, zIndex: on ? 500 : 100 });
    m.addListener("click", () => { pickLoc(l.k, !st.sel.find(s => s.k === l.k)); renderPool(true); renderPlanPanel(); });
    gmarkers.push(m); bounds.extend(m.getPosition()); });
  if (list.length && !gmap.__fitted){ gmap.fitBounds(bounds, 40); gmap.__fitted = true; }
  drawRouteLines();
}
/* optimize edilen rotaları haritada çizer: her ekip ayrı renk, duraklar sıra numaralı */
const ROUTE_HEX = ["#D71920","#D35B22","#11807A","#B98000","#1C8A57"];
let groutes = [];
function drawRouteLines(){
  if (!gmap || !window.google?.maps) return; const maps = google.maps;
  groutes.forEach(x => x.setMap(null)); groutes = [];
  (st.routes || []).forEach((r, ti) => { if (!r.keys?.length) return; const col = ROUTE_HEX[ti % ROUTE_HEX.length];
    const pts = [{ lat: DEPOT.lat, lng: DEPOT.lng }, ...r.keys.map(k => BY[k]).filter(Boolean).map(l => ({ lat: l.lat, lng: l.lng }))];
    if (st.cfg.ret) pts.push({ lat: DEPOT.lat, lng: DEPOT.lng });
    groutes.push(new maps.Polyline({ map: gmap, path: pts, geodesic: true, strokeColor: col, strokeOpacity: .85, strokeWeight: 4,
      icons: [{ icon: { path: maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.5, strokeColor: col }, offset: "50%", repeat: "120px" }] }));
    r.keys.forEach((k, i) => { const l = BY[k]; if (!l) return;
      groutes.push(new maps.Marker({ map: gmap, position: { lat: l.lat, lng: l.lng }, zIndex: 1000 + i, title: `${st.routes.length > 1 ? `Ekip ${ti + 1} · ` : ""}${i + 1}. ${titleTR(l.n)}`,
        label: { text: String(i + 1), color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: { path: maps.SymbolPath.CIRCLE, scale: 11, fillColor: col, fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 } })); }); });
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

document.addEventListener("click", e => { const b = e.target.closest('[data-act="mapfull"]'); if (!b) return; const p = $("#pool"); if (!p) return;
  const on = !p.classList.contains("mapfull"); p.classList.toggle("mapfull", on); document.body.classList.toggle("noscroll", on); b.textContent = on ? "✕ Haritayı kapat" : "⤢ Büyük haritada aç";
  if (gmap && window.google?.maps) setTimeout(() => google.maps.event.trigger(gmap, "resize"), 50); });
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; const p = $("#pool"); if (p?.classList.contains("mapfull")) document.querySelector('[data-act="mapfull"]')?.click(); });
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
  const lines = [`*ANTKA KALİBRASYON damga rotası · ${dTR(p.date)}${p.teams>1?` · Ekip ${p.team}/${p.teams}`:""}*`,
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
    ${(() => { const u = p.stops.filter(s => BY[s.k] && BY[s.k].p !== "ok").length; return u ? `<div class="warnbox" style="font-size:.8rem">${u}/${p.stops.length} durağın konumu doğrulanmadı; bu duraklar adresle aranıyor. Göndermeden önce rota linkini açıp kontrol edin. Google bir adresi bulamazsa tüm rota açılmaz; aşağıdan doğrulayın ya da planlayıcıdaki “Konumu sabitle” ile düzeltin. <button class="link" data-act="geoverify" data-p="${esc(p.id)}" style="font-size:.8rem">Bu durakların adresini şimdi doğrula</button></div>` : `<div class="savings" style="font-size:.8rem">Tüm durakların konumu doğrulandı; rota linkleri koordinatla gidiyor.</div>`; })()}
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
      <div class="row" style="gap:6px"><button class="btn sm" data-act="lblfind">📷 Etiket okut · cihaz bul</button>${links.map(l=>`<a class="btn sm" href="${esc(l.url)}" target="_blank" rel="noopener">${l.label} · ${l.range} ↗</a>`).join("")}</div>
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
  <div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">Cihaz sicili · seri numarasıyla takip</div><h2>Cihazlar</h2></div>
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
          <button class="btn sm" data-act="lblfind">📷 Etiket okut</button>
          <button class="btn sm" data-act="applist">Başvuru listesi CSV</button></span></div>
    </div>
    <div class="tbl-wrap"><table class="devtbl"><thead><tr><th></th><th>Firma</th><th>Cihaz</th><th>Seri no</th><th>Etiket</th><th>Max / e / sınıf</th><th class="r">Son</th><th class="r">Sonraki</th><th>Durum</th></tr></thead><tbody>
    ${page.map(o => { const d = o.d, si = stampInfo(o), e = precOf(o);
      return `<tr><td><input type="checkbox" data-act="dpick" data-c="${d[11]}" ${st.dsel.has(d[11])?"checked":""} aria-label="Seç"></td>
        <td style="min-width:180px"><button class="link rowlink" data-act="dev" data-c="${d[11]}">${esc(titleTR(o.l.n))}</button><div class="muted" style="font-size:.76rem"><span class="mono">#${lno(o.l)}·${cno(d)}</span> ${esc(titleTR(o.l.i))}${o.l.g?` · <span class="gtag">${esc(o.l.g)}</span>`:""}</div></td>
        <td>${esc(d[2]||"—")} ${esc(d[3])}<div class="muted" style="font-size:.76rem">${esc(titleTR(d[1]))}</div></td>
        <td class="mono">${esc(d[4]||"—")}${d[15]?` <span class="st tekrar">${d[15]==="seri-yok"?"yok":"tekrar"}</span>`:""}${d[25]?` <span class="dupflag">MÜKERRER</span>`:""}</td>
        <td>${labelBadge(d)}</td><td class="mono">${esc(d[12]||"?")} / ${e?esc(e):"<span class=muted>e ?</span>"} / ${esc(d[29]||"?")}</td>
        <td class="r mono">${si.last||"—"}</td><td class="r mono">${si.next||"—"}</td>
        <td><span class="st ${SCLS[si.s]}">${esc(si.s==="buyil"?`${YEAR} bekliyor`:si.s==="gecikmis"?`${YEAR} bekliyor · gecikmiş`:si.label)}</span></td></tr>`; }).join("")}
    </tbody></table></div>
    ${pages>1?`<div class="row" style="justify-content:center;padding:12px"><button class="btn sm" data-act="dpage" data-p="${st.df.page-1}" ${st.df.page?"":"disabled"}>‹ Önceki</button><span class="mono muted">${st.df.page+1} / ${pages}</span><button class="btn sm" data-act="dpage" data-p="${st.df.page+1}" ${st.df.page<pages-1?"":"disabled"}>Sonraki ›</button></div>`:""}
  </div></div>`;
}

function cardRole(){ if (st.isAdmin) return st.cardAs || "admin"; return st.cardAs === "musteri" ? "musteri" : "saha"; }
function viewDevice(){
  const o = DEVBY[st.devCode];
  if (!o) return `<div class="field card empty">Bu QR koduna ait cihaz bulunamadı (${esc(st.devCode)}). Etiketteki kodu ANTKA KALİBRASYON'a iletin.</div>`;
  const d = o.d, l = o.l, si = stampInfo(o), role = cardRole(), e = precOf(o), evs = devEvents(d[11]);
  const spec = [["Lokasyon / cihaz no", `${lno(l)} / ${cno(d)}`],["Cinsi", titleTR(d[1]) || "—"],["Marka / model", `${d[2]||"—"} ${d[3]}`],["Seri no", d[4] || "Kayıtlı değil"],["Kapasite (Max)", d[12] || "—"],
    ["e (muayene taksimatı)", e || "Girilmedi"],["d (taksimat)", d[22] || "Girilmedi"],["Doğruluk sınıfı", d[29] || "Girilmedi"],["Son damga", si.last || "—"],["Sonraki damga", si.next ? `${si.next} · başvuru Oca–Şub ${si.next}` : "—"]];
  const rr = Object.values(st.results).filter(r => r.done && (BY[r.k]?.d || []).some(x => x[0] === d[0]));
  const hist = [
    ...evs.map(ev => ({ at: ev.at, t: ev.type === "damga" ? `Damgalandı (${ev.year})` : ev.type === "hassasiyet" ? `Hassasiyet: ${ev.e}` : ev.type === "eksik" ? (RL[ev.reason]?.[1] || "Eksik") : /^Etiket: /.test(ev.note || "") ? ev.note : "Not", n: /^Etiket: /.test(ev.note || "") ? "" : ev.note, c: ev.type === "damga" ? "tamam" : ev.type === "eksik" ? "eksik" : "kapsamdisi" })),
    ...rr.map(r => ({ at: r.at, t: r.done.includes(d[0]) ? "Saha rotasında damgalandı" : (RL[r.st]?.[1] || r.st), n: r.note, c: r.done.includes(d[0]) ? "tamam" : "eksik" })),
    { at: "0000", t: `İlk kayıt (Excel): ${d[9] || "durum boş"}`, n: "", c: CAT[d[8]] ? d[8] : "kapsamdisi", xl: 1 }
  ].sort((a, b) => b.at.localeCompare(a.at));
  return `<div class="field stack devcard">
    ${st.isAdmin ? `<div class="row" style="justify-content:space-between"><button class="btn sm" data-act="view" data-v="${st.role === "admin" ? "musteriler" : "cihazlar"}">‹ ${st.role === "admin" ? "Müşteriler & cihazlar" : "Cihazlar"}</button>
      <div class="chips" role="group" aria-label="Görünüm">${[["musteri","Müşteri / denetçi"],["saha","Saha"],["admin","Yönetici"]].map(([k,lab])=>`<button class="chip" data-act="cardas" data-v="${k}" aria-pressed="${role===k}">${lab}</button>`).join("")}</div></div>` : ""}
    <article class="card">
      <div class="dc-head"><div class="mk"></div><div style="min-width:0"><div class="eyebrow">Periyodik muayene kartı · ${esc(d[11])}</div><h2>${esc(titleTR(l.n))}</h2><div class="muted" style="font-size:.88rem">${esc(titleTR(l.i))} · ${esc(titleTR(d[7]||""))}</div></div></div>
      <div class="dc-status s-${si.s}"><b>${esc(si.label)}</b><span>${esc(si.sub)}</span></div>
      <dl class="specgrid">${spec.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${st.isAdmin && role === "admin" && !o.inP && !st.noPeriod ? `<div class="warnbox row" style="margin:0 16px 16px;justify-content:space-between">Bu cihaz ${YEAR} dönem listesinde yok.<button class="btn sm" data-act="addperiod" data-id="${d[0]}">${YEAR} dönemine ekle</button></div>` : ""}
      ${d[25] && role !== "musteri" ? `<div class="warnbox" style="margin:0 16px 16px">Bu kayıt ${YEAR} içe aktarımında <b>mükerrer</b> olarak işaretlendi. Veri & ayarlar → Mükerrer cihazlar bölümünden birleştirin ya da pasife alın.</div>` : ""}
      ${d[15] ? `<div class="warnbox" style="margin:0 16px 16px">${d[15]==="seri-yok"?"Bu cihazın seri numarası kayıtlı değil. Etiket satır numarasıyla üretildi.":"Bu seri numarası listede birden fazla cihazda geçiyor. Kontrol edin."}</div>` : ""}
      <div class="muted" style="font-size:.78rem;padding:0 16px 14px">Kaynak: ${esc(si.src || "—")}</div>
    </article>
    ${role !== "musteri" ? `<article class="card pad stack" style="gap:10px"><h3>Sahada işlem</h3>
      <div class="row"><button class="btn ok" data-act="evdamga" data-c="${d[11]}">✓ ${YEAR} damgası yapıldı</button></div>
      <div class="row" style="justify-content:space-between;align-items:center"><span style="font-size:.88rem">QR etiketi: ${labelBadge(d)}</span>${d[27] ? "" : labelActs(d)}</div>
      <div class="eyebrow">Yapılamadıysa</div>
      <div class="reasons">${REASONS.map(([k,lab])=>`<button class="chip" data-act="evreason" data-v="${k}" aria-pressed="${st.evReason===k}">${lab}</button>`).join("")}</div>
      <textarea id="ev-note" placeholder="Not (örn. cihaz arızalı, yetkili Pazartesi burada)"></textarea>
      <div class="row"><button class="btn warn" data-act="evmiss" data-c="${d[11]}" ${st.evReason?"":"disabled"}>Eksikliği kaydet</button></div>
    </article>
    ${devInfoCard(o, role)}
    <article class="card pad stack" style="gap:8px"><h3>Geçmiş</h3>
      <ol class="hist">${hist.map(h=>`<li><span class="st ${h.c}">${h.xl?"Excel":h.at.slice(0,10).split("-").reverse().join(".")}</span><div><b>${esc(h.t)}</b>${h.n?`<div class="muted" style="font-size:.84rem">${esc(h.n)}</div>`:""}</div></li>`).join("")}</ol></article>` : ""}
    ${role === "admin" ? `<article class="card pad dc-admin">
      <div class="qrbox">${d[28] === "antka" ? `${qrSVG(qrURL(d[11]))}<div class="mono" style="font-size:.75rem;text-align:center">${esc(d[11])}</div>` : `<div class="muted" style="font-size:.8rem;text-align:center;padding:10px">${d[27] ? "Cihazda mevcut etiket var; sistem QR'ı basılmadı." : "Etiket henüz bağlanmadı. Saha ekibi mevcut etiketi okutur ya da yeni QR basar."}</div>`}</div>
      <div class="stack" style="gap:8px;min-width:0"><h3>Yönetici bilgileri</h3>
        <dl class="specgrid spec-sm">${[["Excel satırı", d[17]||"—"],["İlk aktarım durumu", d[9]||"boş"],["Fatura / ödeme notu", d[10]||"—"],["Kime ait", d[13]||"—"],["Bilgi", d[14]||"—"],["Telefon", l.t||"—"],["Adres", titleTR(l.a)],["Sistem kodu", d[11]]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        <div class="row" style="gap:8px;align-items:center">${labelBadge(d)}${d[27] ? `<span class="muted mono" style="font-size:.78rem;word-break:break-all">${esc(d[27].slice(0, 120))}</span><button class="btn sm" data-act="lblunlink" data-id="${d[0]}">Etiket bağını kaldır</button>` : labelActs(d)}</div></div>
    </article>` : ""}
    <p class="muted" style="font-size:.8rem;text-align:center;margin:0">ANTKA KALİBRASYON · Muratpaşa Mah. 567 Sk. Barış Apt. 58/A Muratpaşa/ANTALYA · 0 242 244 0 967 · info@antka.com.tr · Bu kart tartı aletinin periyodik muayene (damga) durumunu gösterir.</p>
  </div>`;
}
function labelDoc(codes){
  const items = codes.map(c => DEVBY[c]).filter(Boolean);
  const lab = o => { const d = o.d, si = stampInfo(o), e = precOf(o), n = titleTR(o.l.n);
    return `<div class="lb"><div class="q">${qrSVG(qrURL(d[11]))}</div><div class="t"><div class="b">ANTKA KALİBRASYON · DAMGA</div>
      <div class="f">${esc(n.length>46?n.slice(0,45)+"…":n)}</div>
      <div>${esc(d[2])} ${esc(d[3])}</div><div>S/N <b>${esc(d[4]||"—")}</b></div>
      <div>Max ${esc(d[12]||"?")} · e ${esc(e||"____")} · Sınıf ${esc(d[16])}</div>
      <div>Son damga <b>${si.last||"—"}</b> · Sonraki <b>${si.next||"—"}</b></div><div class="c">${esc(d[11])}</div></div></div>`; };
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Antka QR etiketleri (${items.length})</title><style>
  @page{size:A4;margin:12mm 7mm}*{box-sizing:border-box}body{margin:0;font:7.2pt/1.25 Arial,Helvetica,sans-serif;color:#000}
  .sheet{display:grid;grid-template-columns:repeat(3,63.5mm);grid-auto-rows:38.1mm;gap:0 2.5mm;justify-content:center}
  .lb{display:flex;gap:2mm;padding:2mm;border:0.2mm dashed #bbb;overflow:hidden;break-inside:avoid}
  .q{width:24mm;flex:none}.q svg{width:24mm;height:24mm;display:block}.t{min-width:0;display:flex;flex-direction:column;gap:.4mm}
  .b{font-weight:700;letter-spacing:.06em;color:#D71920;font-size:6.4pt}.f{font-weight:700;font-size:7.6pt}.c{font-family:monospace;color:#444;margin-top:auto}
  .hint{font:10pt Arial;margin:0 0 4mm;color:#555}@media print{.hint{display:none}.lb{border-color:transparent}}
  </style></head><body><p class="hint">${items.length} etiket · A4, 3×7 (63,5×38,1 mm, L7160 uyumlu). Yazdırırken ölçek %100 seçin.</p><div class="sheet">${items.map(lab).join("")}</div></body></html>`;
}
async function downloadLabels(codes){
  if (!codes.length) return; if (!window.qrcode){ toast("QR kütüphanesi yüklenemedi; sayfayı yenileyin"); return; }
  const html = labelDoc(codes).replace("</body>", "<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body>");
  const w = window.open("", "_blank");
  if (w){ w.document.open(); w.document.write(html); w.document.close(); toast("Etiket sayfası açıldı; yazdırma penceresinde ölçek %100 seçin"); }
  else { downloadFile(`antka-qr-etiket-${codes.length}-${todayISO()}.html`, labelDoc(codes), "text/html;charset=utf-8"); toast("Açılır pencere engellendi; etiket dosyası indirildi"); }
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
        <div class="spec mono">S/N ${esc(d[4]||"—")} · Max ${esc(d[12]||"?")} · e ${esc(precOf({d})||"?")} · Sınıf ${esc(d[16])} · son damga ${esc(d[6]||"—")}${d[7]?` · ${esc(titleTR(d[7]))}`:""}${missBadge(d)}</div>
        <div style="margin-top:4px">${labelActs(d)}</div></div></label>`).join("")}</div>
      ${st.reasonFor === s.k ? `<div class="stack" style="gap:8px"><div class="eyebrow">${allChecked?"Neden yapılamadı?":`${devs.length-dr.done.length} cihaz için neden?`}</div>
        <div class="reasons">${REASONS.filter(r => r[0] !== "adresteyok").map(([k,lab])=>`<button class="chip" data-act="reason" data-k="${s.k}" data-v="${k}" aria-pressed="${dr.reason===k}">${lab}</button>`).join("")}</div>
        <textarea id="note-${s.k}" placeholder="Açıklama (örn. Pazartesi 10:00'da tekrar gel, yetkili Ahmet Bey)">${esc(dr.note)}</textarea>
        <div class="row"><button class="btn primary" data-act="savemiss" data-k="${s.k}" ${dr.reason?"":"disabled"}>Kaydet</button><button class="btn" data-act="cancelmiss" data-k="${s.k}">Vazgeç</button></div></div>`
      : st.reqFor === s.k ? reqForm(s.k)
      : `<div class="big-acts four">${htfPrinted(p.id, s.k) ? `<button class="btn ok" data-act="complete" data-k="${s.k}" ${dr.done.length?"":"disabled"}>${allChecked?"✓ Tamamlandı":`✓ ${dr.done.length}/${devs.length} tamamlandı`}</button>` : `<button class="btn ok" disabled title="Önce Hizmet Talep Formu yazdırılmalı">✓ Tamamlandı <small>(önce form)</small></button>`}
        <button class="btn warn" data-act="quickmiss" data-v="ertelendi" data-k="${s.k}">Ertelendi</button>
        <button class="btn warn" data-act="tutanak" data-k="${s.k}">Adreste yok · tutanak</button>
        <button class="btn" data-act="addreq" data-k="${s.k}">+ Cihaz ekle</button></div>
        <div class="row" style="justify-content:space-between"><button class="btn sm ${htfPrinted(p.id, s.k) ? "" : "primary"}" data-act="htf" data-k="${s.k}">🖨 Hizmet talep formu ${htfPrinted(p.id, s.k) ? "· yazdırıldı ✓" : "oluştur / yazdır"}</button><button class="link" data-act="miss" data-k="${s.k}" style="font-size:.84rem">Diğer neden / kısmi eksik</button></div>`}
      ${reqListFor(s.k)}
      ${r?`<div class="row" style="justify-content:space-between;font-size:.82rem"><span class="muted">Kaydedildi ${new Date(r.at).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}${r.note?` · ${esc(r.note)}`:""}</span>${r.st === "adresteyok" ? `<button class="link" data-act="tutanak" data-k="${s.k}">Tutanağı tekrar yazdır</button> · ` : ""}<button class="link" data-act="undo" data-k="${s.k}">Geri al</button></div>`:""}
      <div class="row" style="gap:8px"><button class="btn sm" data-act="gpsgeo" data-k="${s.k}">📍 Konumu güncelle</button><span class="muted" style="font-size:.78rem">${l.p === "ok" ? "Konum doğrulanmış" : "Konum yaklaşık"} · müşterinin yanındayken telefon konumunu kaydeder</span></div>
      <details><summary style="font-size:.85rem">Koordinatı elle gir</summary><div class="row" style="margin-top:6px"><input id="geo-${s.k}" type="text" placeholder="36.8841, 30.7056 (Google Haritalar'dan kopyalayın)" style="flex:1 1 200px"><button class="btn sm" data-act="savegeo" data-k="${s.k}">Konumu kaydet</button></div></details>
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
  if (["impfile","gf","cusel","cuall","cudall","cugrp","donem","pick","devchk","ddpick","rstaff","mv","dpick","pf","impmap","pasel","duptgt","dupkeep"].includes(a)) return; // change handlers
  if (["optimize","saveplan","up","down","rm","add","newplan"].includes(a)) readCfg();
  switch (a){
    case "view": if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; e.preventDefault(); st.view = b.dataset.v; clearHash(); render(); window.scrollTo(0,0); break;
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
      d.skipped.forEach(s => rows.push([s.row, s.unvan, s.marka, s.seri, "Atlandı · " + s.reason])); d.other.forEach(s => rows.push([s.row, s.unvan, s.marka, s.seri, (st.imp.includeOther ? "Eklendi · " : "Atlandı · ") + s.reason])); d.errors.forEach(s => rows.push([s.row, s.unvan, "", "", s.reason])); (d.noSerial||[]).forEach(s => rows.push([s.row, s.unvan, s.marka, s.seri, (st.imp.includeNoSerial ? "Eklendi · " : "Atlandı · ") + s.reason])); (d.dup||[]).forEach(s => rows.push([s.row, s.unvan, s.marka, s.seri, (st.imp.dupMark ? "Mükerrer olarak eklendi · " : "Mükerrer, kaldırıldı · ") + s.reason]));
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
      if (a === "complete" && !htfPrinted(p.id, k)){ toast("Önce Hizmet Talep Formu yazdırılmalı"); break; }
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
  if (a === "dpick"){ t.checked ? st.dsel.add(t.dataset.c) : st.dsel.delete(t.dataset.c); if (st.view === "musteriler"){ render(); return; } const s = document.querySelector('[data-act="labels"]'); if (s){ s.disabled = !st.dsel.size; s.textContent = `QR etiketlerini indir (${st.dsel.size})`; } return; }
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
  if (t.name === "impdup"){ if (st.imp){ st.imp.dupMark = t.value === "isaretle"; render(); } return; }
  if (a === "impfile" && t.files[0]){ const year = YEAR, kind = t.dataset.kind; st.imp = { name: t.files[0].name, year, kind };
    readImportFile(t.files[0], year, kind).then(d => { st.imp.data = d; render(); setTimeout(() => $("#imp-" + kind)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }).catch(err => { st.imp.err = "Dosya okunamadı: " + err.message; render(); }); return; }
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
  LOCS_P.filter(l => !l.dep).forEach(l => { const r = placeFix(l.il, l.i, l.a);
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
      biz.set(bid, { id: bid, unvan: ad, adres, mahalle: mahOf(adres), ilce, il: pf.il, tel: cellStr(r[C.tel]), lat: c.lat, lng: c.lng, geo_src: c.src, is_depot: /^(ELMASLAR|ANTKA)/.test(TRU(ad)) }); }
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
const BLANK_SERI = new Set(["BILA","BİLA","BİLLA","BILLA","-","--","YOK","0","00","000","YOKTUR","OKUNMUYOR","SİLİK","SILIK","BELİRSİZ","?","X","NULL","N/A","NA",""]);
// seri no gerçek mi: boş/BILA gibi yer tutucular ve rakam içermeyen kısa değerler mükerrer kontrolüne girmez
const realSeri = s => { const v = TRU(s).replace(/\s/g, ""); return v && !BLANK_SERI.has(v) && /\d/.test(v) && v.length >= 3 ? v : ""; };
const seriOf = v => { const x = cellStr(v); return BLANK_SERI.has(TRU(x)) ? "" : x; };
const devKey = (marka, seri) => { const s = TRU(seri).replace(/\s/g, ""); return s && !BLANK_SERI.has(s) ? TRU(marka).replace(/İ/g, "I").replace(/[^A-Z]/g, "") + "|" + s : ""; };
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
function allDevKeys(){ // marka + seri → sistemdeki cihaz (dönemdeki ve aktif olan öncelikli)
  const ex = new Map(); Object.values(DEVID).forEach(o => { if (o.l.dep) return; const k = devKey(o.d[2], o.d[4]); if (!k) return; const c = ex.get(k);
    if (!c || (o.inP && !c.inP) || (o.inP === c.inP && o.d[23] && !c.d[23])) ex.set(k, o); });
  return ex;
}
function splitMatches(data){
  const ex = allDevKeys();
  const ins = [], upd = [];
  data.devs.forEach(d => { const k = devKey(d.marka, d.seri_no); const o = k && ex.get(k);
    if (!o){ ins.push(d); return; }
    const cur = o.inP ? o.d[8] : null, patch = {};
    const item = { durum_grup: cur || "bekliyor", durum_ham: o.inP ? o.d[9] : "", fatura_notu: o.inP ? o.d[10] : "", bilgi: o.inP ? o.d[14] : "", excel_row: d.excel_row || null };
    if (!cur || RANK[d.durum_grup] >= RANK[cur] || (cur !== "tamam" && cur !== "islenecek")){ item.durum_grup = d.durum_grup; item.durum_ham = d.durum_ham; }
    if (d.son_damga_yili && d.son_damga_yili > (+o.d[6] || 0)) patch.son_damga_yili = d.son_damga_yili;
    if (d.bilgi) item.bilgi = d.bilgi; if (d.fatura_notu) item.fatura_notu = d.fatura_notu; if (d.max_cap && !o.d[12]) patch.max_cap = d.max_cap;
    if (st.noPeriod){ if (item.durum_grup !== o.d[8]){ patch.durum_grup = item.durum_grup; patch.durum_ham = item.durum_ham; } if (d.bilgi) patch.bilgi = d.bilgi; if (d.fatura_notu) patch.fatura_notu = d.fatura_notu; }
    upd.push({ id: o.d[0], patch, item, link: !o.inP }); });
  // Aynı mağaza iki listede farklı adla geçebilir: normalize adres aynıysa mevcut lokasyon kullanılır
  const byAddr = new Map(); Object.values(BY).forEach(l => { if (!l.dep) byAddr.set(normAddr(l.a, l.i), l.k); });
  const remap = new Map(); data.biz.forEach(bz => { const k = byAddr.get(normAddr(bz.adres, bz.ilce)); if (k) remap.set(bz.id, k); });
  ins.forEach(d => { if (remap.has(d.business_id)) d.business_id = remap.get(d.business_id); });
  const bizUsed = new Set(ins.map(d => d.business_id));
  return { ...data, devs: ins, upd, biz: data.biz.filter(b => bizUsed.has(b.id)) };
}


/* ---- Esnek içe aktarma: başlıkları tanıyıp sistem alanlarına eşler (şablon, HTF listesi, farklı firmaların Excel'leri) ----
   Kural: sistemde aynı FİRMA + MARKA + SERİ NO varsa satır eklenmez. */
const IMP2ED = [["unvan","unvan"],["il","il"],["ilce","ilce"],["adres","adres"],["tel","tel"],["grup","grup"],["tip","tip"],["cins","cins"],["marka","marka"],["model","model"],["seri","seri_no"],["sinif","sinif"],
  ["max","max_cap"],["min","min_cap"],["e","e"],["d","d"],["son","son_damga_yili"],["yer","kullanim_yeri"],["durum","durum_grup"],["durumac","durum_ham"],["fatura","fatura_notu"],["not","bilgi"]];
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
  ["not","Not",false,["NOT","AÇIKLAMA","YORUM"]],
  ["durum","Durum",false,["DURUM","DURUMU"]],
  ["durumac","Durum açıklaması",false,["DURUMAÇIKLAMA","DURUMAÇIKLAMASI"]],
  ["fatura","Fatura notu",false,["FATURANOTU"]],
  ["cno","Cihaz no (sistem)",false,["CİHAZNO","CİHAZSIRANO"]],
  ["lno","Lokasyon no (sistem)",false,["LOKNO","LOKASYONNO"]],
  ["grup","Müşteri grubu",false,["GRUP","MÜŞTERİGRUBU"]]];
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
  // Kural: müşteri + adres + cihaz (marka) + seri no aynıysa mükerrer. Bu dönemde varsa mükerrer listesine, sistemde olup dönemde yoksa döneme bağlanır.
  const exTriple = new Map(), exPair = allDevKeys();
  Object.values(DEVID).forEach(o => { if (o.l.dep) return; const p = devKey(o.d[2], o.d[4]); if (!p) return; const k = custNorm(o.l.n) + "#" + p, c = exTriple.get(k); if (!c || (o.inP && !c.inP)) exTriple.set(k, o); });
  const locBy = new Map(); Object.values(BY).forEach(l => { if (!l.dep) locBy.set(custNorm(l.n) + "#" + normAddr(l.a, l.i), l.k); });
  const catLab = Object.fromEntries(Object.entries(CAT).map(([k, c]) => [TRU(c.l), k]));
  const biz = new Map(), devs = [], contacts = [], skipped = [], other = [], errors = [], noSerial = [], dup = [], link = [], inFile = new Map(), tkBid = new Map(), edits = [], editList = []; let nRows = 0, unchanged = 0;
  const cnoBy = new Map(); Object.values(DEVID).forEach(o => { if (o.d[26]) cnoBy.set(+o.d[26], o); });
  const req = GFIELDS.filter(f => f[2]).map(f => f[0]);
  G.rows.slice(G.hr + 1).forEach((r, i) => {
    const row = G.hr + i + 2, unvan = v(r, "unvan");
    // Sistemden indirilen listede CİHAZ NO varsa satır o cihazı günceller (değişen alanlar)
    const eo = G.map.cno !== undefined ? cnoBy.get(+v(r, "cno")) : null;
    if (eo){ nRows++; const ch = {};
      IMP2ED.forEach(([ik, ek]) => { if (G.map[ik] === undefined) return; let raw = v(r, ik); if (raw === "") return;
        if (ek === "durum_grup") raw = catLab[TRU(raw)] || statusCat(raw); if (ek === "seri_no") raw = seriOf(raw) || raw;
        const nv = edNorm(ek, raw), cur = edNorm(ek, EDF[ek][4](eo)); if (String(nv ?? "") !== String(cur ?? "")) ch[ek] = raw; });
      if (!eo.inP) link.push({ row, unvan: eo.l.n, marka: eo.d[2], seri: eo.d[4], id: eo.d[0], reason: `Cihaz no ${eo.d[26]} · ${YEAR} dönemine eklenecek`,
        item: { durum_grup: ch.durum_grup || "bekliyor", durum_ham: ch.durum_ham || `${YEAR} listesi (${G.fileName || "Excel"})`, bilgi: ch.bilgi || "", fatura_notu: ch.fatura_notu || "", excel_row: row } });
      if (Object.keys(ch).length){ edits.push([eo.d[0], ch]); editList.push({ row, unvan: eo.l.n, cno: eo.d[26], f: Object.keys(ch).map(k => { const sh = x => k === "durum_grup" ? (CAT[x]?.l || x) : x; return EDF[k][1] + ": " + (sh(EDF[k][4](eo)) || "—") + " → " + sh(ch[k]); }) }); }
      else unchanged++;
      return; }
    if (!unvan && !v(r, "marka") && !v(r, "seri")) return;
    if (/^ÖRNEK/.test(TRU(unvan)) || /ÖRNEK SATIR/.test(TRU(v(r, "not")))) return;
    nRows++;
    const miss = req.filter(k => k === "seri" ? !seriOf(v(r, k)) : !v(r, k)).map(k => GFIELDS.find(f => f[0] === k)[1]);
    const idOnly = miss.length && miss.every(m => m === "Seri no" || m === "Marka");
    if (miss.length && !idOnly){ errors.push({ row, unvan, reason: "Eksik: " + miss.join(", ") }); return; }
    const marka = v(r, "marka"), seri = seriOf(v(r, "seri")), cn = custNorm(unvan);
    const pk = idOnly ? "NOSN|" + row : devKey(marka, seri), tk = cn + "#" + pk;
    const adres = v(r, "adres"), pf = placeFix(v(r, "il"), v(r, "ilce"), adres), ilce = pf.ilce, ilceKey = normIlce(v(r, "ilce")), kod = v(r, "kod"), sube = v(r, "sube");
    const durumHam = v(r, "durum"), durumCat = durumHam ? (catLab[TRU(durumHam)] || statusCat(durumHam)) : null;
    const ex = !idOnly && exTriple.get(tk);
    if (ex){ const sameAddr = normAddr(ex.l.a, ex.l.i) === normAddr(adres, ilce);
      const why = (sameAddr ? "Müşteri + adres + cihaz + seri aynı" : "Müşteri + cihaz + seri aynı, adres farklı yazılmış") + ` (${ex.d[11]})`;
      if (ex.inP){ dup.push({ row, unvan, marka, seri, reason: `${YEAR} döneminde kayıtlı · ${why}`, bid: ex.l.k, r, inP: true }); return; }
      link.push({ row, unvan, marka, seri, id: ex.d[0], reason: `Sistemde var, ${YEAR} dönemine eklenecek · ${why}`,
        item: { durum_grup: durumCat || "bekliyor", durum_ham: durumHam || `${YEAR} listesi (${G.fileName || "Excel"})`, bilgi: v(r, "not"), fatura_notu: "", excel_row: row } }); return; }
    if (!idOnly && inFile.has(tk)){ dup.push({ row, unvan, marka, seri, reason: `Dosyada tekrar eden satır (ilk: ${inFile.get(tk)}. satır)`, r, inFile: true }); return; }
    if (!idOnly) inFile.set(tk, row);
    const name = unvan + (kod ? " · " + kod : "") + (sube && TRU(sube) !== TRU(unvan) ? " · " + sube : "");
    const reuse = locBy.get(cn + "#" + normAddr(adres, ilce));
    const bid = reuse || ("b" + hkey(TRU(name) + "|" + TRU(adres) + "|" + ilceKey));
    if (!idOnly) tkBid.set(tk, bid);
    const sonY = +v(r, "son"); const son = sonY >= 1990 && sonY <= YEAR + 1 ? sonY : null; const valid = son && son + 2 > YEAR;
    const sin = TRU(v(r, "sinif")).replace(/[^IV3]/g, "").replace(/^3$/, "III");
    const dev = { import_key: hkey("G|" + tk), business_id: bid, tip: v(r, "tip") || "Otomatik olmayan tartı aleti", cins: v(r, "cins") === "NAWI" ? "Otomatik olmayan tartı aleti" : (v(r, "cins") || "Terazi"),
      marka, model: v(r, "model"), seri_no: seri, seri_flag: "", sinif: sin || "III", max_cap: normCap(v(r, "max")), min_cap: v(r, "min"), e: v(r, "e"), d: v(r, "d"),
      uretim_yili: +v(r, "uretim") || null, son_damga_yili: son, durum_grup: durumCat || (valid ? "tamam" : "bekliyor"),
      durum_ham: durumHam || (`Yeni kayıt (${G.fileName || "Excel"})` + (valid ? " · damga geçerli" : son ? ` · son damga ${son}` : "")), bilgi: v(r, "not"), kullanim_yeri: v(r, "yer"), excel_row: row };
    if (idOnly){ dev.seri_flag = "seri-yok"; dev.import_key = hkey("GN|" + cn + "|" + TRU(adres) + "|" + row + "|" + (G.fileName || "")); noSerial.push({ row, unvan, marka, seri: v(r, "seri"), reason: "Eksik: " + miss.join(", ") + " · mükerrer kontrolü yapılamaz", dev }); }
    else if (exPair.has(pk)){ const o = exPair.get(pk); other.push({ row, unvan, marka, seri, reason: `Aynı marka + seri “${titleTR(o.l.n)}” firmasında kayıtlı (devir olabilir)`, dev, bid, b: { name, adres, ilce, r } }); }
    else devs.push(dev);
    if (!reuse && !biz.has(bid)){ const c = approxCoord(ilce, mahOf(adres), bid);
      const bz = { id: bid, unvan: name, sube, adres, mahalle: mahOf(adres), ilce, il: pf.il, tel: fmtTel(v(r, "tel")), vkn: v(r, "vkn"), lat: c.lat, lng: c.lng, geo_src: c.src, is_depot: false };
      const gr = TRU(v(r, "grup")); if (gr) bz.grup = gr; biz.set(bid, bz);
      if (v(r, "yetkili") || v(r, "ycep")) contacts.push({ business_id: bid, ad: v(r, "yetkili"), tel: fmtTel(v(r, "ycep")) }); }
  });
  // "Ekle ve mükerrer işaretle" seçilirse eklenecek kopyalar
  dup.forEach(x => { const r = x.r; const bid = x.bid || tkBid.get(custNorm(x.unvan) + "#" + devKey(x.marka, x.seri));
    x.dev = { import_key: hkey("GD|" + custNorm(x.unvan) + "|" + devKey(x.marka, x.seri) + "|" + x.row + "|" + (G.fileName || "") + "|" + YEAR), business_id: bid,
      tip: v(r, "tip") || "Otomatik olmayan tartı aleti", cins: v(r, "cins") || "Terazi", marka: x.marka, model: v(r, "model"), seri_no: x.seri, seri_flag: "seri-tekrar",
      sinif: TRU(v(r, "sinif")).replace(/[^IV3]/g, "").replace(/^3$/, "III") || "III", max_cap: normCap(v(r, "max")), min_cap: v(r, "min"), e: v(r, "e"), d: v(r, "d"),
      durum_grup: "bekliyor", durum_ham: "Mükerrer kayıt · " + x.reason, bilgi: v(r, "not"), kullanim_yeri: v(r, "yer"), excel_row: x.row }; delete x.r; });
  const cats = devs.reduce((m, d) => (m[d.durum_grup] = (m[d.durum_grup] || 0) + 1, m), {});
  const used = new Set(devs.map(x => x.business_id));
  return { biz: [...biz.values()].filter(b => used.has(b.id)), bizAll: [...biz.values()], devs, contacts, skipped, other, errors, noSerial, dup, link, edits, editList, unchanged, cats, rows: nRows, upd: [],
    format: G.map.cno !== undefined ? "Sistemden indirilen dönem listesi (CİHAZ NO ile güncelleme)" : G.sheet === "Cihazlar" && G.head.some(h => /FİRMA ÜNVANI/.test(TRU(h))) ? "Yeni müşteri şablonu" : `Yeni müşteri listesi (“${G.sheet}” sayfası, ${G.hr + 1}. satır başlık)`, template: true, G };
}
function isElmaslarList(wb){ const ws = wb.Sheets[wb.SheetNames[0]]; const h = (XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 })[0] || []).map(TRU); return h.some(x => x.startsWith("MÜŞTERİ ADI")) && h.includes("DURUMU"); }

let xlsxP = null;
function loadXLSX(){ if (window.XLSX) return Promise.resolve(); if (xlsxP) return xlsxP;
  xlsxP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload = res; s.onerror = () => { xlsxP = null; rej(new Error("Excel okuyucu yüklenemedi")); }; document.head.appendChild(s); });
  return xlsxP; }
async function readImportFile(file, listYear, kind){
  await loadXLSX(); const buf = await file.arrayBuffer(); const wb = XLSX.read(buf, { type: "array" });
  if (kind === "yeni"){ const G = prepGeneric(wb); G.fileName = file.name; return parseGeneric(G, listYear); }
  if (isMigrosFormat(wb)) return splitMatches(parseMigros(wb, listYear));
  if (isElmaslarList(wb)) return splitMatches({ ...parseWorkbook(wb, listYear), format: "Damga listesi (Excel)" });
  const G = prepGeneric(wb); G.fileName = file.name; return parseGeneric(G, listYear);
}
async function runImport(){
  const P = st.imp; if (!P || !P.data || P.busy) return; P.busy = true; P.log = []; render();
  const step = (m) => { P.log.push(m); const el = $("#implog-" + P.kind); if (el) el.textContent = P.log.join("\n"); };
  try {
    const DUP = P.data.template && P.dupMark ? (P.data.dup || []).map(x => x.dev) : [], muk = new Set(DUP.map(x => x.import_key));
    const D = P.data.devs.concat(P.data.template && P.includeOther ? (P.data.other || []).map(x => x.dev) : [], P.data.template && P.includeNoSerial ? (P.data.noSerial || []).map(x => x.dev) : [], DUP);
    const usedB = new Set(D.map(x => x.business_id)); const B = (P.data.bizAll || P.data.biz).filter(b => !P.data.template || usedB.has(b.id));
    if (P.data.contacts) P.data.contacts = P.data.contacts.filter(c => usedB.has(c.business_id));
    for (let i = 0; i < B.length; i += 500){ await q(sb.from("businesses").upsert(B.slice(i, i + 500), { onConflict: "id", ignoreDuplicates: true })); step(`İşletmeler: ${Math.min(i + 500, B.length)} / ${B.length}`); }
    if ((P.data.contacts || []).length){ try { await q(sb.from("contacts").insert(P.data.contacts)); step(`Yetkili kişi: ${P.data.contacts.length}`); } catch(e){ step("Yetkili kişiler eklenemedi: " + e.message); } }
    for (let i = 0; i < D.length; i += 500){ await q(sb.from("devices").upsert(D.slice(i, i + 500), { onConflict: "import_key", ignoreDuplicates: true })); step(`Cihazlar: ${Math.min(i + 500, D.length)} / ${D.length}`); }
    const U = P.data.upd || []; let done = 0;
    if (!st.noPeriod){
      const idBy = new Map(), keys = D.map(x => x.import_key);
      for (let i = 0; i < keys.length; i += 200){ (await q(sb.from("devices").select("id,import_key").in("import_key", keys.slice(i, i + 200)))).forEach(r => idBy.set(r.import_key, r.id)); }
      const kay = (P.name || "Excel").slice(0, 120), IT = new Map();
      const put = (id, x, m) => { if (id && !IT.has(id)) IT.set(id, { donem: YEAR, device_id: id, durum_grup: x.durum_grup || "bekliyor", durum_ham: x.durum_ham || "", fatura_notu: x.fatura_notu || "", bilgi: x.bilgi || "", excel_row: x.excel_row || null, mukerrer: !!m, kaynak: kay }); };
      U.forEach(u => put(u.id, u.item || {}));
      (P.data.link || []).forEach(l => put(l.id, l.item));
      D.forEach(x => { const id = idBy.get(x.import_key); if (id && !inPeriod(id)) put(id, x, muk.has(x.import_key)); });
      const items = [...IT.values()];
      for (let i = 0; i < items.length; i += 500){ await q(sb.from("period_items").upsert(items.slice(i, i + 500), { onConflict: "donem,device_id" })); step(`${YEAR} dönem listesi: ${Math.min(i + 500, items.length)} / ${items.length}`); }
    }
    for (let i = 0; i < U.length; i += 8){ await Promise.all(U.slice(i, i + 8).filter(u => Object.keys(u.patch).length).map(u => q(sb.from("devices").update(u.patch).eq("id", u.id)))); done = Math.min(i + 8, U.length); if (done % 80 === 0 || done === U.length) step(`Mevcut cihaz güncellendi: ${done} / ${U.length}`); }
    if ((P.data.edits || []).length){ const r = await saveEdits(new Map(P.data.edits), step); step(`Güncellenen: ${r.dev} cihaz, ${r.biz} lokasyon, ${r.item} dönem satırı${r.fail ? ` · ${r.fail} hata` : ""}`); }
    const n = await q(sb.rpc("assign_qr_numbers")); step(`QR numarası verilen yeni cihaz: ${n}`);
    await reloadDevices(); step("Tamamlandı. Veriler yenilendi."); P.done = true; toast("İçe aktarma tamamlandı");
  } catch(e){ step("Hata: " + (e.message || e)); toast("İçe aktarma durdu: " + (e.message || e)); }
  P.busy = false; render();
}
/* ---- toplu adres doğrulama (Google Geocoding) + bulunamayanların düzeltilmesi ---- */
async function geocodeOne(gc, l, addr){
  const qs = addr ? [addr] : [`${l.a}, ${titleTR(l.i)}, ${titleTR(l.il || "ANTALYA")}, Türkiye`, normAddr(l.a, l.i)];
  let last = "Adres bulunamadı";
  for (const address of qs){
    for (let tries = 0; tries < 3; tries++){
      try { const out = await gc.geocode({ address, region: "tr", componentRestrictions: { country: "TR" } }); const res = out.results?.[0]; if (!res){ last = "Adres bulunamadı"; break; }
        const loc = res.geometry.location, lat = loc.lat(), lng = loc.lng(), type = res.geometry.location_type;
        const inTR = lat > 35.7 && lat < 42.2 && lng > 25.6 && lng < 44.9;
        const admin = (res.address_components || []).find(c => c.types.includes("administrative_area_level_1"))?.long_name || "";
        const ilOk = !l.il || !admin || FOLD(admin).includes(FOLD(l.il)) || FOLD(l.il).includes(FOLD(admin));
        if (!inTR || !ilOk){ last = `Bulunan yer ${admin || "il dışı"}`; break; }
        if (type === "APPROXIMATE" && !res.types?.some(x => ["establishment","premise","street_address","route"].includes(x))){ last = "Yalnızca yaklaşık (mahalle/ilçe) bulundu"; break; }
        return { lat: +lat.toFixed(6), lng: +lng.toFixed(6), fa: res.formatted_address };
      } catch(e){ const c = String(e.code || e.message || e); if (c.includes("OVER_QUERY_LIMIT")){ await new Promise(r => setTimeout(r, 2000)); continue; }
        if (c.includes("REQUEST_DENIED")) throw new Error("REQUEST_DENIED"); last = c; break; }
    }
  }
  return { err: last };
}
async function runGeocode(){
  if (st.geoRun?.busy) { st.geoRun.stop = true; return; }
  let maps; try { maps = await loadGoogle(); } catch(e){ toast(e.message); return; }
  const gc = new maps.Geocoder(); const todo = LOCS_P.filter(l => !l.dep && l.p !== "ok");
  st.geoRun = { busy: true, stop: false, done: 0, ok: 0, miss: 0, total: todo.length }; st.geoFail = {}; render();
  const upd = () => { const el = $("#geoprog"); if (el) el.textContent = `${st.geoRun.done} / ${st.geoRun.total} · bulunan ${st.geoRun.ok} · bulunamayan ${st.geoRun.miss}`; };
  for (const l of todo){
    if (st.geoRun.stop || st.gmErr) break;
    let r; try { r = await geocodeOne(gc, l); } catch(e){ st.geoRun.denied = true; break; }
    st.geoRun.done++;
    if (r.lat){ try { await saveGeo(l.k, r.lat, r.lng, "google"); st.geoRun.ok++; } catch(e){ st.geoRun.miss++; st.geoFail[l.k] = "Kaydedilemedi: " + e.message; } }
    else { st.geoRun.miss++; st.geoFail[l.k] = r.err; }
    upd(); await new Promise(r => setTimeout(r, 120));
  }
  st.geoRun.busy = false; S = computeSummary(); render();
  toast(st.geoRun.denied || st.gmErr ? "Google anahtarı adres aramaya izin vermiyor (ayrıntı Konumlar kartında)" : `Konum bulma bitti: ${st.geoRun.ok} doğrulandı, ${st.geoRun.miss} düzeltme bekliyor`);
}
function viewGeoFix(){
  const all = LOCS_P.filter(l => !l.dep && l.p !== "ok"), F = st.geoFail || {}, E = st.geoEditQ || "";
  const list = all.filter(l => !E || TRU(l.n + " " + l.a + " " + l.i).includes(TRU(E))).sort((a, b) => (F[b.k] ? 1 : 0) - (F[a.k] ? 1 : 0) || a.i.localeCompare(b.i, "tr") || a.n.localeCompare(b.n, "tr"));
  const pg = st.geoPage || 0, N = 25, pages = Math.max(1, Math.ceil(list.length / N)), rows = list.slice(pg * N, pg * N + N);
  if (!all.length) return `<div class="muted" style="font-size:.88rem">Tüm lokasyonların konumu doğrulanmış.</div>`;
  return `<details ${Object.keys(F).length ? "open" : ""}><summary><b>Doğrulanmamış konumlar (${fmt(all.length)})</b>${Object.keys(F).length ? ` · ${fmt(Object.keys(F).length)} tanesi bulunamadı` : ""} · adresi düzeltip tekrar arayın ya da koordinatı yapıştırın</summary>
    <div class="row" style="margin:8px 0"><input id="geo-q" type="search" placeholder="Firma, adres, ilçe ara" value="${esc(E)}" style="flex:1 1 240px"></div>
    <div class="tbl-wrap"><table class="rptbl" style="font-size:.84rem"><thead><tr><th class="num">Lok.</th><th>Firma / ilçe</th><th>Adres (düzenlenebilir)</th><th>Koordinat ya da Google Maps linki</th><th></th></tr></thead><tbody>
      ${rows.map(l => `<tr><td class="mono num">${lno(l)}</td><td style="white-space:normal;min-width:160px"><b>${esc(titleTR(l.n))}</b><div class="muted">${esc(titleTR(l.i))} / ${esc(titleTR(l.il))}${F[l.k] ? ` · <span style="color:var(--retry)">${esc(F[l.k])}</span>` : ` · ${l.p === "mah" ? "≈ mahalle" : "≈ ilçe"}`}</div></td>
        <td><input id="ga-${esc(l.k)}" value="${esc(l.a)}" style="min-width:260px;width:100%"></td>
        <td><input id="gc-${esc(l.k)}" placeholder="36.88, 30.70 veya maps linki" style="width:200px"></td>
        <td style="white-space:nowrap"><button class="btn sm" data-act="georetry" data-k="${esc(l.k)}">Adresi ara</button> <button class="btn sm primary" data-act="geopin" data-k="${esc(l.k)}">Koordinatı kaydet</button>
          <a class="link" style="font-size:.8rem" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.a + ", " + titleTR(l.i) + ", " + titleTR(l.il))}">Haritada aç ↗</a></td></tr>`).join("")}
    </tbody></table></div>
    ${pages > 1 ? `<div class="row"><button class="btn sm" data-act="geopage" data-p="${pg - 1}" ${pg ? "" : "disabled"}>‹ Önceki</button><span class="muted">${pg + 1} / ${pages}</span><button class="btn sm" data-act="geopage" data-p="${pg + 1}" ${pg + 1 < pages ? "" : "disabled"}>Sonraki ›</button></div>` : ""}
  </details>`;
}
function parseCoord(s){ s = String(s || "").trim(); let m = s.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || s.match(/^(-?\d+[.,]\d+)\s*[,; ]\s*(-?\d+[.,]\d+)$/);
  if (!m) return null; const la = +String(m[1]).replace(",", "."), lo = +String(m[2]).replace(",", "."); return la > 35.7 && la < 42.2 && lo > 25.6 && lo < 44.9 ? [la, lo] : null; }
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "geoverify"){ // paylaşım kartındaki doğrulanmamış durakları arar
    const p = st.plans.find(x => x.id === b.dataset.p); if (!p) return;
    let maps; try { maps = await loadGoogle(); } catch(err){ toast(err.message); return; } const gc = new maps.Geocoder(); let ok = 0, miss = 0; b.disabled = true; b.textContent = "Doğrulanıyor…";
    for (const s of p.stops){ const l = BY[s.k]; if (!l || l.p === "ok") continue; let r; try { r = await geocodeOne(gc, l); } catch(err){ toast("Google anahtarı adres aramaya izin vermiyor"); break; }
      if (r.lat){ try { await saveGeo(l.k, r.lat, r.lng, "google"); ok++; } catch(_){ miss++; } } else { miss++; st.geoFail = st.geoFail || {}; st.geoFail[l.k] = r.err; } }
    S = computeSummary(); render(); toast(`${ok} durak doğrulandı${miss ? `, ${miss} bulunamadı (Veri & ayarlar → Konumlar'dan düzeltin)` : ""}`); }
  if (a === "geopage"){ st.geoPage = +b.dataset.p; render(); }
  if (a === "geopin"){ const k = b.dataset.k, c = parseCoord($("#gc-" + CSS.escape(k))?.value); if (!c){ toast("Koordinat ya da Google Maps linki tanınamadı"); return; }
    try { await saveGeo(k, c[0], c[1], "elle"); if (st.geoFail) delete st.geoFail[k]; S = computeSummary(); render(); toast("Konum kaydedildi"); } catch(err){ toast("Kaydedilemedi: " + err.message); } }
  if (a === "georetry"){ const k = b.dataset.k, l = BY[k], na = ($("#ga-" + CSS.escape(k))?.value || "").trim(); if (!l || !na) return; b.disabled = true;
    try { if (na !== l.a){ await q(sb.from("businesses").update({ adres: na }).eq("id", k)); l.a = na; const rb = RAW.biz.find(x => x.id === k); if (rb) rb.adres = na; }
      const maps = await loadGoogle(); const r = await geocodeOne(new maps.Geocoder(), l, `${na}, ${titleTR(l.i)}, ${titleTR(l.il)}, Türkiye`);
      if (r.lat){ await saveGeo(k, r.lat, r.lng, "google"); if (st.geoFail) delete st.geoFail[k]; S = computeSummary(); render(); toast("Bulundu: " + (r.fa || "")); }
      else { st.geoFail = st.geoFail || {}; st.geoFail[k] = r.err; render(); toast("Bulunamadı: " + r.err); } }
    catch(err){ b.disabled = false; toast(err.message === "REQUEST_DENIED" ? "Google anahtarı adres aramaya izin vermiyor" : "Aranamadı: " + err.message); } }
});
document.addEventListener("input", e => { if (e.target.id !== "geo-q") return; st.geoEditQ = e.target.value; st.geoPage = 0; clearTimeout(cfgT); cfgT = setTimeout(() => { const pos = e.target.selectionStart; render(); const n = $("#geo-q"); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(_){} } }, 300); });
function impCard(kind){
  const P = st.imp && st.imp.kind === kind ? st.imp : {}; const d = P.data;
  return `  <div class="card pad stack" style="gap:10px" id="imp-${kind}">${kind === "donem" ? `<h3>${YEAR} dönem listesini içe aktar</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Damga listesi (Excel), Migros/YMS “kalanlar” listesi ya da bu ekrandan indirilen dönem Excel'i (.xlsx). Biçim otomatik tanınır. Sistemde olan cihazlar (marka + seri no) yeni kayıt açılmadan ${YEAR} dönemine eklenir ve durumu güncellenir; konumlar ve QR numaraları korunur. ${YEAR} döneminde şu an ${fmt(DEVS_P.length)} cihaz, ${fmt(LOCS_P.length)} lokasyon var.</p>` : `<h3>Yeni müşteri ekle (toplu) · ${YEAR}</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Müşteriden gelen toplu listeyi yükleyin; sütunlar sistem alanlarıyla eşlenir ve kayıtlar ${YEAR} dönem listesinin altına eklenir. <b>Müşteri + adres + cihaz (marka) + seri no</b> aynıysa satır mükerrer sayılır.</p>
    <div class="row" style="font-size:.88rem"><a class="btn sm" href="antka-yeni-musteri-sablonu.xlsx" download>Yeni müşteri şablonunu indir (.xlsx)</a><span class="muted">Farklı biçimdeki Excel'ler de kabul edilir; başlıklar otomatik eşlenir.</span></div>`}
    <div class="row"><input id="impfile-${kind}" data-act="impfile" data-kind="${kind}" type="file" accept=".xlsx,.xls"><span class="pill admin">Hedef dönem: ${YEAR}</span></div>
    ${kind === "donem" ? `<div class="row" style="font-size:.88rem"><button class="btn sm" data-act="ptemplate">Dönem şablonunu indir (.xlsx)</button><button class="btn sm" data-act="pexport" ${DEVS.length ? "" : "disabled"}>Mevcut ${YEAR} verisini indir (.xlsx · ${fmt(DEVS.filter(o => !o.l.dep).length)} cihaz)</button>
      <span class="muted">İndirdiğiniz listeyi Excel'de düzenleyip buraya geri yükleyin: <b>CİHAZ NO</b> sütunu olan satırlar o cihazı günceller, numarasız satırlar yeni kayıt olur.</span></div>` : ""}
    ${d ? `<div class="muted" style="font-size:.86rem">Biçim: <b>${esc(d.format||"")}</b>. ${d.upd?.length ? `${fmt(d.upd.length)} cihaz sistemde zaten var (marka + seri no); yeni kayıt açılmadan durumları güncellenecek.` : ""}</div>
      <div class="metrics"><div><b>${fmt(d.rows)}</b><span>satır</span></div><div><b>${fmt(d.biz.length)}</b><span>yeni lokasyon</span></div><div><b>${fmt(d.devs.length)}</b><span>yeni cihaz</span></div><div><b>${fmt((d.upd||[]).filter(u => !u.link).length)}</b><span>güncellenecek</span></div><div><b>${fmt((d.upd||[]).filter(u => u.link).length + (d.link||[]).length)}</b><span>${YEAR} dönemine bağlanacak</span></div>${(d.dup||[]).length ? `<div><b>${fmt(d.dup.length)}</b><span>mükerrer</span></div>` : ""}${d.edits ? (d.edits.length || d.unchanged ? `<div><b>${fmt(d.edits.length)}</b><span>cihazda değişiklik</span></div><div><b>${fmt(d.unchanged)}</b><span>değişmedi</span></div>` : "") : ""}
      ${Object.entries(d.cats).map(([k,n]) => `<div><b>${fmt(n)}</b><span>${CAT[k]?.l || k}</span></div>`).join("")}<div><b>${fmt(d.devs.filter(x=>x.seri_flag).length)}</b><span>seri no sorunlu</span></div></div>
      <div class="row"><button class="btn primary" data-act="impgo" ${P.busy||P.done?"disabled":""}>${P.busy ? "Aktarılıyor…" : P.done ? "Aktarıldı" : `${YEAR} dönemine aktar (${fmt(d.devs.length + (P.dupMark ? (d.dup||[]).length : 0))} yeni, ${fmt((d.upd?.length||0) + (d.link||[]).length)} mevcut${(d.edits||[]).length ? `, ${fmt(d.edits.length)} düzeltme` : ""})`}</button><span class="muted" style="font-size:.84rem">${esc(P.name||"")}</span></div>` : ""}
    ${d && d.G ? `<details ${d.errors.length > d.rows / 3 ? "open" : ""}><summary>Sütun eşleştirme (${Object.keys(d.G.map).length} alan tanındı) · yanlışsa buradan düzeltin</summary>
      <div class="mapgrid">${GFIELDS.map(([k, lab, rq]) => `<label class="f">${esc(lab)}${rq ? " *" : ""}<select data-act="impmap" data-k="${k}"><option value="">—</option>${d.G.head.map((h, i) => h ? `<option value="${i}" ${d.G.map[k] === i ? "selected" : ""}>${esc(h)}</option>` : "").join("")}</select></label>`).join("")}</div></details>` : ""}
    ${d && d.template ? `<div class="stack" style="gap:8px">
      ${(d.dup||[]).length ? `<div class="card pad stack" style="gap:8px;border-color:var(--retry)"><b>${fmt(d.dup.length)} mükerrer satır</b> <span class="muted" style="font-size:.86rem">Müşteri + adres + cihaz + seri no ${YEAR} döneminde zaten kayıtlı ya da dosyada birden fazla geçiyor.</span>
        <div class="row" style="font-size:.9rem"><label class="row" style="gap:6px"><input type="radio" name="impdup" value="kaldir" ${P.dupMark ? "" : "checked"}> <b>Yinelenenleri kaldır</b> (eklenmez)</label>
          <label class="row" style="gap:6px"><input type="radio" name="impdup" value="isaretle" ${P.dupMark ? "checked" : ""}> <b>Ekle ve mükerrer olarak işaretle</b></label></div>
        <details><summary>Listeyi göster</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.dup.slice(0,300).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan))}</td><td>${esc(s.marka)}</td><td class="mono">${esc(s.seri)}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div></details></div>` : ""}
      ${(d.editList||[]).length ? `<details open><summary>${fmt(d.editList.length)} cihazda değişiklik uygulanacak (CİHAZ NO ile eşleşti)</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.editList.slice(0,300).map(s => `<tr><td class="mono">${s.row}</td><td class="mono">#${s.cno}</td><td>${esc(titleTR(s.unvan))}</td><td class="muted" style="white-space:normal">${s.f.map(esc).join("<br>")}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
      ${(d.link||[]).length ? `<details><summary>${fmt(d.link.length)} cihaz sistemde kayıtlı; yeni kayıt açılmadan ${YEAR} dönemine eklenecek</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.link.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan))}</td><td>${esc(s.marka)}</td><td class="mono">${esc(s.seri)}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
      ${d.skipped.length ? `<details><summary>${fmt(d.skipped.length)} satır atlanacak (aynı firma + marka + seri no zaten var)</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.skipped.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan))}</td><td>${esc(s.marka)}</td><td class="mono">${esc(s.seri)}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
      ${d.other.length ? `<details open><summary>${fmt(d.other.length)} cihazın marka + seri numarası başka firmada kayıtlı</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.other.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan))}</td><td>${esc(s.marka)}</td><td class="mono">${esc(s.seri)}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div>
        <label class="row" style="font-size:.86rem;margin-top:6px"><input id="impother" type="checkbox" ${P.includeOther?"checked":""}> Bunları da yeni kayıt olarak ekle (cihaz el değiştirmişse). İşaretsizse atlanır.</label></details>` : ""}
      ${(d.noSerial||[]).length ? `<details open><summary>${fmt(d.noSerial.length)} satırda seri no veya marka yok (“BILA” gibi)</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.noSerial.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan))}</td><td>${esc(s.marka||"—")}</td><td class="mono">${esc(s.seri||"—")}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div>
        <label class="row" style="font-size:.86rem;margin-top:6px"><input id="impnosn" type="checkbox" ${P.includeNoSerial?"checked":""}> Bunları da ekle (seri no sahada tamamlanır). İşaretsizse eklenmez.</label></details>` : ""}
      ${d.errors.length ? `<details open><summary class="warnbox" style="display:list-item">${fmt(d.errors.length)} satırda zorunlu alan eksik, eklenmeyecek</summary><div class="tbl-wrap" style="margin-top:6px"><table><tbody>${d.errors.slice(0,200).map(s => `<tr><td class="mono">${s.row}</td><td>${esc(titleTR(s.unvan||"—"))}</td><td class="muted">${esc(s.reason)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
      ${(d.skipped.length + d.errors.length + d.other.length + (d.noSerial||[]).length + (d.dup||[]).length) ? `<div><button class="btn sm" data-act="impreport">Atlanan ve eksik satırları CSV indir</button></div>` : ""}
    </div>` : ""}
    ${P.err ? `<div class="warnbox">${esc(P.err)}</div>` : ""}
    <pre id="implog-${kind}" class="log" ${P.log?.length ? "" : "hidden"}>${esc((P.log||[]).join("\n"))}</pre>
  </div>`;
}
function viewPeriodCard(){
  const cand = RAW.devs.filter(r => r.aktif !== false && +r.son_damga_yili === YEAR - 2 && !["cihazyok","kapsamdisi"].includes(r.durum_grup) && !inPeriod(r.id)).length;
  const per = periodList().map(y => `<span class="gtag" style="${y === YEAR ? "background:var(--brand);color:var(--brand-ink)" : ""}">${y} · ${fmt(st.periods.find(p => p.y === y)?.n || 0)} cihaz</span>`).join(" ");
  return `<div class="card pad stack" style="gap:10px"><h3>Dönem: ${YEAR}</h3>
    ${st.noPeriod ? `<div class="warnbox">Dönem yapısı kurulu değil; tüm cihazlar tek liste olarak gösteriliyor. Supabase SQL Editor'de <b>supabase/damga-donem.sql</b> dosyasını çalıştırın.</div>` : `
    <div class="row">${per}</div>
    <p class="muted" style="margin:0;font-size:.9rem">Her dönemin kendi listesi ve durumu var; cihaz, QR ve müşteri kayıtları dönemler arasında ortaktır. Dönemi sağ üstten değiştirin.${(st.gf||[]).length ? ` Dışa aktarma sağ üstteki grup filtresine göre yapılır (${esc(st.gf.join(", "))}).` : ""}</p>
    <div class="row"><button class="btn" data-act="pexport" ${DEVS.length ? "" : "disabled"}>${YEAR} listesini Excel'e aktar (${fmt(DEVS.filter(o => !o.l.dep).length)} cihaz)</button><button class="btn" data-act="ptemplate">Boş dönem şablonu (.xlsx)</button>
      <label class="btn primary" style="cursor:pointer">Doldurulan şablonu yükle<input type="file" accept=".xlsx,.xls" data-act="impfile" data-kind="donem" hidden></label>
      <button class="btn warn" data-act="pgopen">İçerdeki veriyi temizle</button>
      ${cand ? `<button class="btn" data-act="mkperiod">Son damgası ${YEAR - 2} olan ${fmt(cand)} cihazı ${YEAR} dönemine ekle</button>` : ""}</div>`}
  </div>`;
}
function viewData(){
  const prec = { ok: 0, mah: 0, ilce: 0 }; LOCS_P.filter(l => !l.dep).forEach(l => prec[l.p] = (prec[l.p] || 0) + 1);
  const G = st.geoRun;
  const noQR = DEVS_P.filter(o => !/^EL-/.test(o.d[11])).length;
  return `<div class="stack" style="max-width:980px;margin:0 auto">
  <div><div class="eyebrow">Yönetici</div><h2>Veri ve ayarlar</h2></div>
  ${viewPeriodCard()}
  ${impCard("donem")}
  ${impCard("yeni")}
  ${viewSmsCard()}
  <div class="card pad stack" style="gap:10px"><h3>Konumlar</h3>
    <div class="metrics"><div><b>${fmt(prec.ok||0)}</b><span>doğrulanmış (Google / elle)</span></div><div><b>${fmt(prec.mah||0)}</b><span>≈ mahalle merkezi</span></div><div><b>${fmt(prec.ilce||0)}</b><span>≈ ilçe merkezi</span></div></div>
    <p class="muted" style="margin:0;font-size:.9rem">Google Geocoding ile adresler koordinata çevrilir. Bulunamayan adresler (“DEPO”, “KAŞ” gibi) sahadan “Konumu kaydet” ile düzeltilir. Google, ayda belirli bir sorguya kadar ücretsiz; ${fmt((prec.mah||0)+(prec.ilce||0))} sorgu bu sınırın çok altında.</p>
    <div class="row"><button class="btn ${G?.busy?"warn":"primary"}" data-act="geocode" ${CFG.GOOGLE_MAPS_KEY?"":"disabled"}>${G?.busy ? "Durdur" : `Tüm adresleri doğrula (${fmt((prec.mah||0)+(prec.ilce||0))})`}</button>
      <span class="mono muted" id="geoprog">${G ? `${G.done} / ${G.total} · bulunan ${G.ok} · bulunamayan ${G.miss}` : ""}</span></div>
    ${CFG.GOOGLE_MAPS_KEY ? "" : `<div class="warnbox">config.js dosyasında GOOGLE_MAPS_KEY boş. Kurulum rehberinin 4. adımına bakın.</div>`}
    ${st.gmErr || st.geoRun?.denied ? `<div class="warnbox">${gmapsHelp()}</div>` : ""}
    ${viewGeoFix()}
  </div>
  <div class="card pad stack" style="gap:10px"><h3>QR numaraları</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Her cihazın kalıcı bir QR numarası (EL-000123) ve tahmin edilemeyen bir anahtarı var. Herkese açık kart adresi: <span class="mono">${esc(PUBLIC_QR_URL)}?k=EL-000123-xxxxx</span></p>
    <div class="row"><button class="btn" data-act="assignqr" ${noQR?"":"disabled"}>${noQR ? `${fmt(noQR)} cihaza QR numarası ver` : "Tüm cihazların QR numarası var"}</button><button class="btn" data-act="view" data-v="musteriler">Etiket basmak için Cihazlar & QR</button></div>
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
  const locs = LOCS_P.filter(l => !l.dep && l.d.length);
  const parent = new Map(locs.map(l => [l.k, l.k])); const find = k => { while (parent.get(k) !== k) k = parent.get(k); return k; }; const join = (a, b) => parent.set(find(a), find(b));
  const by = (keyf) => { const m = new Map(); locs.forEach(l => { const k = keyf(l); if (!k) return; if (m.has(k)) join(l.k, m.get(k)); else m.set(k, l.k); }); };
  by(l => normAddr(l.a, l.i).length > 30 ? normAddr(l.a, l.i) : null);
  by(l => { const c = custNorm(l.n); return c.length > 3 ? c + "#" + l.i : null; });
  const g = new Map(); locs.forEach(l => { const r = find(l.k); (g.get(r) || g.set(r, []).get(r)).push(l); });
  const cust = [...g.values()].filter(x => x.length > 1).map(x => x.sort((a, b) => b.d.length - a.d.length)).sort((a, b) => b.length - a.length);
  // Cihaz: marka ve seri numarası birebir aynı olan aktif kayıtlar (BILA / boş / rakamsız seri hariç)
  const dm = new Map(); DEVS_P.forEach(o => { if (o.d[23] === false || o.l.dep) return; const s = realSeri(o.d[4]); if (!s) return; const k = TRU(o.d[2]) + "|" + s; (dm.get(k) || dm.set(k, []).get(k)).push(o); });
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
  const dev = D.dev.slice(0, 80).map((grp, gi) => `<div class="share" style="gap:6px"><div class="muted" style="font-size:.8rem">${esc(grp[0].d[2])} · seri <span class="mono"><b>${esc(grp[0].d[4])}</b></span> (birebir aynı) · ${grp.length} kayıt · tutulacak kaydı seçin</div>
    ${grp.map(o => { const si = stampInfo(o); return `<label class="row" style="gap:8px;font-size:.86rem;align-items:flex-start"><input type="radio" name="dupd-${gi}" value="${o.d[0]}" ${D.keep[gi] === o.d[0] ? "checked" : ""} data-act="dupkeep" data-g="${gi}">
      <span style="flex:1;min-width:0"><b>${esc(titleTR(o.l.n))}</b> <span class="muted">· ${esc(titleTR(o.l.i))}</span><br><span class="muted"><span class="mono">#${lno(o.l)}·${cno(o.d)}</span> · ${esc(o.d[3])} · Max ${esc(o.d[12]||"?")} · ${esc(CAT[o.d[8]]?.l || o.d[8])} · son damga ${si.last || "—"} · QR ${esc(o.d[11])}</span></span></label>`; }).join("")}
    <div class="row"><button class="btn sm primary" data-act="dupedit" data-g="${gi}">Düzenle</button><button class="btn sm" data-act="dupdev" data-g="${gi}">Seçiliyi tut, diğerlerini pasife al</button><button class="link" data-act="dupdskip" data-g="${gi}" style="font-size:.82rem">Mükerrer değil, gizle</button></div></div>`).join("");
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
  let out;
  if (f.view === "musteri") out = locs.filter(l => !f.durum || l.d.some(okDev)).map(rpLocRow);
  else { out = []; locs.forEach(l => l.d.filter(okDev).forEach(d => out.push({ l, d, si: stampInfo({ d, l }), lr: lastResult(l.k) }))); }
  const s = f.sort && f.sort.v === f.view && RP_SORT[f.view][f.sort.k];
  if (s){ const dir = f.sort.dir, num = v => typeof v === "number";
    out = out.map((r, i) => [s(r), i, r]).sort((a, b) => { const x = a[0], y = b[0], ex = x === "" || x == null, ey = y === "" || y == null;
      if (ex !== ey) return ex ? 1 : -1; const c = num(x) && num(y) ? x - y : String(x).localeCompare(String(y), "tr", { numeric: true }); return (c || a[1] - b[1]) * (c ? dir : 1); }).map(x => x[2]); }
  return out;
}
const rpLast = lr => lr ? lr.at : "";
const RP_SORT = {
  musteri: { "Lok. no": r => r.l.no || "", "Müşteri": r => r.l.n, "Grup": r => r.l.g, "İl": r => r.l.il, "İlçe": r => r.l.i, "Adres": r => r.l.a, "Telefon": r => r.l.t,
    "Cihaz": r => r.n, "Tamam": r => r.c.tamam, "İşlenecek": r => r.c.islenecek, "Açık": r => r.open, "Kapsam dışı": r => r.c.out, "Genel durum": r => r.genel, "Sonraki damga": r => r.next || "", "Son saha sonucu": r => r.last },
  cihaz: { "Lok. no": x => x.l.no || "", "Cihaz no": x => x.d[26] || "", "Müşteri": x => x.l.n, "Grup": x => x.l.g, "İl": x => x.l.il, "İlçe": x => x.l.i, "Marka": x => x.d[2], "Model": x => x.d[3],
    "Seri no": x => x.d[4], "Max": x => parseFloat(String(x.d[12]).replace(",", ".")) || x.d[12], "Sınıf": x => x.d[16], "Durum": x => CAT[x.d[8]]?.l || x.d[8], "Son damga": x => +x.si.last || "", "Sonraki": x => +x.si.next || "", "QR": x => x.d[11], "Son saha sonucu": x => rpLast(x.lr) } };
function rpSortHead(html, view){
  const f = st.rp, cur = f.sort && f.sort.v === view ? f.sort : null;
  return html.replace(/<th( class="r")?>([^<]+)<\/th>/g, (m, cls, lab) => { if (!RP_SORT[view][lab]) return m; const on = cur && cur.k === lab;
    return `<th${cls || ""} aria-sort="${on ? (cur.dir > 0 ? "ascending" : "descending") : "none"}"><button class="sorth${on ? " on" : ""}" data-act="rpsort" data-k="${esc(lab)}">${lab}<span>${on ? (cur.dir > 0 ? "▲" : "▼") : "↕"}</span></button></th>`; });
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
  const table0 = f.view === "musteri"
    ? `<table class="rptbl"><thead><tr><th class="r">Lok. no</th><th>Müşteri</th><th>Grup</th><th>İl</th><th>İlçe</th><th>Adres</th><th>Telefon</th><th class="r">Cihaz</th><th class="r">Tamam</th><th class="r">İşlenecek</th><th class="r">Açık</th><th class="r">Kapsam dışı</th><th>Genel durum</th><th>Sonraki damga</th><th>Son saha sonucu</th></tr></thead><tbody>
      ${page.map(r => `<tr><td class="r mono">${lno(r.l)}</td><td><b>${esc(titleTR(r.l.n))}</b></td><td>${r.l.g ? `<span class="gtag">${esc(r.l.g)}</span>` : ""}</td><td>${esc(titleTR(r.l.il))}</td><td>${esc(titleTR(r.l.i))}</td><td class="muted">${esc(titleTR(r.l.a))}</td><td class="mono">${esc(r.l.t||"")}</td>
        <td class="r">${r.n}</td><td class="r">${r.c.tamam||""}</td><td class="r">${r.c.islenecek||""}</td><td class="r"><b>${r.open||""}</b></td><td class="r">${r.c.out||""}</td>
        <td><span class="st ${genelCls[r.genel]}">${r.genel}</span></td><td class="mono">${r.next||"—"}</td><td class="muted">${esc(r.last)}</td></tr>`).join("")}</tbody></table>`
    : `<table class="rptbl"><thead><tr><th class="r">Lok. no</th><th class="r">Cihaz no</th><th>Müşteri</th><th>Grup</th><th>İl</th><th>İlçe</th><th>Marka</th><th>Model</th><th>Seri no</th><th>Max</th><th>Sınıf</th><th>Durum</th><th>Son damga</th><th>Sonraki</th><th>QR</th><th>Son saha sonucu</th></tr></thead><tbody>
      ${page.map(x => `<tr><td class="r mono">${lno(x.l)}</td><td class="r mono">${cno(x.d)}</td><td><button class="link rowlink" data-act="dev" data-c="${x.d[11]}">${esc(titleTR(x.l.n))}</button></td><td>${x.l.g ? `<span class="gtag">${esc(x.l.g)}</span>` : ""}</td><td>${esc(titleTR(x.l.il))}</td><td>${esc(titleTR(x.l.i))}</td><td>${esc(x.d[2])}</td><td>${esc(x.d[3])}</td><td class="mono">${esc(x.d[4]||"—")}${x.d[25] ? ` <span class="dupflag">MÜKERRER</span>` : ""}</td>
        <td class="mono">${esc(x.d[12]||"")}</td><td>${esc(x.d[16])}</td><td>${st_(RP_OUT.includes(x.d[8])?"out":x.d[8])}</td><td class="mono">${x.si.last||"—"}</td><td class="mono">${x.si.next||"—"}</td><td class="mono">${esc(x.d[11])}</td>
        <td class="muted">${x.lr ? esc((x.lr.st==="tamam"?"Tamamlandı":(RL[x.lr.st]?.[1]||x.lr.st)) + " · " + x.lr.at.slice(0,10).split("-").reverse().join(".")) : ""}</td></tr>`).join("")}</tbody></table>`;
  const table = rpSortHead(table0, f.view);
  return `<div class="stack">
  <div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">Raporlar · ${YEAR} dönemi${(st.gf||[]).length ? " · grup: " + esc(st.gf.join(", ")) : ""}</div><h2>${f.view === "musteri" ? "Müşteri bazlı durum raporu" : "Cihaz bazlı durum raporu"}</h2></div>
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
    rows = [["Lok. no","Dönem","Grup","Müşteri","İl","İlçe","Adres","Telefon","Cihaz","Tamamlandı","Sisteme işlenecek","Bekliyor","Tekrar ziyaret","Tutanak","Kapsam dışı","Genel durum","Sonraki damga","Son saha sonucu","Konum"]];
    data.forEach(r => rows.push([r.l.no || "", YEAR, r.l.g || "", r.l.n, r.l.il, r.l.i, r.l.a, r.l.t, r.n, r.c.tamam, r.c.islenecek, r.c.bekliyor, r.c.tekrar, r.c.tutanak, r.c.out, r.genel, r.next || "", r.last, r.l.p === "ok" ? "Doğrulandı" : "Yaklaşık"]));
  } else {
    rows = [["Lok. no","Cihaz no","Dönem","Grup","Müşteri","İl","İlçe","Adres","Telefon","Cinsi","Marka","Model","Seri no","Max","e","Sınıf","Durum","Ham durum","Son damga","Sonraki damga","QR no","Son saha sonucu","Excel satır","Mükerrer"]];
    data.forEach(x => rows.push([x.l.no || "", x.d[26] || "", YEAR, x.l.g || "", x.l.n, x.l.il, x.l.i, x.l.a, x.l.t, x.d[1], x.d[2], x.d[3], x.d[4], x.d[12], x.d[18], x.d[16], CAT[x.d[8]]?.l || x.d[8], x.d[9], x.si.last || "", x.si.next || "", x.d[11],
      x.lr ? (x.lr.st === "tamam" ? "Tamamlandı" : (RL[x.lr.st]?.[1] || x.lr.st)) + " " + x.lr.at.slice(0,10) : "", x.d[17], x.d[25] ? "EVET" : ""]));
  }
  const tag = [f.il, f.ilce, f.durum].filter(Boolean).map(s => s.toLocaleLowerCase("tr-TR")).join("-");
  downloadFile(`damga-${YEAR}-${f.view === "musteri" ? "musteri" : "cihaz"}-raporu${tag ? "-" + tag : ""}-${todayISO()}.csv`, "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(";")).join("\r\n"));
  toast(`${fmt(rows.length - 1)} satır CSV olarak indirildi`);
}
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="rpsort"]'); if (!b) return; const f = st.rp, k = b.dataset.k;
  f.sort = f.sort && f.sort.v === f.view && f.sort.k === k ? (f.sort.dir > 0 ? { v: f.view, k, dir: -1 } : null) : { v: f.view, k, dir: 1 }; f.page = 0; render();
});
/* ---------------- müşteri grupları · dönem seçimi · dönem dışa aktarma ---------------- */
/* ---- Müşteriler & cihazlar: müşteri listesi, açılır cihaz satırları, zincirleme filtreler ---- */
const CU_STAMP = [["gecerli","Damga geçerli"],["buyil",""],["gecikmis","Periyodu aşılmış"],["bilinmiyor","Bilgi yok"],["pasif","Kapsam dışı"],["flag","Seri no sorunlu"]];
function cuBase(){ return st.cu.scope === "tum" ? Object.values(BY).filter(l => !l.dep && l.nAll && (!(st.gf || []).length || LOCS.includes(l))) : LOCS.filter(l => !l.dep); }
function cuDevsOf(l){ return st.cu.scope === "tum" ? Object.values(DEVID).filter(o => o.l === l) : l.d.map(d => DEVID[d[0]]).filter(Boolean); }
let CU_GEN = 0;
const cuStamp = o => { if (!o._si || o._si.g !== CU_GEN) o._si = { g: CU_GEN, v: stampInfo(o) }; return o._si.v; };
// skip: bu filtre hariç tutulur (seçenek listesini zincirleme daraltmak için)
function cuFilter(skip){
  const c = st.cu, qq = TRU(c.q), out = [];
  const devOk = o => (skip === "marka" || !c.marka || TRU(o.d[2]) === c.marka) && (skip === "model" || !c.model || TRU(o.d[3]) === c.model)
    && (skip === "ds" || !c.ds || (c.ds === "flag" ? !!o.d[15] : cuStamp(o).s === c.ds)) && (skip === "next" || !c.next || String(cuStamp(o).next) === c.next)
    && (skip === "lbl" || !c.lbl || (c.lbl === "yok" ? !o.d[27] : c.lbl === "var" ? !!o.d[27] : devMissing(o.d).length > 0));
  const devFilt = (skip !== "marka" && c.marka) || (skip !== "model" && c.model) || (skip !== "ds" && c.ds) || (skip !== "next" && c.next) || (skip !== "lbl" && c.lbl);
  cuBase().forEach(l => {
    if ((skip !== "il" && c.il && l.il !== c.il) || (skip !== "ilce" && c.ilce && l.i !== c.ilce) || (skip !== "g" && c.g && (c.g === NOGRP ? !!l.g : l.g !== c.g))) return;
    let devs = cuDevsOf(l); const custHit = !qq || TRU(l.n + " " + l.a + " " + l.i + " " + lno(l)).includes(qq);
    if (devFilt) devs = devs.filter(devOk);
    if (qq && !custHit) devs = devs.filter(o => TRU([o.d[2], o.d[3], o.d[4], o.d[11], cno(o.d)].join(" ")).includes(qq));
    if ((devFilt || (qq && !custHit)) && !devs.length) return;
    out.push({ l, devs, all: cuDevsOf(l).length, part: !!(devFilt || (qq && !custHit)) });
  });
  const s = st.cu.sort, g = s && CU_SORT[s.k];
  return out.sort((a, b) => { if (g){ const x = g(a), y = g(b); const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "tr", { numeric: true }); if (c) return c * s.dir; } return a.l.n.localeCompare(b.l.n, "tr"); });
}
// seçili müşteriler + seçili cihazların müşterileri (tek cihaz seçiminde de tüm işlemler çalışsın)
function cuEff(){ return new Set([...st.cu.sel, ...[...st.dsel].map(code => DEVBY[code]?.l?.k).filter(Boolean)]); }
const CU_SORT = { lok: r => r.l.no || 1e12, firma: r => r.l.n, ilce: r => r.l.il + " " + r.l.i, adres: r => r.l.a, cihaz: r => r.devs.length,
  durum: r => r.devs.filter(o => ["buyil","gecikmis"].includes(cuStamp(o).s)).length * 1000 + r.devs.filter(o => cuStamp(o).s === "bilinmiyor").length, grup: r => r.l.g || "" };
function cuSortHead(k, lab, num){ const s = st.cu.sort, on = s && s.k === k;
  return `<th${num ? ' class="num"' : ""} aria-sort="${on ? (s.dir > 0 ? "ascending" : "descending") : "none"}"><button class="sorth${on ? " on" : ""}" data-act="cusort" data-k="${k}">${lab}<span>${on ? (s.dir > 0 ? "▲" : "▼") : "↕"}</span></button></th>`; }
function cuRows(){ return cuFilter(null).map(r => r.l); }
function cuOpts(skip, get){ const m = new Map(); cuFilter(skip).forEach(r => (skip === "il" || skip === "ilce" || skip === "g" ? [r.l] : r.devs).forEach(x => { const v = get(x); if (v) m.set(v, (m.get(v) || 0) + 1); })); return [...m].sort((a, b) => String(a[0]).localeCompare(String(b[0]), "tr", { numeric: true })); }
function grpCounts(){
  const m = {}; Object.values(BY).forEach(l => { if (l.dep || !l.nAll) return; const k = l.g || NOGRP; const x = m[k] = m[k] || { c: 0, d: 0 }; x.c++; x.d += l.d.length; });
  return m;
}
function cuDevRow(o){ const d = o.d, si = cuStamp(o), e = precOf(o);
  return `<tr class="cudev"><td></td><td><input type="checkbox" data-act="dpick" data-c="${d[11]}" ${st.dsel.has(d[11]) ? "checked" : ""} aria-label="Cihazı seç"></td>
    <td class="mono num">${cno(d)}</td><td class="mono"><button class="link" data-act="dev" data-c="${d[11]}">${esc(d[11])}</button><div>${labelBadge(d)}</div></td>
    <td>${esc(d[2] || "—")} ${esc(d[3])}<div class="muted" style="font-size:.74rem">${esc(titleTR(d[1]))}</div></td>
    <td class="mono">${esc(d[4] || "—")}${d[15] ? ` <span class="st tekrar">${d[15] === "seri-yok" ? "yok" : "tekrar"}</span>` : ""}${d[25] ? ` <span class="dupflag">M</span>` : ""}</td>
    <td class="mono">${esc(d[12] || "?")} / ${e ? esc(e) : "e ?"} / ${esc(d[29] || "?")}${missBadge(d)}</td><td class="mono num">${si.last || "—"}</td><td class="mono num">${si.next || "—"}</td>
    <td><span class="st ${SCLS[si.s]}">${esc(si.s === "buyil" ? `${YEAR} bekliyor` : si.s === "gecikmis" ? `${YEAR} · gecikmiş` : si.label)}</span>${o.inP ? "" : ` <span class="muted" style="font-size:.74rem">dönem dışı</span>`}</td></tr>`; }
function viewCustomers(){
  CU_GEN++; const c = st.cu; c.open = c.open || new Set();
  const modeSeg = `<div class="seg" role="group" aria-label="Görünüm"><button class="segb" data-act="cumode" data-v="liste" aria-pressed="${c.mode !== "tablo"}">Liste</button><button class="segb" data-act="cumode" data-v="tablo" aria-pressed="${c.mode === "tablo"}">Toplu tablo düzenleme</button></div>`;
  if (c.mode === "tablo"){ const E = edState(); E.open = true;
    return `<div class="stack" style="max-width:1240px;margin:0 auto"><div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">Yönetici · ${YEAR} dönemi</div><h2>Müşteriler ve cihazlar</h2>
      <p class="muted" style="margin:4px 0 0;font-size:.9rem">Alan seçerek tüm listeyi tablo halinde düzenleyin, toplu değer uygulayın, seriye göre mükerrerleri bulun.</p></div>${modeSeg}</div>${viewEditor()}</div>`; }
  const rows = cuFilter(null), N = 50, pages = Math.max(1, Math.ceil(rows.length / N)); if (c.page >= pages) c.page = 0;
  const pg = rows.slice(c.page * N, c.page * N + N), gc = grpCounts(), nDev = rows.reduce((s, r) => s + r.devs.length, 0);
  const sel = (id, cur, blank, opts) => `<select id="${id}"><option value="">${blank}</option>${opts.map(([v, n, lab]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(lab || titleTR(v))} · ${fmt(n)}</option>`).join("")}</select>`;
  const gOpts = (cur, blank) => `${blank ? `<option value="">${blank}</option>` : ""}${GROUPS.map(g => `<option value="${esc(g.ad)}" ${cur === g.ad ? "selected" : ""}>${esc(g.ad)}</option>`).join("")}`;
  const allSel = rows.length && rows.every(r => c.sel.has(r.l.k));
  const anyF = c.q || c.il || c.ilce || c.g || c.marka || c.model || c.ds || c.next || c.lbl;
  const all = cuBase().flatMap(l => cuDevsOf(l)), cnt = k => all.filter(o => k === "flag" ? o.d[15] : cuStamp(o).s === k).length, nx1 = all.filter(o => cuStamp(o).next === YEAR + 1 && cuStamp(o).s !== "pasif").length;
  const stampLab = k => k === "buyil" ? `${YEAR} bekliyor` : CU_STAMP.find(x => x[0] === k)[1];
  return `<div class="stack" style="max-width:1240px;margin:0 auto">
  <div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">Yönetici · ${YEAR} dönemi</div><h2>Müşteriler ve cihazlar</h2>
    <p class="muted" style="margin:4px 0 0;font-size:.9rem">Müşteriye tıklayınca cihazları açılır. Müşteri kutusu müşteriyi ve cihazlarını seçer; cihaz kutuları QR etiketi için tek tek seçilir.</p></div>
    ${modeSeg}</div>
  ${st.noPeriod ? `<div class="warnbox">Gruplar ve dönemler için Supabase'de <b>supabase/damga-donem.sql</b> çalıştırılmalı.</div>` : ""}
  ${viewDevRequests()}
  <section class="kpis">
    ${[["gecerli","var(--ok)",`sonraki muayene ${YEAR + 1}+`],["buyil","var(--wait)","31 Aralık'a kadar"],["gecikmis","var(--retry)",`son damga ${YEAR - 2} öncesi`],["flag","var(--off)","boş ya da tekrar eden"]].map(([k, col, sm]) => `<button class="card kpi kpib" style="--c:${col}" data-act="cuds" data-v="${k}" aria-pressed="${c.ds === k}"><span>${stampLab(k)}</span><b>${fmt(cnt(k))}</b><small>${sm}</small></button>`).join("")}
    <button class="card kpi kpib" style="--c:var(--brand)" data-act="cunext" data-v="${YEAR + 1}" aria-pressed="${c.next === String(YEAR + 1)}"><span>Ocak–Şubat ${YEAR + 1} başvurusu</span><b>${fmt(nx1)}</b><small>son damgası ${YEAR - 1}</small></button>
  </section>
  <details class="card pad" ${c.gOpen ? "open" : ""} id="cu-groups"><summary><b>Gruplar</b> <span class="muted">(${GROUPS.length}) · ekle, yeniden adlandır, sil</span></summary>
    <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Grup</th><th class="num">Müşteri</th><th class="num">${YEAR} cihaz</th><th></th></tr></thead><tbody>
      ${GROUPS.map(g => `<tr><td><span class="gtag">${esc(g.ad)}</span></td><td class="num">${fmt(gc[g.ad]?.c || 0)}</td><td class="num">${fmt(gc[g.ad]?.d || 0)}</td>
        <td style="text-align:right"><button class="link" data-act="cufilter" data-g="${esc(g.ad)}">Müşterileri göster</button> · <button class="link" data-act="grename" data-g="${esc(g.ad)}">Yeniden adlandır</button> · <button class="link" data-act="gdel" data-g="${esc(g.ad)}" style="color:var(--bad)">Sil</button></td></tr>`).join("")}
      <tr><td class="muted">${NOGRP}</td><td class="num">${fmt(gc[NOGRP]?.c || 0)}</td><td class="num">${fmt(gc[NOGRP]?.d || 0)}</td><td style="text-align:right"><button class="link" data-act="cufilter" data-g="${NOGRP}">Müşterileri göster</button></td></tr>
    </tbody></table></div>
    <form id="groupForm" class="row" style="margin-top:8px"><input id="gf-ad" required maxlength="60" placeholder="Yeni grup adı (örn. MİGROS)" style="min-width:240px"><button class="btn primary">Grup ekle</button></form>
  </details>
  ${viewSmsComposer()}
  <div class="card pad stack" style="gap:10px">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">Liste</h3>
      <div class="seg"><button class="segb" data-act="cuscope" data-v="donem" aria-pressed="${c.scope !== "tum"}">${YEAR} dönemindekiler</button><button class="segb" data-act="cuscope" data-v="tum" aria-pressed="${c.scope === "tum"}">Tüm müşteriler</button></div></div>
    <div class="row cufilters">
      <input id="cu-q" type="search" placeholder="Firma, adres, seri no, QR, marka ara" value="${esc(c.q)}" style="flex:2 1 240px">
      ${sel("cu-il", c.il, "Tüm iller", cuOpts("il", l => l.il))}
      ${sel("cu-ilce", c.ilce, "Tüm ilçeler", cuOpts("ilce", l => l.i))}
      ${sel("cu-g", c.g, "Tüm gruplar", cuOpts("g", l => l.g || NOGRP).map(([v, n]) => [v, n, v]))}
      ${sel("cu-marka", c.marka, "Tüm markalar", cuOpts("marka", o => TRU(o.d[2])).map(([v, n]) => [v, n, v]))}
      ${sel("cu-model", c.model, "Tüm modeller", cuOpts("model", o => TRU(o.d[3])).map(([v, n]) => [v, n, v]))}
      ${sel("cu-ds", c.ds, "Damga durumu", cuOpts("ds", o => cuStamp(o).s).map(([v, n]) => [v, n, stampLab(v)]))}
      ${sel("cu-lbl", c.lbl, "Etiket / bilgi", cuOpts("lbl", o => o.d[27] ? "var" : "yok").concat(cuOpts("lbl", o => devMissing(o.d).length ? "eksik" : "")).map(([v, n]) => [v, n, { yok: "Etiketi yok", var: "Etiket bağlı", eksik: "e / d / sınıf eksik" }[v]]))}
      ${sel("cu-next", c.next, "Sonraki damga", cuOpts("next", o => cuStamp(o).s !== "pasif" ? cuStamp(o).next : null).map(([v, n]) => [v, n, "Sonraki " + v]))}
      ${anyF ? `<button class="link" data-act="cufclear">Filtreleri temizle</button>` : ""}
    </div>
    <div class="row" style="justify-content:space-between;font-size:.86rem"><span class="muted">${fmt(rows.length)} müşteri · ${fmt(nDev)} cihaz${st.dsel.size ? ` · <b>${fmt(st.dsel.size)} cihaz seçili</b>` : ""}</span>
      <span class="row" style="gap:10px"><button class="link" data-act="cuopenall">${pg.every(r => c.open.has(r.l.k)) ? "Tümünü kapat" : "Bu sayfadakileri aç"}</button><button class="btn sm" data-act="applist">Başvuru listesi CSV</button></span></div>
    <div class="tbl-wrap"><table class="cutbl"><thead><tr><th><input type="checkbox" data-act="cuall" ${allSel ? "checked" : ""} title="Filtredeki tüm müşterileri ve cihazlarını seç"></th><th></th>${cuSortHead("lok", "Lok.", true)}${cuSortHead("firma", "Firma")}${cuSortHead("ilce", "İl / ilçe")}${cuSortHead("adres", "Adres")}${cuSortHead("cihaz", "Cihaz", true)}${cuSortHead("durum", "Durum")}${cuSortHead("grup", "Grup")}</tr></thead><tbody>
      ${pg.map(r => { const l = r.l, op = c.open.has(l.k), sc = {}; r.devs.forEach(o => { const s = cuStamp(o).s; sc[s] = (sc[s] || 0) + 1; });
        return `<tr class="cucust${op ? " open" : ""}"><td><input type="checkbox" data-act="cusel" data-k="${esc(l.k)}" ${c.sel.has(l.k) ? "checked" : ""} aria-label="Müşteriyi seç"></td>
        <td><button class="cutog" data-act="cutog" data-k="${esc(l.k)}" aria-expanded="${op}" aria-label="Cihazları ${op ? "kapat" : "aç"}">${op ? "▾" : "▸"}</button></td><td class="mono num">${lno(l)}</td>
        <td class="wrap"><button class="link rowlink" data-act="cutog" data-k="${esc(l.k)}"><b>${esc(titleTR(l.n))}</b></button> <button class="link" data-act="mfopen1" data-k="${esc(l.k)}" style="font-size:.8rem">Düzenle</button></td>
        <td>${esc(titleTR(l.il))} / ${esc(titleTR(l.i))}</td><td class="wrap muted" style="font-size:.82rem">${esc(l.a)}</td>
        <td class="num">${r.part ? `${fmt(r.devs.length)}<span class="muted">/${fmt(r.all)}</span>` : fmt(r.all)}</td>
        <td style="white-space:nowrap">${Object.entries(sc).map(([s, n]) => `<span class="st ${SCLS[s]}" title="${esc(s === "buyil" ? YEAR + " bekliyor" : (CU_STAMP.find(x => x[0] === s) || [])[1] || s)}">${n}</span>`).join(" ")}</td>
        <td><select data-act="cugrp" data-k="${esc(l.k)}" aria-label="Grup"><option value="">—</option>${gOpts(l.g)}</select></td></tr>
        ${op ? `<tr class="cudevs"><td colspan="9"><table class="cudevtbl"><thead><tr><th></th><th><input type="checkbox" data-act="cudall" data-k="${esc(l.k)}" ${r.devs.length && r.devs.every(o => st.dsel.has(o.d[11])) ? "checked" : ""} title="Bu müşterinin cihazları"></th><th class="num">Cihaz</th><th>QR</th><th>Marka / model</th><th>Seri no</th><th>Max / e / sınıf</th><th class="num">Son</th><th class="num">Sonraki</th><th>Durum</th></tr></thead><tbody>
          ${r.devs.map(cuDevRow).join("") || `<tr><td colspan="10" class="muted">Cihaz yok.</td></tr>`}</tbody></table></td></tr>` : ""}`; }).join("") || `<tr><td colspan="9" class="muted">Filtreye uyan kayıt yok.</td></tr>`}
    </tbody></table></div>
    ${pages > 1 ? `<div class="row"><button class="btn sm" data-act="cupage" data-p="${c.page - 1}" ${c.page ? "" : "disabled"}>‹ Önceki</button><span class="muted">${c.page + 1} / ${pages}</span><button class="btn sm" data-act="cupage" data-p="${c.page + 1}" ${c.page + 1 < pages ? "" : "disabled"}>Sonraki ›</button></div>` : ""}
    ${(() => { const eff = cuEff(); return eff.size || st.dsel.size ? `<div class="bulkbar"><b>${fmt(eff.size)} müşteri · ${fmt(st.dsel.size)} cihaz</b>
      ${eff.size ? `<select id="cu-bulkg">${GROUPS.length ? gOpts("", "Grup seçin") : `<option value="">Önce grup ekleyin</option>`}</select>
      <button class="btn sm" data-act="cuassign" ${GROUPS.length ? "" : "disabled"}>Gruba ata</button><button class="btn sm" data-act="cuunassign">Gruptan çıkar</button>
      <button class="btn sm" data-act="smsopen">SMS gönder</button>
      ${eff.size === 1 ? `<button class="btn sm" data-act="htfbulk">Hizmet talep formu</button>` : ""}
      <button class="btn sm primary" data-act="mfopen">${eff.size > 1 ? `Seçili ${fmt(eff.size)} kaydı düzenle` : "Kaydı düzenle"}</button>` : ""}
      <button class="link" data-act="cuclear">Seçimi temizle</button></div>` : ""; })()}
  </div>${viewCustForm()}</div>`;
}
async function setGroup(keys, grup){
  keys = [...keys]; if (!keys.length) return;
  for (let i = 0; i < keys.length; i += 200) await q(sb.from("businesses").update({ grup: grup || null }).in("id", keys.slice(i, i + 200)));
  keys.forEach(k => { const l = BY[k]; if (l) l.g = grup || ""; const b = RAW.biz.find(x => x.id === k); if (b) b.grup = grup || null; });
  applyGroupFilter();
}
async function renameGroup(from, to){
  to = to.trim().toLocaleUpperCase("tr-TR"); if (!to || to === from) return;
  if (GROUPS.some(g => g.ad === to)) throw new Error("bu adla bir grup zaten var");
  await q(sb.from("customer_groups").insert({ ad: to }));
  await q(sb.from("businesses").update({ grup: to }).eq("grup", from));
  await q(sb.from("customer_groups").delete().eq("ad", from));
  Object.values(BY).forEach(l => { if (l.g === from) l.g = to; });
  RAW.biz.forEach(b => { if (b.grup === from) b.grup = to; });
  st.gf = (st.gf || []).map(g => g === from ? to : g); lsSet("damga.grup", st.gf);
  if (st.cu.g === from) st.cu.g = to;
  await loadMeta(); applyGroupFilter();
}

/* ---- dönem listesini Excel'e aktar (yeni müşteri / dönem içe aktarımıyla aynı başlıklar) ---- */
async function exportPeriod(template){
  try { await loadXLSX(); } catch(e){ toast(e.message); return; }
  const head = ["LOK NO","CİHAZ NO","DÖNEM","GRUP","FİRMA ÜNVANI","ADRES","İLÇE","İL","TELEFON","CİHAZ TİPİ","CİNSİ","MARKA","MODEL","SERİ NO","SINIF","MAX (KAPASİTE)","MİN","e (doğrulama bölüntüsü)","d (okuma bölüntüsü)","SON DAMGA YILI","DURUM","DURUM AÇIKLAMA","FATURA NOTU","KULLANIM YERİ","NOT","QR NO","MÜKERRER"];
  const rows = template ? [] : DEVS.filter(o => !o.l.dep).sort((a, b) => (a.l.no || 1e12) - (b.l.no || 1e12) || (a.d[26] || 1e12) - (b.d[26] || 1e12) || a.l.n.localeCompare(b.l.n, "tr"))
    .map(({ d, l }) => [l.no || "", d[26] || "", YEAR, l.g || "", l.n, l.a, l.i, l.il, l.t, d[20], d[1], d[2], d[3], d[4], d[16], d[12], d[21], d[18], d[22], d[6] ? +d[6] : "", CAT[d[8]]?.l || d[8], d[9], d[10], d[7], d[14], d[11], d[25] ? "EVET" : ""]);
  const ws = XLSX.utils.aoa_to_sheet([head, ...rows]);
  ws["!cols"] = head.map((h, i) => ({ wch: [8,9,6,14,34,44,14,10,14,22,16,14,14,16,6,12,8,10,10,10,18,28,18,16,28,12,9][i] }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: head.length - 1 } }) };
  ws["!freeze"] = { xSplit: 2, ySplit: 1 };
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Cihazlar");
  const help = [["ANTKA KALİBRASYON · Damga Takip · dönem listesi"], [""],
    ["LOK NO / CİHAZ NO", "Sistemin verdiği kalıcı sıra numaraları. Dolu satır o cihazı günceller; yeni cihaz için boş bırakın."],
    ["Zorunlu (yeni satır)", "FİRMA ÜNVANI, ADRES, İLÇE, MARKA, SERİ NO"],
    ["DURUM", "Listeler sayfasındaki değerlerden biri ya da saha notu (örn. YAPILDI, TUTANAK, ULAŞILAMADI)."],
    ["GRUP", "Müşteri grubu (örn. MİGROS). Sistemde tanımlı olmalı."],
    ["Mükerrer", "Müşteri + adres + cihaz (marka) + seri no aynı olan yeni satırlar mükerrer sayılır; içe aktarırken kaldırılır ya da işaretlenir."],
    ["Boş hücre", "Güncellemede boş hücre değiştirilmez; mevcut değer kalır."]];
  const hs = XLSX.utils.aoa_to_sheet(help); hs["!cols"] = [{ wch: 22 }, { wch: 100 }]; XLSX.utils.book_append_sheet(wb, hs, "Açıklamalar");
  const ls = XLSX.utils.aoa_to_sheet([["DURUM", "GRUP", "SINIF"], ...Array.from({ length: Math.max(8, GROUPS.length) }, (_, i) => [CAT[["bekliyor","tamam","islenecek","tekrar","tutanak","cihazyok","kapsamdisi","baskasi"][i]]?.l || "", GROUPS[i]?.ad || "", ["I","II","III","IIII"][i] || ""])]);
  XLSX.utils.book_append_sheet(wb, ls, "Listeler");
  if (template){ XLSX.writeFile(wb, `antka-donem-sablonu.xlsx`); toast("Dönem şablonu indirildi"); return; }
  const gf = (st.gf || []).length ? "-" + st.gf.join("-").replace(/[^0-9A-Za-zÇĞİÖŞÜçğıöşü]+/g, "_").slice(0, 40) : "";
  XLSX.writeFile(wb, `antka-damga-${YEAR}${gf}.xlsx`);
  toast(`${fmt(rows.length)} cihaz Excel'e aktarıldı`);
}

document.addEventListener("click", async e => {
  if (st.gfOpen && !e.target.closest(".gpick")){ st.gfOpen = false; render(); }
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act, c = st.cu;
  switch (a){
    case "gfopen": st.gfOpen = !st.gfOpen; render(); break;
    case "gfclear": st.gf = []; lsSet("damga.grup", []); st.gfOpen = false; applyGroupFilter(); render(); break;
    case "cuscope": c.scope = b.dataset.v; c.page = 0; render(); break;
    case "cumode": c.mode = b.dataset.v; render(); window.scrollTo(0, 0); break;
    case "cufclear": Object.assign(c, { q: "", il: "", ilce: "", g: "", marka: "", model: "", ds: "", next: "", lbl: "", page: 0 }); render(); break;
    case "cuds": c.ds = c.ds === b.dataset.v ? "" : b.dataset.v; c.page = 0; render(); break;
    case "cunext": c.next = c.next === b.dataset.v ? "" : b.dataset.v; c.page = 0; render(); break;
    case "cutog": { c.open = c.open || new Set(); const k = b.dataset.k; c.open.has(k) ? c.open.delete(k) : c.open.add(k); render(); break; }
    case "cuopenall": { c.open = c.open || new Set(); const rows = cuFilter(null).slice(c.page * 50, c.page * 50 + 50); const allOpen = rows.every(r => c.open.has(r.l.k)); rows.forEach(r => allOpen ? c.open.delete(r.l.k) : c.open.add(r.l.k)); render(); break; }
    case "cupage": c.page = +b.dataset.p; render(); window.scrollTo(0, 0); break;
    case "cufilter": c.g = b.dataset.g; c.page = 0; render(); break;
    case "cuclear": c.sel.clear(); st.dsel.clear(); render(); break;
    case "cusort": { const k = b.dataset.k, s = c.sort; c.sort = s && s.k === k ? (s.dir > 0 ? { k, dir: -1 } : null) : { k, dir: 1 }; c.page = 0; render(); break; }
    case "cuassign": case "cuunassign": {
      const g = a === "cuassign" ? $("#cu-bulkg")?.value : ""; if (a === "cuassign" && !g){ toast("Grup seçin"); break; }
      const eff = cuEff(), n = eff.size; b.disabled = true;
      try { await setGroup(eff, g); render(); toast(g ? `${fmt(n)} müşteri “${g}” grubuna atandı` : `${fmt(n)} müşteri gruptan çıkarıldı`); }
      catch(err){ b.disabled = false; toast("Kaydedilemedi: " + err.message); } break; }
    case "gdel": { const g = b.dataset.g; if (!confirm(`“${g}” grubu silinsin mi? Müşteriler grupsuz kalır, kayıtlar silinmez.`)) break;
      try { await q(sb.from("businesses").update({ grup: null }).eq("grup", g)); await q(sb.from("customer_groups").delete().eq("ad", g));
        Object.values(BY).forEach(l => { if (l.g === g) l.g = ""; }); st.gf = (st.gf || []).filter(x => x !== g); lsSet("damga.grup", st.gf);
        await loadMeta(); applyGroupFilter(); render(); toast("Grup silindi"); } catch(err){ toast("Silinemedi: " + err.message); } break; }
    case "grename": { const g = b.dataset.g, to = prompt("Yeni grup adı", g); if (!to) break;
      try { await renameGroup(g, to); render(); toast("Grup adı değişti"); } catch(err){ toast("Değiştirilemedi: " + err.message); } break; }
    case "mkperiod": b.disabled = true;
      try { const n = await q(sb.rpc("create_period", { p_donem: YEAR })); await reloadDevices(); render(); toast(`${YEAR} dönemi ${fmt(n)} cihazla oluşturuldu`); }
      catch(err){ b.disabled = false; toast("Dönem oluşturulamadı: " + err.message); } break;
    case "pexport": exportPeriod(false); break;
    case "ptemplate": exportPeriod(true); break;
    case "addperiod": b.disabled = true;
      try { await q(sb.from("period_items").upsert({ donem: YEAR, device_id: +b.dataset.id, durum_grup: "bekliyor", durum_ham: "Elle eklendi", kaynak: "cihaz kartı" }, { onConflict: "donem,device_id" }));
        await reloadDevices(); render(); toast(`Cihaz ${YEAR} dönemine eklendi`); } catch(err){ b.disabled = false; toast("Eklenemedi: " + err.message); } break;
  }
});
document.addEventListener("change", async e => {
  const t = e.target, a = t.dataset.act, c = st.cu;
  if (a === "donem"){ switchPeriod(t.value); return; }
  if (a === "gf"){ const v = t.value; st.gf = t.checked ? [...new Set([...(st.gf || []), v])] : (st.gf || []).filter(x => x !== v); lsSet("damga.grup", st.gf); applyGroupFilter(); render(); return; }
  if (a === "cusel"){ const k = t.dataset.k, r = cuFilter(null).find(x => x.l.k === k); c.open = c.open || new Set();
    if (t.checked){ c.sel.add(k); c.open.add(k); (r ? r.devs : []).forEach(o => st.dsel.add(o.d[11])); } else { c.sel.delete(k); (r ? r.devs : []).forEach(o => st.dsel.delete(o.d[11])); }
    render(); return; }
  if (a === "cuall"){ cuFilter(null).forEach(r => { if (t.checked){ c.sel.add(r.l.k); r.devs.forEach(o => st.dsel.add(o.d[11])); } else { c.sel.delete(r.l.k); r.devs.forEach(o => st.dsel.delete(o.d[11])); } }); render(); return; }
  if (a === "cudall"){ const r = cuFilter(null).find(x => x.l.k === t.dataset.k); (r ? r.devs : []).forEach(o => t.checked ? st.dsel.add(o.d[11]) : st.dsel.delete(o.d[11])); render(); return; }
  if (a === "cugrp"){ try { await setGroup([t.dataset.k], t.value); toast(t.value ? `Grup: ${t.value}` : "Gruptan çıkarıldı"); } catch(err){ toast("Kaydedilemedi: " + err.message); } return; }
  if (t.id === "cu-il"){ c.il = t.value; c.ilce = ""; c.page = 0; render(); return; }
  if (t.id === "cu-ilce"){ c.ilce = t.value; c.page = 0; render(); return; }
  if (t.id === "cu-g"){ c.g = t.value; c.page = 0; render(); return; }
  if (["cu-marka","cu-model","cu-ds","cu-next","cu-lbl"].includes(t.id)){ c[t.id.slice(3)] = t.value; c.page = 0; render(); return; }
});
document.addEventListener("input", e => {
  if (e.target.id !== "cu-q") return;
  st.cu.q = e.target.value; st.cu.page = 0; clearTimeout(cfgT);
  cfgT = setTimeout(() => { const pos = e.target.selectionStart; render(); const n = document.getElementById("cu-q"); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(_){} } }, 250);
});
document.addEventListener("submit", async e => {
  if (e.target.id !== "groupForm") return; e.preventDefault();
  const ad = $("#gf-ad").value.trim().toLocaleUpperCase("tr-TR"); if (!ad) return;
  if (GROUPS.some(g => g.ad === ad)){ toast("Bu grup zaten var"); return; }
  try { await q(sb.from("customer_groups").insert({ ad })); await loadMeta(); render(); toast(`“${ad}” grubu eklendi`); } catch(err){ toast("Eklenemedi: " + err.message); }
});
/* ---------------- kayıt düzenleyici: dönem listesini tablo halinde düzenleme ---------------- */
const lno = l => l && l.no ? String(l.no) : "—";
const cno = d => d && d[26] ? String(d[26]) : "—";
// [anahtar, etiket, seviye (biz/dev/item), sütun, okuyucu, tür]
const ED_FIELDS = [
  ["unvan","Firma ünvanı","biz","unvan", o => o.l.n, "text"],
  ["il","İl","biz","il", o => o.l.il, "text"],
  ["ilce","İlçe","biz","ilce", o => o.l.i, "text"],
  ["adres","Adres","biz","adres", o => o.l.a, "text"],
  ["tel","Telefon","biz","tel", o => o.l.t, "text"],
  ["grup","Grup","biz","grup", o => o.l.g, "grup"],
  ["tip","Cihaz tipi","dev","tip", o => o.d[20], "text"],
  ["cins","Cinsi","dev","cins", o => o.d[1], "text"],
  ["marka","Marka","dev","marka", o => o.d[2], "text"],
  ["model","Model","dev","model", o => o.d[3], "text"],
  ["seri_no","Seri no","dev","seri_no", o => o.d[4], "text"],
  ["sinif","Sınıf","dev","sinif", o => o.d[16], "sinif"],
  ["max_cap","Max","dev","max_cap", o => o.d[12], "text"],
  ["min_cap","Min","dev","min_cap", o => o.d[21], "text"],
  ["e","e","dev","e", o => o.d[18], "text"],
  ["d","d","dev","d", o => o.d[22], "text"],
  ["son_damga_yili","Son damga","dev","son_damga_yili", o => o.d[6], "year"],
  ["kullanim_yeri","Kullanım yeri","dev","kullanim_yeri", o => o.d[7], "text"],
  ["durum_grup","Durum","item","durum_grup", o => o.d[8], "durum"],
  ["durum_ham","Durum açıklaması","item","durum_ham", o => o.d[9], "text"],
  ["fatura_notu","Fatura notu","item","fatura_notu", o => o.d[10], "text"],
  ["bilgi","Not","item","bilgi", o => o.d[14], "text"]];
const EDF = Object.fromEntries(ED_FIELDS.map(f => [f[0], f]));
const ED_DEFAULT = ["unvan","ilce","adres","marka","model","seri_no","max_cap","durum_grup"];
const ED_STATUS = ["bekliyor","tamam","islenecek","tekrar","tutanak","cihazyok","kapsamdisi","baskasi"];
function edState(){
  if (!st.ed) st.ed = { open: false, colsOpen: true, cols: lsGet("damga.edcols", ED_DEFAULT).filter(k => EDF[k]), q: "", ilce: "", durum: "", page: 0, sel: new Set(), dirty: new Map(), busy: false };
  return st.ed;
}
function edRows(){
  const E = edState(), qq = TRU(E.q);
  if (E.ids) return [...E.ids].map(id => DEVID[id]).filter(Boolean);
  const sc = E.dupSeri ? edSeriCount() : null;
  const out = DEVS.filter(o => !o.l.dep && (!E.ilce || o.l.i === E.ilce) && (!E.durum || o.d[8] === E.durum)
    && (!E.cap || capKey(o.d[12]) === E.cap)
    && (!sc || (o.d[23] !== false && (sc.get(realSeri(o.d[4])) || 0) > 1))
    && (!qq || TRU([o.l.n, o.l.a, o.d[2], o.d[3], o.d[4], o.d[11], lno(o.l), cno(o.d)].join(" ")).includes(qq)));
  return sc ? out.sort((a, b) => realSeri(a.d[4]).localeCompare(realSeri(b.d[4])) || (a.l.no || 1e12) - (b.l.no || 1e12))
    : out.sort((a, b) => (a.l.no || 1e12) - (b.l.no || 1e12) || (a.d[26] || 1e12) - (b.d[26] || 1e12));
}
const capKey = v => { const s = TRU(v).replace(/\s+/g, " ").replace(/,/g, "."); if (!s) return "(boş)"; return /KG$/.test(s) ? s.replace(/\s*KG$/, " KG") : /\d\s*GR?$/.test(s) ? s.replace(/\s*GR?$/, " G") : s; };
function edSeriCount(){ const hide = new Set(lsGet("damga.serHide", [])); const m = new Map(); DEVS.forEach(o => { if (o.l.dep || o.d[23] === false) return; const s = realSeri(o.d[4]); if (s && !hide.has(s)) m.set(s, (m.get(s) || 0) + 1); }); return m; }
// mükerrer grubunda tutulacak kayıt: seçilen; yoksa tamamlanmış / en yeni damgalı / en düşük cihaz no
function edKeepOf(g){ const E = edState(); E.keep = E.keep || {}; const k = E.keep[g.s]; if (k && g.items.some(o => o.d[0] === k)) return k;
  return g.items.slice().sort((a, b) => (RANK[b.d[8]] ?? 0) - (RANK[a.d[8]] ?? 0) || (+b.d[6] || 0) - (+a.d[6] || 0) || (a.d[26] || 1e12) - (b.d[26] || 1e12))[0].d[0]; }
function edGroupHead(g, span){ const E = edState(), nSel = g.items.filter(o => E.sel.has(o.d[0])).length, locs = new Set(g.items.map(o => o.l.k)).size;
  return `<tr class="grph"><td colspan="${span}"><b>Seri ${esc(g.s)}</b> · ${g.items.length} kayıt · ${locs} lokasyon · ${esc([...new Set(g.items.map(o => o.d[2]))].join(" / "))}
    <span style="display:inline-flex;gap:10px;margin-left:12px;flex-wrap:wrap"><button class="btn sm primary" data-act="edmerge" data-s="${esc(g.s)}">${nSel >= 2 ? `Seçili ${nSel} kaydı birleştir` : "Tümünü birleştir"} → “Tut” işaretli kayıt kalır</button>
    <button class="link" data-act="ednotdup" data-s="${esc(g.s)}">Mükerrer değil, listeden kaldır</button></span></td></tr>`; }
async function edMerge(s){
  const E = edState(), sc = edRows().filter(o => realSeri(o.d[4]) === s); if (sc.length < 2) return;
  const sel = sc.filter(o => E.sel.has(o.d[0])), grp = sel.length >= 2 ? sel : sc, keepId = edKeepOf({ s, items: sc });
  const kept = grp.find(o => o.d[0] === keepId) || DEVID[keepId]; const rest = grp.filter(o => o.d[0] !== kept.d[0]);
  if (!rest.length){ toast("Birleştirilecek başka kayıt yok"); return; }
  if (!grp.some(o => o.d[0] === kept.d[0])){ toast("“Tut” işaretli kaydı da seçin"); return; }
  if (!confirm(`Seri ${s}: ${kept.d[11]} (${titleTR(kept.l.n)}) kalacak, ${rest.length} kayıt pasife alınıp ${YEAR} listesinden çıkarılacak. QR ve geçmiş silinmez. Devam?`)) return;
  const all = [kept, ...rest], maxSon = Math.max(...all.map(o => +o.d[6] || 0)) || null, best = all.map(o => o.d[8]).sort((a, b) => (RANK[b] ?? 0) - (RANK[a] ?? 0))[0];
  try {
    if (maxSon && maxSon > (+kept.d[6] || 0)) await q(sb.from("devices").update({ son_damga_yili: maxSon }).eq("id", kept.d[0]));
    if ((RANK[best] ?? 0) > (RANK[kept.d[8]] ?? 0)){ if (kept.d[24] && !st.noPeriod) await q(sb.from("period_items").update({ durum_grup: best }).eq("id", kept.d[24])); else await q(sb.from("devices").update({ durum_grup: best }).eq("id", kept.d[0])); }
    for (const o of rest){ await q(sb.from("devices").update({ aktif: false, cikis_nedeni: `Mükerrer kayıt · ${kept.d[11]} ile birleştirildi` }).eq("id", o.d[0]));
      if (o.d[24] && !st.noPeriod) await q(sb.from("period_items").delete().eq("id", o.d[24])); E.sel.delete(o.d[0]); E.dirty.delete(o.d[0]); }
    await reloadDevices(); render(); toast(`Seri ${s}: ${rest.length} kayıt birleştirildi, ${kept.d[11]} tutuldu`);
  } catch(e){ toast("Birleştirilemedi: " + e.message); }
}
function edCaps(){ const m = new Map(); DEVS.forEach(o => { if (!o.l.dep){ const k = capKey(o.d[12]); m.set(k, (m.get(k) || 0) + 1); } });
  const num = k => { const x = parseFloat(String(k).replace(",", ".")); return isNaN(x) ? 1e9 : x * (/ G$/.test(k) ? 0.001 : 1); };
  return [...m].sort((a, b) => num(a[0]) - num(b[0]) || a[0].localeCompare(b[0], "tr")); }
const edVal = (o, k) => { const ch = edState().dirty.get(o.d[0])?.[k]; return ch !== undefined ? ch : (EDF[k][4](o) ?? ""); };
function edCell(o, k){
  const f = EDF[k], v = edVal(o, k), dirty = edState().dirty.get(o.d[0])?.[k] !== undefined, cls = dirty ? "edin dirty" : "edin";
  const at = `class="${cls}" data-act="edcell" data-id="${o.d[0]}" data-k="${k}" aria-label="${esc(f[1])}"`;
  if (f[5] === "durum") return `<select ${at}>${ED_STATUS.map(s => `<option value="${s}" ${v === s ? "selected" : ""}>${esc(CAT[s]?.l || s)}</option>`).join("")}</select>`;
  if (f[5] === "grup") return `<select ${at}><option value="">—</option>${GROUPS.map(g => `<option ${v === g.ad ? "selected" : ""}>${esc(g.ad)}</option>`).join("")}</select>`;
  if (f[5] === "sinif") return `<select ${at}>${["I","II","III","IIII"].map(s => `<option ${v === s ? "selected" : ""}>${s}</option>`).join("")}</select>`;
  return `<input ${at} value="${esc(v)}" ${f[5] === "year" ? `inputmode="numeric" style="width:70px"` : k === "adres" || k === "unvan" ? `style="min-width:220px"` : ""} ${k === "ilce" ? `list="dl-ilce"` : ""}>`;
}
function viewEditor(){
  const E = edState();
  if (!E.open) return `<div class="card pad stack" style="gap:10px"><h3>Kayıt düzenleyici · ${YEAR}</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Dönem listesini tablo halinde düzenleyin: her lokasyonun ve cihazın kalıcı bir sıra numarası var. Görmek istediğiniz alanları seçin, hücreleri değiştirin, toplu değer uygulayın, sonra kaydedin. Sağ üstteki grup filtresine uyar.</p>
    <div><button class="btn primary" data-act="edopen">Düzenleyiciyi aç (${fmt(DEVS.filter(o => !o.l.dep).length)} cihaz)</button></div></div>`;
  const rows = edRows(), dupMode = E.dupSeri && !E.ids;
  const groups = dupMode ? rows.reduce((m, o) => { const s = realSeri(o.d[4]); const g = m.length && m[m.length - 1].s === s ? m[m.length - 1] : (m.push({ s, items: [] }), m[m.length - 1]); g.items.push(o); return m; }, []) : null;
  const N = dupMode ? 20 : 50, pages = Math.max(1, Math.ceil((dupMode ? groups.length : rows.length) / N)); if (E.page >= pages) E.page = 0;
  const pgG = dupMode ? groups.slice(E.page * N, E.page * N + N) : null;
  const pg = dupMode ? pgG.flatMap(g => g.items) : rows.slice(E.page * N, E.page * N + N), nd = E.dirty.size, allSel = pg.length && pg.every(o => E.sel.has(o.d[0]));
  const ilces = [...new Set(DEVS.filter(o => !o.l.dep).map(o => o.l.i).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  const noSira = !DEVS.some(o => o.d[26]);
  return `<div class="card pad stack" style="gap:10px" id="editor">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">Kayıt düzenleyici · ${YEAR}</h3><button class="btn sm" data-act="cumode" data-v="liste">Listeye dön</button></div>
    ${noSira ? `<div class="warnbox">Sıra numaraları için Supabase'de <b>supabase/damga-sira.sql</b> çalıştırılmalı.</div>` : ""}
    <details id="ed-cols" ${E.colsOpen || !E.cols.length ? "open" : ""}><summary>Gösterilecek alanlar (${E.cols.length}) · seçin</summary>
      <div class="chips" style="margin-top:8px">${ED_FIELDS.map(([k, lab, lev]) => `<button class="chip" data-act="edcol" data-k="${k}" aria-pressed="${E.cols.includes(k)}">${esc(lab)}${lev === "biz" ? " ⌂" : ""}</button>`).join("")}
        <button class="btn sm ${E.capOn ? "primary" : ""}" data-act="edcap" aria-pressed="${!!E.capOn}">Kapasite</button>
        <button class="btn sm ${E.dupSeri ? "primary" : ""}" data-act="eddupseri" aria-pressed="${!!E.dupSeri}">Seriye göre mükerrerleri bul</button></div>
      <div class="muted" style="font-size:.8rem;margin-top:6px">⌂ lokasyon alanı: değişiklik o adresteki tüm cihazlara uygulanır. <button class="link" data-act="edcolreset">Varsayılana dön</button> · <button class="link" data-act="edcolall">Tümü</button></div></details>
    ${E.ids ? `<div class="row warnbox" style="justify-content:space-between"><span>${esc(E.idsLabel || "Seçili kayıtlar")} · ${fmt(E.ids.size)} cihaz gösteriliyor</span><button class="btn sm" data-act="edidsclear">Tüm listeye dön</button></div>` : ""}
    ${E.dupSeri && !E.ids ? (() => { const sc = edSeriCount(), n = [...sc.values()].filter(x => x > 1).length; return `<div class="row warnbox" style="justify-content:space-between"><span>Seriye göre mükerrer: seri numarası birebir aynı <b>${fmt(n)}</b> seri, listede ${fmt(rows.length)} cihaz (BILA / boş seri hariç, marka fark etmez). Aynı seriler alt alta sıralı.${lsGet("damga.serHide", []).length ? ` <button class="link" data-act="edserreset">Gizlenen ${lsGet("damga.serHide", []).length} seriyi geri getir</button>` : ""}</span><button class="btn sm" data-act="eddupseri">Kapat</button></div>`; })() : ""}
    <div class="row" ${E.ids ? "hidden" : ""}>
      <input id="ed-q" type="search" placeholder="Firma, adres, seri no, QR, sıra no ara" value="${esc(E.q)}" style="min-width:260px">
      <select id="ed-ilce"><option value="">Tüm ilçeler</option>${ilces.map(x => `<option ${x === E.ilce ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
      <select id="ed-durum"><option value="">Tüm durumlar</option>${ED_STATUS.map(s => `<option value="${s}" ${E.durum === s ? "selected" : ""}>${esc(CAT[s]?.l || s)}</option>`).join("")}</select>
      ${E.capOn ? `<select id="ed-cap" aria-label="Kapasite"><option value="">Tüm kapasiteler</option>${edCaps().map(([k, n]) => `<option value="${esc(k)}" ${E.cap === k ? "selected" : ""}>${esc(k)} · ${fmt(n)}</option>`).join("")}</select>` : ""}
      <span class="muted" style="font-size:.86rem">${fmt(rows.length)} cihaz</span>
    </div>
    <datalist id="dl-ilce">${[...new Set([...(YER.iller.ANTALYA || []), ...ilces])].map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="tbl-wrap edwrap"><table class="edtbl"><thead><tr><th><input type="checkbox" data-act="edall" ${allSel ? "checked" : ""} title="Bu sayfadakileri seç"></th>${dupMode ? "<th>Ana kayıt</th>" : ""}<th class="num">Lok. no</th><th class="num">Cihaz no</th><th>QR</th>${E.cols.map(k => `<th>${esc(EDF[k][1])}${EDF[k][2] === "biz" ? " ⌂" : ""}</th>`).join("")}</tr></thead><tbody>
      ${(dupMode ? pgG.map(g => ({ g, rows: g.items })) : [{ g: null, rows: pg }]).map(({ g, rows: rr }) => (g ? edGroupHead(g, E.cols.length + 5) : "") + rr.map(o => `<tr class="${E.dirty.has(o.d[0]) ? "chg" : ""}"><td><input type="checkbox" data-act="edsel" data-id="${o.d[0]}" ${E.sel.has(o.d[0]) ? "checked" : ""}></td>
        ${g ? `<td style="white-space:nowrap"><label style="display:inline-flex;gap:4px;align-items:center;font-size:.82rem"><input type="radio" name="edkeep-${esc(g.s)}" data-act="edkeep" data-s="${esc(g.s)}" value="${o.d[0]}" ${edKeepOf(g) === o.d[0] ? "checked" : ""}> Tut</label> · <button class="link" data-act="edrm1" data-id="${o.d[0]}" style="font-size:.82rem;color:var(--bad)">Listeden çıkar</button></td>` : ""}
        <td class="num mono">${lno(o.l)}</td><td class="num mono">${cno(o.d)}${o.d[25] ? ` <span class="dupflag">M</span>` : ""}</td><td class="mono"><button class="link" data-act="dev" data-c="${o.d[11]}">${esc(o.d[11])}</button></td>
        ${E.cols.map(k => `<td>${edCell(o, k)}</td>`).join("")}</tr>`).join("")).join("") || `<tr><td colspan="${E.cols.length + 5}" class="muted">Kayıt yok.</td></tr>`}
    </tbody></table></div>
    ${pages > 1 ? `<div class="row"><button class="btn sm" data-act="edpage" data-p="${E.page - 1}" ${E.page ? "" : "disabled"}>‹ Önceki</button><span class="muted mono">${E.page + 1} / ${pages}</span><button class="btn sm" data-act="edpage" data-p="${E.page + 1}" ${E.page + 1 < pages ? "" : "disabled"}>Sonraki ›</button>
      <button class="link" data-act="edselall">Filtredeki ${fmt(rows.length)} cihazın tümünü seç</button></div>` : ""}
    ${E.sel.size || nd ? `<div class="bulkbar">
      ${E.sel.size ? `<b>${fmt(E.sel.size)} seçili</b>
        <select id="ed-bk">${ED_FIELDS.map(([k, lab]) => `<option value="${k}">${esc(lab)}</option>`).join("")}</select>
        <input id="ed-bv" placeholder="Yeni değer" style="width:180px"><button class="btn sm" data-act="edbulk">Seçilenlere uygula</button>
        <button class="btn sm warn" data-act="edremove">Dönemden çıkar</button><button class="link" data-act="edselclear">Seçimi temizle</button>` : ""}
      ${nd ? `<span style="margin-left:auto"></span><b id="ed-nd">${fmt(nd)} cihazda değişiklik</b><button class="link" data-act="edundo">Geri al</button><button class="btn primary" data-act="edsave" ${E.busy ? "disabled" : ""}>${E.busy ? "Kaydediliyor…" : "Değişiklikleri kaydet"}</button>` : ""}
    </div>` : ""}
  </div>`;
}
/* değişiklik haritası: cihaz id → { alan: değer } ; kayıt: lokasyon, cihaz ve dönem satırı ayrı güncellenir */
function edNorm(k, v){
  v = String(v ?? "").trim();
  if (k === "son_damga_yili"){ const n = parseInt(v, 10); return n >= 1990 && n <= 2100 ? n : null; }
  if (["unvan","il","ilce","grup"].includes(k)) return v.toLocaleUpperCase("tr-TR") || (k === "grup" ? null : v);
  if (k === "durum_grup") return ED_STATUS.includes(v) ? v : (statusCat(v) || "bekliyor");
  return v;
}
async function saveEdits(dirty, step){
  const biz = new Map(), dev = new Map(), item = new Map(); let skipped = 0;
  dirty.forEach((ch, id) => { const o = DEVID[id]; if (!o) return;
    Object.entries(ch).forEach(([k, v]) => { const f = EDF[k]; if (!f) return; const val = edNorm(k, v);
      if (f[2] === "biz"){ const m = biz.get(o.l.k) || {}; m[f[3]] = val; if (k === "ilce" || k === "il"){ const pf = placeFix(k === "il" ? val : (m.il || o.l.il), k === "ilce" ? val : (m.ilce || o.l.i), o.l.a); m.il = pf.il; m.ilce = pf.ilce; } biz.set(o.l.k, m); }
      else if (f[2] === "dev" || st.noPeriod || !o.d[24]){ if (f[2] === "item" && !st.noPeriod && !o.d[24]){ skipped++; return; } const m = dev.get(id) || {}; m[f[3]] = val; dev.set(id, m); }
      else { const m = item.get(o.d[24]) || {}; m[f[3]] = val; m.updated_at = new Date().toISOString(); item.set(o.d[24], m); } }); });
  const jobs = [...[...biz].map(([id, p]) => () => q(sb.from("businesses").update(p).eq("id", id))),
    ...[...dev].map(([id, p]) => () => q(sb.from("devices").update(p).eq("id", id))),
    ...[...item].map(([id, p]) => () => q(sb.from("period_items").update(p).eq("id", id)))];
  let done = 0, fail = 0;
  for (let i = 0; i < jobs.length; i += 8){ const r = await Promise.allSettled(jobs.slice(i, i + 8).map(j => j())); r.forEach(x => x.status === "rejected" && fail++); done = Math.min(i + 8, jobs.length); if (step && (done % 80 === 0 || done === jobs.length)) step(`Kaydedilen: ${done} / ${jobs.length}`); }
  return { biz: biz.size, dev: dev.size, item: item.size, fail, skipped };
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act; if (!a.startsWith("ed")) return; const E = edState();
  switch (a){
    case "edopen": E.open = true; render(); break;
    case "edclose": if (E.dirty.size && !confirm("Kaydedilmemiş değişiklikler silinsin mi?")) break; E.open = false; E.dirty.clear(); E.sel.clear(); render(); break;
    case "edcol": { const k = b.dataset.k; E.cols = E.cols.includes(k) ? E.cols.filter(x => x !== k) : ED_FIELDS.map(f => f[0]).filter(x => x === k || E.cols.includes(x)); lsSet("damga.edcols", E.cols); render(); break; }
    case "edcolreset": E.cols = ED_DEFAULT.slice(); lsSet("damga.edcols", E.cols); render(); break;
    case "edcolall": E.cols = ED_FIELDS.map(f => f[0]); lsSet("damga.edcols", E.cols); render(); break;
    case "edpage": E.page = +b.dataset.p; render(); $("#editor")?.scrollIntoView(); break;
    case "edselall": edRows().forEach(o => E.sel.add(o.d[0])); render(); break;
    case "edselclear": E.sel.clear(); render(); break;
    case "edidsclear": E.ids = null; E.idsLabel = ""; E.page = 0; render(); break;
    case "edcap": E.capOn = !E.capOn; if (!E.capOn) E.cap = ""; E.colsOpen = true; E.page = 0; render(); break;
    case "eddupseri": E.dupSeri = !E.dupSeri; E.page = 0; E.colsOpen = true; if (E.dupSeri){ ["marka","seri_no","model","max_cap"].forEach(k => { if (!E.cols.includes(k)) E.cols.push(k); }); } render(); break;
    case "edserreset": lsSet("damga.serHide", []); render(); break;
    case "edmerge": edMerge(b.dataset.s); break;
    case "ednotdup": { const h = lsGet("damga.serHide", []); h.push(b.dataset.s); lsSet("damga.serHide", h); render(); toast(`Seri ${b.dataset.s} mükerrer listesinden kaldırıldı`); break; }
    case "edrm1": { const o = DEVID[+b.dataset.id]; if (!o) break;
      if (!o.d[24] || st.noPeriod){ toast("Bu kayıt dönem listesinde değil"); break; }
      if (!confirm(`${o.d[11]} · ${titleTR(o.l.n)} ${YEAR} listesinden çıkarılsın mı? Cihaz kaydı ve QR silinmez.`)) break;
      try { await q(sb.from("period_items").delete().eq("id", o.d[24])); E.sel.delete(o.d[0]); E.dirty.delete(o.d[0]); await reloadDevices(); render(); toast("Listeden çıkarıldı"); } catch(err){ toast("Çıkarılamadı: " + err.message); } break; }
    case "edundo": E.dirty.clear(); render(); break;
    case "edbulk": { const k = $("#ed-bk").value, v = $("#ed-bv").value; const f = EDF[k];
      if (f[5] === "durum" && !ED_STATUS.includes(v) && !statusCat(v)){ toast("Durum için: " + ED_STATUS.join(", ")); break; }
      E.sel.forEach(id => { const o = DEVID[id]; if (!o) return; const m = E.dirty.get(id) || {}; m[k] = v; E.dirty.set(id, m); });
      if (!E.cols.includes(k)){ E.cols.push(k); lsSet("damga.edcols", E.cols); }
      render(); toast(`${fmt(E.sel.size)} cihazda “${f[1]}” değiştirildi; kaydetmeyi unutmayın`); break; }
    case "edremove": { const ids = [...E.sel].map(id => DEVID[id]?.d[24]).filter(Boolean);
      if (!ids.length){ toast("Seçilenler dönem listesinde değil"); break; }
      if (!confirm(`${ids.length} cihaz ${YEAR} dönem listesinden çıkarılsın mı? Cihaz kaydı ve QR silinmez.`)) break;
      try { for (let i = 0; i < ids.length; i += 200) await q(sb.from("period_items").delete().in("id", ids.slice(i, i + 200)));
        E.sel.clear(); await reloadDevices(); render(); toast(`${ids.length} cihaz dönemden çıkarıldı`); } catch(err){ toast("Çıkarılamadı: " + err.message); } break; }
    case "edsave": { E.busy = true; render();
      try { const r = await saveEdits(E.dirty); E.dirty.clear(); await reloadDevices();
        if (st.dup){ st.dup = { ...dupAudit(), target: {}, keep: {} }; initDupDefaults(); }
        if (E.ids){ E.ids = new Set([...E.ids].filter(id => DEVID[id])); }
        toast(`Kaydedildi: ${r.dev} cihaz, ${r.biz} lokasyon, ${r.item} dönem satırı${r.fail ? ` · ${r.fail} hata` : ""}`); }
      catch(err){ toast("Kaydedilemedi: " + err.message); }
      E.busy = false; render(); break; }
  }
});
document.addEventListener("change", e => {
  const t = e.target, a = t.dataset.act; if (!st.ed) return; const E = st.ed;
  if (a === "edcell"){ const id = +t.dataset.id, k = t.dataset.k, o = DEVID[id]; const orig = String(EDF[k][4](o) ?? "");
    const m = E.dirty.get(id) || {}; if (String(t.value) === orig) delete m[k]; else m[k] = t.value;
    Object.keys(m).length ? E.dirty.set(id, m) : E.dirty.delete(id);
    t.classList.toggle("dirty", m[k] !== undefined); t.closest("tr")?.classList.toggle("chg", E.dirty.has(id));
    const nd = document.getElementById("ed-nd");
    if (nd && E.dirty.size) nd.textContent = `${fmt(E.dirty.size)} cihazda değişiklik`;
    else { const ae = document.activeElement, key = ae && ae.dataset ? [ae.dataset.id, ae.dataset.k] : null; render();
      if (key && key[0]) document.querySelector(`[data-act="edcell"][data-id="${key[0]}"][data-k="${key[1]}"]`)?.focus(); }
    return; }
  if (a === "edsel"){ t.checked ? E.sel.add(+t.dataset.id) : E.sel.delete(+t.dataset.id); render(); return; }
  if (a === "edall"){ const rows = edRows(), pg = rows.slice(E.page * 50, E.page * 50 + 50); pg.forEach(o => t.checked ? E.sel.add(o.d[0]) : E.sel.delete(o.d[0])); render(); return; }
  if (t.id === "ed-ilce"){ E.ilce = t.value; E.page = 0; render(); return; }
  if (a === "edkeep"){ E.keep = E.keep || {}; E.keep[t.dataset.s] = +t.value; return; }
  if (t.id === "ed-cap"){ E.cap = t.value; E.page = 0; render(); return; }
  if (t.id === "ed-durum"){ E.durum = t.value; E.page = 0; render(); return; }
});
document.addEventListener("input", e => {
  if (e.target.id !== "ed-q" || !st.ed) return;
  st.ed.q = e.target.value; st.ed.page = 0; clearTimeout(cfgT);
  cfgT = setTimeout(() => { const pos = e.target.selectionStart; render(); const n = document.getElementById("ed-q"); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(_){} } }, 300);
});
document.addEventListener("toggle", e => { if (e.target.id === "ed-cols" && st.ed) st.ed.colsOpen = e.target.open; }, true);
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="dupedit"]'); if (!b || !st.dup) return;
  const grp = st.dup.dev[+b.dataset.g]; if (!grp) return; const E = edState();
  E.open = true; E.page = 0; st.view = "musteriler"; st.cu.mode = "tablo"; E.ids = new Set(grp.map(o => o.d[0])); E.idsLabel = `Mükerrer grup: ${grp[0].d[2]} · seri ${grp[0].d[4]}`;
  ["marka","seri_no","model","max_cap","durum_grup"].forEach(k => { if (!E.cols.includes(k)) E.cols.push(k); });
  render(); setTimeout(() => $("#editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
});
/* ---------------- fatura / ödeme notu sayfaları ---------------- */
function fatRows(k){
  const devs = DEVS.filter(o => !o.l.dep && odemeCat(o.d[10]) && (!k || odemeCat(o.d[10]) === k));
  const by = new Map(); devs.forEach(o => { (by.get(o.l.k) || by.set(o.l.k, []).get(o.l.k)).push(o); });
  return [...by.values()].map(arr => ({ l: arr[0].l, devs: arr.sort((a, b) => (a.d[26] || 0) - (b.d[26] || 0)) }))
    .sort((a, b) => b.devs.length - a.devs.length || a.l.n.localeCompare(b.l.n, "tr"));
}
function fatOptions(cur){ return ODEME.filter(x => x[0] !== "diger").map(x => `<option value="${x[0]}" ${cur === x[0] ? "selected" : ""}>${esc(x[1])}</option>`).join("")
  + (cur === "diger" ? `<option value="diger" selected>Diğer not</option>` : "") + `<option value="__new">+ Serbest not yaz…</option><option value="__clear">Notu kaldır</option>`; }
function fatSelect(d){ const c = odemeCat(d[10]); return `<select class="edin" data-act="fatone" data-id="${d[0]}" aria-label="Ödeme durumu">${fatOptions(c)}</select>${c === "diger" || (c && fatKey(d[10]) !== ODEME_BY[c][2]) ? `<div class="muted" style="font-size:.74rem">${esc(d[10])}</div>` : ""}`; }
async function fatSave(ids, val){
  if (val === "diger") return false;
  if (val === "__clear") val = ""; else if (val === "__new"){ val = (prompt("Serbest fatura / ödeme notu") || "").trim(); if (!val) return false; } else val = ODEME_BY[val]?.[2] || val;
  val = fatKey(val);
  const dirty = new Map(ids.filter(id => DEVID[id] && fatKey(DEVID[id].d[10]) !== val).map(id => [id, { fatura_notu: val }]));
  if (!dirty.size){ toast("Değişiklik yok"); return false; }
  try { const r = await saveEdits(dirty); await reloadDevices(); st.fsel.clear(); render();
    toast(`${fmt(dirty.size)} cihazın ödeme durumu “${val ? odemeLab(odemeCat(val)) : "boş"}” yapıldı${r.fail ? ` · ${r.fail} hata` : ""}`); return true; }
  catch(e){ toast("Kaydedilemedi: " + e.message); render(); return false; }
}
function viewFatura(){
  if (!st.fsel) st.fsel = new Set();
  const k = st.fk || "", all = S.faturaAll, rows = fatRows(k), nDev = rows.reduce((s, r) => s + r.devs.length, 0);
  const qq = TRU(st.fq || ""), shown = qq ? rows.filter(r => TRU(r.l.n + " " + r.l.a + " " + r.l.i + " " + r.devs.map(o => o.d[4] + " " + o.d[11]).join(" ")).includes(qq)) : rows;
  const tamam = rows.reduce((s, r) => s + r.devs.filter(o => o.d[8] === "tamam").length, 0);
  return `<div class="stack">
  <div class="row" style="justify-content:space-between;align-items:flex-end">
    <div><button class="btn sm" data-act="view" data-v="ozet">‹ Yönetici özeti</button>
      <div class="eyebrow" style="margin-top:10px">Ödeme durumu · ${YEAR} dönemi${(st.gf||[]).length ? " · grup: " + esc(st.gf.join(", ")) : ""}</div>
      <h2>${k ? esc(odemeLab(k)) : "Tüm ödeme durumları"}</h2></div>
    <button class="btn primary" data-act="fatcsv" ${nDev ? "" : "disabled"}>CSV indir (${fmt(nDev)} cihaz)</button></div>
  <div class="chips" role="group" aria-label="Not">
    <button class="chip" data-act="fatpage" data-k="" aria-pressed="${!k}">Tümü · ${fmt(all.reduce((s, x) => s + x[1], 0))}</button>
    ${all.map(([key, n]) => `<button class="chip" data-act="fatpage" data-k="${esc(key)}" aria-pressed="${k === key}">${esc(odemeLab(key))} · ${fmt(n)}</button>`).join("")}</div>
  <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <div class="card kpi" style="--c:var(--brand)"><span>Cihaz</span><b>${fmt(nDev)}</b><small>bu notla kayıtlı</small></div>
    <div class="card kpi" style="--c:var(--tut)"><span>Müşteri / lokasyon</span><b>${fmt(rows.length)}</b><small>${fmt(new Set(rows.map(r => TRU(r.l.n))).size)} farklı ünvan</small></div>
    <div class="card kpi" style="--c:var(--ok)"><span>Damgası tamamlanan</span><b>${fmt(tamam)}</b><small>${nDev ? "%" + (tamam / nDev * 100).toFixed(1).replace(".", ",") : "—"} · ${YEAR}</small></div></div>
  <div class="card pad stack" style="gap:10px">
    <div class="row"><input id="fat-q" type="search" placeholder="Müşteri, adres, seri no, QR ara" value="${esc(st.fq || "")}" style="flex:1 1 260px"><span class="muted" style="font-size:.86rem">${fmt(shown.length)} müşteri</span></div>
    ${shown.slice(0, 300).map(r => { const l = r.l; return `<div class="share" style="gap:8px">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div style="min-width:0"><div class="muted mono" style="font-size:.76rem">Lok. ${lno(l)}${l.g ? ` · <span class="gtag">${esc(l.g)}</span>` : ""}</div>
          <b>${esc(titleTR(l.n))}</b><div class="muted" style="font-size:.86rem">${esc(titleTR(l.a))} · ${esc(titleTR(l.i))} / ${esc(titleTR(l.il))}</div>
          <div style="font-size:.86rem">${l.t ? `Tel: <a href="tel:${esc(String(l.t).replace(/\s/g, ""))}">${esc(l.t)}</a>` : `<span class="muted">Telefon yok</span>`} · ${fmt(l.d.length)} cihaz (bu dönem) · konum ${l.p === "ok" ? "doğrulandı" : "yaklaşık"}</div></div>
        <div class="row" style="gap:6px"><span class="pill admin">${fmt(r.devs.length)} cihaz</span>
          <select data-act="fatcust" data-k="${esc(l.k)}" aria-label="Bu müşterinin tüm cihazları" style="font-size:.82rem"><option value="">Tümünü değiştir…</option>${fatOptions("")}</select></div></div>
      <div class="tbl-wrap"><table class="rptbl"><thead><tr><th><input type="checkbox" data-act="fatall" data-k="${esc(l.k)}" ${r.devs.every(o => st.fsel.has(o.d[0])) ? "checked" : ""} title="Bu müşterinin tüm cihazları"></th><th class="r">Cihaz no</th><th>QR</th><th>Marka / model</th><th>Seri no</th><th>Max</th><th>Durum</th><th>Son damga</th><th>Ödeme durumu</th><th>Durum açıklaması</th></tr></thead><tbody>
        ${r.devs.map(o => { const d = o.d, si = stampInfo(o); return `<tr><td><input type="checkbox" data-act="fatsel" data-id="${d[0]}" ${st.fsel.has(d[0]) ? "checked" : ""}></td><td class="r mono">${cno(d)}</td><td class="mono"><button class="link" data-act="dev" data-c="${d[11]}">${esc(d[11])}</button></td><td>${esc(d[2])} ${esc(d[3])}</td><td class="mono">${esc(d[4] || "—")}</td><td class="mono">${esc(d[12] || "")}</td>
          <td><span class="st ${RP_OUT.includes(d[8]) ? "kapsamdisi" : d[8]}">${esc(CAT[d[8]]?.l || d[8])}</span></td><td class="mono">${si.last || "—"}</td><td>${fatSelect(d)}</td><td class="muted">${esc(d[9])}</td></tr>`; }).join("")}
      </tbody></table></div></div>`; }).join("") || `<div class="empty">Kayıt yok.</div>`}
    ${shown.length > 300 ? `<div class="muted">İlk 300 müşteri gösteriliyor; tamamı için CSV indirin.</div>` : ""}
    ${st.fsel.size ? `<div class="bulkbar"><b>${fmt(st.fsel.size)} cihaz seçili</b><span>Ödeme durumunu değiştir:</span>
      <select id="fat-bulk">${fatOptions("")}</select><button class="btn primary sm" data-act="fatbulk">Uygula</button><button class="link" data-act="fatclear">Seçimi temizle</button></div>` : ""}
  </div></div>`;
}
function fatCSV(){
  const k = st.fk || "", rows = [["Ödeme durumu","Fatura / ödeme notu","Lok. no","Cihaz no","Grup","Müşteri","İl","İlçe","Adres","Telefon","QR no","Cinsi","Marka","Model","Seri no","Max","Sınıf","Durum","Durum açıklaması","Son damga","Konum"]];
  fatRows(k).forEach(r => r.devs.forEach(o => { const d = o.d, l = r.l; rows.push([odemeLab(odemeCat(d[10])), d[10], l.no || "", d[26] || "", l.g || "", l.n, l.il, l.i, l.a, l.t, d[11], d[1], d[2], d[3], d[4], d[12], d[16], CAT[d[8]]?.l || d[8], d[9], stampInfo(o).last || "", l.p === "ok" ? "Doğrulandı" : "Yaklaşık"]); }));
  const tag = k ? "-" + k.toLocaleLowerCase("tr-TR").replace(/[^0-9a-zçğıöşü]+/g, "-") : "";
  downloadFile(`damga-${YEAR}-fatura${tag}-${todayISO()}.csv`, "﻿" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n"));
  toast(`${fmt(rows.length - 1)} satır CSV olarak indirildi`);
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "fatpage"){ st.fk = b.dataset.k || ""; st.fq = ""; st.fsel = new Set(); st.view = "fatura"; render(); window.scrollTo(0, 0); }
  if (b.dataset.act === "fatcsv") fatCSV();
});
document.addEventListener("input", e => {
  if (e.target.id !== "fat-q") return;
  st.fq = e.target.value; clearTimeout(cfgT);
  cfgT = setTimeout(() => { const pos = e.target.selectionStart; render(); const n = document.getElementById("fat-q"); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(_){} } }, 250);
});
document.addEventListener("change", async e => {
  const t = e.target, a = t.dataset.act; if (!a || !a.startsWith("fat")) return; if (!st.fsel) st.fsel = new Set();
  if (a === "fatsel"){ t.checked ? st.fsel.add(+t.dataset.id) : st.fsel.delete(+t.dataset.id); render(); return; }
  if (a === "fatall"){ const r = fatRows(st.fk || "").find(x => x.l.k === t.dataset.k); (r ? r.devs : []).forEach(o => t.checked ? st.fsel.add(o.d[0]) : st.fsel.delete(o.d[0])); render(); return; }
  if (a === "fatone"){ const ok = await fatSave([+t.dataset.id], t.value); if (!ok) render(); return; }
  if (a === "fatcust"){ if (!t.value) return; const r = fatRows(st.fk || "").find(x => x.l.k === t.dataset.k); const ids = (r ? r.devs : []).map(o => o.d[0]);
    if (!confirm(`${titleTR(BY[t.dataset.k]?.n || "")}: ${ids.length} cihazın notu değiştirilsin mi?`)){ t.value = ""; return; } const ok = await fatSave(ids, t.value); if (!ok) render(); return; }
});
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "fatclear"){ st.fsel.clear(); render(); }
  if (b.dataset.act === "fatbulk"){ const v = $("#fat-bulk").value, ids = [...st.fsel]; if (!confirm(`${ids.length} cihazın ödeme durumu değiştirilsin mi?`)) return; await fatSave(ids, v); }
});
/* ---------------- SMS (Sanal Santral, Supabase Edge Function "sms-gonder") ---------------- */
const SMS_TPL = "Sayın {firma}, {donem} yılı periyodik damga (muayene) çalışması kapsamında ekibimiz {ilce} bölgesinde olacaktır. {cihaz} cihazınız için bilgilendirme. ANTKA KALİBRASYON";
const mob90 = p => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("0")) d = "90" + d.slice(1); if (d.length === 10 && d[0] === "5") d = "90" + d; return /^905\d{9}$/.test(d) ? d : null; };
const GSM7 = /^[A-Za-z0-9 @£$¥èéùìòÇØøÅå_ÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà\n\r^{}\\[~\]|€]*$/;
function smsParts(t){ const n = [...t].length, g = GSM7.test(t); const one = g ? 160 : 70, multi = g ? 153 : 67; return { n, g, parts: n <= one ? (n ? 1 : 0) : Math.ceil(n / multi) }; }
function smsFill(tpl, l){ return tpl.replace(/\{firma\}/g, titleTR(String(l.n).split(" · ")[0])).replace(/\{ilce\}/g, titleTR(l.i)).replace(/\{il\}/g, titleTR(l.il))
  .replace(/\{donem\}/g, String(YEAR)).replace(/\{cihaz\}/g, String(l.d.length || l.nAll || "")); }
async function smsContacts(){ if (st.smsCt) return st.smsCt; const m = {}; try { (await q(sb.from("contacts").select("business_id,tel").limit(10000))).forEach(c => { if (mob90(c.tel) && !m[c.business_id]) m[c.business_id] = c.tel; }); } catch(_){}
  st.smsCt = m; return m; }
function smsRecipients(){
  const ct = st.smsCt || {}, ok = [], bad = [];
  [...cuEff()].map(k => BY[k]).filter(Boolean).forEach(l => { const p = mob90(l.t) || mob90(ct[l.k]); p ? ok.push({ l, p }) : bad.push(l); });
  return { ok, bad };
}
function viewSmsComposer(){
  const C = st.smsc; if (!C || !C.open) return "";
  const R = smsRecipients(), ex = R.ok[0] ? smsFill(C.text, R.ok[0].l) : smsFill(C.text, { n: "Örnek Firma", i: "KEPEZ", il: "ANTALYA", d: [1, 2] }), sp = smsParts(ex);
  return `<div class="card pad stack" style="gap:10px;border-color:var(--brand)" id="smscomp">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">Müşterilere SMS · ${fmt(cuEff().size)} müşteri seçili</h3><button class="btn sm" data-act="smsclose">Kapat</button></div>
    <div class="row" style="gap:16px;font-size:.9rem"><span><b>${fmt(R.ok.length)}</b> geçerli cep numarası</span>${R.bad.length ? `<span class="muted">${fmt(R.bad.length)} müşteride cep numarası yok (sabit hat ya da boş), gönderilmeyecek</span>` : ""}</div>
    <label class="f">Mesaj <textarea id="sms-text" rows="4" maxlength="900" style="font:inherit">${esc(C.text)}</textarea></label>
    <div class="muted" style="font-size:.8rem">Değişkenler: <code>{firma}</code> <code>{ilce}</code> <code>{il}</code> <code>{donem}</code> <code>{cihaz}</code> (bu dönemdeki cihaz sayısı). Bilgilendirme amaçlı mesaj; reklam/kampanya içeriği İYS onayı gerektirir.</div>
    <div class="share" style="gap:4px"><div class="muted" style="font-size:.78rem">Önizleme${R.ok[0] ? ` · ${esc(titleTR(R.ok[0].l.n))} · ${esc(R.ok[0].p)}` : ""}</div><div style="white-space:pre-wrap">${esc(ex)}</div>
      <div class="muted" style="font-size:.78rem">${sp.n} karakter · ${sp.parts} SMS${sp.g ? "" : " (Türkçe karakter var; SMS başına 70 karakter)"} · toplam yaklaşık ${fmt(sp.parts * R.ok.length)} SMS</div></div>
    ${R.bad.length ? `<details><summary>Cep numarası olmayan ${fmt(R.bad.length)} müşteri</summary><div class="muted" style="font-size:.84rem;margin-top:6px">${R.bad.slice(0, 60).map(l => `${esc(titleTR(l.n))} (${esc(l.t || "tel yok")})`).join(" · ")}${R.bad.length > 60 ? " …" : ""}</div></details>` : ""}
    <div class="row"><button class="btn primary" data-act="smssend" ${C.busy || !R.ok.length ? "disabled" : ""}>${C.busy ? "Gönderiliyor…" : `${fmt(R.ok.length)} numaraya gönder`}</button>
      ${C.res ? `<span style="font-size:.9rem"><b style="color:var(--ok)">${fmt(C.res.sent)} gönderildi</b>${C.res.failed ? ` · <b style="color:var(--bad)">${fmt(C.res.failed)} gönderilemedi</b>` : ""}</span>` : ""}</div>
    ${C.res && C.res.failed ? `<details><summary>Gönderilemeyenler</summary><div class="muted" style="font-size:.84rem;margin-top:6px">${C.res.results.filter(r => !r.ok).slice(0, 100).map(r => `${esc(r.phone)}: ${esc(r.error || "")}`).join("<br>")}</div></details>` : ""}
  </div>`;
}
function viewSmsCard(){
  const L = st.smsLog;
  return `<div class="card pad stack" style="gap:10px"><h3>SMS · Sanal Santral</h3>
    <p class="muted" style="margin:0;font-size:.9rem">Saha ekibinin telefonla girişindeki doğrulama kodu ve müşteri bilgilendirme SMS'leri Sanal Santral üzerinden gider. API anahtarı ve gönderici başlığı Supabase'de gizli tutulur, bu sayfada görünmez. Müşterilere toplu SMS: Müşteriler & gruplar → müşterileri seçin → SMS gönder.</p>
    <form id="smsTest" class="row"><input id="sms-test-no" inputmode="tel" placeholder="05xx xxx xx xx" style="width:170px" required><button class="btn">Test SMS gönder</button><button class="btn sm" type="button" data-act="smsdiag">Kurulumu kontrol et</button><button class="link" type="button" data-act="smslog">${L ? "Günlüğü yenile" : "Son gönderimleri göster"}</button></form>
    ${st.smsDiagR ? `<div class="share" style="gap:4px"><div class="muted" style="font-size:.78rem">Kontrol · ${esc(st.smsDiagR.at)}</div>${st.smsDiagR.rows.map(r => `<div style="font-size:.88rem"><b style="color:${r.ok ? "var(--ok)" : "var(--retry)"}">${r.ok ? "✓" : "✗"}</b> ${esc(r.t)}${r.h ? `<div class="muted" style="font-size:.8rem;margin-left:18px">${esc(r.h)}</div>` : ""}</div>`).join("")}</div>` : ""}
    ${L ? (L.err ? `<div class="warnbox">${esc(L.err)}</div>` : `<div class="tbl-wrap"><table class="rptbl" style="font-size:.84rem"><thead><tr><th>Zaman</th><th>Tür</th><th>Telefon</th><th>Durum</th><th>Mesaj / hata</th></tr></thead><tbody>
      ${L.rows.map(r => `<tr><td class="mono">${esc(String(r.gonderim || "").slice(0, 16).replace("T", " "))}</td><td>${esc(r.tur || "")}</td><td class="mono">${esc(r.telefon || "")}</td><td>${r.durum === "gonderildi" ? `<span class="st tamam">Gönderildi</span>` : `<span class="st tekrar">${esc(r.durum || "")}</span>`}</td><td class="muted" style="white-space:normal">${esc(r.hata || r.mesaj || "")}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">Henüz gönderim yok.</td></tr>`}
    </tbody></table></div>`) : ""}
  </div>`;
}
async function smsDiag(){
  const D = { at: new Date().toLocaleTimeString("tr-TR"), rows: [] }, add = (ok, t, h) => D.rows.push({ ok, t, h });
  let tok = ""; try { tok = (await sb.auth.getSession()).data.session?.access_token || ""; } catch(_){}
  try {
    const r = await fetch(`${CFG.SUPABASE_URL}/functions/v1/sms-gonder`, { method: "POST", headers: { "Content-Type": "application/json", apikey: CFG.SUPABASE_ANON_KEY, Authorization: "Bearer " + (tok || CFG.SUPABASE_ANON_KEY) }, body: JSON.stringify({ ping: true }) });
    let j = null; try { j = await r.json(); } catch(_){}
    if (r.status === 404) add(false, "sms-gonder fonksiyonu bulunamadı", "Supabase → Edge Functions'ta fonksiyon adı birebir “sms-gonder” olmalı ve Deploy edilmiş olmalı.");
    else if (r.status === 401) add(false, "Fonksiyon oturumu reddetti (401)", "Sayfadan çıkış yapıp tekrar girin. Sürerse fonksiyonun “Verify JWT” ayarı açık kalmalı, anahtarlar config.js ile aynı projeye ait olmalı.");
    else if (r.status === 403) add(false, "Yalnızca yönetici SMS gönderebilir (403)", "Bu hesabın rolü admin olmalı.");
    else if (r.status === 546) add(false, "Fonksiyon kaynak sınırına takıldı (546)", "Eski sms-gonder kodu Sanal Santral'dan yanıt beklerken zaman aşımına uğruyor. damga-sms-fonksiyonlar.zip içindeki güncel sms-gonder/index.ts'i yapıştırıp Deploy edin; yeni kod en fazla 8 sn bekler ve hangi adresin yanıt verdiğini burada gösterir.");
    else if (!r.ok) add(false, `Fonksiyon hata verdi (${r.status})`, (j && (j.error || j.message || j.msg)) || "Supabase → Edge Functions → sms-gonder → Logs bölümüne bakın.");
    else if (j && j.ok){ add(true, "sms-gonder fonksiyonu çalışıyor", "Adres: " + (j.api || ""));
      add(!!j.secrets.SS_API_KEY, "SS_API_KEY (API şifresi) tanımlı", j.secrets.SS_API_KEY ? "" : "Edge Functions → Secrets → SS_API_KEY adıyla ss_live_… anahtarını ekleyin.");
      add(!!j.secrets.SS_USERNAME, "SS_USERNAME (API kullanıcı adı)", j.secrets.SS_USERNAME ? "" : "Zorunlu: Sanal Santral SMS API kullanıcı adı. Şifre SS_API_KEY'e yazılır (API Basic Authentication ile çalışıyor).");
      add(!!j.secrets.SS_SENDER, "SS_SENDER (gönderici başlığı)", j.secrets.SS_SENDER ? "" : "Zorunlu: Sanal Santral'da onaylı gönderici başlığı (Senders listesindeki ad, birebir).");
      if (j.tried){ (j.tried || []).forEach(x => add(x.status > 0 && x.status < 500, `Sanal Santral ${x.url.replace(/^https?:\/\//, "")}`, x.status ? `HTTP ${x.status}` : "Yanıt yok (bağlantı kurulamadı)"));
        const c = j.credit; if (c && c.status){ const err = c.body && c.body.err, cr = c.body && c.body.data; add(c.status === 200 && !(err && (err.code || err.message)), "Kullanıcı adı / şifre (kredi sorgusu)", c.status === 200 && !(err && (err.code || err.message)) ? "Kredi: " + (typeof cr === "object" ? JSON.stringify(cr).slice(0, 120) : cr) + ` · kullanılan adres: ${j.base}` : `HTTP ${c.status}: ${(err && (err.message || err.code)) || JSON.stringify(c.body).slice(0, 160)} · SS_USERNAME / SS_API_KEY değerlerini kontrol edin.`); }
        else if (j.tried.length && j.tried.every(x => !x.status)) add(false, "Sanal Santral sunucusuna ulaşılamıyor", "Supabase sunucusundan hiçbir adres yanıt vermedi. Sanal Santral'a, IP kısıtlaması olup olmadığını ve API'nin dış erişime açık portunu sorun.");
        if (j.senders && j.senders.status === 200){ const s = JSON.stringify(j.senders.body?.data ?? j.senders.body); add(true, "Gönderici başlıkları", s.slice(0, 160)); } }
      add(!!j.secrets.SEND_SMS_HOOK_SECRET, "SEND_SMS_HOOK_SECRET (giriş kodu kancası)", j.secrets.SEND_SMS_HOOK_SECRET ? "" : "Telefonla giriş için: sms-otp fonksiyonu + Authentication → Auth Hooks → Send SMS hook → üretilen secret bu adla eklenmeli."); }
    else add(false, "Fonksiyon eski sürüm", "damga-sms-fonksiyonlar.zip içindeki güncel sms-gonder/index.ts ile yeniden Deploy edin.");
  } catch(e){ add(false, "Fonksiyona ulaşılamadı", "sms-gonder Supabase'de yüklü değil ya da açılışta hata veriyor. Edge Functions listesinde sms-gonder görünüyor mu? Görünüyorsa Logs'taki kırmızı satırı kontrol edin."); }
  st.smsDiagR = D; render();
}
async function smsInvoke(items, tur){
  const { data, error } = await sb.functions.invoke("sms-gonder", { body: { items, tur, donem: YEAR } });
  if (error){ let m = error.message; try { const j = await error.context?.json?.(); if (j?.error) m = j.error; } catch(_){} throw new Error(/Failed to send|fetch/i.test(m) ? "SMS servisine ulaşılamadı (sms-gonder fonksiyonu kurulu mu?)" : m); }
  return data;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "smsopen"){ st.smsc = { open: true, text: (st.smsc && st.smsc.text) || SMS_TPL }; await smsContacts(); render(); setTimeout(() => $("#smscomp")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
  if (a === "smsclose"){ st.smsc = null; render(); }
  if (a === "smssend"){ const C = st.smsc, R = smsRecipients(); if (!R.ok.length) return;
    if (!confirm(`${R.ok.length} numaraya SMS gönderilsin mi?`)) return;
    C.busy = true; C.res = null; render(); const all = { sent: 0, failed: 0, results: [] };
    try { const items = R.ok.map(({ l, p }) => ({ phone: p, text: smsFill(C.text, l), business_id: l.k }));
      for (let i = 0; i < items.length; i += 200){ const r = await smsInvoke(items.slice(i, i + 200), "bilgilendirme"); all.sent += r.sent || 0; all.failed += r.failed || 0; all.results.push(...(r.results || [])); }
      toast(`${fmt(all.sent)} SMS gönderildi${all.failed ? `, ${all.failed} gönderilemedi` : ""}`);
    } catch(err){ toast("SMS gönderilemedi: " + err.message); }
    C.busy = false; C.res = all; render(); }
  if (a === "smsdiag"){ b.disabled = true; b.textContent = "Kontrol ediliyor…"; await smsDiag(); }
  if (a === "smslog"){ try { st.smsLog = { rows: await q(sb.from("sms_log").select("*").order("gonderim", { ascending: false }).limit(30)) }; } catch(err){ st.smsLog = { err: "Günlük okunamadı: " + err.message + " (damga-sms.sql çalıştırıldı mı?)" }; } render(); }
});
document.addEventListener("input", e => { if (e.target.id === "sms-text" && st.smsc){ st.smsc.text = e.target.value; clearTimeout(cfgT); cfgT = setTimeout(() => { const pos = e.target.selectionStart; render(); const n = $("#sms-text"); if (n){ n.focus(); try { n.setSelectionRange(pos, pos); } catch(_){} } }, 400); } });
document.addEventListener("submit", async e => {
  if (e.target.id !== "smsTest") return; e.preventDefault();
  const p = mob90($("#sms-test-no").value); if (!p){ toast("Cep numarasını 05xx xxx xx xx biçiminde yazın"); return; }
  try { const r = await smsInvoke([{ phone: p, text: `ANTKA KALİBRASYON Damga Takip test mesajı (${new Date().toLocaleString("tr-TR")}).` }], "test");
    toast(r.sent ? "Test SMS gönderildi" : "Gönderilemedi: " + (r.results?.[0]?.error || "bilinmeyen hata")); } catch(err){ toast(err.message); }
});
/* ---------------- müşteri düzenleme formu (açılır pencere): müşterinin tüm alanları + tüm cihazları ---------------- */
const MF_BIZ = [["unvan","Firma ünvanı",true],["sube","Şube",false],["il","İl",true],["ilce","İlçe",true],["mahalle","Mahalle",false],["adres","Adres",true,"wide"],
  ["tel","Telefon",false],["gsm","Cep (GSM)",false],["eposta","E-posta",false],["vkn","Vergi no",false],["vergi_dairesi","Vergi dairesi",false],["grup","Grup",false]];
const MF_DEV = ED_FIELDS.filter(f => f[2] !== "biz");
function mfOpen(keys){
  const ks = [...keys].filter(k => BY[k]); if (!ks.length){ toast("Önce müşteri seçin"); return; }
  st.mf = { keys: ks, i: 0, vals: {}, dev: {}, busy: false, err: "" }; mfLoad(); render();
  setTimeout(() => document.querySelector('.mfdlg [data-mfb="unvan"]')?.focus(), 30);
}
function mfDevices(k){ return Object.values(DEVID).filter(o => o.l.k === k).sort((a, b) => (b.inP - a.inP) || (a.d[26] || 1e12) - (b.d[26] || 1e12)); }
function mfLoad(){
  const M = st.mf, k = M.keys[M.i], l = BY[k], raw = RAW.biz.find(b => b.id === k) || {};
  M.orig = Object.fromEntries(MF_BIZ.map(([f]) => [f, String(f === "grup" ? (l.g || "") : f === "unvan" ? l.n : f === "adres" ? l.a : f === "ilce" ? l.i : f === "il" ? l.il : f === "tel" ? (raw.tel ?? l.t ?? "") : (raw[f] ?? ""))]));
  M.vals = { ...M.orig }; M.devOrig = {}; M.dev = {};
  mfDevices(k).forEach(o => { M.devOrig[o.d[0]] = Object.fromEntries(MF_DEV.map(f => [f[0], String(f[4](o) ?? "")])); M.dev[o.d[0]] = { ...M.devOrig[o.d[0]] }; });
  M.err = "";
}
function mfChanged(){ const M = st.mf; if (!M) return 0;
  let n = MF_BIZ.filter(([f]) => M.vals[f] !== M.orig[f]).length;
  Object.keys(M.dev).forEach(id => { n += MF_DEV.filter(f => M.dev[id][f[0]] !== M.devOrig[id][f[0]]).length; }); return n; }
function mfInput(attr, f, v, extra = ""){
  const def = EDF[f]; const t = def ? def[5] : (f === "grup" ? "grup" : "text");
  if (t === "durum") return `<select ${attr}>${ED_STATUS.map(s => `<option value="${s}" ${v === s ? "selected" : ""}>${esc(CAT[s]?.l || s)}</option>`).join("")}</select>`;
  if (t === "grup") return `<select ${attr}><option value="">—</option>${GROUPS.map(g => `<option ${v === g.ad ? "selected" : ""}>${esc(g.ad)}</option>`).join("")}</select>`;
  if (t === "sinif") return `<select ${attr}>${["I","II","III","IIII"].map(s => `<option ${v === s ? "selected" : ""}>${s}</option>`).join("")}</select>`;
  return `<input ${attr} value="${esc(v)}" ${t === "year" ? `inputmode="numeric" maxlength="4"` : ""} ${extra}>`;
}
function viewCustForm(){
  const M = st.mf; if (!M) return "";
  const k = M.keys[M.i], l = BY[k]; if (!l) return "";
  const devs = mfDevices(k), nch = mfChanged();
  const ilList = Object.keys(YER.iller || {}), ilceList = YER.iller?.[TRU(M.vals.il)] || YER.iller?.ANTALYA || [];
  return `<div class="mfback" data-act="mfbackdrop"><div class="mfdlg card" role="dialog" aria-modal="true" aria-labelledby="mf-title">
    <div class="mfhead"><div style="min-width:0"><div class="eyebrow">Müşteri kaydı · Lok. ${lno(l)}${M.keys.length > 1 ? ` · ${M.i + 1} / ${M.keys.length}` : ""}</div><h3 id="mf-title" style="margin:2px 0 0">${esc(titleTR(l.n))}</h3></div>
      <div class="row" style="gap:6px">${M.keys.length > 1 ? `<button class="btn sm" data-act="mfnav" data-d="-1" ${M.i ? "" : "disabled"}>‹ Önceki</button><button class="btn sm" data-act="mfnav" data-d="1" ${M.i < M.keys.length - 1 ? "" : "disabled"}>Sonraki ›</button>` : ""}<button class="btn sm" data-act="mfcancel" aria-label="Kapat">✕</button></div></div>
    <div class="mfbody">
      <h4 class="mfsec">Müşteri bilgileri</h4>
      <div class="mfgrid">${MF_BIZ.map(([f, lab, req, wide]) => `<label class="f${wide ? " wide" : ""}">${esc(lab)}${req ? " *" : ""}${mfInput(`data-mfb="${f}" class="${M.vals[f] !== M.orig[f] ? "dirty" : ""}"`, f, M.vals[f], f === "il" ? `list="mf-il"` : f === "ilce" ? `list="mf-ilce"` : "")}</label>`).join("")}</div>
      <datalist id="mf-il">${ilList.map(x => `<option value="${esc(x)}">`).join("")}</datalist><datalist id="mf-ilce">${ilceList.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
      <h4 class="mfsec">Cihazlar (${devs.length})</h4>
      ${devs.map(o => { const id = o.d[0], v = M.dev[id], dv = M.devOrig[id]; return `<div class="mfdev${o.inP ? "" : " out"}">
        <div class="row" style="justify-content:space-between;gap:6px"><b class="mono" style="font-size:.84rem">Cihaz ${cno(o.d)} · ${esc(o.d[11])}</b>
          <span class="muted" style="font-size:.78rem">${o.inP ? `${YEAR} listesinde` : `${YEAR} listesinde değil · durum alanları kaydedilmez`}${o.d[23] === false ? " · pasif" : ""}${o.d[25] ? ` · <span class="dupflag">MÜKERRER</span>` : ""}</span></div>
        <div class="mfgrid">${MF_DEV.map(f => { const dis = f[2] === "item" && !o.inP && !st.noPeriod; return `<label class="f${f[0] === "durum_ham" || f[0] === "bilgi" ? " wide" : ""}">${esc(f[1])}${mfInput(`data-mfd="${id}" data-k="${f[0]}" class="${v[f[0]] !== dv[f[0]] ? "dirty" : ""}" ${dis ? "disabled" : ""}`, f[0], v[f[0]])}</label>`; }).join("")}</div></div>`; }).join("") || `<div class="muted">Bu müşteride cihaz yok.</div>`}
      ${M.err ? `<div class="warnbox">${esc(M.err)}</div>` : ""}
    </div>
    <div class="mffoot"><span class="muted" id="mf-nch" style="font-size:.86rem">${nch ? `${nch} alan değişti` : "Değişiklik yok"}</span>
      <span style="flex:1"></span><button class="btn" data-act="mfcancel">İptal</button><button class="btn primary" data-act="mfsave" ${M.busy ? "disabled" : ""}>${M.busy ? "Kaydediliyor…" : "Kaydet"}</button></div>
  </div></div>`;
}
async function mfSave(){
  const M = st.mf, k = M.keys[M.i];
  const miss = MF_BIZ.filter(([f, , req]) => req && !String(M.vals[f] || "").trim()).map(x => x[1]);
  if (miss.length){ M.err = "Zorunlu alan boş: " + miss.join(", "); render(); return false; }
  for (const id of Object.keys(M.dev)){ const y = M.dev[id].son_damga_yili; if (y && !/^(19|20)\d\d$/.test(String(y).trim())){ M.err = `Cihaz ${cno(DEVID[id].d)}: son damga yılı 4 haneli yıl olmalı`; render(); return false; } }
  if (!mfChanged()){ return true; }
  M.busy = true; M.err = ""; render();
  try {
    const bp = {}; MF_BIZ.forEach(([f]) => { if (M.vals[f] !== M.orig[f]) bp[f] = ["unvan","il","ilce","grup"].includes(f) ? (String(M.vals[f]).trim().toLocaleUpperCase("tr-TR") || (f === "grup" ? null : "")) : String(M.vals[f]).trim(); });
    if (bp.il !== undefined || bp.ilce !== undefined){ const pf = placeFix(bp.il ?? M.orig.il, bp.ilce ?? M.orig.ilce, bp.adres ?? M.orig.adres); bp.il = pf.il; bp.ilce = pf.ilce; }
    if (Object.keys(bp).length) await q(sb.from("businesses").update(bp).eq("id", k));
    const dirty = new Map(); Object.keys(M.dev).forEach(id => { const ch = {}; MF_DEV.forEach(f => { if (M.dev[id][f[0]] !== M.devOrig[id][f[0]]) ch[f[0]] = M.dev[id][f[0]]; }); if (Object.keys(ch).length) dirty.set(+id, ch); });
    let r = { fail: 0 }; if (dirty.size) r = await saveEdits(dirty);
    await reloadDevices(); M.busy = false;
    toast(`Kaydedildi${r.fail ? ` · ${r.fail} alan kaydedilemedi` : ""}`); return !r.fail;
  } catch(e){ M.busy = false; M.err = "Kaydedilemedi: " + e.message; render(); return false; }
}
function mfClose(force){ if (!force && mfChanged() && !confirm("Kaydedilmemiş değişiklikler silinsin mi?")) return; st.mf = null; render(); }
document.addEventListener("click", async e => {
  if (!st.mf && !e.target.closest('[data-act="mfopen"],[data-act="mfopen1"]')) return;
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "mfopen") mfOpen(cuEff());
  if (a === "mfopen1") mfOpen([b.dataset.k]);
  if (!st.mf) return;
  if (a === "mfbackdrop" && e.target === b) mfClose(false);
  if (a === "mfcancel") mfClose(false);
  if (a === "mfnav"){ if (mfChanged() && !confirm("Bu müşterideki değişiklikler kaydedilmeden geçilsin mi?")) return; st.mf.i += +b.dataset.d; mfLoad(); render(); }
  if (a === "mfsave"){ const ok = await mfSave(); if (ok && st.mf){ if (st.mf.i < st.mf.keys.length - 1){ st.mf.i++; mfLoad(); render(); } else mfClose(true); } }
});
document.addEventListener("input", e => { const t = e.target, M = st.mf; if (!M) return;
  if (t.dataset.mfb){ M.vals[t.dataset.mfb] = t.value; t.classList.toggle("dirty", M.vals[t.dataset.mfb] !== M.orig[t.dataset.mfb]); }
  else if (t.dataset.mfd){ M.dev[t.dataset.mfd][t.dataset.k] = t.value; t.classList.toggle("dirty", t.value !== M.devOrig[t.dataset.mfd][t.dataset.k]); }
  else return;
  const n = mfChanged(), el = document.getElementById("mf-nch"); if (el) el.textContent = n ? `${n} alan değişti` : "Değişiklik yok";
});
document.addEventListener("change", e => { const t = e.target; if (st.mf && t.tagName === "SELECT" && (t.dataset.mfb || t.dataset.mfd)) t.dispatchEvent(new Event("input", { bubbles: true })); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && st.mf) mfClose(false); });
/* ---------------- sahadan yeni cihaz talebi + yönetici onayı ---------------- */
const reqPending = () => (st.reqs || []).filter(r => r.durum === "bekliyor");
function reqForm(k){
  const D = st.reqDraft || {};
  return `<form class="stack reqform" data-k="${esc(k)}" style="gap:8px"><div class="eyebrow">Yeni cihaz ekle · yönetici onayına gider</div>
    <div class="mfgrid">
      <label class="f">Marka *<input name="marka" required value="${esc(D.marka || "")}" autocomplete="off"></label>
      <label class="f">Model<input name="model" value="${esc(D.model || "")}" autocomplete="off"></label>
      <label class="f">Seri no<input name="seri_no" value="${esc(D.seri_no || "")}" autocomplete="off" placeholder="Etiket okunmuyorsa boş bırakın"></label>
      <label class="f">Cinsi<input name="cins" value="${esc(D.cins || "Terazi")}"></label>
      <label class="f">Kapasite (Max)<input name="max_cap" value="${esc(D.max_cap || "")}" placeholder="örn. 30 kg"></label>
      <label class="f">e<input name="e" value="${esc(D.e || "")}" placeholder="örn. 5 g"></label>
      <label class="f">d<input name="d" value="${esc(D.d || "")}" placeholder="örn. 2 g"></label>
      <label class="f">Sınıf<select name="sinif">${["III","II","I","IIII"].map(s => `<option ${D.sinif === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
      <label class="f">Kullanım yeri<input name="kullanim_yeri" value="${esc(D.kullanim_yeri || "")}" placeholder="örn. şarküteri"></label>
      <label class="f wide">Not<input name="notlar" value="${esc(D.notlar || "")}"></label>
    </div>
    <label class="row" style="gap:8px;font-size:.9rem"><input type="checkbox" name="damgalandi" ${D.damgalandi ? "checked" : ""}> Bu cihazın damgası şimdi yapıldı</label>
    <div class="row"><button class="btn primary">Onaya gönder</button><button class="btn" type="button" data-act="reqcancel">Vazgeç</button></div></form>`;
}
function reqListFor(k){ const rs = (st.reqs || []).filter(r => r.business_id === k && r.durum !== "onaylandi").slice(0, 10); if (!rs.length) return "";
  return `<div class="stack" style="gap:4px">${rs.map(r => `<div class="share" style="gap:2px;font-size:.84rem"><b>${r.tur === "bilgi" ? `Bilgi önerisi: ${esc(r.marka)} · e ${esc(r.e || "—")} · d ${esc(r.d || "—")} · sınıf ${esc(r.sinif || "—")}` : `Yeni cihaz: ${esc(r.marka)} ${esc(r.model || "")}`}</b>
    <span class="muted mono">S/N ${esc(r.seri_no || "—")} · ${esc(r.max_cap || "")}</span><span class="st ${r.durum === "reddedildi" ? "tekrar" : "bekliyor"}">${r.durum === "reddedildi" ? "Reddedildi" + (r.red_nedeni ? " · " + esc(r.red_nedeni) : "") : "Yönetici onayı bekliyor"}</span></div>`).join("")}</div>`; }
function reqBanner(){ const rs = reqPending(), n = rs.length; if (!n || !(st.isAdmin && st.role === "admin")) return "";
  const ni = rs.filter(r => r.tur === "bilgi").length, ny = n - ni;
  return `<div class="warnbox row" style="justify-content:space-between;margin-bottom:16px"><span>${[ny ? `<b>${ny}</b> yeni cihaz` : "", ni ? `<b>${ni}</b> eksik bilgi önerisi` : ""].filter(Boolean).join(" ve ")} sahadan geldi, onay bekliyor.</span><button class="btn sm primary" data-act="view" data-v="musteriler">İncele</button></div>`; }
function viewDevRequests(){ return viewInfoRequests() + viewNewDevRequests(); }
function viewInfoRequests(){ const rs = reqPending().filter(r => r.tur === "bilgi"); if (!rs.length) return ""; const who = id => st.staffAll?.find(s => s.id === id)?.name || "Saha";
  st.reqEdit = st.reqEdit || {};
  return `<div class="card pad stack" style="gap:10px;border-color:var(--wait)"><h3 style="margin:0">Onay bekleyen eksik bilgi önerileri (${rs.length})</h3>
    <p class="muted" style="margin:0;font-size:.86rem">Saha ekibi cihaz plakasından okuduğu e / d / sınıf değerlerini önerdi. Gerekirse düzeltip onaylayın; cihaz kaydı güncellenir ve hizmet talep formu açılır.</p>
    ${rs.map(r => { const o = DEVID[r.hedef_device], E = st.reqEdit[r.id] || {}, val = k => E[k] ?? r[k] ?? ""; return `<div class="share" style="gap:6px">
      <div style="min-width:0"><b>${o ? `${esc(o.d[2] || "")} ${esc(o.d[3] || "")}` : esc(r.marka)}</b> <span class="mono muted">S/N ${esc(o ? o.d[4] || "—" : r.seri_no || "—")}</span>
        <div style="font-size:.86rem">${o ? `${esc(titleTR(o.l.n))} · ${esc(titleTR(o.l.i))}` : "Cihaz bulunamadı"}</div>
        <div class="muted" style="font-size:.8rem">Kayıttaki: e ${esc(o ? o.d[18] || "—" : "—")} · d ${esc(o ? o.d[22] || "—" : "—")} · sınıf ${esc(o ? o.d[29] || "—" : "—")} · ${esc(who(r.created_by))}, ${esc(String(r.created_at || "").slice(0, 16).replace("T", " "))}</div></div>
      <div class="row" style="gap:6px;align-items:flex-end;flex-wrap:wrap"><label class="f" style="flex:0 1 110px">e<input data-reqf="${r.id}" data-c="e" value="${esc(val("e"))}"></label><label class="f" style="flex:0 1 110px">d<input data-reqf="${r.id}" data-c="d" value="${esc(val("d"))}"></label>
        <label class="f" style="flex:0 1 110px">Sınıf<select data-reqf="${r.id}" data-c="sinif"><option value=""></option>${["I","II","III","IIII"].map(s => `<option ${val("sinif") === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <button class="btn sm ok" data-act="reqinfook" data-id="${r.id}" ${o ? "" : "disabled"}>Onayla</button><button class="btn sm warn" data-act="reqno" data-id="${r.id}">Reddet</button></div></div>`; }).join("")}</div>`; }
function viewNewDevRequests(){
  const rs = reqPending().filter(r => r.tur !== "bilgi"); if (!rs.length) return "";
  const ex = allDevKeys(), who = id => st.staffAll?.find(s => s.id === id)?.name || "Saha";
  return `<div class="card pad stack" style="gap:10px;border-color:var(--wait)"><h3 style="margin:0">Onay bekleyen yeni cihazlar (${rs.length})</h3>
    <p class="muted" style="margin:0;font-size:.86rem">Saha ekibinin müşteri adresinde bulup eklediği cihazlar. Onaylanınca o müşteriye eklenir, QR numarası alır ve ${YEAR} listesine girer.</p>
    ${rs.map(r => { const l = BY[r.business_id], dup = devKey(r.marka, r.seri_no) && ex.get(devKey(r.marka, r.seri_no)); return `<div class="share" style="gap:6px">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0"><b>${esc(r.marka)} ${esc(r.model || "")}</b> <span class="mono muted">S/N ${esc(r.seri_no || "—")}</span>
        <div style="font-size:.86rem">${l ? `${esc(titleTR(l.n))} · Lok. ${lno(l)} · ${esc(titleTR(l.i))}` : "Müşteri bulunamadı"}</div>
        <div class="muted" style="font-size:.8rem">${esc(r.cins || "")} · Max ${esc(r.max_cap || "?")} · e ${esc(r.e || "?")} · d ${esc(r.d || "?")} · Sınıf ${esc(r.sinif || "III")}${r.kullanim_yeri ? " · " + esc(r.kullanim_yeri) : ""} · ${esc(who(r.created_by))}, ${esc(String(r.created_at || "").slice(0, 16).replace("T", " "))}${r.damgalandi ? ` · <b style="color:var(--ok)">damgası yapıldı</b>` : ""}${r.notlar ? " · " + esc(r.notlar) : ""}</div>
        ${dup ? `<div class="warnbox" style="margin-top:6px;font-size:.82rem">Aynı marka + seri sistemde kayıtlı: ${esc(dup.d[11])} · ${esc(titleTR(dup.l.n))}</div>` : ""}</div>
        <div class="row" style="gap:6px"><button class="btn sm ok" data-act="reqok" data-id="${r.id}">Onayla</button><button class="btn sm warn" data-act="reqno" data-id="${r.id}">Reddet</button></div></div></div>`; }).join("")}
  </div>`;
}
async function reqApprove(id){
  const r = (st.reqs || []).find(x => x.id === id); if (!r) return;
  const ik = "REQ|" + r.id, dev = { business_id: r.business_id, import_key: ik, tip: "Otomatik olmayan tartı aleti", cins: r.cins || "Terazi", marka: r.marka, model: r.model || "", seri_no: r.seri_no || "",
    seri_flag: realSeri(r.seri_no) ? "" : "seri-yok", sinif: r.sinif || "III", max_cap: r.max_cap || "", e: r.e || "", d: r.d || "", kullanim_yeri: r.kullanim_yeri || "",
    son_damga_yili: r.damgalandi ? YEAR : null, durum_grup: r.damgalandi ? "tamam" : "bekliyor", durum_ham: "Sahadan eklendi" + (r.damgalandi ? " · damgalandı" : ""), bilgi: r.notlar || "" };
  await q(sb.from("devices").upsert(dev, { onConflict: "import_key", ignoreDuplicates: true }));
  const row = (await q(sb.from("devices").select("id,import_key").in("import_key", [ik])))[0]; if (!row) throw new Error("cihaz kaydı oluşturulamadı");
  if (!st.noPeriod) await q(sb.from("period_items").upsert({ donem: YEAR, device_id: row.id, durum_grup: dev.durum_grup, durum_ham: dev.durum_ham, bilgi: dev.bilgi, kaynak: "saha talebi" }, { onConflict: "donem,device_id" }));
  await q(sb.from("device_requests").update({ durum: "onaylandi", device_id: row.id, karar_veren: st.me, karar_zamani: new Date().toISOString() }).eq("id", id));
  try { await q(sb.rpc("assign_qr_numbers")); } catch(_){}
  // talep bir rotadan geldiyse cihaz o rotadaki müşteri durağına eklenir (saha ekranında cihaz listesinin altına düşer)
  if (r.plan_id){ const p = st.plans.find(x => x.id === r.plan_id), s = p?.stops?.find(x => x.k === r.business_id);
    if (p && s && !s.dev.includes(row.id)){ s.dev.push(row.id); p.dev = (p.dev || 0) + 1; try { await savePlan(p); } catch(_){} } }
  await reloadDevices(); await loadDynamic();
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "quickmiss"){ const k = b.dataset.k, d = st.draft[k]; if (!d) return; d.reason = b.dataset.v; st.reasonFor = k; st.reqFor = null; render(); setTimeout(() => $("#note-" + k)?.focus(), 30); }
  if (a === "addreq"){ st.reqFor = b.dataset.k; st.reasonFor = null; st.reqDraft = {}; render(); setTimeout(() => document.querySelector('.reqform [name="marka"]')?.focus(), 30); }
  if (a === "reqcancel"){ st.reqFor = null; render(); }
  if (a === "reqok"){ b.disabled = true; try { await reqApprove(+b.dataset.id); render(); toast("Cihaz onaylandı ve müşteriye eklendi"); } catch(err){ b.disabled = false; toast("Onaylanamadı: " + err.message); } }
  if (a === "reqinfook"){ const id = +b.dataset.id, r = (st.reqs || []).find(x => x.id === id); if (!r) return; const E = (st.reqEdit || {})[id] || {}; b.disabled = true;
    try { const patch = {}; ["e","d","sinif"].forEach(k => { const v = String(E[k] ?? r[k] ?? "").trim(); if (v) patch[k] = v; });
      await saveDevInfo(r.hedef_device, patch);
      await q(sb.from("device_requests").update({ durum: "onaylandi", device_id: r.hedef_device, e: patch.e ?? r.e, d: patch.d ?? r.d, sinif: patch.sinif ?? r.sinif, karar_veren: st.me, karar_zamani: new Date().toISOString() }).eq("id", id));
      if (st.reqEdit) delete st.reqEdit[id]; await loadDynamic(); render(); toast("Cihaz bilgileri güncellendi"); }
    catch(err){ b.disabled = false; toast("Onaylanamadı: " + err.message); } }
  if (a === "reqno"){ const why = prompt("Reddetme nedeni (saha ekibi görür)", "") ; if (why === null) return;
    try { await q(sb.from("device_requests").update({ durum: "reddedildi", red_nedeni: why, karar_veren: st.me, karar_zamani: new Date().toISOString() }).eq("id", +b.dataset.id)); await loadDynamic(); render(); toast("Talep reddedildi"); } catch(err){ toast("İşlem yapılamadı: " + err.message); } }
});
const reqEditSet = e => { const t = e.target; if (!t.dataset?.reqf) return; st.reqEdit = st.reqEdit || {}; (st.reqEdit[t.dataset.reqf] = st.reqEdit[t.dataset.reqf] || {})[t.dataset.c] = t.value; };
document.addEventListener("input", reqEditSet); document.addEventListener("change", reqEditSet);
document.addEventListener("input", e => { const f = e.target.closest?.(".reqform"); if (!f) return; st.reqDraft = Object.fromEntries(new FormData(f)); st.reqDraft.damgalandi = f.damgalandi.checked; });
document.addEventListener("submit", async e => {
  const f = e.target; if (!f.classList?.contains("reqform")) return; e.preventDefault();
  const v = Object.fromEntries(new FormData(f)); const k = f.dataset.k;
  if (!String(v.marka || "").trim()){ toast("Marka zorunlu"); return; }
  const row = { business_id: k, plan_id: st.fieldPlan || null, donem: YEAR, marka: v.marka.trim().toLocaleUpperCase("tr-TR"), model: (v.model || "").trim().toLocaleUpperCase("tr-TR"), seri_no: (v.seri_no || "").trim(),
    cins: (v.cins || "").trim(), max_cap: normCap(v.max_cap || ""), e: (v.e || "").trim(), d: (v.d || "").trim(), sinif: v.sinif || "III", kullanim_yeri: (v.kullanim_yeri || "").trim(), notlar: (v.notlar || "").trim(), damgalandi: f.damgalandi.checked, created_by: st.me };
  const btn = f.querySelector("button.primary"); btn.disabled = true;
  try { await q(sb.from("device_requests").insert(row)); await loadDynamic(); st.reqFor = null; st.reqDraft = null; render(); toast("Yeni cihaz yöneticinin onayına gönderildi"); }
  catch(err){ btn.disabled = false; toast("Gönderilemedi: " + (/device_requests/.test(err.message) ? "cihaz talebi tablosu kurulu değil (damga-cihaz-talep.sql)" : err.message)); }
});
/* ---------------- Hizmet Talep Formu: sistemdeki cihaz verileriyle dolar, düzenlenir, yazdırılır ---------------- */
const HTF_CHECKS = [["nawi","Otomatik olmayan tartı aleti",true],["uretici","Üretici yerinde muayene",false],["periyodik","Periyodik muayene",true],
  ["awi","Otomatik tartı aleti",false],["yerinde","Cihazın kurulu olduğu yerde muayene",false],["tamir","Tamir sonrası/İlk muayene",false]];
const HTF_FIRMA_DEF = { ad: "ANTKA KALİBRASYON", alt: "Muratpaşa Mah. 567 Sk. Barış Apt. 58/A Muratpaşa / ANTALYA • Tel: 0 242 244 0 967 • Gsm: 0 553 844 0 967", eposta: "info@antka.com.tr" };
function htfAddrParts(a){ const A = TRU(a).replace(/^.*?(?:MAHALLESİ|MAHALLE|MAH\.?|MH\.?)\s+/, "");
  const pick = re => { const m = A.match(re); return m ? titleTR(m[1].trim()) : ""; };
  return { sokak: pick(/([0-9A-ZÇĞİÖŞÜ.]+(?:\s[0-9A-ZÇĞİÖŞÜ.]+)?\s+(?:SOKAĞI|SOKAK|SOK\.?|SK\.?))(?![A-ZÇĞİÖŞÜ])/), cadde: pick(/([0-9A-ZÇĞİÖŞÜ.]+(?:\s[0-9A-ZÇĞİÖŞÜ.]+)?\s+(?:CADDESİ|CADDE|CAD\.?|CD\.?))(?![A-ZÇĞİÖŞÜ])/),
    dis: pick(/NO\s*:?\s*([0-9]+[A-Z]?(?:[\/-][0-9A-Z]+)?)/), ic: pick(/(?:DAİRE|D)\s*:?\s*([0-9]+)/) }; }
function htfDevRow(o){ const d = o.d, raw = RAW.devs.find(r => r.id === d[0]) || {};
  return { id: d[0], marka: d[2] || "", tip: d[3] || "", sinif: d[29] || "", kap: d[12] || "", seri: d[4] || "", uretim: raw.uretim_yili ? String(raw.uretim_yili) : "", d: d[22] || "", e: d[18] || "" }; }
function htfOpen(k, ids){
  const l = BY[k]; if (!l) return; const raw = RAW.biz.find(b => b.id === k) || {}, ap = htfAddrParts(l.a);
  const all = Object.values(DEVID).filter(o => o.l === l && o.d[23] !== false).sort((a, b) => (b.inP - a.inP) || (a.d[26] || 0) - (b.d[26] || 0));
  const pick = ids && ids.length ? all.filter(o => ids.includes(o.d[0])) : all.filter(o => o.inP);
  st.htf = { k, ctx: st.view === "saha" && st.fieldPlan ? st.fieldPlan + "|" + k : "", firma: htfFirma(), f: {
      tarih: new Date().toLocaleDateString("tr-TR"), no: "", ad: titleTR(String(l.n).split(" · ")[0]), tel: [raw.gsm, l.t].filter(Boolean).join(" / "), sube: raw.sube || (String(l.n).split(" · ").slice(1).join(" · ")),
      vergi: [raw.vergi_dairesi, raw.vkn].filter(Boolean).join(" / "), yer: `${titleTR(l.a)} ${titleTR(l.i)}/${titleTR(l.il)}`.trim(), yetkili: "", dogum: "", tc: "",
      mahalle: titleTR(raw.mahalle || mahOf(l.a) || ""), sokak: ap.sokak, cadde: ap.cadde, ic: ap.ic, dis: ap.dis, eposta: raw.eposta || "", yil: String(YEAR) },
    checks: Object.fromEntries(HTF_CHECKS.map(c => [c[0], c[2]])), all: all.map(o => o.d[0]), rows: pick.map(htfDevRow) };
  delete SIG.htf; st.htf.prop = {};
  if (!st.htf.rows.length && st.isAdmin) st.htf.rows = [{ id: 0, marka: "", tip: "", sinif: "III", kap: "", seri: "", uretim: "", d: "", e: "" }];
  render();
}
function viewHtf(){
  const H = st.htf; if (!H) return ""; const f = H.f, inp = (k, lab, w) => `<label class="f${w ? " wide" : ""}">${lab}<input data-htf="${k}" value="${esc(f[k])}"></label>`;
  const inRows = new Set(H.rows.map(r => r.id));
  return `<div class="mfback" data-act="htfback"><div class="mfdlg card" role="dialog" aria-modal="true" aria-label="Hizmet talep formu">
    <div class="mfhead"><div><div class="eyebrow">Sistem verileriyle dolduruldu · yazdırmadan önce düzenleyin</div><h3 style="margin:2px 0 0">Hizmet Talep Formu</h3></div><button class="btn sm" data-act="htfclose" aria-label="Kapat">✕</button></div>
    <div class="mfbody">
      <div class="mfgrid">${inp("tarih","Tarih")}<label class="f">Form / başvuru no<input data-htf="no" value="${esc(f.no)}" readonly placeholder="Yazdırınca otomatik verilir" style="background:var(--sunk)"></label>${inp("ad","Başvuran firma adı",1)}${inp("tel","Gsm / sabit tel")}${inp("sube","Şube adı")}${inp("vergi","Vergi dairesi / no")}
        ${inp("yer","Cihaz(lar)ın bulunduğu yer",1)}${inp("yetkili","Yetkili kişi *")}<label class="f">Yetkili doğum tarihi * (gg/aa/yyyy)<input data-htf="dogum" value="${esc(f.dogum)}" inputmode="numeric" maxlength="10" placeholder="gg/aa/yyyy" autocomplete="off"></label><label class="f">T.C. kimlik no *<input data-htf="tc" value="${esc(f.tc)}" inputmode="numeric" maxlength="11" autocomplete="off"></label>${inp("mahalle","Mahalle")}${inp("sokak","Sokak")}${inp("cadde","Cadde")}${inp("ic","İç kapı no")}${inp("dis","Dış kapı no")}${inp("eposta","E-mail")}${inp("yil","Muayene yılı")}</div>
      <div class="row" style="gap:14px;flex-wrap:wrap">${HTF_CHECKS.map(([k, lab]) => `<label class="row" style="gap:6px;font-size:.88rem"><input type="checkbox" data-htfc="${k}" ${H.checks[k] ? "checked" : ""}> ${lab}</label>`).join("")}</div>
      <h4 class="mfsec">Cihazlar (${H.rows.length})</h4>
      <div class="row" style="gap:6px;flex-wrap:wrap;font-size:.84rem">${H.all.map(id => { const o = DEVID[id]; return o ? `<label class="chip" style="cursor:pointer"><input type="checkbox" data-htfd="${id}" ${inRows.has(id) ? "checked" : ""}> ${esc(o.d[2] || "?")} ${esc(o.d[4] || "")}</label>` : ""; }).join("")}${st.isAdmin ? `<button class="btn sm" data-act="htfadd">+ Boş satır</button>` : ""}</div>
      <div class="tbl-wrap"><table class="rptbl htftbl"><thead><tr><th>S.No</th><th>Marka</th><th>Tip</th><th>Sınıf</th><th>Kapasite</th><th>Seri No</th><th>Üretim yılı</th><th>d Taksimat</th><th>e Mua. Sab.</th><th></th></tr></thead><tbody>
        ${H.rows.map((r, i) => `<tr><td>${i + 1}</td>${["marka","tip","sinif","kap","seri","uretim","d","e"].map(c => { const ro = !st.isAdmin && r.id, miss = HTF_REQ.includes(c) && !String(r[c] || "").trim();
          return `<td><input data-htfr="${i}" data-c="${c}" value="${esc(r[c])}" ${ro ? "readonly tabindex=-1" : ""} ${miss ? 'aria-invalid="true"' : ""} placeholder="${miss ? "zorunlu" : ""}" style="width:${c === "seri" ? 130 : c === "marka" || c === "tip" ? 100 : 64}px;${ro ? "background:var(--sunk);" : ""}${miss ? "border-color:var(--bad);" : ""}"></td>`; }).join("")}<td>${!st.isAdmin && r.id ? "" : `<button class="link" data-act="htfrm" data-i="${i}" style="color:var(--bad)">Sil</button>`}</td></tr>`).join("")}
      </tbody></table></div>
      ${htfMissView()}
      ${sigPad("htf", "Yetkili imzası", !!H.ctx)}
      <details><summary style="font-size:.86rem">Form başlığı ve alt bilgi (bir kez ayarlanır)</summary><div class="mfgrid" style="margin-top:8px">
        <label class="f">Kurum adı<input data-htff="ad" value="${esc(H.firma.ad)}"></label><label class="f wide">Alt bilgi (adres / telefon)<input data-htff="alt" value="${esc(H.firma.alt)}"></label><label class="f">E-posta<input data-htff="eposta" value="${esc(H.firma.eposta)}"></label></div></details>
      <p class="muted" style="margin:0;font-size:.8rem">${st.isAdmin ? "Cihaz satırlarında boş olan alanları doldurursanız yazdırırken cihaz kaydına da işlenir." : "Cihaz bilgileri kayıttan gelir ve sahada değiştirilemez. Eksik bilgi için yukarıdan öneri gönderin."}</p>
    </div>
    <div class="mffoot"><span style="flex:1"></span><button class="btn" data-act="htfclose">İptal</button><button class="btn" data-act="htfprint">${(st.htf.a4next || 1) === 2 ? "A4 · 2. nüshayı yazdır" : "A4 yazdır / PDF (1. nüsha)"}</button><button class="btn primary" data-act="htf80">🖨 80 mm yazıcıya</button></div>
  </div></div>`;
}
function htfDoc(nus){
  const H = st.htf, f = H.f, F = H.firma, n = Math.max(6, H.rows.length), cb = k => `<span class="cb">${H.checks[k] ? "✓" : ""}</span>`;
  const line = (lab, v) => `<tr><td class="lb">${lab}</td><td>: ${esc(v)}</td></tr>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Hizmet Talep Formu · ${esc(f.ad)}</title><style>
  @page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;font-size:12px}
  .frm{border:1.5px solid #000;padding:10px 14px}.hd{display:grid;grid-template-columns:160px 1fr 220px;align-items:center}.logo{line-height:1}
  h1{text-align:center;font-size:22px;margin:0;letter-spacing:.5px}.no{color:#b00;font-size:26px;font-weight:700;text-align:right}.no small{display:block;font-size:13px;color:#b00}
  .top{display:grid;grid-template-columns:1.3fr 1fr 1.1fr;gap:12px;margin-top:8px}.top table{width:100%;border-collapse:collapse}.top td{padding:3px 2px;vertical-align:top}.lb{white-space:nowrap;width:1%;padding-right:6px!important;background:#e9e9e9}
  .cbs div{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.cb{display:inline-block;width:16px;height:16px;border:1px solid #000;text-align:center;line-height:15px;font-weight:700}
  .grp{margin-top:6px}table.dv{width:100%;border-collapse:collapse;margin-top:10px}table.dv th,table.dv td{border:1px solid #000;padding:5px 4px;height:24px;text-align:center}table.dv th{background:#e9e9e9}
  .txt{margin-top:8px;line-height:1.5}.sign{display:flex;justify-content:space-between;margin-top:6px}.box{width:260px;text-align:center;flex:none}.box .im{height:66px;border-bottom:1px dotted #000;display:flex;align-items:flex-end;justify-content:center}.box img{max-height:64px;max-width:250px}
  .defs{font-size:10px;margin-top:6px}.ft{text-align:center;margin-top:8px;border-top:1px solid #000;padding-top:6px;font-size:12px}
  .nu{position:absolute;right:16px;top:6px;font-size:11px;font-weight:700;border:1px solid #000;padding:2px 6px}.frm{position:relative;page-break-after:always}.frm:last-of-type{page-break-after:auto}
  </style></head><body>${[nus || 1].map(nu => `<div class="frm"><div class="nu">${nu}. NÜSHA · ${nu === 1 ? "MÜŞTERİ" : "FİRMA"}</div>
  <div class="hd"><div class="logo"><img src="${APP_URL}antka-logo.png" alt="" style="height:58px;display:block"><div style="font:700 10px Arial;letter-spacing:.06em;margin-top:2px">${esc(F.ad)}</div></div><div><h1>HİZMET TALEP FORMU</h1><div style="text-align:center;margin-top:4px">Tarih: ${esc(f.tarih)}</div></div><div class="no">${esc(f.no)}<small>Başvuru</small></div></div>
  <div class="top"><table>${line("Başvuran Firma Adı", f.ad)}${line("Gsm / Sabit Tel", f.tel)}${line("Şube Adı", f.sube)}${line("Vergi Dairesi / No", f.vergi)}${line("Cihaz(lar)ın Bulunduğu Yer", f.yer)}${line("Yetkili Kişi", f.yetkili)}${line("Doğum Tarihi", f.dogum)}${line("T.C.No", f.tc)}</table>
    <table>${line("Mahalle", f.mahalle)}${line("Sokak", f.sokak)}${line("Cadde", f.cadde)}${line("İç Kapı No", f.ic)}${line("Dış Kapı No", f.dis)}${line("E-mail Adresi", f.eposta)}</table>
    <div class="cbs">${HTF_CHECKS.slice(0, 3).map(([k, lab]) => `<div><span>${lab}</span>${cb(k)}</div>`).join("")}<div class="grp"></div>${HTF_CHECKS.slice(3).map(([k, lab]) => `<div><span>${lab}</span>${cb(k)}</div>`).join("")}</div></div>
  <table class="dv"><thead><tr><th style="width:40px">S.No</th><th>Marka</th><th>Tip</th><th>Sınıf</th><th>Kapasite</th><th>Seri No</th><th>Üretim Yılı</th><th>d Taksimat</th><th>e Mua Sab.</th></tr></thead><tbody>
    ${Array.from({ length: n }, (_, i) => { const r = H.rows[i] || {}; return `<tr><td>${i + 1}</td><td>${esc(r.marka || "")}</td><td>${esc(r.tip || "")}</td><td>${esc(r.sinif || "")}</td><td>${esc(r.kap || "")}</td><td>${esc(r.seri || "")}</td><td>${esc(r.uretim || "")}</td><td>${esc(r.d || "")}</td><td>${esc(r.e || "")}</td></tr>`; }).join("")}</tbody></table>
  <div class="sign"><div class="txt">Listede nitelikleri yazılı firmamızda kullanılmakta olan *(AWI / NAWI) tartı aletlerinin, <b>${esc(f.yil)}</b> yılı (Periyodik / Tamir Sonrası) muayenelerinin yapılması,<br>mühürleme işlemlerinin gerçekleşmesi ve muayene raporlarının düzenlenerek tarafımıza iletilmesi hususunda gereğini rica ederiz.</div>${SIG.htf ? `<div class="box"><div class="im"><img src="${SIG.htf.url}" alt=""></div><div>${esc(f.yetkili)}</div><div style="font-size:10px">Yetkili imzası</div></div>` : ""}</div>
  <div class="defs">*AWI: Otomatik Tartı Aletleri: Kütle belirleme, Gravimetrik Dolum, kesintili toplayıcı, Sürekli Toplayıcı, Ray Kantarı.<br>NAWI: Otomatik Olmayan Tartı Aletleri: I. ve II. Sınıf Elektronik ve mekanik hassas teraziler, III. ve IV. Sınıf çıktı verebilme veya başka elektronik cihazlarla bağlantılı çalışabilme özelliğine sahip olan tartı aletleri.</div>
  <div class="ft">${esc(F.alt)}<br>e-mail: ${esc(F.eposta)}</div>
  </div>`).join("")}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "htf"){ const k = b.dataset.k, d = st.draft[k]; htfOpen(k, d ? d.done : null); }
  if (a === "htfbulk"){ const eff = [...cuEff()]; if (eff.length !== 1){ toast("Form için tek müşteri seçin"); return; } const ids = [...st.dsel].map(c => DEVBY[c]?.d[0]).filter(Boolean); htfOpen(eff[0], ids); }
  if (!st.htf) return;
  if (a === "htfclose" || (a === "htfback" && e.target === b)){ st.htf = null; render(); }
  if (a === "htfadd"){ st.htf.rows.push({ id: 0, marka: "", tip: "", sinif: "III", kap: "", seri: "", uretim: "", d: "", e: "" }); render(); }
  if (a === "htfpropsend"){ const H = st.htf, ids = H.rows.filter(r => r.id && !infoPending(r.id) && HTF_REQ.some(c => !String(r[c] || "").trim())).map(r => r.id); b.disabled = true;
    try { for (const id of ids) await propInfo(id, H.prop[id] || {}); await loadDynamic(); render(); toast("Eksik bilgiler yöneticinin onayına gönderildi"); }
    catch(err){ b.disabled = false; toast("Gönderilemedi: " + err.message); } }
  if (a === "htfrefresh"){ b.disabled = true; try { await infoRefresh(); render(); toast("Güncellendi"); } catch(err){ b.disabled = false; toast("Yenilenemedi: " + err.message); } }
  if (a === "htfrm"){ st.htf.rows.splice(+b.dataset.i, 1); render(); }
  if (a === "htfprint"){ if (!htfValid()) return; const w = window.open("", "_blank"); if (!w){ toast("Açılır pencere engellendi; tarayıcıda izin verin"); return; }
    w.document.write("<p style='font-family:sans-serif'>Form numarası alınıyor…</p>");
    const nus = st.htf.a4next || 1;
    htfNumber().then(async ok => { if (!ok){ w.close(); return; } if (nus === 1){ htfMark(); await htfSaveFill(); } lsSet("damga.htfFirma", st.htf.firma); w.document.open(); w.document.write(htfDoc(nus)); w.document.close();
      st.htf.a4next = nus === 1 ? 2 : 1; toast(nus === 1 ? "1. nüsha açıldı. Yazdırdıktan sonra “A4 2. nüsha” düğmesine basın." : "2. nüsha açıldı."); render(); }); }
});
document.addEventListener("input", e => { const t = e.target, H = st.htf; if (!H) return;
  if (t.dataset.htf === "dogum"){ const d = t.value.replace(/\D/g, "").slice(0, 8); const v = d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    if (v !== t.value){ t.value = v; try { t.setSelectionRange(v.length, v.length); } catch(_){} } H.f.dogum = v; }
  else if (t.dataset.htf === "tc"){ const v = t.value.replace(/\D/g, "").slice(0, 11); if (v !== t.value) t.value = v; H.f.tc = v; }
  else if (t.dataset.htf) H.f[t.dataset.htf] = t.value; else if (t.dataset.htfr) H.rows[+t.dataset.htfr][t.dataset.c] = t.value; else if (t.dataset.htff) H.firma[t.dataset.htff] = t.value; else if (t.dataset.htfp){ (H.prop[t.dataset.htfp] = H.prop[t.dataset.htfp] || {})[t.dataset.c] = t.value; } });
document.addEventListener("change", e => { const t = e.target, H = st.htf; if (!H) return;
  if (t.dataset.htfc){ H.checks[t.dataset.htfc] = t.checked; }
  if (t.dataset.htfp){ (H.prop[t.dataset.htfp] = H.prop[t.dataset.htfp] || {})[t.dataset.c] = t.value; }
  if (t.dataset.htfd){ const id = +t.dataset.htfd; if (t.checked){ const o = DEVID[id]; if (o && !H.rows.some(r => r.id === id)) H.rows.push(htfDevRow(o)); } else H.rows = H.rows.filter(r => r.id !== id); render(); } });
document.addEventListener("keydown", e => { if (e.key === "Escape" && st.htf){ st.htf = null; render(); } });

/* ---- saha: telefonun konum servisiyle müşteri adresinin konumunu güncelle ---- */
document.addEventListener("click", e => {
  const b = e.target.closest('[data-act="gpsgeo"]'); if (!b) return; const k = b.dataset.k, l = BY[k];
  if (!navigator.geolocation){ toast("Bu cihazda konum servisi yok"); return; }
  b.disabled = true; b.textContent = "Konum alınıyor…";
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: la, longitude: lo, accuracy: acc } = pos.coords;
    if (!confirm(`${titleTR(l?.n || "")} için konum güncellensin mi?\n${la.toFixed(6)}, ${lo.toFixed(6)} · doğruluk yaklaşık ${Math.round(acc)} m${acc > 100 ? "\n\nDoğruluk düşük; açık alanda tekrar denemeniz önerilir." : ""}`)){ b.disabled = false; b.textContent = "📍 Konumu güncelle"; return; }
    try { await saveGeo(k, +la.toFixed(6), +lo.toFixed(6), "saha"); S = computeSummary(); render(); toast("Müşteri konumu güncellendi; rota linkleri artık bu konumla gider"); }
    catch(err){ b.disabled = false; b.textContent = "📍 Konumu güncelle"; toast("Kaydedilemedi: " + err.message); }
  }, err => { b.disabled = false; b.textContent = "📍 Konumu güncelle"; toast(err.code === 1 ? "Konum izni verilmedi. Tarayıcı ayarlarından bu siteye konum izni verin." : "Konum alınamadı: " + err.message); },
  { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
});

/* yetkili ve doğum tarihi zorunlu; form yazdırılınca duraktaki “Tamamlandı” açılır */
function htfValid(){ const f = st.htf.f; const m = String(f.dogum || "").trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!String(f.yetkili || "").trim()){ toast("Yetkili kişinin adını yazın"); document.querySelector('[data-htf="yetkili"]')?.focus(); return false; }
  if (!m || +m[1] < 1 || +m[1] > 31 || +m[2] < 1 || +m[2] > 12 || +m[3] < 1900 || +m[3] > new Date().getFullYear()){ toast("Doğum tarihini gün/ay/yıl olarak yazın (örn. 05/03/1980)"); document.querySelector('[data-htf="dogum"]')?.focus(); return false; }
  f.dogum = `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[3]}`;
  if (!tcValid(f.tc)){ toast("Geçerli bir T.C. kimlik numarası yazın (11 hane)"); document.querySelector('[data-htf="tc"]')?.focus(); return false; }
  const H = st.htf; if (!H.rows.length){ toast("Formda cihaz yok"); return false; }
  const miss = H.rows.filter(r => HTF_REQ.some(c => !String(r[c] || "").trim()));
  if (miss.length){ toast(`${miss.length} cihazın e / d / sınıf bilgisi eksik. ${st.isAdmin ? "Satırlardaki boş alanları doldurun." : "Eksik bilgiyi yöneticiye önerin; onaylanınca form yazdırılabilir."}`); document.querySelector(".htfmiss, [aria-invalid=true]")?.scrollIntoView({ block: "center" }); return false; }
  if (H.ctx && !SIG.htf){ toast("Yetkilinin imzasını alın"); document.querySelector('canvas.sigpad[data-sig="htf"]')?.scrollIntoView({ block: "center" }); return false; }
  return true; }
const HTF_REQ = ["e", "d", "sinif"];
// saha: kayıtta e / d / sınıf eksik olan cihazlar için öneri (yönetici onayına)
function htfMissView(){ const H = st.htf; if (st.isAdmin) return "";
  const ids = H.rows.filter(r => r.id && HTF_REQ.some(c => !String(r[c] || "").trim())).map(r => r.id); if (!ids.length) return "";
  return `<div class="card pad stack htfmiss" style="gap:8px;border-color:var(--bad)"><b>Eksik cihaz bilgisi (${ids.length}) · form bunlar olmadan yazdırılamaz</b>
    <p class="muted" style="margin:0;font-size:.84rem">Cihaz plakasındaki e, d ve sınıf değerlerini yazıp yöneticiye gönderin. Onaylanınca “Onay durumunu yenile”ye basın.</p>
    ${ids.map(id => { const o = DEVID[id], pend = infoPending(id); if (!o) return ""; return `<div class="share" style="gap:6px"><b style="font-size:.88rem">${esc(o.d[2] || "Cihaz")} ${esc(o.d[3] || "")} · S/N ${esc(o.d[4] || "—")}</b>
      ${pend ? `<span class="st bekliyor">Onay bekliyor · e ${esc(pend.e || "—")} · d ${esc(pend.d || "—")} · sınıf ${esc(pend.sinif || "—")}</span>` : `<div class="mfgrid">${infoInputs(id, H.prop[id] || {}, "data-htfp")}</div>`}</div>`; }).join("")}
    <div class="row">${ids.some(id => !infoPending(id)) ? `<button class="btn primary" data-act="htfpropsend">Onaya gönder</button>` : ""}<button class="btn" data-act="htfrefresh">🔄 Onay durumunu yenile</button></div></div>`; }
// yönetici: formda doldurulan boş alanlar cihaz kaydına işlenir
async function htfSaveFill(){ const H = st.htf; if (!H || !st.isAdmin) return;
  const MAP = { marka: "marka", tip: "model", sinif: "sinif", kap: "max_cap", seri: "seri_no", d: "d", e: "e" };
  for (const r of H.rows){ const o = r.id && DEVID[r.id]; if (!o) continue; const base = htfDevRow(o), patch = {};
    Object.entries(MAP).forEach(([c, col]) => { const v = String(r[c] || "").trim(); if (v && !String(base[c] || "").trim()) patch[col] = v; });
    if (/^(19|20)\d\d$/.test(String(r.uretim || "").trim()) && !base.uretim) patch.uretim_yili = +r.uretim;
    try { await saveDevInfo(r.id, patch); } catch(err){ toast("Cihaz kaydı güncellenemedi: " + err.message); } } }
function tcValid(s){ s = String(s || "").trim(); if (!/^[1-9]\d{10}$/.test(s)) return false; const d = [...s].map(Number);
  const o = d[0] + d[2] + d[4] + d[6] + d[8], e = d[1] + d[3] + d[5] + d[7]; if (((o * 7 - e) % 10 + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10]; }
function htfFirma(){ const F = Object.assign({}, HTF_FIRMA_DEF, lsGet("damga.htfFirma", {})); if (/anka\.com\.tr$/i.test(F.eposta || "")) F.eposta = HTF_FIRMA_DEF.eposta; if (!F.ad || F.ad === "ANTKA") F.ad = HTF_FIRMA_DEF.ad; return F; }
// Form / başvuru no: sunucuda ay bazında artan (YYYY/AA-0001); iki nüsha aynı numarayı taşır, tekrar yazdırmada değişmez
async function htfNumber(){ const H = st.htf; if (!H) return false; if (H.f.no) return true;
  try { H.f.no = await q(sb.rpc("next_form_no", { p_tur: "HTF", p_business: H.k, p_plan: H.ctx ? H.ctx.split("|")[0] : null, p_devices: H.rows.map(r => r.id).filter(Boolean) })); return !!H.f.no; }
  catch(err){ toast(/next_form_no/.test(err.message) ? "Form numarası alınamadı: supabase/damga-form.sql çalıştırılmalı" : "Form numarası alınamadı: " + err.message); return false; } }
function htfMark(){ const H = st.htf; if (!H || !H.ctx) return; const m = lsGet("damga.htfDone", {}); m[H.ctx] = H.rows.map(r => r.id).filter(Boolean); lsSet("damga.htfDone", m);
  const [, k] = H.ctx.split("|"), d = st.draft[k]; if (d) d.done = m[H.ctx].filter(id => (BY[k]?.d || []).some(x => x[0] === id)); }
const htfPrinted = (planId, k) => !!lsGet("damga.htfDone", {})[planId + "|" + k];
/* ---------------- 80 mm termal yazıcı (SP-L39 BT): ESC/POS, Bluetooth (BLE) / RawBT / tarayıcı ---------------- */
const P80_DEF = { cols: 48, cp: "pc857", method: "", mode: "img", dark: "koyu", fs: 24 };
const p80cfg = () => Object.assign({}, P80_DEF, lsGet("damga.p80", {}));
// PC857 (Türkçe) kod sayfası
const CP857 = { "Ç":0x80,"ü":0x81,"é":0x82,"â":0x83,"ä":0x84,"à":0x85,"å":0x86,"ç":0x87,"ê":0x88,"ë":0x89,"è":0x8A,"ï":0x8B,"î":0x8C,"ı":0x8D,"Ä":0x8E,"Å":0x8F,"É":0x90,"æ":0x91,"Æ":0x92,
  "ô":0x93,"ö":0x94,"ò":0x95,"û":0x96,"ù":0x97,"İ":0x98,"Ö":0x99,"Ü":0x9A,"ø":0x9B,"£":0x9C,"Ø":0x9D,"Ş":0x9E,"ş":0x9F,"á":0xA0,"í":0xA1,"ó":0xA2,"ú":0xA3,"ñ":0xA4,"Ñ":0xA5,"Ğ":0xA6,"ğ":0xA7 };
const P80_SUB = { "·":"-","•":"*","—":"-","–":"-","“":'"',"”":'"',"‘":"'","’":"'","…":"...","₺":"TL","→":"->","✓":"X","\u00a0":" " };
const ASCII_TR = { "ç":"c","Ç":"C","ğ":"g","Ğ":"G","ı":"i","İ":"I","ö":"o","Ö":"O","ş":"s","Ş":"S","ü":"u","Ü":"U","â":"a","î":"i","û":"u" };
function p80enc(s, cp){ const out = []; for (let ch of String(s)){ if (P80_SUB[ch] !== undefined){ for (const x of P80_SUB[ch]) out.push(x.charCodeAt(0)); continue; } const c = ch.charCodeAt(0);
  if (c < 128) out.push(c); else if (cp === "pc857" && CP857[ch] !== undefined) out.push(CP857[ch]); else { const a = ASCII_TR[ch] || "?"; for (const x of a) out.push(x.charCodeAt(0)); } } return out; }
function p80wrap(text, w){ const out = []; String(text).split("\n").forEach(par => { const ind = (par.match(/^ */) || [""])[0]; let line = ind;
  par.split(/\s+/).filter(Boolean).forEach(word => { while (word.length > w){ if (line){ out.push(line); line = ""; } out.push(word.slice(0, w)); word = word.slice(w); }
    if (!line.trim()) line = line + word; else if ((line + " " + word).length <= w) line += " " + word; else { out.push(line); line = ind + word; } });
  out.push(line); }); return out; }
// satır modeli: { t, a: "l"|"c"|"r", b: bold, big: çift boy, hr: çizgi, kv: [anahtar, değer], gap: n }
const P80_LOGO = (() => { const i = new Image(); i.src = "antka-logo.png"; return i; })();
function p80lines(doc, cols){ const L = [];
  doc.forEach(x => { const w = x.big ? Math.floor(cols / 2) : cols;
    if (x.logo){ L.push({ s: "", logo: 1 }); return; }
    if (x.img){ L.push({ s: "", img: x.img, iw: x.w || 0.55, px: x.px }); return; }
    if (x.hr){ L.push({ s: (x.hr === "=" ? "=" : "-").repeat(cols) }); return; }
    if (x.gap){ for (let i = 0; i < x.gap; i++) L.push({ s: "" }); return; }
    if (x.kv){ const k = x.kv[0] + ": ", v = String(x.kv[1] ?? ""); const ws = p80wrap(k + v, w); ws.forEach((s, i) => L.push({ s: i ? "  " + s : s, b: x.b })); return; }
    p80wrap(x.t ?? "", w).forEach(s => L.push({ s, a: x.a, b: x.b, big: x.big })); });
  return L; }
// Görüntü (raster) modu: belge tuvale orantılı, kalın yazıyla çizilir (etiket: değer sütunları, tablo, onay kutuları), GS v 0 ile basılır.
// Yazıcının kod sayfasından bağımsızdır; önizleme de aynı tuvalden üretilir (ekranda görülen = kâğıda çıkan).
const P80_FONT = '"Roboto","Noto Sans","Segoe UI","DejaVu Sans",Arial,sans-serif';
const P80_DARK = { normal: 430, koyu: 560, cokkoyu: 660 };   // gri kenar pikselleri siyaha sayma eşiği (R+G+B)
function p80canvas(doc){
  const C = p80cfg(), W = C.cols <= 32 ? 384 : 576, K = W / 576, S = Math.round((C.fs || 24) * K), PAD = 4, IW = W - PAD * 2;
  const heavy = C.dark === "cokkoyu", FN = (sz, b) => `${b || heavy ? "700" : "500"} ${Math.round(sz)}px ${P80_FONT}`;
  const meas = document.createElement("canvas").getContext("2d");
  const wrap = (txt, font, max) => { meas.font = font; const out = []; String(txt ?? "").split("\n").forEach(par => { let line = "";
    par.split(/\s+/).filter(Boolean).forEach(w => { const tryL = line ? line + " " + w : w;
      if (meas.measureText(tryL).width <= max) { line = tryL; return; }
      if (line) out.push(line); line = "";
      while (meas.measureText(w).width > max){ let i = w.length; while (i > 1 && meas.measureText(w.slice(0, i)).width > max) i--; out.push(w.slice(0, i)); w = w.slice(i); }
      line = w; });
    out.push(line); }); return out; };
  // etiket sütunu genişliği: belgedeki en uzun etiket (en fazla genişliğin %42'si)
  meas.font = FN(S, 1); const KW = Math.min(IW * 0.42, Math.max(0, ...doc.filter(x => x.kv).map(x => meas.measureText(x.kv[0] + ":").width)) + 10);
  const ops = []; let y = PAD;   // önce yerleşim, sonra çizim
  const LH = sz => Math.round(sz * 1.3);
  doc.forEach(x => {
    if (x.logo){ const ok = P80_LOGO.complete && P80_LOGO.naturalWidth; const lw = Math.min(W * 0.5, 300 * K), lh = ok ? lw * P80_LOGO.naturalHeight / P80_LOGO.naturalWidth : 0; if (ok) ops.push({ k: "im", im: P80_LOGO, x: (W - lw) / 2, y, w: lw, h: lh }); y += lh + 6; return; }
    if (x.img){ const im = x.img; if (!im || !im.complete || !im.naturalWidth) return; const iw = W * (x.w || 0.55), ih = iw * im.naturalHeight / im.naturalWidth; ops.push({ k: "im", im, x: (W - iw) / 2, y: y + 2, w: iw, h: ih, px: x.px }); y += ih + 6; return; }
    if (x.hr){ y += 5; ops.push({ k: x.hr === "=" ? "hr2" : "hr1", y }); y += x.hr === "=" ? 9 : 7; return; }
    if (x.gap){ y += Math.round(S * 0.7 * x.gap); return; }
    if (x.sigline){ y += 4; ops.push({ k: "dash", x: W * 0.15, w: W * 0.7, y }); y += 4; return; }
    if (x.kv){ const sz = S * (x.sm ? 0.88 : 1), vs = wrap(x.kv[1] || "-", FN(sz, x.b), IW - KW);
      ops.push({ k: "tx", s: x.kv[0] + ":", x: PAD, y, f: FN(sz, 1) }); vs.forEach((v, i) => ops.push({ k: "tx", s: v, x: PAD + KW, y: y + i * LH(sz), f: FN(sz, x.b) }));
      y += vs.length * LH(sz) + 2; return; }
    if (x.chk){ // iki sütunlu onay kutuları: [[etiket, işaretli], ...]
      const sz = S * 0.86, colW = IW / 2, bx = Math.round(sz * 0.85);
      for (let i = 0; i < x.chk.length; i += 2){ let h = 0;
        x.chk.slice(i, i + 2).forEach(([lab, on], j) => { const cx = PAD + j * colW, ls = wrap(lab, FN(sz), colW - bx - 14);
          ops.push({ k: "box", x: cx, y: y + 2, s: bx, on }); ls.forEach((l, li) => ops.push({ k: "tx", s: l, x: cx + bx + 8, y: y + li * LH(sz), f: FN(sz) })); h = Math.max(h, ls.length * LH(sz)); });
        y += h + 4; } return; }
    if (x.tbl){ // { cols: [[başlık, oran, hiza]], rows: [[...]] }
      const sz = S * 0.82, cw = x.tbl.cols.map(c => c[1] * IW), cx = cw.reduce((a, w, i) => (a.push(i ? a[i - 1] + cw[i - 1] : PAD), a), []);
      const row = (cells, b, shade) => { const ls = cells.map((c, i) => wrap(c, FN(sz, b), cw[i] - 8)); const h = Math.max(...ls.map(l => l.length)) * LH(sz) + 8;
        if (shade) ops.push({ k: "fill", x: PAD, y, w: IW, h }); ops.push({ k: "rect", x: PAD, y, w: IW, h }); cx.slice(1).forEach(xx => ops.push({ k: "vl", x: xx, y, h }));
        ls.forEach((l, i) => l.forEach((s, li) => ops.push({ k: "tx", s, x: x.tbl.cols[i][2] === "c" ? cx[i] + cw[i] / 2 : cx[i] + 4, y: y + 4 + li * LH(sz), f: FN(sz, b), a: x.tbl.cols[i][2] === "c" ? "c" : "" })));
        y += h; };
      row(x.tbl.cols.map(c => c[0]), 1, 1); x.tbl.rows.forEach(r => row(r, 0)); y += 6; return; }
    const sz = S * (x.big ? 1.45 : x.sm ? 0.82 : 1), f = FN(sz, x.b || x.big), ls = wrap(x.t, f, IW - (x.inv ? 16 : 0)), h = ls.length * LH(sz);
    if (x.inv) ops.push({ k: "fill", x: PAD, y: y - 2, w: IW, h: h + 4, inv: 1 });
    ls.forEach((s, i) => ops.push({ k: "tx", s, x: x.a === "c" ? W / 2 : x.a === "r" ? W - PAD : PAD, y: y + i * LH(sz), f, a: x.a, inv: x.inv }));
    y += h + (x.big ? 4 : 1) + (x.inv ? 6 : 0);
  });
  const H = Math.ceil(y + PAD + 4), cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.textBaseline = "top";
  ops.forEach(o => { g.fillStyle = "#000"; g.strokeStyle = "#000";
    if (o.k === "im"){ g.imageSmoothingEnabled = !o.px; g.drawImage(o.im, o.x, o.y, o.w, o.h); g.imageSmoothingEnabled = true; }
    else if (o.k === "hr1"){ g.fillRect(PAD, o.y, IW, 2); }
    else if (o.k === "hr2"){ g.fillRect(PAD, o.y, IW, 3); g.fillRect(PAD, o.y + 5, IW, 2); }
    else if (o.k === "dash"){ for (let xx = o.x; xx < o.x + o.w; xx += 10) g.fillRect(xx, o.y, 6, 2); }
    else if (o.k === "fill"){ g.fillStyle = o.inv ? "#000" : "#d0d0d0"; g.fillRect(o.x, o.y, o.w, o.h); }
    else if (o.k === "rect"){ g.lineWidth = 2; g.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h); }
    else if (o.k === "vl"){ g.fillRect(o.x, o.y, 2, o.h); }
    else if (o.k === "box"){ g.lineWidth = 2.5; g.strokeRect(o.x + 1, o.y + 1, o.s, o.s); if (o.on){ g.lineWidth = 3.5; g.beginPath(); g.moveTo(o.x + 4, o.y + o.s * 0.55); g.lineTo(o.x + o.s * 0.42, o.y + o.s - 2); g.lineTo(o.x + o.s - 2, o.y + 3); g.stroke(); } }
    else if (o.k === "tx"){ g.font = o.f; g.textAlign = o.a === "c" ? "center" : o.a === "r" ? "right" : "left"; g.fillStyle = o.inv ? "#fff" : "#000"; g.fillText(o.s, o.x, o.y + 1); g.textAlign = "left"; } });
  // eşikleme: kâğıda çıkacak saf siyah-beyaz görüntü (gri kenarlar koyuluk ayarına göre siyaha döner)
  const thr = P80_DARK[C.dark] || P80_DARK.koyu, id = g.getImageData(0, 0, W, H), px = id.data;
  for (let i = 0; i < px.length; i += 4){ const v = px[i] + px[i + 1] + px[i + 2] < thr ? 0 : 255; px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255; }
  g.putImageData(id, 0, 0); return cv;
}
function p80raster(doc){
  const cv = p80canvas(doc), W = cv.width, H = cv.height, px = cv.getContext("2d").getImageData(0, 0, W, H).data, bw = W / 8, B = [0x1B,0x40];
  for (let y0 = 0; y0 < H; y0 += 128){ const rows = Math.min(128, H - y0); B.push(0x1D,0x76,0x30,0x00, bw & 255, bw >> 8, rows & 255, rows >> 8);
    for (let yy = y0; yy < y0 + rows; yy++) for (let xb = 0; xb < bw; xb++){ let v = 0; for (let bit = 0; bit < 8; bit++){ if (px[(yy * W + xb * 8 + bit) * 4] === 0) v |= 0x80 >> bit; } B.push(v); } }
  B.push(0x1B,0x64,4, 0x1D,0x56,0x42,0x00); return new Uint8Array(B);
}
// metin modu için tablo ve onay kutuları düz satırlara çevrilir
function p80flat(doc){ return doc.flatMap(x => x.chk ? x.chk.map(([l, on]) => ({ t: `[${on ? "X" : " "}] ${l}` }))
  : x.tbl ? x.tbl.rows.map(r => ({ t: r.map((c, i) => i ? `${x.tbl.cols[i][0]}: ${c}` : c).join("  ") })) : x.sigline ? [{ t: "______________________", a: "c" }] : [x]); }
function p80lines(doc, cols){ const L = [];
  p80flat(doc).forEach(x => { const w = x.big ? Math.floor(cols / 2) : cols;
    if (x.logo || x.img) return;
    if (x.hr){ L.push({ s: (x.hr === "=" ? "=" : "-").repeat(cols) }); return; }
    if (x.gap){ for (let i = 0; i < x.gap; i++) L.push({ s: "" }); return; }
    if (x.kv){ const k = x.kv[0] + ": ", v = String(x.kv[1] ?? ""); p80wrap(k + v, w).forEach((s, i) => L.push({ s: i ? "  " + s : s, b: x.b })); return; }
    p80wrap(x.t ?? "", w).forEach(s => L.push({ s, a: x.a, b: x.b || x.inv, big: x.big })); });
  return L; }
function p80bytes(doc){ if (p80cfg().mode !== "text" || doc.some(x => x.img)) return p80raster(doc); const C = p80cfg(), L = p80lines(doc, C.cols), B = [0x1B,0x40];
  if (C.cp === "pc857") B.push(0x1B,0x74,13);
  L.forEach(l => { B.push(0x1B,0x61, l.a === "c" ? 1 : l.a === "r" ? 2 : 0, 0x1B,0x45, l.b ? 1 : 0, 0x1D,0x21, l.big ? 0x11 : 0x00); B.push(...p80enc(l.s, C.cp), 0x0A); });
  B.push(0x1B,0x45,0, 0x1D,0x21,0, 0x1B,0x61,0, 0x1B,0x64,4, 0x1D,0x56,0x42,0x00);
  return new Uint8Array(B); }
// önizleme: kâğıda gidecek görüntünün aynısı
function p80preview(doc){ let src = ""; try { src = p80canvas(doc).toDataURL("image/png"); } catch(_){}
  return `<div class="p80paper img"><img src="${src}" alt="Çıktı önizlemesi" style="width:100%;display:block;image-rendering:pixelated"></div>`; }

/* ---- Bluetooth (BLE) — Chrome/Android: navigator.bluetooth ---- */
const P80_SERVICES = ["000018f0-0000-1000-8000-00805f9b34fb","e7810a71-73ae-499d-8c15-faa9aef0c3f2","49535343-fe7d-4ae5-8fa9-9fafd205e455","0000ff00-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb","0000ae30-0000-1000-8000-00805f9b34fb","0000ffe0-0000-1000-8000-00805f9b34fb","000018f1-0000-1000-8000-00805f9b34fb"];
let p80dev = null, p80ch = null;
async function p80ble(bytes){
  if (!navigator.bluetooth) throw new Error("Bu tarayıcı Bluetooth'a doğrudan bağlanamıyor (Android'de Chrome gerekir). “RawBT ile yazdır”ı kullanın.");
  if (!p80ch || !p80dev?.gatt?.connected){
    if (!p80dev) p80dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: P80_SERVICES });
    const srv = await p80dev.gatt.connect(); p80ch = null;
    for (const s of await srv.getPrimaryServices()){ for (const c of await s.getCharacteristics()){ if (c.properties.writeWithoutResponse || c.properties.write){ p80ch = c; break; } } if (p80ch) break; }
    if (!p80ch) throw new Error("Yazıcıda yazılabilir Bluetooth (BLE) kanalı bulunamadı. Bu model yalnızca klasik Bluetooth kullanıyorsa “RawBT ile yazdır”ı seçin.");
  }
  const step = p80ch.properties.writeWithoutResponse ? 180 : 100;
  for (let i = 0; i < bytes.length; i += step){ const part = bytes.slice(i, i + step);
    try { p80ch.properties.writeWithoutResponse ? await p80ch.writeValueWithoutResponse(part) : await p80ch.writeValue(part); }
    catch(e){ for (let j = 0; j < part.length; j += 20){ await p80ch.writeValue(part.slice(j, j + 20)); } }
    await new Promise(r => setTimeout(r, 25)); }
}
/* ---- RawBT (Android uygulaması; klasik Bluetooth yazıcılar için) ---- */
function p80rawbt(bytes){ let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b)); const b64 = btoa(bin);
  location.href = `intent:base64,${b64}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`; }
/* ---- tarayıcı yazdır (80 mm sayfa) ---- */
function p80browser(doc0, title, tot = 1){ const w = window.open("", "_blank"); if (!w){ toast("Açılır pencere engellendi"); return; }
  const imgs = Array.from({ length: tot }, (_, i) => p80canvas(p80copy(doc0, i + 1, tot)).toDataURL("image/png"));
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:80mm auto;margin:2mm}body{margin:0;width:76mm}img{width:72mm;display:block;image-rendering:pixelated}.brk{page-break-after:always}</style></head><body>${imgs.map((s, i) => `<img src="${s}" class="${i < imgs.length - 1 ? "brk" : ""}">`).join("")}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close(); }

/* ---- yazdırma penceresi (önizleme + Yazdır / İptal) ---- */
function p80open(o){ st.p80 = Object.assign({ busy: false, err: "", copies: 2 }, o); render(); }
// çift nüsha: her nüshanın başına etiket eklenir, aralarında kesim yapılır
const p80copy = (doc, n, tot) => { if (tot <= 1) return doc; const lab = { t: `${n}. NÜSHA · ${n === 1 ? "MÜŞTERİ" : "FİRMA"}`, a: "c", b: 1, inv: 1 }; return doc[0] && doc[0].logo ? [doc[0], lab, ...doc.slice(1)] : [lab, ...doc]; };
function p80all(doc, tot){ const parts = Array.from({ length: tot }, (_, i) => p80bytes(p80copy(doc, i + 1, tot))); const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out; }
function viewP80(){
  const P = st.p80; if (!P) return ""; const C = p80cfg(), doc = P.build();
  return `<div class="mfback" data-act="p80back"><div class="mfdlg card p80dlg" role="dialog" aria-modal="true" aria-label="${esc(P.title)}">
    <div class="mfhead"><div><div class="eyebrow">80 mm termal yazıcı · SP-L39 BT</div><h3 style="margin:2px 0 0">${esc(P.title)}</h3></div><button class="btn sm" data-act="p80close" aria-label="Kapat">✕</button></div>
    <div class="mfbody p80body"><div class="p80edit">${P.editor ? P.editor() : ""}
      <details><summary style="font-size:.84rem">Yazıcı ayarları</summary><div class="mfgrid" style="margin-top:8px">
        <label class="f">Kâğıt<select data-p80c="cols">${[[48,"80 mm"],[32,"58 mm"]].map(([n, l]) => `<option value="${n}" ${(C.cols <= 32 ? 32 : 48) === n ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="f">Baskı modu<select data-p80c="mode"><option value="img" ${C.mode !== "text" ? "selected" : ""}>Görüntü · Türkçe tam uyumlu (önerilen)</option><option value="text" ${C.mode === "text" ? "selected" : ""}>Metin · hızlı</option></select></label>
        <label class="f">Koyuluk<select data-p80c="dark">${[["normal","Normal"],["koyu","Koyu (önerilen)"],["cokkoyu","Çok koyu · tümü kalın"]].map(([v, l]) => `<option value="${v}" ${(C.dark || "koyu") === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="f">Yazı boyutu<select data-p80c="fs">${[[22,"Küçük"],[24,"Normal"],[27,"Büyük"]].map(([v, l]) => `<option value="${v}" ${(C.fs || 24) === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label class="f">Türkçe karakter (metin modu)<select data-p80c="cp"><option value="pc857" ${C.cp === "pc857" ? "selected" : ""}>PC857 kod sayfası</option><option value="ascii" ${C.cp === "ascii" ? "selected" : ""}>Türkçe harfleri sadeleştir (ç→c)</option></select></label>
      </div><p class="muted" style="font-size:.78rem;margin:6px 0 0">Görüntü modu her yazıcıda Türkçe harfleri doğru basar (biraz daha yavaş gönderilir). “Bluetooth” düğmesi ilk kullanımda yazıcıyı seçtirir (L39 BT Printer).</p></details></div>
      <div class="p80prev"><div class="muted" style="font-size:.78rem;margin-bottom:6px">${P.copies > 1 ? `${P.copies} nüsha ayrı ayrı basılır (1. Müşteri, 2. Firma) · sıradaki: <b>${P.next || 1}. nüsha</b>` : "1 nüsha"}</div>${p80preview(p80copy(doc, P.next || 1, P.copies || 1))}</div></div>
    ${P.err ? `<div class="warnbox" style="margin:0 16px">${esc(P.err)}</div>` : ""}
    ${P.next > 1 ? `<div class="savings" style="margin:0 16px;font-size:.9rem">✓ ${P.next - 1}. nüsha gönderildi. Kağıdı koparın, ardından <b>${P.next}. nüshayı yazdır</b> düğmesine basın.${P.lastM && P.lastM !== "ble" ? ` (Son kullanılan yöntem: ${P.lastM === "rawbt" ? "RawBT" : "tarayıcı"})` : ""}</div>` : ""}
    <div class="mffoot" style="flex-wrap:wrap"><button class="btn" data-act="p80close">${P.next > 1 ? "Kapat" : "İptal"}</button><span style="flex:1"></span>
      <button class="btn sm" data-act="p80go" data-m="browser">Tarayıcıda${P.copies > 1 ? ` (${P.next || 1}. nüsha)` : ""}</button>
      <button class="btn sm" data-act="p80go" data-m="rawbt">RawBT${P.copies > 1 ? ` (${P.next || 1}. nüsha)` : ""}</button>
      <button class="btn primary" data-act="p80go" data-m="ble" ${P.busy ? "disabled" : ""}>${P.busy ? "Gönderiliyor…" : (P.copies > 1 ? `🖨 ${P.next || 1}. nüshayı yazdır` : "🖨 Yazdır") + " (Bluetooth)"}</button></div>
  </div></div>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b || !st.p80) return; const a = b.dataset.act, P = st.p80;
  if (a === "p80close" || (a === "p80back" && e.target === b)){ if (P.next > 1 && P.next <= (P.copies || 1) && !confirm(`${P.next}. nüsha henüz yazdırılmadı. Yine de kapatılsın mı?`)) return; st.p80 = null; render(); return; }
  if (a !== "p80go") return;
  // nüshalar ayrı ayrı basılır: 1. nüsha sonrası kağıt koparılır, 2. nüsha düğmeyle gönderilir (tek parça çıkmaz)
  const tot = P.copies || 1, n = P.next || 1, doc = P.build(), one = p80copy(doc, n, tot), m = b.dataset.m;
  await Promise.all([P80_LOGO, ...one.filter(x => x.img).map(x => x.img)].map(im => im.decode ? im.decode().catch(() => {}) : null));
  const bytes = p80bytes(one);
  try {
    if (m === "ble"){ P.busy = true; P.err = ""; render(); await p80ble(bytes); }
    else if (m === "rawbt") p80rawbt(bytes); else p80browser(one, `${P.title}${tot > 1 ? ` · ${n}. nüsha` : ""}`, 1);
    lsSet("damga.p80", Object.assign(p80cfg(), { method: m })); P.busy = false;
    if (n === 1 && P.after) await P.after(m);
    if (n < tot){ P.next = n + 1; P.lastM = m; toast(`${n}. nüsha gönderildi. Kağıdı koparın, sonra ${n + 1}. nüshayı yazdırın.`); render(); return; }
    if (P.final) await P.final(m);
    toast(tot > 1 ? "Son nüsha da gönderildi" : m === "ble" ? "Yazıcıya gönderildi" : m === "rawbt" ? "RawBT'ye gönderildi" : "Yazdırma penceresi açıldı");
    st.p80 = null; render();
  } catch(err){ P.busy = false; P.err = err.name === "NotFoundError" ? "Yazıcı seçilmedi." : (err.message || String(err)); if (/GATT|disconnect/i.test(P.err)){ p80dev = null; p80ch = null; } render(); }
});
document.addEventListener("change", e => { const t = e.target; if (!st.p80 || !t.dataset.p80c) return; const C = p80cfg(); C[t.dataset.p80c] = ["cols","fs"].includes(t.dataset.p80c) ? +t.value : t.value; lsSet("damga.p80", C); render(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && st.p80){ st.p80 = null; render(); } });

/* ---------------- Tutanak (Adreste yok) ---------------- */
const TUT_TXT = "Yukarıda bilgileri yazılı cihaz(lar) lokasyonda yer almadığı için damga yapılamadı, işbu tutanak ile imza altına alınmıştır.";
function tutOpen(k){
  const p = st.plans.find(x => x.id === st.fieldPlan), s = p?.stops.find(x => x.k === k), l = BY[k]; if (!l) return;
  const devs = l.d.filter(d => !s || s.dev.includes(d[0]));
  const now = new Date(), T = { k, tarih: now.toLocaleDateString("tr-TR") + " " + now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    musteri: titleTR(l.n), lokasyon: `${titleTR(l.a)} ${titleTR(l.i)}/${titleTR(l.il)}`, metin: TUT_TXT, ids: devs.map(d => d[0]), all: devs.map(d => d[0]),
    duzenleyen: st.profile?.ad || "", yetkili: "", kurum: htfFirma().ad || "" };
  st.tut = T; delete SIG.tut_duz; delete SIG.tut_yet;
  p80open({ title: "Tutanak", editor: tutEditor, build: tutDoc, after: async () => { await tutSave(); } });
}
function tutEditor(){ const T = st.tut, inp = (k, lab, w) => `<label class="f${w ? " wide" : ""}">${lab}<input data-tut="${k}" value="${esc(T[k])}"></label>`;
  return `<div class="mfgrid">${inp("tarih","Tarih")}${inp("musteri","Müşteri",1)}${inp("lokasyon","Lokasyon",1)}${inp("duzenleyen","Düzenleyen (saha)")}${inp("yetkili","Firma yetkilisi")}</div>
    <label class="f" style="margin-top:8px">Açıklama<textarea data-tut="metin" rows="3">${esc(T.metin)}</textarea></label>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px;font-size:.84rem">${T.all.map(id => { const o = DEVID[id]; return o ? `<label class="chip" style="cursor:pointer"><input type="checkbox" data-tutd="${id}" ${T.ids.includes(id) ? "checked" : ""}> ${esc(o.d[2] || "?")} ${esc(o.d[3] || "")} ${esc(o.d[4] || "")}</label>` : ""; }).join("")}</div>
    <div class="mfgrid" style="margin-top:8px">${sigPad("tut_duz", "Düzenleyen imzası")}${sigPad("tut_yet", "Firma yetkilisi imzası")}</div>
    <p class="muted" style="font-size:.78rem;margin:6px 0 0">Yazdırınca durak “Adreste yok” olarak kaydedilir ve tutanak notu sonuca eklenir.</p>`; }
function tutDoc(){ const T = st.tut;
  return [ { logo: 1 }, ...(T.kurum ? [{ t: T.kurum, a: "c", b: 1 }] : []), { t: "TUTANAKTIR", a: "c", big: 1 }, { hr: "=" },
    { kv: ["Tarih", T.tarih] }, { kv: ["Müşteri", T.musteri], b: 1 }, { kv: ["Lokasyon", T.lokasyon] }, { hr: "-" },
    { t: `CİHAZLAR (${T.ids.length})`, b: 1 },
    { tbl: { cols: [["#", 0.08, "c"], ["Marka / Model", 0.47], ["Seri No", 0.45]], rows: T.ids.map((id, i) => { const d = DEVID[id]?.d || []; return [String(i + 1), `${d[2] || "-"} ${d[3] || ""}`.trim(), d[4] || "-"]; }) } },
    { t: T.metin }, { gap: 1 },
    { t: "DÜZENLEYEN", a: "c", b: 1, sm: 1 }, ...(SIG.tut_duz ? sigLines("tut_duz", 0.5) : [{ gap: 3 }]), { sigline: 1 }, { t: T.duzenleyen || "", a: "c" }, { gap: 1 },
    { t: "FİRMA YETKİLİSİ", a: "c", b: 1, sm: 1 }, ...(SIG.tut_yet ? sigLines("tut_yet", 0.5) : [{ gap: 3 }]), { sigline: 1 }, { t: T.yetkili || "", a: "c" }, { gap: 2 } ]; }
async function tutSave(){ const T = st.tut, p = st.plans.find(x => x.id === st.fieldPlan); if (!p) return;
  const devTxt = T.ids.map(id => { const d = DEVID[id]?.d || []; return `${d[2] || ""} ${d[4] || ""}`.trim(); }).join(", ");
  const r = { planId: p.id, k: T.k, st: "adresteyok", done: [], note: `Tutanak düzenlendi (${T.tarih}): ${devTxt}`.slice(0, 500), by: st.me, at: new Date().toISOString() };
  try { await saveResult(r); delete st.draft[T.k]; st.reasonFor = null; } catch(err){ toast("Durak kaydedilemedi: " + err.message); } }
document.addEventListener("click", e => { const b = e.target.closest('[data-act="tutanak"]'); if (b) tutOpen(b.dataset.k); });
document.addEventListener("input", e => { const t = e.target; if (st.tut && t.dataset.tut){ st.tut[t.dataset.tut] = t.value; const pv = document.querySelector(".p80prev"); if (pv && st.p80) pv.innerHTML = p80preview(st.p80.build()); } });
document.addEventListener("change", e => { const t = e.target; if (st.tut && t.dataset.tutd){ const id = +t.dataset.tutd; st.tut.ids = t.checked ? [...new Set([...st.tut.ids, id])] : st.tut.ids.filter(x => x !== id); render(); } });

/* ---------------- Hizmet Talep Formu → 80 mm ---------------- */
function htf80Doc(){ const H = st.htf, f = H.f, F = H.firma, kapi = [f.dis, f.ic && "İç " + f.ic].filter(Boolean).join(" / ");
  const kv = (k, v, o) => v ? [Object.assign({ kv: [k, v] }, o || {})] : [];
  return [ { logo: 1 }, { t: F.ad, a: "c", b: 1 }, { t: "HİZMET TALEP FORMU", a: "c", big: 1 },
    { kv: ["Tarih", f.tarih] }, { kv: ["Form No", f.no || "-"], b: 1 }, { hr: "=" },
    { kv: ["Firma", f.ad], b: 1 }, ...kv("Şube", f.sube), ...kv("Telefon", f.tel), ...kv("Vergi D./No", f.vergi),
    { kv: ["Cihaz yeri", f.yer] }, ...kv("Mahalle", f.mahalle), ...kv("Cadde", f.cadde), ...kv("Sokak", f.sokak), ...kv("Kapı no", kapi), ...kv("E-posta", f.eposta),
    { hr: "-" }, { kv: ["Yetkili", f.yetkili || "-"], b: 1 }, { kv: ["Doğum tarihi", f.dogum || "-"] }, { kv: ["T.C. No", f.tc || "-"] }, { hr: "-" },
    { chk: HTF_CHECKS.map(([k, lab]) => [lab, !!H.checks[k]]) }, { hr: "-" },
    { t: `CİHAZLAR (${H.rows.length})`, b: 1 },
    { tbl: { cols: [["#", 0.07, "c"], ["Marka / Tip", 0.31], ["Seri No", 0.27], ["Kap.", 0.13, "c"], ["d", 0.11, "c"], ["e", 0.11, "c"]],
      rows: H.rows.map((r, i) => [String(i + 1), `${r.marka} ${r.tip}`.trim() + ` · Sınıf ${r.sinif || "-"}` + (r.uretim ? ` · ${r.uretim}` : ""), r.seri || "-", r.kap || "-", r.d || "-", r.e || "-"]) } },
    { t: `Listede nitelikleri yazılı firmamızda kullanılmakta olan (AWI/NAWI) tartı aletlerinin ${f.yil} yılı (Periyodik / Tamir Sonrası) muayenelerinin yapılması, mühürleme işlemlerinin gerçekleşmesi ve muayene raporlarının düzenlenerek tarafımıza iletilmesi hususunda gereğini rica ederiz.`, sm: 1 },
    { gap: 1 }, { t: "YETKİLİ İMZASI", a: "c", b: 1, sm: 1 }, ...(SIG.htf ? sigLines("htf", 0.55) : [{ gap: 3 }]), { sigline: 1 }, { t: f.yetkili || "", a: "c", b: 1 }, { gap: 1 },
    { hr: "-" }, { t: F.alt, a: "c", sm: 1 }, { t: F.eposta, a: "c", sm: 1 }, { gap: 2 } ]; }
document.addEventListener("click", async e => { const b = e.target.closest('[data-act="htf80"]'); if (!b || !st.htf) return; if (!htfValid()) return;
  b.disabled = true; const okNo = await htfNumber(); b.disabled = false; if (!okNo) return; lsSet("damga.htfFirma", st.htf.firma);
  const keep = st.htf; p80open({ title: "Hizmet Talep Formu", editor: () => `<p class="muted" style="margin:0;font-size:.86rem">Önizleme sağda. Bir alanı değiştirmek için İptal'e basın; form açık kalır, düzenleyip tekrar yazdırın.</p>`, build: () => { const cur = st.htf; st.htf = keep; const d = htf80Doc(); st.htf = cur; return d; }, after: async () => { const cur = st.htf; st.htf = keep; htfMark(); await htfSaveFill(); st.htf = cur; }, final: async () => { st.htf = null; } }); st.htf = keep; render(); });
/* ---------------- içerdeki veriyi temizle: e-posta koduyla doğrulama + sunucuda yetki kontrolü (purge_data) ---------------- */
function viewPurge(){
  const P = st.purge; if (!P) return "";
  const email = st.profile?.email || "";
  return `<div class="mfback" data-act="pgback"><div class="mfdlg card" role="dialog" aria-modal="true" aria-label="Veriyi temizle" style="width:min(560px,100%)">
    <div class="mfhead"><div><div class="eyebrow" style="color:var(--bad)">Geri alınamaz işlem</div><h3 style="margin:2px 0 0">İçerdeki Veriyi Temizle</h3></div><button class="btn sm" data-act="pgclose" aria-label="Kapat">✕</button></div>
    <div class="mfbody">
      <label class="row" style="gap:8px;align-items:flex-start;flex-wrap:nowrap"><input type="radio" name="pgscope" value="donem" ${P.scope === "donem" ? "checked" : ""}><span><b>${YEAR} dönem listesi ve planları</b><br><span class="muted" style="font-size:.84rem">${fmt(DEVS_P.length)} dönem kaydı, ${fmt(st.plans.length)} plan ve saha sonuçları silinir. Müşteri, cihaz ve QR kayıtları kalır.</span></span></label>
      <label class="row" style="gap:8px;align-items:flex-start;flex-wrap:nowrap"><input type="radio" name="pgscope" value="tum" ${P.scope === "tum" ? "checked" : ""}><span><b style="color:var(--bad)">Tüm veriler</b><br><span class="muted" style="font-size:.84rem">Tüm müşteriler, cihazlar, QR kayıtları, tüm dönemler, planlar ve sonuçlar silinir. Kullanıcılar, gruplar ve ayarlar kalır.</span></span></label>
      ${!email ? `<div class="warnbox">Bu hesapta e-posta yok; temizleme için e-posta ile giriş yapan bir yönetici hesabı gerekir.</div>` : P.sent ? `
        <div class="share" style="gap:6px"><span style="font-size:.9rem"><b>${esc(email)}</b> adresine 6 haneli doğrulama kodu gönderildi.</span>
          <label class="f">E-postadaki kod<input id="pg-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456" value="${esc(P.code || "")}"></label>
          <label class="f"><span>Onay için büyük harfle <b>SİL</b> yazın</span><input id="pg-confirm" value="${esc(P.confirm || "")}" autocomplete="off"></label>
          <button class="link" data-act="pgsend" style="align-self:flex-start;font-size:.84rem">Kodu tekrar gönder</button></div>`
      : `<p class="muted" style="margin:0;font-size:.88rem">Devam etmek için <b>${esc(email)}</b> adresine doğrulama kodu gönderilecek. Kod 10 dakika geçerlidir.</p>`}
      ${P.err ? `<div class="warnbox">${esc(P.err)}</div>` : ""}
    </div>
    <div class="mffoot"><button class="btn" data-act="pgclose">İptal</button><span style="flex:1"></span>
      ${!email ? "" : P.sent ? `<button class="btn warn" data-act="pgdo" ${P.busy ? "disabled" : ""}>${P.busy ? "Siliniyor…" : "Kodu doğrula ve temizle"}</button>` : `<button class="btn primary" data-act="pgsend" ${P.busy ? "disabled" : ""}>${P.busy ? "Gönderiliyor…" : "Doğrulama kodu gönder"}</button>`}</div>
  </div></div>`;
}
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "pgopen"){ st.purge = { scope: "donem", sent: false }; render(); return; }
  const P = st.purge; if (!P) return;
  if (a === "pgclose" || (a === "pgback" && e.target === b)){ st.purge = null; render(); return; }
  if (a === "pgsend"){ P.busy = true; P.err = ""; render();
    const { error } = await sb.auth.signInWithOtp({ email: st.profile.email, options: { shouldCreateUser: false } });
    P.busy = false; if (error) P.err = "Kod gönderilemedi: " + error.message; else { P.sent = true; toast("Doğrulama kodu e-postanıza gönderildi"); } render(); return; }
  if (a === "pgdo"){ P.code = ($("#pg-code")?.value || "").trim(); P.confirm = ($("#pg-confirm")?.value || "").trim();
    if (P.confirm !== "SİL"){ P.err = "Onay kutusuna büyük harfle SİL yazın."; render(); return; }
    if (!/^\d{6,10}$/.test(P.code)){ P.err = "E-postadaki kodu yazın."; render(); return; }
    P.busy = true; P.err = ""; render();
    try {
      const v = await sb.auth.verifyOtp({ email: st.profile.email, token: P.code, type: "email" }); if (v.error) throw new Error("Kod geçersiz ya da süresi dolmuş: " + v.error.message);
      const r = await q(sb.rpc("purge_data", { p_scope: P.scope, p_donem: P.scope === "donem" ? YEAR : null }));
      st.purge = null; st.imp = null; await reloadDevices(); await loadDynamic(); render();
      toast(`Temizlendi: ${fmt(r?.items || 0)} dönem kaydı, ${fmt(r?.plans || 0)} plan${P.scope === "tum" ? `, ${fmt(r?.devices || 0)} cihaz, ${fmt(r?.businesses || 0)} müşteri` : ""}`);
    } catch(err){ P.busy = false; P.err = /purge_data/.test(err.message) && /function|not find|exist/i.test(err.message) ? "Temizleme fonksiyonu kurulu değil: supabase/damga-temizle.sql çalıştırılmalı." : err.message; render(); }
  }
});
document.addEventListener("change", e => { if (e.target.name === "pgscope" && st.purge){ st.purge.scope = e.target.value; render(); } });
document.addEventListener("input", e => { if (!st.purge) return; if (e.target.id === "pg-code") st.purge.code = e.target.value; if (e.target.id === "pg-confirm") st.purge.confirm = e.target.value; });
/* ---------------- QR etiket: cihazdaki mevcut etiket okutulup eşleştirilir (değişmez) · etiketi olmayana sahada Antka QR basılır ---------------- */
const LBL_KAY = { mevcut: "Mevcut etiket", antka: "Antka QR etiketi" };
function labelBadge(d){ return d[27] ? `<span class="st tamam" title="${esc(d[27])}">🏷 ${d[28] === "antka" ? "QR basıldı" : "Etiket bağlı"}</span>` : `<span class="st bekliyor">Etiket yok</span>`; }
function labelActs(d){
  if (d[27]) return `<span class="muted" style="font-size:.8rem">🏷 ${LBL_KAY[d[28]] || "Etiket"} bağlı</span>`;
  return `<span class="row" style="gap:6px"><button type="button" class="btn sm" data-act="lblscan" data-id="${d[0]}">📷 Mevcut etiketi okut</button><button type="button" class="btn sm" data-act="lblprint" data-id="${d[0]}">🖨 QR bas</button></span>`;
}
// okutulan içerikten cihazı bul: bağlı etiket → Antka QR kodu (EL-000123) → panel linki (#c-…)
function labelFind(txt){ const t = String(txt || "").trim(); if (!t) return null;
  const all = Object.values(DEVID), hit = all.find(o => o.d[27] && o.d[27] === t); if (hit) return hit;
  const m = t.match(/(EL-\d{6})/) || t.match(/#c-([A-Z0-9-]+)/i); if (m && DEVBY[m[1]]) return DEVBY[m[1]];
  return all.find(o => o.d[11] === t.toUpperCase()) || null; }
const isAntkaQR = t => /[?&]k=EL-\d{6}-/.test(t) || new RegExp("^" + String(APP_URL).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "#c-").test(t);
function labelLocal(id, txt, kay){ const o = DEVID[id]; if (o){ o.d[27] = txt; o.d[28] = kay; } const r = RAW.devs.find(x => x.id === id); if (r){ r.etiket = txt; r.etiket_kaynak = kay; } }
async function labelLink(id, txt, kay){
  try { await q(sb.rpc("link_label", { p_device: id, p_etiket: txt, p_kaynak: kay })); }
  catch(err){ throw new Error(/link_label/.test(err.message) && /function|exist/i.test(err.message) ? "etiket altyapısı kurulu değil (supabase/damga-etiket.sql çalıştırılmalı)" : err.message); }
  labelLocal(id, txt, kay); }

/* ---- kamera ile okutma (BarcodeDetector; yoksa jsQR) ---- */
const SCAN = { stream: null, timer: null };
function scanOpen(id){ st.scan = { id: id || null, err: "", busy: false }; render(); setTimeout(scanStart, 60); }
function scanStop(){ clearTimeout(SCAN.timer); SCAN.timer = null; if (SCAN.stream){ SCAN.stream.getTracks().forEach(t => t.stop()); SCAN.stream = null; } }
function scanClose(){ scanStop(); st.scan = null; render(); }
function viewScan(){ const S = st.scan; if (!S) return ""; const o = S.id ? DEVID[S.id] : null;
  return `<div class="mfback" data-act="scanback"><div class="mfdlg card" role="dialog" aria-modal="true" aria-label="Etiket okut" style="max-width:520px">
    <div class="mfhead"><div><div class="eyebrow">${o ? "Mevcut etiketi bu cihaza bağla" : "Etiketi okutup cihazı bul"}</div><h3 style="margin:2px 0 0">${o ? `${esc(o.d[2] || "Cihaz")} ${esc(o.d[3] || "")} · S/N ${esc(o.d[4] || "—")}` : "Etiket okut"}</h3></div><button class="btn sm" data-act="scanclose" aria-label="Kapat">✕</button></div>
    <div class="mfbody"><div class="scanbox"><video id="scanv" playsinline muted autoplay></video><div class="scanaim" aria-hidden="true"></div></div>
      <p class="muted" style="margin:0;font-size:.84rem">Kamerayı cihazdaki QR etiketine tutun; okununca otomatik ${o ? "bağlanır. Bağlanan etiket sonradan değiştirilemez (yalnızca yönetici)" : "cihaz kartı açılır"}.</p>
      ${S.err ? `<div class="warnbox">${esc(S.err)}</div>` : ""}
      <details ${S.err ? "open" : ""}><summary style="font-size:.86rem">Okunmuyor mu? Etiketteki numarayı elle yazın</summary><div class="row" style="margin-top:6px"><input id="scanman" type="text" autocomplete="off" placeholder="Etiket no / kod" style="flex:1 1 200px"><button class="btn sm" data-act="scanman">Kullan</button></div></details></div>
    <div class="mffoot"><span style="flex:1"></span><button class="btn" data-act="scanclose">Kapat</button></div></div></div>`; }
let jsqrLoad = null;
function loadJsQR(){ if (window.jsQR) return Promise.resolve(); return jsqrLoad || (jsqrLoad = new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"; s.onload = ok; s.onerror = () => { jsqrLoad = null; no(new Error("QR okuyucu yüklenemedi")); }; document.head.appendChild(s); })); }
async function scanStart(){ const v = document.getElementById("scanv"); if (!v || !st.scan) return;
  const fail = m => { if (!st.scan) return; st.scan.err = m; scanStop(); render(); };
  if (!navigator.mediaDevices?.getUserMedia) return fail("Bu tarayıcı kameraya erişemiyor. Etiketteki numarayı elle yazın.");
  try { SCAN.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }); v.srcObject = SCAN.stream; await v.play(); }
  catch(err){ return fail(err.name === "NotAllowedError" ? "Kamera izni verilmedi. Tarayıcı ayarlarından bu siteye kamera izni verin ya da numarayı elle yazın." : "Kamera açılamadı: " + err.message); }
  let det = null;
  if ("BarcodeDetector" in window){ try { const f = await BarcodeDetector.getSupportedFormats(); if (f.includes("qr_code")) det = new BarcodeDetector({ formats: f.filter(x => ["qr_code","data_matrix","code_128","ean_13"].includes(x)) }); } catch(_){} }
  if (!det){ try { await loadJsQR(); } catch(err){ return fail(err.message + ". Numarayı elle yazın."); } }
  const cv = document.createElement("canvas"), g = cv.getContext("2d", { willReadFrequently: true });
  const tick = async () => { if (!SCAN.stream || !st.scan) return; let txt = null;
    try { if (det){ const r = await det.detect(v); if (r.length) txt = r[0].rawValue; }
      else if (window.jsQR && v.videoWidth){ const k = Math.min(1, 720 / v.videoWidth); cv.width = v.videoWidth * k | 0; cv.height = v.videoHeight * k | 0; g.drawImage(v, 0, 0, cv.width, cv.height);
        const im = g.getImageData(0, 0, cv.width, cv.height), r = jsQR(im.data, im.width, im.height, { inversionAttempts: "attemptBoth" }); if (r && r.data) txt = r.data; } } catch(_){}
    if (txt){ try { navigator.vibrate?.(80); } catch(_){} scanStop(); scanFound(txt); return; }
    SCAN.timer = setTimeout(tick, 160); };
  tick(); }
async function scanFound(txt){ const S = st.scan; if (!S) return; txt = String(txt).trim();
  if (!S.id){ const o = labelFind(txt); if (!o){ S.err = `Bu etiket sistemde bir cihaza bağlı değil: “${txt.slice(0, 80)}”. Cihazın durağından “Mevcut etiketi okut” ile bağlayın.`; render(); return; }
    scanClose(); st.devCode = o.d[11]; st.view = "cihaz"; st.evReason = null; try { history.replaceState(null, "", "#c-" + o.d[11]); } catch(_){} render(); window.scrollTo(0, 0); return; }
  const o = DEVID[S.id]; if (!o){ scanClose(); return; }
  const other = labelFind(txt); if (other && other !== o && other.d[27] === txt){ S.err = `Bu etiket başka bir cihaza bağlı: ${titleTR(other.l.n)} · ${other.d[2] || ""} S/N ${other.d[4] || "—"}`; render(); return; }
  if (!confirm(`Etiket bu cihaza bağlansın mı?\n\n${o.d[2] || ""} ${o.d[3] || ""} · S/N ${o.d[4] || "—"}\nEtiket: ${txt.slice(0, 120)}\n\nBağlandıktan sonra saha ekibi değiştiremez.`)){ S.err = ""; render(); setTimeout(scanStart, 60); return; }
  try { await labelLink(o.d[0], txt, isAntkaQR(txt) ? "antka" : "mevcut"); scanClose(); toast("Etiket cihaza bağlandı"); }
  catch(err){ S.err = "Bağlanamadı: " + err.message; render(); } }

/* ---- etiketi olmayan cihaz: 80 mm yazıcıdan Antka QR etiketi ---- */
function lblDoc(id){ const o = DEVID[id]; if (!o) return []; const d = o.d, url = qrURL(d[11]);
  if (!o._qrImg || o._qrUrl !== url){ const qq = qrcode(0, "M"); qq.addData(url); qq.make(); const img = new Image(); img.src = qq.createDataURL(8, 2); o._qrImg = img; o._qrUrl = url; }
  return [ { logo: 1 }, { t: "PERİYODİK MUAYENE · DAMGA", a: "c", b: 1 }, { img: o._qrImg, w: 0.6, px: 1 }, { t: d[11], a: "c", big: 1 }, { hr: "-" },
    { t: titleTR(String(o.l.n).split(" · ")[0]), a: "c", b: 1 }, { t: `${d[2] || ""} ${d[3] || ""}`.trim() || "-", a: "c" }, { t: `S/N ${d[4] || "-"}`, a: "c" },
    { t: `Max ${d[12] || "-"} · e ${d[18] || "-"} · d ${d[22] || "-"} · Sınıf ${d[29] || d[16] || "-"}`, a: "c" }, { gap: 1 },
    { t: "Damga durumunu görmek için QR kodu okutun.", a: "c" }, { t: "ANTKA KALİBRASYON · info@antka.com.tr", a: "c" } ]; }
function lblPrint(id){ const o = DEVID[id]; if (!o) return; if (!window.qrcode){ toast("QR kütüphanesi yüklenemedi; sayfayı yenileyin"); return; }
  if (o.d[27]){ toast("Bu cihazın etiketi zaten bağlı"); return; }
  p80open({ title: "QR etiketi", copies: 1, build: () => lblDoc(id),
    editor: () => `<p class="muted" style="margin:0;font-size:.86rem">${esc(o.d[2] || "")} ${esc(o.d[3] || "")} · S/N ${esc(o.d[4] || "—")}<br>Yazdırınca bu QR kodu cihaza bağlanır. Etiketi cihazın görünen bir yerine yapıştırın.</p>`,
    after: async () => { try { await labelLink(id, qrURL(o.d[11]), "antka"); } catch(err){ toast("Etiket basıldı fakat kaydedilemedi: " + err.message); } } }); }

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "lblscan"){ e.preventDefault(); scanOpen(+b.dataset.id); }
  if (a === "lblfind"){ e.preventDefault(); scanOpen(null); }
  if (a === "lblprint"){ e.preventDefault(); lblPrint(+b.dataset.id); }
  if (a === "lblunlink"){ const id = +b.dataset.id; if (!confirm("Bu cihazın etiket bağı kaldırılsın mı? Sahada yeniden okutulabilir ya da yeni QR basılabilir.")) return;
    try { await q(sb.rpc("unlink_label", { p_device: id })); labelLocal(id, "", ""); render(); toast("Etiket bağı kaldırıldı"); } catch(err){ toast("Kaldırılamadı: " + err.message); } }
  if (!st.scan) return;
  if (a === "scanclose" || (a === "scanback" && e.target === b)) scanClose();
  if (a === "scanman"){ const v = (document.getElementById("scanman")?.value || "").trim(); if (!v){ toast("Etiket numarasını yazın"); return; } scanStop(); scanFound(v); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && st.scan) scanClose(); });

/* ---------------- cihaz bilgileri: saha değiştiremez · eksik e / d / sınıf sahadan önerilir, yönetici onaylar ---------------- */
const INFO_REQ = [["e","e (muayene taksimatı)"],["d","d (taksimat)"],["sinif","Sınıf"]];
const devInfoVal = (d, k) => String(k === "e" ? d[18] : k === "d" ? d[22] : d[29] || "").trim();
const devMissing = d => INFO_REQ.filter(([k]) => !devInfoVal(d, k)).map(([k]) => k === "sinif" ? "sınıf" : k);
const infoPending = id => (st.reqs || []).find(r => r.tur === "bilgi" && r.hedef_device === id && r.durum === "bekliyor");
const missBadge = d => { const m = devMissing(d); return m.length ? ` <span class="st tekrar" title="Hizmet talep formu için zorunlu">${m.join(" / ")} eksik</span>` : ""; };
// yönetici cihaz kaydını doğrudan günceller (yalnızca verilen alanlar)
const DEV_COL = { marka: [2], model: [3], seri_no: [4], max_cap: [5, 12], sinif: [16, 29], e: [18], d: [22] };
async function saveDevInfo(id, patch){ patch = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)); if (!Object.keys(patch).length) return;
  await q(sb.from("devices").update(patch).eq("id", id));
  const o = DEVID[id], r = RAW.devs.find(x => x.id === id); if (r) Object.assign(r, patch);
  if (o) Object.entries(patch).forEach(([k, v]) => (DEV_COL[k] || []).forEach(i => o.d[i] = v ?? "")); }
async function propInfo(id, vals){ const o = DEVID[id]; if (!o) throw new Error("cihaz bulunamadı");
  const v = Object.fromEntries(INFO_REQ.map(([k]) => [k, String(vals[k] || "").trim()]));
  if (INFO_REQ.some(([k]) => !devInfoVal(o.d, k) && !v[k])) throw new Error("eksik alanların hepsini doldurun");
  try { await q(sb.from("device_requests").insert({ tur: "bilgi", hedef_device: id, business_id: o.l.k, plan_id: st.fieldPlan || null, donem: YEAR, marka: o.d[2] || "-", model: o.d[3] || "", seri_no: o.d[4] || "",
    max_cap: o.d[12] || "", e: v.e, d: v.d, sinif: v.sinif, created_by: st.me })); }
  catch(err){ throw new Error(/tur|hedef_device|column/.test(err.message) ? "bilgi talebi altyapısı kurulu değil (supabase/damga-etiket.sql çalıştırılmalı)" : err.message); } }
function infoInputs(id, vals, attr){ const o = DEVID[id]; return INFO_REQ.map(([k, lab]) => { const cur = devInfoVal(o.d, k), v = vals[k] ?? cur;
  return k === "sinif" ? `<label class="f">${lab}${cur ? "" : " *"}<select ${attr}="${id}" data-c="${k}"><option value="">Seçin</option>${["I","II","III","IIII"].map(s => `<option ${v === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>`
    : `<label class="f">${lab}${cur ? "" : " *"}<input ${attr}="${id}" data-c="${k}" value="${esc(v)}" placeholder="örn. ${k === "e" ? "5 g" : "2 g"}" autocomplete="off"></label>`; }).join(""); }
// cihaz kartı: saha → eksikse öneri formu · yönetici → doğrudan düzenleme
function devInfoCard(o, role){ const d = o.d, id = d[0], miss = devMissing(d), pend = infoPending(id); st.infoDraft = st.infoDraft || {}; const dr = st.infoDraft[id] || {};
  if (role === "admin") return `<article class="card pad stack" style="gap:8px"><h3>Cihaz bilgileri (yönetici)</h3>
    <div class="mfgrid">${infoInputs(id, dr, "data-info")}</div><div class="row"><button class="btn primary" data-act="infosave" data-id="${id}">Kaydet</button>${miss.length ? `<span class="muted" style="font-size:.84rem">${miss.join(" / ")} eksik · hizmet talep formu bunlar olmadan çıkmaz</span>` : ""}</div></article>`;
  if (!miss.length) return "";
  return `<article class="card pad stack" style="gap:8px;border-color:var(--wait)"><h3>Eksik cihaz bilgisi</h3>
    ${pend ? `<div class="savings" style="font-size:.88rem">Öneriniz yönetici onayı bekliyor (e ${esc(pend.e || "—")} · d ${esc(pend.d || "—")} · sınıf ${esc(pend.sinif || "—")}).</div><div><button class="btn sm" data-act="inforefresh">🔄 Onay durumunu yenile</button></div>`
      : `<p class="muted" style="margin:0;font-size:.86rem">${miss.join(" / ")} kayıtlı değil. Cihaz plakasından okuyup yöneticiye gönderin; onaylanınca hizmet talep formu yazdırılabilir.</p>
    <div class="mfgrid">${infoInputs(id, dr, "data-info")}</div><div class="row"><button class="btn primary" data-act="infoprop" data-id="${id}">Onaya gönder</button></div>`}</article>`; }
async function infoRefresh(){ await loadDynamic(); await reloadDevices(); if (st.htf) st.htf.rows = st.htf.rows.map(r => r.id && DEVID[r.id] ? htfDevRow(DEVID[r.id]) : r); }
document.addEventListener("input", e => { const t = e.target; if (t.dataset.info){ st.infoDraft = st.infoDraft || {}; (st.infoDraft[t.dataset.info] = st.infoDraft[t.dataset.info] || {})[t.dataset.c] = t.value; } });
document.addEventListener("change", e => { const t = e.target; if (t.dataset.info){ st.infoDraft = st.infoDraft || {}; (st.infoDraft[t.dataset.info] = st.infoDraft[t.dataset.info] || {})[t.dataset.c] = t.value; } });
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return; const a = b.dataset.act;
  if (a === "infosave" || a === "infoprop"){ const id = +b.dataset.id, o = DEVID[id], dr = (st.infoDraft || {})[id] || {}; if (!o) return; b.disabled = true;
    try { if (a === "infosave"){ const patch = {}; INFO_REQ.forEach(([k]) => { if (dr[k] !== undefined) patch[k] = String(dr[k]).trim(); }); await saveDevInfo(id, patch); toast("Cihaz bilgileri kaydedildi"); }
      else { await propInfo(id, dr); await loadDynamic(); toast("Öneri yöneticinin onayına gönderildi"); }
      delete st.infoDraft[id]; render(); }
    catch(err){ b.disabled = false; toast((a === "infosave" ? "Kaydedilemedi: " : "Gönderilemedi: ") + err.message); } }
  if (a === "inforefresh"){ b.disabled = true; try { await infoRefresh(); render(); toast("Güncellendi"); } catch(err){ b.disabled = false; toast("Yenilenemedi: " + err.message); } }
});
/* ---------------- ekranda imza: Hizmet Talep Formu ve Tutanak (A4 ve 80 mm çıktıya basılır, veritabanına kaydedilmez) ---------------- */
const SIG = {};   // id -> { url, img }
function sigPad(id, label, req){
  return `<div class="sigwrap"><div class="row" style="justify-content:space-between;align-items:center"><span style="font-size:.86rem;font-weight:600">${esc(label)}${req ? " *" : ""}</span><button type="button" class="link" data-act="sigclear" data-id="${id}">Temizle</button></div>
    <canvas class="sigpad" data-sig="${id}" width="640" height="220" aria-label="${esc(label)} alanı"></canvas>
    <small class="muted" data-sigst="${id}">${SIG[id] ? "İmza alındı ✓" : "Parmağınızla ya da kalemle bu alana imza atın"}</small></div>`;
}
// render() sonrası tuval yeniden oluşur: alınmış imza geri çizilir
function sigRestore(){ document.querySelectorAll("canvas.sigpad").forEach(cv => { const s = SIG[cv.dataset.sig]; if (!s || !s.full) return;
  const draw = () => { const g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(s.full, 0, 0); };
  s.full.complete ? draw() : (s.full.onload = draw); }); }
const sigLines = (id, w = 0.55) => SIG[id] ? [{ img: SIG[id].img, w }] : [];
function sigPt(cv, e){ const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
// mürekkebin bulunduğu bölge kırpılır; baskıda boş kenar kalmaz
function sigTrim(cv){ const g = cv.getContext("2d"), { width: W, height: H } = cv, px = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 40){ if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < 60) return null;
  const p = 6; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(W - 1, x1 + p); y1 = Math.min(H - 1, y1 + p);
  const c = document.createElement("canvas"); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1; const cg = c.getContext("2d"); cg.fillStyle = "#fff"; cg.fillRect(0, 0, c.width, c.height); cg.drawImage(cv, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  return c.toDataURL("image/png"); }
function sigStatus(id){ const el = document.querySelector(`[data-sigst="${id}"]`); if (el) el.textContent = SIG[id] ? "İmza alındı ✓" : "Parmağınızla ya da kalemle bu alana imza atın";
  const pv = document.querySelector(".p80prev"); if (pv && st.p80){ const P = st.p80; pv.innerHTML = `<div class="muted" style="font-size:.78rem;margin-bottom:6px">${P.copies > 1 ? `${P.copies} nüsha ayrı ayrı basılır · sıradaki: <b>${P.next || 1}. nüsha</b>` : "1 nüsha"}</div>` + p80preview(p80copy(P.build(), P.next || 1, P.copies || 1)); } }
let sigCur = null;
document.addEventListener("pointerdown", e => { const cv = e.target.closest?.("canvas.sigpad"); if (!cv) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch(_){}
  const g = cv.getContext("2d"); g.lineWidth = 3.4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#000";
  const p = sigPt(cv, e); g.beginPath(); g.arc(p.x, p.y, 1.6, 0, Math.PI * 2); g.fillStyle = "#000"; g.fill(); sigCur = { cv, g, last: p }; });
document.addEventListener("pointermove", e => { if (!sigCur) return; e.preventDefault(); const { cv, g } = sigCur, p = sigPt(cv, e);
  g.beginPath(); g.moveTo(sigCur.last.x, sigCur.last.y); g.lineTo(p.x, p.y); g.stroke(); sigCur.last = p; }, { passive: false });
const sigEnd = () => { if (!sigCur) return; const { cv } = sigCur, id = cv.dataset.sig; sigCur = null;
  const url = sigTrim(cv); if (!url){ delete SIG[id]; sigStatus(id); return; }
  const img = new Image(); img.src = url; const full = new Image(); full.src = cv.toDataURL("image/png"); SIG[id] = { url, img, full }; sigStatus(id); };
document.addEventListener("pointerup", sigEnd); document.addEventListener("pointercancel", sigEnd);
document.addEventListener("click", e => { const b = e.target.closest('[data-act="sigclear"]'); if (!b) return; e.preventDefault(); const id = b.dataset.id; delete SIG[id];
  const cv = document.querySelector(`canvas.sigpad[data-sig="${id}"]`); if (cv) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); sigStatus(id); });
/* ---------------- boot & giriş ---------------- */
function showScreen(id){ ["setup","login","loading","app"].forEach(s => { const el = document.getElementById("scr-" + s); if (el) el.hidden = s !== id; }); }
function loginMsg(m, ok){ const el = $("#lmsg"); if (el){ el.textContent = m || ""; el.className = "lmsg" + (ok ? " ok" : ""); } }
let rtTimer = null;
let rtFull = false;
function scheduleRefresh(full){ if (full === true) rtFull = true; clearTimeout(rtTimer); rtTimer = setTimeout(async () => { const f = rtFull; rtFull = false; try { if (f) await reloadDevices(); await loadDynamic(); softRender(); } catch(e){} }, 600); }
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
    st.ready = true; routeFromPath(); applyHash(); showScreen("app"); render();
    sb.channel("damga-canli")
      .on("postgres_changes", { event: "*", schema: "public", table: "plans" }, () => scheduleRefresh(true))
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
    if (error){ loginMsg(/provider|sms|phone.*(disabled|not enabled)/i.test(error.message) ? "SMS girişi henüz etkin değil (" + error.message + "). Yöneticinize başvurun." : /rate|seconds/i.test(error.message) ? "Çok sık denendi; biraz bekleyip tekrar deneyin." : "Kod gönderilemedi: " + error.message); console.warn("SMS OTP", error); return false; }
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
