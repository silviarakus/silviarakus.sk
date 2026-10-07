-- „Kto je môj zákazník?“ — submissions, výstup aj lead v jednej tabuľke.
-- Spusti v Supabase: SQL Editor → New query → vlož celý súbor → Run.

create table if not exists zakaznik_submissions (
  id            uuid primary key default gen_random_uuid(),
  token         text unique not null,          -- URL-safe, 32 znakov, na prístup k reportu
  created_at    timestamptz not null default now(),
  -- lead
  meno          text not null,
  email         text not null,
  firma         text,
  gdpr_suhlas   boolean not null default false,
  gdpr_cas      timestamptz,
  marketing_suhlas boolean not null default false,
  -- vstupy
  odpovede      jsonb not null,               -- všetky polia formulára podľa id
  segment_label text,                          -- denormalizované pre prehľad
  cena_hladina  text,
  -- výstup
  status        text not null default 'pending'
                check (status in ('pending', 'generating', 'done', 'failed')),
  avatar        jsonb,                          -- výstup podľa schémy 6.4
  model         text,
  tokens_in     int,
  tokens_out    int,
  error         text,
  attempts      int not null default 0,
  generation_started_at timestamptz,
  generated_at  timestamptz,
  email_sent_at timestamptz,
  failure_notified_at timestamptz,
  -- technické
  ip_hash       text,                           -- sha256(ip + salt), nie raw IP
  user_agent    text,
  utm           jsonb
);

create index if not exists zakaznik_submissions_email_idx on zakaznik_submissions (email);
create index if not exists zakaznik_submissions_created_idx on zakaznik_submissions (created_at desc);
create index if not exists zakaznik_submissions_status_idx on zakaznik_submissions (status);
create index if not exists zakaznik_submissions_ip_idx on zakaznik_submissions (ip_hash, created_at desc);

-- RLS zapnuté bez jedinej policy = anon ani authenticated nemajú prístup.
-- Server pristupuje výhradne cez service role kľúč.
alter table zakaznik_submissions enable row level security;
revoke all on zakaznik_submissions from anon, authenticated;
