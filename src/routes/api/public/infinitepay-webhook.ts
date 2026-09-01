import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Webhook da InfinitePay: confirma o pagamento do plano e libera a agenda.
 * Chame com o cabeçalho `x-webhook-token: <INFINITEPAY_WEBHOOK_SECRET>`
 * ou `?token=<INFINITEPAY_WEBHOOK_SECRET>`.
 */
const payloadSchema = z.object({
  // identificação do agendamento (qualquer um dos campos abaixo)
  agendamento_id: z.string().uuid().optional(),
  whatsapp: z.string().min(8).max(20).optional(),
  // status do pagamento na InfinitePay
  status: z.string().max(40).optional(),
  amount: z.union([z.number(), z.string()]).optional(),
});

const STATUS_PAGO = ["paid", "approved", "succeeded", "success", "pago", "confirmed"];

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

        const status = (dados.status ?? "paid").toLowerCase();
        if (!STATUS_PAGO.includes(status)) {
          return Response.json({ ok: true, ignorado: status });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let query = supabaseAdmin
          .from("agendamentos")
          .update({ status_pagamento: "pago", status_agendamento: "confirmado" });

        if (dados.agendamento_id) {
          query = query.eq("id", dados.agendamento_id);
        } else if (dados.whatsapp) {
          query = query
            .eq("whatsapp", dados.whatsapp.replace(/\D/g, ""))
            .eq("status_pagamento", "pendente");
        } else {
          return new Response("Informe agendamento_id ou whatsapp", { status: 400 });
        }

        const { data, error } = await query.select("id");
        if (error) {
          console.error("[infinitepay-webhook]", error.message);
          return new Response("Erro ao atualizar", { status: 500 });
        }

        return Response.json({ ok: true, atualizados: data?.length ?? 0 });
      },
    },
  },
});
