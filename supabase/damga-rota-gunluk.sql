-- Elmaslar Damga Takip · v13 · rota oluşturma zamanı (günlük özetteki "yeni eklenen" için). Tekrar çalıştırılabilir.
alter table public.plans add column if not exists created_at timestamptz;
update public.plans set created_at = coalesce(updated_at, now()) where created_at is null;
alter table public.plans alter column created_at set default now();
