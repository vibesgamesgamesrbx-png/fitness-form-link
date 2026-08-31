create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  order_nsu text not null unique,
  nome text not null,
  whatsapp text not null,
  plano text not null,
  valor_centavos integer not null check (valor_centavos > 0),
  status text not null default 'pendente' check (status in ('pendente','pago','erro','cancelado')),
  transaction_nsu text,
  invoice_slug text,
  capture_method text,
  receipt_url text,
  paid_amount_centavos integer,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pagamentos_transaction_nsu_unique
  on public.pagamentos(transaction_nsu)
  where transaction_nsu is not null;

alter table public.pagamentos enable row level security;

create policy "public cannot read payment records"
  on public.pagamentos for select
  using (false);

create policy "public cannot insert payment records"
  on public.pagamentos for insert
  with check (false);

create policy "public cannot update payment records"
  on public.pagamentos for update
  using (false)
  with check (false);

create policy "public cannot delete payment records"
  on public.pagamentos for delete
  using (false);

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
