import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const JULIANA_ADMIN_EMAIL = "juliana.doro@hotmail.com";

type FichaItem = { rotulo: string; valor: string };
type FichaSecao = { titulo: string; itens: FichaItem[] };

function isJulianaAdmin(context: { claims?: Record<string, unknown> }) {
  return String(context.claims?.email ?? "").trim().toLowerCase() === JULIANA_ADMIN_EMAIL;
}

function garantirAdmin(context: { claims?: Record<string, unknown> }) {
  if (!isJulianaAdmin(context)) throw new Error("Acesso restrito.");
}

function item(secoes: FichaSecao[], rotulo: string) {
  for (const secao of secoes) {
    const encontrado = secao.itens.find((i) => i.rotulo === rotulo);
    if (encontrado) return encontrado.valor;
  }
  return "";
}

function secao(secoes: FichaSecao[], titulo: string) {
  return secoes.find((s) => s.titulo === titulo)?.itens ?? [];
}

export type NovaFichaAnamnese = {
  nome: string;
  whatsapp: string;
  secoes: FichaSecao[];
};

export const salvarFichaAnamnese = createServerFn({ method: "POST" })
  .inputValidator((input: NovaFichaAnamnese) => input)
  .handler(async ({ data }) => {
    const nome = String(data.nome ?? "").trim().slice(0, 120);
    const whatsapp = String(data.whatsapp ?? "").replace(/\D/g, "").slice(0, 13);
    if (!nome || whatsapp.length < 10 || !Array.isArray(data.secoes)) {
      throw new Error("Dados da ficha inválidos.");
    }

    const nascimento = item(data.secoes, "Data de nascimento");
    const idadeRaw = item(data.secoes, "Idade");
    const objetivosRaw = item(data.secoes, "Principal objetivo");
    const objetivos = objetivosRaw ? objetivosRaw.split(",").map((v) => v.trim()).filter(Boolean) : [];

    const payload = {
      nome,
      whatsapp,
      secoes: data.secoes,
      data_nascimento: /^\d{2}\/\d{2}\/\d{4}$/.test(nascimento)
        ? `${nascimento.slice(6, 10)}-${nascimento.slice(3, 5)}-${nascimento.slice(0, 2)}`
        : null,
      idade: /^\d+$/.test(idadeRaw) ? Number(idadeRaw) : null,
      objetivos,
    };

    const supabaseUrl = process.env["SUPABASE_URL"];
    const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!supabaseUrl || !publishableKey) {
      throw new Error("Configuração do Supabase incompleta no servidor.");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/salvar-ficha-anamnese`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
      },
      body: JSON.stringify({ nome: payload.nome, whatsapp: payload.whatsapp, secoes: payload.secoes }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.id) {
      console.error("[ficha] erro ao salvar pela Edge Function:", result?.error ?? response.statusText);
      throw new Error(result?.error || "Não foi possível salvar a ficha agora.");
    }

    return { id: String(result.id) };
  });

export type FichaAdmin = {
  id: string;
  nome: string;
  whatsapp: string;
  data_nascimento: string | null;
  idade: number | null;
  objetivos: string[];
  dados: FichaSecao[];
  pagamento_id: string | null;
  created_at: string;
};

export const listarFichasAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FichaAdmin[]> => {
    garantirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("fichas_anamnese")
      .select("id, nome, whatsapp, data_nascimento, idade, objetivos, dados, pagamento_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as FichaAdmin[];
  });

export const atualizarFichaPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fichaId: string; pagamentoId: string }) => input)
  .handler(async ({ context, data }) => {
    garantirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("fichas_anamnese")
      .update({ pagamento_id: data.pagamentoId })
      .eq("id", data.fichaId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarPagamentosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    garantirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("pagamentos")
      .select("id, order_nsu, nome, whatsapp, plano, forma_pagamento, valor_centavos, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
