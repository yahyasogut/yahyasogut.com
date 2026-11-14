// Elmaslar Damga Takip · Supabase Auth "Send SMS" kancası → Sanal Santral SMS
// Supabase panelinde: Edge Functions → sms-otp (JWT doğrulaması KAPALI), Authentication → Hooks → Send SMS → HTTPS → bu fonksiyonun adresi.
// Gizli değerler (Edge Functions → Secrets): SS_USERNAME, SS_API_KEY (ya da SS_PASSWORD), SS_SENDER, isteğe bağlı SS_CUSTOMER_ID, SS_ENTEGRATOR_ID, SS_AUTH_MODE, SEND_SMS_HOOK_SECRET, (isteğe bağlı) SS_API_URL
import { Webhook } from "npm:standardwebhooks@1.0.0";

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const API = env("SS_API_URL", "https://sms.sanalsantral.com.tr:9588/sms/create");

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
    body: JSON.stringify({ type: 1, sendingType: 0, title: "Giris kodu", content, number: Number(number), encoding: 1, sender: env("SS_SENDER"), validity: 10, customID }),
  });
  const txt = await res.text();
  let j: any = null; try { j = JSON.parse(txt); } catch { /* düz metin */ }
  if (!res.ok || !j || j.success !== true) throw new Error(`Sanal Santral ${res.status}: ${(j && (j.error || j.message)) || txt.slice(0, 200)}`);
  return j?.data?.data?.pkgID ?? null;
}

async function log(row: Record<string, unknown>) {
  const url = env("SUPABASE_URL"), key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  try { await fetch(`${url}/rest/v1/sms_log`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(row) }); } catch { /* günlük hatası girişi engellemez */ }
}

const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return out({ error: { http_code: 405, message: "POST gerekli" } }, 405);
  const payload = await req.text();
  let data: any;
  try {
    const wh = new Webhook(env("SEND_SMS_HOOK_SECRET").replace("v1,whsec_", ""));
    data = wh.verify(payload, Object.fromEntries(req.headers));
  } catch (_e) {
    return out({ error: { http_code: 401, message: "Kanca imzası doğrulanamadı" } }, 401);
  }
  const num = phone90(data?.user?.phone || "");
  const otp = String(data?.sms?.otp || "");
  if (!num || !otp) return out({ error: { http_code: 400, message: "Geçersiz telefon numarası" } }, 400);
  const content = `Elmaslar Damga Takip giris kodunuz: ${otp}. Kodu kimseyle paylasmayin.`;
  try {
    const pkg = await sendSS(num, content, `otp-${Date.now()}`);
    await log({ telefon: num, tur: "otp", mesaj: "Giriş kodu (içerik saklanmaz)", paket_id: pkg ? String(pkg) : null, durum: "gonderildi" });
    return out({});
  } catch (e) {
    await log({ telefon: num, tur: "otp", mesaj: "Giriş kodu (içerik saklanmaz)", durum: "hata", hata: String((e as Error).message).slice(0, 500) });
    return out({ error: { http_code: 500, message: "SMS gönderilemedi, lütfen tekrar deneyin" } }, 500);
  }
});
