import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { montarAgenda, type AgendaConfig, type DiaAgenda } from "@/lib/agenda-slots";

function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Agenda pública: apenas datas/horários e se estão ocupados (sem dados de clientes). */
export const listarAgenda = createServerFn({ method: "GET" }).handler(
  async (): Promise<DiaAgenda[]> => {
    const supabase = clientePublico();
    const [{ data: configs }, { data: ocupados }, { data: bloqueios }] = await Promise.all([
      supabase.from("agenda_config").select("*"),
      supabase.rpc("horarios_ocupados"),
      supabase.from("agenda_bloqueios").select("data, horario"),
    ]);
    return montarAgenda(
      (configs ?? []) as AgendaConfig[],
      (ocupados ?? []) as { data: string; horario: string }[],
      bloqueios ?? [],
    );
  },
);

export type NovoAgendamento = {
  nome: string;
  whatsapp: string;
  data: string;
  horario: string;
  plano: string;
  formaPagamento: string;
};

export type ResultadoAgendamento =
  | { ok: true; id: string }
  | { ok: false; erro: string; ocupado?: boolean };

export const criarAgendamento = createServerFn({ method: "POST" })
  .inputValidator((input: NovoAgendamento) => input)
  .handler(async ({ data }): Promise<ResultadoAgendamento> => {
    const nome = String(data.nome ?? "").trim().slice(0, 120);
    const whatsapp = String(data.whatsapp ?? "").replace(/\D/g, "").slice(0, 13);
    const plano = String(data.plano ?? "").trim().slice(0, 120);
    const formaPagamento = String(data.formaPagamento ?? "").trim().slice(0, 60);

    if (!nome || whatsapp.length < 10 || !plano)
      return { ok: false, erro: "Dados incompletos para o agendamento." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.data) || !/^\d{2}:\d{2}$/.test(data.horario))
      return { ok: false, erro: "Data ou horário inválidos." };

    // O horário precisa existir na agenda e estar livre
    const agenda = await listarAgenda();
    const dia = agenda.find((d) => d.data === data.data);
    const slot = dia?.slots.find((s) => s.horario === data.horario);
    if (!slot) return { ok: false, erro: "Esse horário não está disponível na agenda." };
    if (slot.ocupado)
      return {
        ok: false,
        ocupado: true,
        erro: "Esse horário acabou de ser reservado. Escolha outro horário disponível.",
      };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserido, error } = await supabaseAdmin
      .from("agendamentos")
      .insert({
        nome,
        whatsapp,
        data: data.data,
        horario: data.horario,
        plano,
        forma_pagamento: formaPagamento,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505")
        return {
          ok: false,
          ocupado: true,
          erro: "Esse horário acabou de ser reservado. Escolha outro horário disponível.",
        };
      return { ok: false, erro: "Não foi possível salvar o agendamento. Tente novamente." };
    }
    return { ok: true, id: inserido.id };
  });

/* ---------- Área da Juliana (somente administradora) ---------- */

async function garantirAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Acesso restrito.");
}

export const souAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return Boolean(data);
  });

export const ativarAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_admin");
    if (error) return false;
    return Boolean(data);
  });

export const listarAgendamentosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await garantirAdmin(context as never);
    const { data, error } = await context.supabase
      .from("agendamentos")
      .select("*")
      .order("data", { ascending: true })
      .order("horario", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const atualizarAgendamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; status_pagamento?: string; status_agendamento?: string }) => input,
  )
  .handler(async ({ data, context }) => {
    await garantirAdmin(context as never);
    const patch: { status_pagamento?: string; status_agendamento?: string } = {};
    if (data.status_pagamento) patch.status_pagamento = data.status_pagamento;
    if (data.status_agendamento) patch.status_agendamento = data.status_agendamento;
    const { error } = await context.supabase
      .from("agendamentos")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
