-- Avatar zákazníka pre maklérov Moderného makléra (/makler).
-- Spusti v Supabase: SQL Editor → New query → vlož celý súbor → Run.

create table if not exists makler_avatary (
  id            uuid primary key default gen_random_uuid(),
  token         text unique not null,          -- URL-safe, 32 znakov, adresa avatara
  created_at    timestamptz not null default now(),
  typ           text not null check (typ in ('predavajuci', 'kupujuci')),
  autor         text not null,                 -- maklér, ktorý avatara vytvoril
  region        text,
  nehnutelnost  text,
  cena          text,
  vstupy        jsonb not null,                -- všetky polia formulára podľa id
  status        text not null default 'pending'
                check (status in ('pending', 'generating', 'done', 'failed')),
  archetyp      text,
  avatar        jsonb,
  model         text,
  tokens_in     int,
  tokens_out    int,
  error         text,
  attempts      int not null default 0,
  generation_started_at timestamptz,
  generated_at  timestamptz,
  ip_hash       text                           -- sha256(ip), len na limit počtu požiadaviek
);

create index if not exists makler_avatary_created_idx on makler_avatary (created_at desc);
create index if not exists makler_avatary_status_idx on makler_avatary (status, created_at desc);
create index if not exists makler_avatary_ip_idx on makler_avatary (ip_hash, created_at desc);

-- RLS zapnuté bez jedinej policy = anon ani authenticated nemajú prístup.
-- Server pristupuje výhradne cez service role kľúč.
alter table makler_avatary enable row level security;
revoke all on makler_avatary from anon, authenticated;
