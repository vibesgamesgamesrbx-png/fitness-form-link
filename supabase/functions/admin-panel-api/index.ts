import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const ADMIN_EMAIL = "juliana.doro@hotmail.com";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL"); const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Serviço de banco indisponível." }, 500);
    const token = auth.slice(7); const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: claimsData, error: claimsError } = await db.auth.getClaims(token);
    const email = String(claimsData?.claims?.email ?? "").trim().toLowerCase();
    if (claimsError || email !== ADMIN_EMAIL) return json({ error: "Acesso restrito." }, 403);
    const body = await req.json(); const action = String(body?.action ?? ""); let result: any;
    switch (action) {
      case "fichas": result = await db.from("fichas_anamnese").select("id, nome, whatsapp, data_nascimento, idade, objetivos, dados, pagamento_id, created_at").order("created_at", { ascending: false }); break;
      case "pagamentos": result = await db.from("pagamentos").select("id, order_nsu, nome, whatsapp, plano, forma_pagamento, valor_centavos, status, created_at").order("created_at", { ascending: false }); break;
      case "agendamentos": result = await db.from("agendamentos").select("*").order("data", { ascending: true }).order("horario", { ascending: true }); break;
      case "bloqueios": result = await db.from("agenda_bloqueios").select("id, data, horario, motivo").order("data", { ascending: true }).order("horario", { ascending: true, nullsFirst: true }); break;
      case "bloqueios-recorrentes": result = await db.from("agenda_bloqueios_recorrentes").select("id, dia_semana, horario").order("dia_semana", { ascending: true }).order("horario", { ascending: true }); break;
      case "criar-bloqueio": {
        const data = String(body?.data ?? ""); const horarioRaw = body?.horario ? String(body.horario) : null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return json({ error: "Data inválida." }, 400);
        const horario = horarioRaw ? `${horarioRaw}:00` : null;
        if (horario && !/^\d{2}:\d{2}:00$/.test(horario)) return json({ error: "Horário inválido." }, 400);
        result = await db.from("agenda_bloqueios").insert({ data, horario, motivo: String(body?.motivo ?? "").trim() || null }).select("id, data, horario, motivo").single(); break;
      }
      case "remover-bloqueio": result = await db.from("agenda_bloqueios").delete().eq("id", String(body?.id ?? "")); break;
      case "criar-bloqueio-recorrente": {
        const dia = Number(body?.dia_semana); const horario = String(body?.horario ?? "");
        if (!Number.isInteger(dia) || dia < 1 || dia > 5 || !/^(0[6-9]|1\d|2[0-4]):00$/.test(horario)) return json({ error: "Dados inválidos." }, 400);
        result = await db.from("agenda_bloqueios_recorrentes").insert({ dia_semana: dia, horario: `${horario}:00` }).select("id, dia_semana, horario").single(); break;
      }
      case "remover-bloqueio-recorrente": result = await db.from("agenda_bloqueios_recorrentes").delete().eq("id", String(body?.id ?? "")); break;
      case "atualizar-agendamento": {
        const patch: Record<string,string> = {}; if (body?.status_pagamento) patch.status_pagamento = String(body.status_pagamento); if (body?.status_agendamento) patch.status_agendamento = String(body.status_agendamento);
        result = await db.from("agendamentos").update(patch).eq("id", String(body?.id ?? "")); break;
      }
      default: return json({ error: "Ação inválida." }, 400);
    }
    if (result?.error) return json({ error: result.error.message }, 500);
    return json({ data: result?.data ?? null }, 200);
  } catch (e) { console.error("[admin-panel-api]", e); return json({ error: "Erro interno." }, 500); }
});
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
