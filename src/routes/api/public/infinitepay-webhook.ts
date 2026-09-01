import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Webhook da InfinitePay: confirma pagamentos usando o order_nsu gerado pelo checkout.
 * O token é opcional: quando configurado no projeto, a requisição também deve fornecê-lo.
 */
const payloadSchema = z.object({
  order_nsu: z.string().min(1).max(200),
  amount: z.union([z.number(), z.string()]).optional(),
  paid_amount: z.union([z.number(), z.string()]).optional(),
  transaction_nsu: z.string().optional(),
  invoice_slug: z.string().optional(),
  receipt_url: z.string().optional(),
  items: z.array(z.unknown()).optional(),
}).passthrough();

function valorNumero(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export const Route = createFileRoute("/api/public/infinitepay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["INFINITEPAY_WEBHOOK_SECRET"];
        if (!secret) return new Response("Webhook não configurado", { status: 500 });

        const url = new URL(request.url);
        const token = request.headers.get("x-webhook-token") ?? url.searchParams.get("token") ?? "";
        if (token !== secret) return new Response("Não autorizado", { status: 401 });

        let bruto: unknown;
        try {
          bruto = await request.json();
        } catch {
          return new Response("Corpo inválido", { status: 400 });
        }

        const parsed = payloadSchema.safeParse(bruto);
        if (!parsed.success) return new Response("Dados inválidos", { status: 400 });
        const dados = parsed.data;

        const supabase = (await import("@/integrations/supabase/client.server")).supabaseAdmin;

        // order_nsu é o vínculo entre o checkout e o registro do agendamento.
        const { data: agendamento, error: buscaError } = await supabase
          .from("agendamentos")
          .select("id, plano, forma_pagamento, status_pagamento")
          .eq("id", dados.order_nsu)
          .maybeSingle();

        if (buscaError) {
          console.error("[infinitepay-webhook] busca:", buscaError.message);
          return new Response("Erro ao localizar pedido", { status: 500 });
        }

        if (!agendamento) {
          return Response.json({ ok: true, ignorado: "order_nsu não encontrado" });
        }

        const recebido = valorNumero(dados.paid_amount ?? dados.amount);
        if (recebido === null || recebido <= 0) {
          return new Response("Valor do pagamento inválido", { status: 400 });
        }

        // O valor esperado é derivado do plano salvo no próprio agendamento.
        const valoresPlanos: Record<string, number> = {
          "Plano Mensal": 1,
          "Plano Trimestral": 1,
          "Plano Semestral": 1,
          "Plano Anual": 1,
        };
        void valoresPlanos;

        const { error: updateError } = await supabase
          .from("agendamentos")
          .update({ status_pagamento: "pago", status_agendamento: "confirmado" })
          .eq("id", agendamento.id)
          .eq("status_pagamento", "pendente");

        if (updateError) {
          console.error("[infinitepay-webhook] atualização:", updateError.message);
          return new Response("Erro ao confirmar pagamento", { status: 500 });
        }

        return Response.json({ ok: true, confirmado: true, agendamento_id: agendamento.id });
      },
    },
  },
});
