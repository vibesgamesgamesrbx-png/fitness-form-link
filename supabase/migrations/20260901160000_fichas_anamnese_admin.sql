create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  order_nsu text not null unique,
  nome text not null,
  whatsapp text not null,
  plano text not null,
  forma_pagamento text not null,
  valor_centavos integer not null,
  status text not null default 'pendente',
  transaction_nsu text,
  invoice_slug text,
  receipt_url text,
  paid_amount_centavos integer,
  pago_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pagamentos_nome_idx on public.pagamentos (lower(nome));
create index if not exists pagamentos_whatsapp_idx on public.pagamentos (whatsapp);
create index if not exists pagamentos_status_idx on public.pagamentos (status);

alter table public.pagamentos enable row level security;
revoke all on public.pagamentos from anon, authenticated;
grant all on public.pagamentos to service_role;

create or replace function public.touch_pagamentos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pagamentos_updated_at on public.pagamentos;
create trigger pagamentos_updated_at
before update on public.pagamentos
for each row execute function public.touch_pagamentos_updated_at();

create table if not exists public.fichas_anamnese (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  data_nascimento date,
  idade integer,
  objetivos text[] not null default '{}',
  dados jsonb not null default '[]'::jsonb,
  pagamento_id uuid references public.pagamentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fichas_anamnese_nome_idx on public.fichas_anamnese (lower(nome));
create index if not exists fichas_anamnese_whatsapp_idx on public.fichas_anamnese (whatsapp);
create index if not exists fichas_anamnese_pagamento_idx on public.fichas_anamnese (pagamento_id);

alter table public.fichas_anamnese enable row level security;
revoke all on public.fichas_anamnese from anon, authenticated;
grant all on public.fichas_anamnese to service_role;

create or replace function public.touch_fichas_anamnese_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fichas_anamnese_updated_at on public.fichas_anamnese;
create trigger fichas_anamnese_updated_at
before update on public.fichas_anamnese
for each row execute function public.touch_fichas_anamnese_updated_at();
