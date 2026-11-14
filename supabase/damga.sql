-- =====================================================================
-- Elmaslar Damga Takip · Supabase şeması (v1 · Faz 1 rota + temel cihaz/QR)
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run
-- Tekrar çalıştırılabilir (IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- ---------- Profiller (giriş yapan herkes) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  ad text default '',
  tel text default '',
  rol text not null default 'saha' check (rol in ('admin','bolge','saha')),
  bolge_id bigint,
  aktif boolean not null default false,
  created_at timestamptz default now()
);
alter table public.profiles alter column aktif set default false;

-- İlk yönetici: bu e-posta ile açılan hesap otomatik admin olur
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Yeni hesaplar PASİF açılır; yönetici panelden açtığında etkinleşir.
  -- Böylece anon anahtarla kendi kendine kayıt olan biri hiçbir veriyi göremez.
  insert into public.profiles (id, email, ad, rol, aktif)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'ad', ''),
          case when lower(new.email) in ('yahyasogut@ankutsan.com','yahya.sogut@ankutsan.com','admin@ankutsan.com') then 'admin' else 'saha' end,
          lower(new.email) in ('yahyasogut@ankutsan.com','yahya.sogut@ankutsan.com','admin@ankutsan.com'))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and rol in ('admin','bolge') and aktif);
$$;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and aktif);
$$;

-- ---------- Bölgeler ----------
create table if not exists public.regions (
  id bigint generated always as identity primary key,
  ad text not null,
  ilceler text[] not null default '{}',
  sorumlu uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- ---------- İşletmeler / lokasyonlar ----------
create table if not exists public.businesses (
  id text primary key,                 -- içe aktarımda üretilen sabit anahtar
  unvan text not null,
  sube text default '',
  adres text default '',
  mahalle text default '',
  ilce text default '',
  il text default 'ANTALYA',
  tel text default '',
  gsm text default '',
  eposta text default '',
  vkn text default '',
  vergi_dairesi text default '',
  lat double precision,
  lng double precision,
  geo_src text default 'yaklasik' check (geo_src in ('yaklasik-ilce','yaklasik-mah','yaklasik','google','elle')),
  is_depot boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists businesses_ilce_idx on public.businesses (ilce);

-- KVKK: sorumlu kişi (TC / doğum tarihi yalnızca yönetici)
create table if not exists public.contacts (
  id bigint generated always as identity primary key,
  business_id text references public.businesses(id) on delete cascade,
  ad text, tel text, eposta text, tc text, dogum_tarihi date
);

-- ---------- Cihazlar ----------
create table if not exists public.devices (
  id bigint generated always as identity primary key,
  import_key text unique,
  qr_no text unique,                   -- EL-000123
  qr_key text not null default substr(md5(random()::text), 1, 5), -- tahmin edilemeyen anahtar
  business_id text references public.businesses(id) on delete set null,
  tip text default 'Otomatik olmayan tartı aleti',
  cins text default '',
  marka text default '',
  model text default '',
  seri_no text default '',
  seri_flag text default '',           -- '' | seri-yok | seri-tekrar
  sinif text default 'III',
  max_cap text default '',             -- örn. "15 kg"
  min_cap text default '',
  d text default '',
  e text default '',
  uretim_yili int,
  son_damga_yili int,
  durum_grup text default 'bekliyor',  -- tamam|bekliyor|tekrar|tutanak|cihazyok|kapsamdisi|baskasi
  durum_ham text default '',
  fatura_notu text default '',
  kime_ait text default '',
  bilgi text default '',
  kullanim_yeri text default '',
  excel_row int,
  aktif boolean not null default true,
  cikis_nedeni text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists devices_business_idx on public.devices (business_id);
create sequence if not exists public.qr_seq start 1;

-- ---------- Rota planları ve saha sonuçları ----------
create table if not exists public.plans (
  id text primary key,
  gid text,
  team int default 1,
  teams int default 1,
  date date not null,
  staff_id uuid references public.profiles(id) on delete set null,
  staff_name text default '',
  phone text default '',
  data jsonb not null,                 -- start, end, svc, costKm, ret, perLink, stops[{k, dev[]}], km, min, dev
  created_by uuid default auth.uid(),
  updated_at timestamptz default now()
);
create index if not exists plans_date_idx on public.plans (date);

create table if not exists public.results (
  id text primary key,                 -- planId__businessId
  plan_id text references public.plans(id) on delete cascade,
  business_id text,
  st text not null,
  done bigint[] not null default '{}', -- device id listesi
  note text default '',
  by uuid default auth.uid(),
  at timestamptz default now()
);

-- ---------- Cihaz olayları (damga, hassasiyet, eksik, not) ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  device_id bigint references public.devices(id) on delete cascade,
  type text not null check (type in ('damga','hassasiyet','eksik','not','konum','devir','cikis')),
  year int,
  e text,
  reason text,
  note text default '',
  by uuid default auth.uid(),
  at timestamptz default now()
);
create index if not exists events_device_idx on public.events (device_id);

-- ---------- Sonraki fazlar için hazır tablolar ----------
create table if not exists public.applications (kod text primary key, tarih date, tip text, device_ids bigint[], olusturan uuid default auth.uid(), imza text, pdf_path text, created_at timestamptz default now());
create table if not exists public.inspections (kod text primary key, device_id bigint references public.devices(id), tip text, tarih date, muhur_no text, kontrol jsonb, sonuc text, imza text, pdf_path text, yapan uuid default auth.uid(), created_at timestamptz default now());
create table if not exists public.payments (kod text primary key, device_ids bigint[], tutar numeric, odeme_sekli text, imza text, created_at timestamptz default now());
create table if not exists public.price_list (bant text primary key, alt_kg numeric, ust_kg numeric, fiyat numeric);
create table if not exists public.qr_labels (qr_no text primary key, qr_key text, seri text, durum text default 'bos', device_id bigint references public.devices(id));
create table if not exists public.sms_log (id bigint generated always as identity primary key, business_id text, telefon text, donem int, gonderim timestamptz, durum text);
create table if not exists public.audit_log (id bigint generated always as identity primary key, tablo text, kayit text, alan text, eski text, yeni text, yapan uuid default auth.uid(), zaman timestamptz default now());

-- ---------- Metrolojik alan geçmişi ----------
create or replace function public.devices_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare f text;
begin
  foreach f in array array['seri_no','marka','model','sinif','max_cap','min_cap','d','e','tip','son_damga_yili','business_id','aktif'] loop
    if (to_jsonb(old)->>f) is distinct from (to_jsonb(new)->>f) then
      insert into public.audit_log (tablo, kayit, alan, eski, yeni) values ('devices', new.id::text, f, to_jsonb(old)->>f, to_jsonb(new)->>f);
    end if;
  end loop;
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists devices_audit_trg on public.devices;
create trigger devices_audit_trg before update on public.devices for each row execute function public.devices_audit();

-- ---------- Saha kullanıcısının yapabileceği sınırlı güncellemeler ----------
create or replace function public.set_business_location(p_id text, p_lat double precision, p_lng double precision, p_src text default 'elle')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active() then raise exception 'etkin hesap gerekli'; end if;
  update public.businesses set lat = p_lat, lng = p_lng, geo_src = p_src, updated_at = now() where id = p_id;
end $$;

create or replace function public.record_device_event(p_device bigint, p_type text, p_year int default null, p_e text default null, p_reason text default null, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active() then raise exception 'etkin hesap gerekli'; end if;
  insert into public.events (device_id, type, year, e, reason, note) values (p_device, p_type, p_year, p_e, p_reason, coalesce(p_note,''));
  if p_type = 'damga' and p_year is not null then
    update public.devices set son_damga_yili = greatest(coalesce(son_damga_yili,0), p_year), durum_grup = 'tamam' where id = p_device;
  elsif p_type = 'hassasiyet' and p_e is not null then
    update public.devices set e = p_e where id = p_device;
  end if;
end $$;

-- Rotada "tamamlandı" işaretlenen cihazların damga yılını işler
create or replace function public.results_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if array_length(new.done, 1) > 0 then
    update public.devices set son_damga_yili = greatest(coalesce(son_damga_yili,0), extract(year from now())::int), durum_grup = 'tamam'
     where id = any(new.done);
  end if;
  return new;
end $$;
drop trigger if exists results_stamp_trg on public.results;
create trigger results_stamp_trg after insert or update on public.results for each row execute function public.results_stamp();

-- QR numarası ver (içe aktarım sonrası, numarası olmayanlara)
create or replace function public.assign_qr_numbers() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'yetki yok'; end if;
  update public.devices set qr_no = 'EL-' || lpad(nextval('public.qr_seq')::text, 6, '0') where qr_no is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- Herkese açık QR sayfası (giriş gerektirmez) ----------
create or replace function public.public_device(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_no text; v_key text; r record;
begin
  v_no := substring(p_code from '^(EL-[0-9]{6})');
  v_key := substring(p_code from '^EL-[0-9]{6}-([a-z0-9]+)$');
  if v_no is null or v_key is null then return null; end if;
  select d.qr_no, d.tip, d.cins, d.marka, d.model, d.seri_no, d.sinif, d.max_cap, d.min_cap, d.e, d.d,
         d.son_damga_yili, d.durum_grup, d.aktif, b.unvan, b.ilce
    into r from public.devices d left join public.businesses b on b.id = d.business_id
   where d.qr_no = v_no and d.qr_key = v_key;
  if not found then return null; end if;
  return row_to_json(r);   -- fiyat, telefon, adres, TC dönmez
end $$;
grant execute on function public.public_device(text) to anon, authenticated;

-- ---------- Satır düzeyi güvenlik (RLS) ----------
alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.businesses enable row level security;
alter table public.contacts enable row level security;
alter table public.devices enable row level security;
alter table public.plans enable row level security;
alter table public.results enable row level security;
alter table public.events enable row level security;
alter table public.applications enable row level security;
alter table public.inspections enable row level security;
alter table public.payments enable row level security;
alter table public.price_list enable row level security;
alter table public.qr_labels enable row level security;
alter table public.sms_log enable row level security;
alter table public.audit_log enable row level security;

do $$ declare t text; begin
  foreach t in array array['profiles','regions','businesses','contacts','devices','plans','results','events','applications','inspections','payments','price_list','qr_labels','sms_log','audit_log'] loop
    execute format('drop policy if exists "%1$s_admin_all" on public.%1$s', t);
    execute format('create policy "%1$s_admin_all" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Saha: okuma
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_active());
drop policy if exists "regions_read" on public.regions;
create policy "regions_read" on public.regions for select to authenticated using (public.is_active());
drop policy if exists "businesses_read" on public.businesses;
create policy "businesses_read" on public.businesses for select to authenticated using (public.is_active());
drop policy if exists "devices_read" on public.devices;
create policy "devices_read" on public.devices for select to authenticated using (public.is_active());
drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events for select to authenticated using (public.is_active());
-- Saha: yalnızca kendisine atanan planlar
drop policy if exists "plans_own" on public.plans;
create policy "plans_own" on public.plans for select to authenticated using (staff_id = auth.uid() and public.is_active());
-- Saha: kendi planlarının sonuçlarını okur/yazar
drop policy if exists "results_rw" on public.results;
create policy "results_rw" on public.results for all to authenticated
  using (public.is_active() and exists (select 1 from public.plans p where p.id = plan_id and p.staff_id = auth.uid()))
  with check (public.is_active() and exists (select 1 from public.plans p where p.id = plan_id and p.staff_id = auth.uid()));
-- Kullanıcı kendi profilinde ad ve telefonu düzeltebilir
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create or replace function public.profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() boşsa istek Supabase panelinden/SQL'den gelir (yalnızca proje sahibi); uygulama kullanıcılarına koruma uygulanır
  if auth.uid() is not null and not public.is_admin() and (new.rol is distinct from old.rol or new.aktif is distinct from old.aktif or new.bolge_id is distinct from old.bolge_id) then
    raise exception 'rol, bölge ve aktiflik yalnızca yönetici tarafından değiştirilebilir';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg before update on public.profiles for each row execute function public.profiles_guard();
-- contacts (TC) yalnızca admin: yukarıdaki *_admin_all dışında politika yok.

-- ---------- Canlı güncelleme ----------
do $$ begin
  begin alter publication supabase_realtime add table public.plans; exception when others then null; end;
  begin alter publication supabase_realtime add table public.results; exception when others then null; end;
  begin alter publication supabase_realtime add table public.events; exception when others then null; end;
end $$;
