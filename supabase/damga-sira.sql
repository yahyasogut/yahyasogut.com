-- =====================================================================
-- Elmaslar Damga Takip · v10 · lokasyon ve cihaz sıra numaraları
-- damga.sql (ve damga-donem.sql) sonrası çalıştırılır; tekrar çalıştırılabilir.
-- Numaralar kalıcıdır: kayıt silinse de başka kayda verilmez. Yeni kayıtlar otomatik numara alır.
-- =====================================================================
create sequence if not exists public.businesses_sira_seq;
create sequence if not exists public.devices_sira_seq;
alter table public.businesses add column if not exists sira bigint;
alter table public.devices add column if not exists sira bigint;

-- mevcut kayıtlar: lokasyonlar il / ilçe / ad sırasıyla, cihazlar lokasyon sırasıyla numaralanır
with o as (
  select id, row_number() over (order by is_depot, il, ilce, unvan, id) + coalesce((select max(sira) from public.businesses), 0) as rn
    from public.businesses where sira is null)
update public.businesses b set sira = o.rn from o where b.id = o.id;
with o as (
  select d.id, row_number() over (order by b.sira, d.id) + coalesce((select max(sira) from public.devices), 0) as rn
    from public.devices d join public.businesses b on b.id = d.business_id where d.sira is null)
update public.devices d set sira = o.rn from o where d.id = o.id;

select setval('public.businesses_sira_seq', greatest(coalesce((select max(sira) from public.businesses), 0), 1));
select setval('public.devices_sira_seq', greatest(coalesce((select max(sira) from public.devices), 0), 1));
alter table public.businesses alter column sira set default nextval('public.businesses_sira_seq');
alter table public.devices alter column sira set default nextval('public.devices_sira_seq');
create unique index if not exists businesses_sira_uq on public.businesses (sira);
create unique index if not exists devices_sira_uq on public.devices (sira);
grant usage, select on sequence public.businesses_sira_seq, public.devices_sira_seq to authenticated;
