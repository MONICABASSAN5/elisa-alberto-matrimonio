-- ============================================================
-- Elisa & Alberto — schema Supabase
-- Incolla ed esegui questo file nel SQL Editor di Supabase
-- (Project -> SQL Editor -> New query)
-- ============================================================

-- Tabella dei ricordi (foto, video, audio)
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  guest_name text,
  message text,
  type text not null check (type in ('photo', 'video', 'audio')),
  file_path text not null,
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

-- Attiva la sicurezza a livello di riga
alter table public.memories enable row level security;

-- Chiunque (anche non autenticato) può INSERIRE un nuovo ricordo
create policy "Chiunque può caricare un ricordo"
  on public.memories for insert
  to anon
  with check (true);

-- Chiunque può LEGGERE solo i ricordi approvati (per la galleria pubblica)
create policy "Lettura pubblica dei ricordi approvati"
  on public.memories for select
  to anon
  using (approved = true);

-- Nessuno tramite la chiave pubblica può modificare o cancellare
-- (niente policy di update/delete per il ruolo anon = operazioni bloccate)


-- ============================================================
-- STORAGE
-- Prima crea manualmente il bucket dalla dashboard:
--   Storage -> New bucket -> nome: wedding-memories -> Public bucket: ON
-- Poi esegui queste policy sullo storage:
-- ============================================================

create policy "Upload pubblico nel bucket wedding-memories"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'wedding-memories');

create policy "Lettura pubblica del bucket wedding-memories"
  on storage.objects for select
  to anon
  using (bucket_id = 'wedding-memories');
