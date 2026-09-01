import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  order_nsu: z.string().min(1).max(200),
  amount: z.union([z.number(), z.string()]),
  paid_amount: z.union([z.number(), z.string()]).optional(),
  transaction_nsu: z.string().optional(),
  invoice_slug: z.string().optional(),
  receipt_url: z.string().url().optional(),
  capture_method: z.string().optional(),
  items: z.array(z.unknown()).optional(),
}).passthrough();

function centavos(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export const Route = createFileRoute("/api/public/infinitepay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let bruto: unknown;
        try {
          bruto = await request.json();
        } catch {
          return Response.json({ success: false, message: "Corpo inválido" }, { status: 400 });
        }

        const parsed = payloadSchema.safeParse(bruto);
        if (!parsed.success) {
          return Response.json({ success: false, message: "Dados inválidos" }, { status: 400 });
        }

        const dados = parsed.data;
        const valor = centavos(dados.amount);
        const pago = centavos(dados.paid_amount ?? dados.amount);
        if (valor === null || pago === null) {
          return Response.json({ success: false, message: "Valor inválido" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const { data: pagamento, error: buscaError } = await db
          .from("pagamentos")
          .select("id, valor_centavos, status")
          .eq("order_nsu", dados.order_nsu)
          .maybeSingle();

        if (buscaError) {
          console.error("[infinitepay-webhook] busca:", buscaError.message);
          return Response.json({ success: false, message: "Erro interno" }, { status: 500 });
        }

        if (!pagamento) {
          return Response.json({ success: false, message: "Pedido não encontrado" }, { status: 400 });
        }

        // A própria InfinitePay informa o valor do pedido em centavos. Só confirmamos
        // quando o valor recebido não é menor que o valor esperado.
        if (valor !== pagamento.valor_centavos || pago < pagamento.valor_centavos) {
          return Response.json({ success: false, message: "Valor do pagamento não confere" }, { status: 400 });
        }

        const { error: updateError } = await db
          .from("pagamentos")
          .update({
            status: "pago",
            transaction_nsu: dados.transaction_nsu ?? null,
            invoice_slug: dados.invoice_slug ?? null,
            receipt_url: dados.receipt_url ?? null,
            paid_amount_centavos: pago,
            pago_em: new Date().toISOString(),
          })
          .eq("id", pagamento.id)
          .eq("status", "pendente");

        if (updateError) {
          console.error("[infinitepay-webhook] atualização:", updateError.message);
          return Response.json({ success: false, message: "Erro interno" }, { status: 500 });
        }

        return Response.json({ success: true, message: null });
      },
    },
  },
});
