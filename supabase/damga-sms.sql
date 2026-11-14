-- =====================================================================
-- Elmaslar Damga Takip · v15 · SMS günlüğü (Sanal Santral)
-- Tekrar çalıştırılabilir. Doğrulama kodunun kendisi ASLA kaydedilmez.
-- =====================================================================
alter table public.sms_log add column if not exists tur text default 'bilgilendirme';   -- otp | bilgilendirme | test
alter table public.sms_log add column if not exists mesaj text;
alter table public.sms_log add column if not exists paket_id text;
alter table public.sms_log add column if not exists hata text;
alter table public.sms_log add column if not exists gonderen uuid;
alter table public.sms_log alter column gonderim set default now();
create index if not exists sms_log_gonderim_idx on public.sms_log (gonderim desc);
-- okuma/yazma yalnızca yönetici (damga.sql'deki sms_log_admin_all politikası); Edge Function service role ile yazar.
