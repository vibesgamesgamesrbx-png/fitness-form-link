import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const JULIANA_ADMIN_EMAIL = "juliana.doro@hotmail.com";
const SUPABASE_PROJECT_URL = "https://vwceklxxklkftqzxnbkb.supabase.co";

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

    // The Supabase project URL is public configuration. Keeping the project
    // target explicit here avoids depending on a possibly mismatched
    // Lovable Cloud SUPABASE_URL. The service-role key remains only inside
    // the Supabase Edge Function and is never sent to the browser.
    const endpoint = `${SUPABASE_PROJECT_URL}/functions/v1/salvar-ficha-anamnese`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, whatsapp, secoes: data.secoes }),
      });
    } catch (error) {
      console.error("[ficha] falha de rede ao chamar Edge Function:", error);
      throw new Error("Não foi possível conectar ao serviço de salvamento.");
    }

    const rawBody = await response.text();
    let result: { id?: unknown; error?: string } = {};
    try {
      result = JSON.parse(rawBody) as { id?: unknown; error?: string };
    } catch {
      console.error("[ficha] resposta não-JSON da Edge Function:", {
        status: response.status,
        statusText: response.statusText,
        body: rawBody.slice(0, 500),
      });
    }

    if (!response.ok || !result?.id) {
      console.error("[ficha] Edge Function rejeitou o salvamento:", {
        status: response.status,
        statusText: response.statusText,
        body: rawBody.slice(0, 500),
      });
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
