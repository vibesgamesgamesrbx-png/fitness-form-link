create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  order_nsu text not null unique,
  nome text not null,
  whatsapp text not null,
  plano text not null,
  forma_pagamento text,
  valor_centavos integer not null check (valor_centavos > 0),
  status text not null default 'pendente' check (status in ('pendente','pago','erro','cancelado')),
  transaction_nsu text,
  invoice_slug text,
  receipt_url text,
  capture_method text,
  paid_amount_centavos integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.pagamentos add column if not exists forma_pagamento text;
alter table public.pagamentos add column if not exists paid_amount_centavos integer;
alter table public.pagamentos add column if not exists updated_at timestamptz not null default now();
alter table public.pagamentos add column if not exists paid_at timestamptz;

create index if not exists pagamentos_status_idx on public.pagamentos(status);
create unique index if not exists pagamentos_transaction_nsu_unique
  on public.pagamentos(transaction_nsu)
  where transaction_nsu is not null;

alter table public.pagamentos enable row level security;

drop policy if exists "pagamentos_no_public_access" on public.pagamentos;
drop policy if exists "public cannot read payment records" on public.pagamentos;
drop policy if exists "public cannot insert payment records" on public.pagamentos;
drop policy if exists "public cannot update payment records" on public.pagamentos;
drop policy if exists "public cannot delete payment records" on public.pagamentos;

-- Clientes nunca recebem acesso direto aos registros de pagamento.
-- A aplicação usa exclusivamente funções server-side/service role.
create policy "pagamentos_no_public_access"
  on public.pagamentos for all
  using (false)
  with check (false);

-- Guarda o identificador do pagamento no agendamento.
alter table public.agendamentos add column if not exists order_nsu text;
create unique index if not exists agendamentos_order_nsu_unique
  on public.agendamentos(order_nsu)
  where order_nsu is not null;

create or replace function public.set_pagamentos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pagamentos_set_updated_at on public.pagamentos;
create trigger pagamentos_set_updated_at
before update on public.pagamentos
for each row execute function public.set_pagamentos_updated_at();
