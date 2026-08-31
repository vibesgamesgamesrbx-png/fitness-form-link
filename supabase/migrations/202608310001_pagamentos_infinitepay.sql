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
  paid_amount integer,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists pagamentos_status_idx on public.pagamentos(status);

alter table public.pagamentos enable row level security;

-- Clientes nunca recebem acesso direto aos registros de pagamento.
-- A aplicação usa o backend/service role para criar e consultar por order_nsu.
drop policy if exists "pagamentos_no_public_access" on public.pagamentos;

-- Guarda o identificador do pagamento no agendamento e exige que ele seja pago.
alter table public.agendamentos add column if not exists order_nsu text;
create unique index if not exists agendamentos_order_nsu_unique
  on public.agendamentos(order_nsu)
  where order_nsu is not null;

-- A reserva continua protegida pelo índice existente de data+horário,
-- ignorando agendamentos cancelados.
