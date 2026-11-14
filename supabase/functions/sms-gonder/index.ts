// Elmaslar Damga Takip · yönetici SMS gönderimi (müşteri bilgilendirme, test) → Sanal Santral SMS
// Supabase panelinde: Edge Functions → sms-gonder (JWT doğrulaması AÇIK). Yalnızca etkin yönetici çağırabilir.
// Gizli değerler: SS_USERNAME, SS_API_KEY (ya da SS_PASSWORD), SS_SENDER, isteğe bağlı SS_CUSTOMER_ID, SS_ENTEGRATOR_ID, SS_AUTH_MODE, (isteğe bağlı) SS_API_URL, SMS_ALLOWED_ORIGIN
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const API = env("SS_API_URL", "https://sms.sanalsantral.com.tr:9588/sms/create");
const ORIGIN = env("SMS_ALLOWED_ORIGIN", "https://yahyasogut.com");
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function phone90(p: string): string | null {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "90" + d.slice(1);
  if (d.length === 10 && d.startsWith("5")) d = "90" + d;
  return /^905\d{9}$/.test(d) ? d : null;
}
// Kimlik doğrulama: varsayılan Basic (kullanıcı adı : API anahtarı ya da şifre). SS_AUTH_MODE=bearer → "Authorization: Bearer <anahtar>", apikey → "X-API-Key: <anahtar>".
function ssHeaders(): Record<string, string> {
  const key = env("SS_API_KEY") || env("SS_PASSWORD"), mode = env("SS_AUTH_MODE", "basic").toLowerCase();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (mode === "bearer") h["Authorization"] = "Bearer " + key;
  else if (mode === "apikey") h["X-API-Key"] = key;
  else h["Authorization"] = "Basic " + btoa(`${env("SS_USERNAME")}:${key}`);
  if (env("SS_CUSTOMER_ID")) h["X-Customer-Company-ID"] = env("SS_CUSTOMER_ID");
  if (env("SS_ENTEGRATOR_ID")) h["X-Entegrator-Company-ID"] = env("SS_ENTEGRATOR_ID");
  return h;
}
async function sendSS(number: string, content: string, customID: string) {
  const res = await fetch(API, {
    method: "POST",
    headers: ssHeaders(),
    body: JSON.stringify({ type: 1, sendingType: 0, title: "Bilgilendirme", content, number: Number(number), encoding: 1, sender: env("SS_SENDER"), validity: 1440, customID }),
  });
  const txt = await res.text(); let j: any = null; try { j = JSON.parse(txt); } catch { /* düz metin */ }
  if (!res.ok || !j || j.success !== true) throw new Error(`${res.status}: ${(j && (j.error || j.message)) || txt.slice(0, 200)}`);
  return j?.data?.data?.pkgID ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return out({ error: "POST gerekli" }, 405);
  const auth = req.headers.get("Authorization") || "";
  const userDb = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: auth } } });
  const { data: u } = await userDb.auth.getUser();
  const { data: isAdmin } = await userDb.rpc("is_admin");
  if (!u?.user || isAdmin !== true) return out({ error: "Yalnızca yönetici SMS gönderebilir" }, 403);

  let body: any; try { body = await req.json(); } catch { return out({ error: "Geçersiz istek" }, 400); }
  const tur = ["bilgilendirme", "test"].includes(body?.tur) ? body.tur : "bilgilendirme";
  const items: { phone: string; text: string; business_id?: string }[] = Array.isArray(body?.items) ? body.items.slice(0, 500) : [];
  if (!items.length) return out({ error: "Alıcı yok" }, 400);

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const results: { phone: string; ok: boolean; error?: string }[] = [];
  const logs: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  const queue = items.map((it) => ({ ...it, num: phone90(it.phone), text: String(it.text || "").slice(0, 900) }));
  const work = async (it: any) => {
    if (!it.num || !it.text.trim()){ results.push({ phone: it.phone, ok: false, error: "Geçersiz cep numarası ya da boş mesaj" }); return; }
    if (seen.has(it.num + "|" + it.text)){ results.push({ phone: it.phone, ok: false, error: "Aynı numaraya aynı mesaj (atlandı)" }); return; }
    seen.add(it.num + "|" + it.text);
    try { const pkg = await sendSS(it.num, it.text, `${tur}-${Date.now()}-${results.length}`); results.push({ phone: it.num, ok: true });
      logs.push({ business_id: it.business_id || null, telefon: it.num, donem: body?.donem || null, tur, mesaj: it.text, paket_id: pkg ? String(pkg) : null, durum: "gonderildi", gonderen: u.user.id }); }
    catch (e) { const m = String((e as Error).message).slice(0, 500); results.push({ phone: it.num, ok: false, error: m });
      logs.push({ business_id: it.business_id || null, telefon: it.num, donem: body?.donem || null, tur, mesaj: it.text, durum: "hata", hata: m, gonderen: u.user.id }); }
  };
  for (let i = 0; i < queue.length; i += 5) await Promise.all(queue.slice(i, i + 5).map(work));
  if (logs.length) await admin.from("sms_log").insert(logs);
  const sent = results.filter((r) => r.ok).length;
  return out({ sent, failed: results.length - sent, results });
});
