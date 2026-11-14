-- =====================================================================
-- Elmaslar Damga Takip · Telefonla giriş (SMS doğrulama) eki · v5
-- damga.sql'den SONRA çalıştırılır; tekrar çalıştırılabilir.
-- Yönetici "davet" listesine ad + telefon ekler. Bu numarayla SMS koduyla ilk kez
-- giren kişi otomatik ETKİN olur ve rolünü davetten alır. Listede olmayan numaralar pasif kalır.
-- =====================================================================
create or replace function public.norm_phone(p text) returns text
language sql immutable as $$ select right(regexp_replace(coalesce(p,''), '\D', '', 'g'), 10) $$;

create table if not exists public.invites (
  phone text primary key,                       -- son 10 hane, örn. 5072207107
  ad text not null,
  rol text not null default 'saha' check (rol in ('admin','bolge','saha')),
  bolge_id bigint,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.invites enable row level security;
drop policy if exists "invites_admin_all" on public.invites;
create policy "invites_admin_all" on public.invites for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv public.invites%rowtype; p10 text; admins text[] := array['yahyasogut@ankutsan.com','yahya.sogut@ankutsan.com','admin@ankutsan.com'];
begin
  p10 := public.norm_phone(new.phone);
  if length(p10) = 10 then select * into inv from public.invites where phone = p10; end if;
  if inv.phone is not null then
    insert into public.profiles (id, email, ad, tel, rol, bolge_id, aktif)
    values (new.id, new.email, inv.ad, '0' || substr(p10,1,3) || ' ' || substr(p10,4,3) || ' ' || substr(p10,7,2) || ' ' || substr(p10,9,2), inv.rol, inv.bolge_id, true)
    on conflict (id) do nothing;
    update public.invites set used_by = new.id where phone = p10;
    -- Henüz giriş yapmamışken bu numaraya atanmış planlar kişiye bağlanır
    update public.plans set staff_id = new.id where staff_id is null and public.norm_phone(phone) = p10;
  else
    insert into public.profiles (id, email, ad, tel, rol, aktif)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'ad', ''), coalesce(new.phone, ''),
            case when lower(new.email) = any(admins) then 'admin' else 'saha' end,
            coalesce(lower(new.email) = any(admins), false))
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
