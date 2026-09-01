import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://vwceklxxklkftqzxnbkb.supabase.co";

async function chamarAdmin(action: string, body: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Sessão administrativa expirada. Entre novamente.");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-panel-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error ?? "Não foi possível concluir a operação."));
  return payload?.data ?? null;
}

export async function souAdmin() { try { await chamarAdmin("fichas"); return true; } catch { return false; } }
export async function listarAgendamentosAdmin() { return (await chamarAdmin("agendamentos")) ?? []; }
export async function listarBloqueiosAdmin() { return (await chamarAdmin("bloqueios")) ?? []; }
export async function listarBloqueiosRecorrentesAdmin() { return (await chamarAdmin("bloqueios-recorrentes")) ?? []; }
export async function listarFichasAdmin() { return (await chamarAdmin("fichas")) ?? []; }
export async function listarPagamentosAdmin() { return (await chamarAdmin("pagamentos")) ?? []; }
export async function criarBloqueio({ data }: { data: { data: string; horario?: string | null; motivo?: string } }) { return await chamarAdmin("criar-bloqueio", data); }
export async function removerBloqueio({ data }: { data: { id: string } }) { await chamarAdmin("remover-bloqueio", data); return { ok: true }; }
export async function criarBloqueioRecorrente({ data }: { data: { dia_semana: number; horario: string } }) { return await chamarAdmin("criar-bloqueio-recorrente", data); }
export async function removerBloqueioRecorrente({ data }: { data: { id: string } }) { await chamarAdmin("remover-bloqueio-recorrente", data); return { ok: true }; }
export async function atualizarAgendamento({ data }: { data: { id: string; status_pagamento?: string; status_agendamento?: string } }) { await chamarAdmin("atualizar-agendamento", data); return { ok: true }; }
