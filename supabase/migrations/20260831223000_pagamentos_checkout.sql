create table if not exists public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  order_nsu text not null unique,
  nome text not null,
  whatsapp text not null,
  plano text not null,
  forma_pagamento text not null,
  valor_centavos integer not null check (valor_centavos > 0),
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  transaction_nsu text,
  invoice_slug text,
  receipt_url text,
  paid_amount_centavos integer,
  created_at timestamptz not null default now(),
  pago_em timestamptz
);

create index if not exists pagamentos_status_idx on public.pagamentos(status);
create index if not exists pagamentos_created_at_idx on public.pagamentos(created_at desc);

alter table public.pagamentos enable row level security;

revoke all on table public.pagamentos from anon, authenticated;
grant all on table public.pagamentos to service_role;
