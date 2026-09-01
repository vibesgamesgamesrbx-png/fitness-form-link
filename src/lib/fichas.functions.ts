import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPABASE_PROJECT_URL = "https://vwceklxxklkftqzxnbkb.supabase.co";
type FichaItem = { rotulo: string; valor: string };
type FichaSecao = { titulo: string; itens: FichaItem[] };

async function chamarAdminEdge(authorization: string | undefined, action: string, body: Record<string, unknown> = {}) {
  if (!authorization?.startsWith("Bearer ")) throw new Error("Sessão administrativa inválida.");
  const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/admin-panel-api`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: authorization }, body: JSON.stringify({ action, ...body }) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error ?? "Não foi possível concluir a operação."));
  return payload?.data ?? null;
}

export type NovaFichaAnamnese = { nome: string; whatsapp: string; secoes: FichaSecao[] };
export const salvarFichaAnamnese = createServerFn({ method: "POST" }).inputValidator((input: NovaFichaAnamnese) => input).handler(async ({ data }) => {
  const nome = String(data.nome ?? "").trim().slice(0, 120); const whatsapp = String(data.whatsapp ?? "").replace(/\D/g, "").slice(0, 13);
  if (!nome || whatsapp.length < 10 || !Array.isArray(data.secoes)) throw new Error("Dados da ficha inválidos.");
  const endpoint = `${SUPABASE_PROJECT_URL}/functions/v1/salvar-ficha-anamnese`;
  let response: Response; try { response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, whatsapp, secoes: data.secoes }) }); } catch (error) { console.error("[ficha] falha de rede:", error); throw new Error("Não foi possível conectar ao serviço de salvamento."); }
  const rawBody = await response.text(); let result: { id?: unknown; error?: string } = {}; try { result = JSON.parse(rawBody); } catch { console.error("[ficha] resposta não-JSON:", { status: response.status, body: rawBody.slice(0, 500) }); }
  if (!response.ok || !result?.id) { console.error("[ficha] Edge Function rejeitou:", { status: response.status, statusText: response.statusText, body: rawBody.slice(0, 500) }); throw new Error(result?.error || "Não foi possível salvar a ficha agora."); }
  return { id: String(result.id) };
});

export type FichaAdmin = { id: string; nome: string; whatsapp: string; data_nascimento: string | null; idade: number | null; objetivos: string[]; dados: FichaSecao[]; pagamento_id: string | null; created_at: string };
export const listarFichasAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<FichaAdmin[]> => { return ((await chamarAdminEdge((context as any).authorization, "fichas")) ?? []) as FichaAdmin[]; });
export const atualizarFichaPagamento = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: { fichaId: string; pagamentoId: string }) => input).handler(async ({ context, data }) => { await chamarAdminEdge((context as any).authorization, "atualizar-ficha-pagamento", data); return { ok: true }; });
export const listarPagamentosAdmin = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => { return (await chamarAdminEdge((context as any).authorization, "pagamentos")) ?? []; });
