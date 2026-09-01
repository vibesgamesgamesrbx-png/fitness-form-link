import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";
import { montarAgenda, type AgendaConfig, type BloqueioRecorrente, type DiaAgenda } from "@/lib/agenda-slots";

const JULIANA_ADMIN_EMAIL = "juliana.doro@hotmail.com";
const SUPABASE_URL = "https://vwceklxxklkftqzxnbkb.supabase.co";

function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function chamarAdminEdge(action: string, body: Record<string, unknown> = {}) {
  const request = getRequest();
  const authorization = request?.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Sessão administrativa inválida.");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-panel-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authorization },
    body: JSON.stringify({ action, ...body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error ?? "Não foi possível concluir a operação."));
  return payload?.data ?? null;
}

export const listarAgenda = createServerFn({ method: "GET" }).handler(async (): Promise<DiaAgenda[]> => {
  const supabase = clientePublico();
  const [{ data: configs }, { data: ocupados }, { data: bloqueios }, { data: bloqueiosRecorrentes }] = await Promise.all([
    supabase.from("agenda_config").select("*"),
    supabase.rpc("horarios_ocupados"),
    supabase.from("agenda_bloqueios_publicos").select("data, horario"),
    supabase.rpc("horarios_bloqueados_recorrentes_publicos"),
  ]);
  return montarAgenda((configs ?? []) as AgendaConfig[], (ocupados ?? []) as { data: string; horario: string }[], bloqueios ?? [], (bloqueiosRecorrentes ?? []) as BloqueioRecorrente[]);
});

export type NovoAgendamento = { pagamentoId: string; data: string; horario: string };
export type ResultadoAgendamento = { ok: true; id: string } | { ok: false; erro: string; ocupado?: boolean };

export const criarAgendamento = createServerFn({ method: "POST" })
  .inputValidator((input: NovoAgendamento) => input)
  .handler(async ({ data }): Promise<ResultadoAgendamento> => {
    const pagamentoId = String(data.pagamentoId ?? "").trim();
    if (!pagamentoId || !/^\d{4}-\d{2}-\d{2}$/.test(data.data) || !/^\d{2}:\d{2}$/.test(data.horario)) return { ok: false, erro: "Pagamento, data ou horário inválidos." };
    const agenda = await listarAgenda();
    const dia = agenda.find((d) => d.data === data.data);
    const slot = dia?.slots.find((s) => s.horario === data.horario);
    if (!slot || slot.bloqueado) return { ok: false, erro: "Esse horário não está disponível na agenda." };
    if (slot.ocupado) return { ok: false, ocupado: true, erro: "Esse horário acabou de ser reservado. Escolha outro horário disponível." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: pagamento, error: pagamentoError } = await db.from("pagamentos").select("id, nome, whatsapp, plano, forma_pagamento, status").eq("id", pagamentoId).maybeSingle();
    if (pagamentoError || !pagamento) return { ok: false, erro: "Pedido de pagamento não encontrado." };
    if (pagamento.status !== "pago") return { ok: false, erro: "O pagamento ainda não foi confirmado." };
    const { data: inserido, error } = await db.from("agendamentos").insert({ nome: pagamento.nome, whatsapp: pagamento.whatsapp, data: data.data, horario: data.horario, plano: pagamento.plano, forma_pagamento: pagamento.forma_pagamento, status_pagamento: "confirmado", status_agendamento: "confirmado" }).select("id").single();
    if (error) {
      if (error.code === "23505") return { ok: false, ocupado: true, erro: "Esse horário acabou de ser reservado. Escolha outro horário disponível." };
      console.error("[agenda] erro ao salvar:", error.message);
      return { ok: false, erro: "Não foi possível salvar o agendamento. Tente novamente." };
    }
    return { ok: true, id: inserido.id };
  });

function isJulianaAdmin(context: { claims?: Record<string, unknown> }) { return String(context.claims?.email ?? "").trim().toLowerCase() === JULIANA_ADMIN_EMAIL; }
async function garantirAdmin(context: { supabase: any; userId: string; claims?: Record<string, unknown> }) { if (!isJulianaAdmin(context)) throw new Error("Acesso restrito."); }

export const souAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => isJulianaAdmin(context));

export const listarAgendamentosAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { await garantirAdmin(context as never); return (await chamarAdminEdge("agendamentos")) ?? []; });

export type BloqueioAdmin = { id: string; data: string; horario: string | null; motivo: string | null };
export const listarBloqueiosAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { await garantirAdmin(context as never); return (await chamarAdminEdge("bloqueios")) ?? []; });

export type BloqueioRecorrenteAdmin = { id: string; dia_semana: number; horario: string };
export const listarBloqueiosRecorrentesAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { await garantirAdmin(context as never); return (await chamarAdminEdge("bloqueios-recorrentes")) ?? []; });

export const criarBloqueio = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { data: string; horario?: string | null; motivo?: string }) => input).handler(async ({ context, data }) => { await garantirAdmin(context as never); if (!/^\d{4}-\d{2}-\d{2}$/.test(data.data)) throw new Error("Data inválida."); return chamarAdminEdge("criar-bloqueio", data); });

export const criarBloqueioRecorrente = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { dia_semana: number; horario: string }) => input).handler(async ({ context, data }) => { await garantirAdmin(context as never); if (!Number.isInteger(data.dia_semana) || data.dia_semana < 1 || data.dia_semana > 5 || !/^(0[6-9]|1\d|2[0-4]):00$/.test(data.horario)) throw new Error("Dados inválidos."); return chamarAdminEdge("criar-bloqueio-recorrente", data); });

export const removerBloqueio = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { id: string }) => input).handler(async ({ context, data }) => { await garantirAdmin(context as never); await chamarAdminEdge("remover-bloqueio", data); return { ok: true }; });

export const removerBloqueioRecorrente = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { id: string }) => input).handler(async ({ context, data }) => { await garantirAdmin(context as never); await chamarAdminEdge("remover-bloqueio-recorrente", data); return { ok: true }; });

export const atualizarAgendamento = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { id: string; status_pagamento?: string; status_agendamento?: string }) => input).handler(async ({ context, data }) => { await garantirAdmin(context as never); await chamarAdminEdge("atualizar-agendamento", data); return { ok: true }; });
