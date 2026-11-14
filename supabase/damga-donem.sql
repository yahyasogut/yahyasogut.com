-- =====================================================================
-- Elmaslar Damga Takip · Dönem (yıl) yapısı · v9
-- damga.sql'den SONRA çalıştırılır; tekrar çalıştırılabilir.
-- Cihaz kalıcıdır (QR, marka, seri, metroloji); her dönemin listesi ve durumu period_items'ta tutulur.
-- =====================================================================
create table if not exists public.period_items (
  id bigint generated always as identity primary key,
  donem int not null,
  device_id bigint not null references public.devices(id) on delete cascade,
  durum_grup text not null default 'bekliyor',
  durum_ham text default '',
  fatura_notu text default '',
  bilgi text default '',
  excel_row int,
  mukerrer boolean not null default false,
  kaynak text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (donem, device_id)
);
create index if not exists period_items_donem_idx on public.period_items (donem);
alter table public.period_items enable row level security;
drop policy if exists "period_items_admin_all" on public.period_items;
create policy "period_items_admin_all" on public.period_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "period_items_read" on public.period_items;
create policy "period_items_read" on public.period_items for select to authenticated using (public.is_active());

alter table public.plans add column if not exists donem int;
update public.plans set donem = extract(year from date)::int where donem is null;

-- Mevcut kayıtlar 2026 dönemine alınır (bir kez; tekrar çalıştırmak çift kayıt üretmez)
insert into public.period_items (donem, device_id, durum_grup, durum_ham, fatura_notu, bilgi, excel_row, kaynak)
select 2026, id, coalesce(durum_grup, 'bekliyor'), coalesce(durum_ham, ''), coalesce(fatura_notu, ''), coalesce(bilgi, ''), excel_row, 'ilk aktarım'
  from public.devices
on conflict (donem, device_id) do nothing;

-- Dönem listesi
create or replace function public.list_periods() returns table (donem int, cihaz bigint)
language sql stable security definer set search_path = public as $$
  select donem, count(*) from public.period_items where public.is_active() group by donem order by donem;
$$;

-- Yeni dönem: son damgası (dönem - 2) olan aktif cihazlar listeye alınır
create or replace function public.create_period(p_donem int) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'yetki yok'; end if;
  insert into public.period_items (donem, device_id, durum_grup, durum_ham, kaynak)
  select p_donem, d.id, 'bekliyor', 'Dönem açılışı (son damga ' || d.son_damga_yili || ')', 'dönem açılışı'
    from public.devices d
   where d.aktif and d.son_damga_yili = p_donem - 2
     and coalesce(d.durum_grup, '') not in ('cihazyok','kapsamdisi')
  on conflict (donem, device_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- Saha "tamamlandı" → planın dönemindeki kayıt tamam, cihazın son damga yılı güncellenir
create or replace function public.results_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_donem int;
begin
  if array_length(new.done, 1) > 0 then
    select coalesce(donem, extract(year from date)::int) into v_donem from public.plans where id = new.plan_id;
    v_donem := coalesce(v_donem, extract(year from now())::int);
    update public.devices set son_damga_yili = greatest(coalesce(son_damga_yili,0), v_donem), durum_grup = 'tamam' where id = any(new.done);
    update public.period_items set durum_grup = 'tamam', updated_at = now() where donem = v_donem and device_id = any(new.done);
  end if;
  return new;
end $$;

create or replace function public.record_device_event(p_device bigint, p_type text, p_year int default null, p_e text default null, p_reason text default null, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active() then raise exception 'etkin hesap gerekli'; end if;
  insert into public.events (device_id, type, year, e, reason, note) values (p_device, p_type, p_year, p_e, p_reason, coalesce(p_note,''));
  if p_type = 'damga' and p_year is not null then
    update public.devices set son_damga_yili = greatest(coalesce(son_damga_yili,0), p_year), durum_grup = 'tamam' where id = p_device;
    update public.period_items set durum_grup = 'tamam', updated_at = now() where device_id = p_device and donem = p_year;
  elsif p_type = 'hassasiyet' and p_e is not null then
    update public.devices set e = p_e where id = p_device;
  end if;
end $$;

-- ---------- Müşteri grupları ----------
alter table public.businesses add column if not exists grup text;
create index if not exists businesses_grup_idx on public.businesses (grup);
create table if not exists public.customer_groups (
  ad text primary key,
  renk text default '',
  aciklama text default '',
  created_at timestamptz default now()
);
alter table public.customer_groups enable row level security;
drop policy if exists "customer_groups_admin_all" on public.customer_groups;
create policy "customer_groups_admin_all" on public.customer_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "customer_groups_read" on public.customer_groups;
create policy "customer_groups_read" on public.customer_groups for select to authenticated using (public.is_active());
