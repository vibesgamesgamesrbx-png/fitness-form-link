import { createServerFn } from "@tanstack/react-start";

const PLANOS: Record<string, number> = {
  "2x na semana — Mensal R$ 960": 96000,
  "2x na semana — Trimestral R$ 2.640": 264000,
  "3x na semana — Mensal R$ 1.200": 120000,
  "3x na semana — Trimestral R$ 3.300": 330000,
  "4x na semana — Mensal R$ 1.520": 152000,
  "4x na semana — Trimestral R$ 4.200": 420000,
};

function appUrl() {
  const value = process.env["APP_URL"]?.trim();
  if (!value) throw new Error("APP_URL não configurado.");
  return value.replace(/\/$/, "");
}

export type CriarCheckoutInput = {
  nome: string;
  whatsapp: string;
  plano: string;
  formaPagamento: string;
};

export const criarCheckoutInfinitePay = createServerFn({ method: "POST" })
  .inputValidator((input: CriarCheckoutInput) => input)
  .handler(async ({ data }) => {
    const nome = String(data.nome ?? "").trim().slice(0, 120);
    const whatsapp = String(data.whatsapp ?? "").replace(/\D/g, "").slice(0, 13);
    const plano = String(data.plano ?? "").trim();
    const formaPagamento = String(data.formaPagamento ?? "").trim();
    const valorCentavos = PLANOS[plano];

    if (!nome || whatsapp.length < 10 || !valorCentavos || !["Pix", "Cartão de crédito"].includes(formaPagamento)) {
      throw new Error("Dados de pagamento inválidos.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const orderNsu = crypto.randomUUID();

    const { error: insertError } = await db.from("pagamentos").insert({
      order_nsu: orderNsu,
      nome,
      whatsapp,
      plano,
      forma_pagamento: formaPagamento,
      valor_centavos: valorCentavos,
      status: "pendente",
    });

    if (insertError) throw new Error("Não foi possível criar o pedido de pagamento.");

    const base = appUrl();
    const payload = {
      handle: "juliana-doro-truglia",
      redirect_url: `${base}/pagamento-confirmado?payment=${encodeURIComponent(orderNsu)}`,
      webhook_url: `${base}/api/public/infinitepay-webhook`,
      order_nsu: orderNsu,
      customer: {
        name: nome,
        phone_number: `+55${whatsapp}`,
      },
      items: [{ quantity: 1, price: valorCentavos, description: plano }],
    };

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let result: any = null;
    try { result = await response.json(); } catch { result = null; }

    if (!response.ok || !result?.url) {
      await db.from("pagamentos").delete().eq("order_nsu", orderNsu);
      console.error("[infinitepay] erro ao criar checkout", response.status, result);
      throw new Error("A InfinitePay não conseguiu criar o checkout agora.");
    }

    return { ok: true as const, orderNsu, checkoutUrl: String(result.url) };
  });

export const consultarPagamento = createServerFn({ method: "GET" })
  .inputValidator((input: { orderNsu: string }) => input)
  .handler(async ({ data }) => {
    const orderNsu = String(data.orderNsu ?? "").trim();
    if (!orderNsu) return { ok: false as const, status: "inexistente" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: pagamento, error } = await db
      .from("pagamentos")
      .select("id, status, plano")
      .eq("order_nsu", orderNsu)
      .maybeSingle();

    if (error || !pagamento) return { ok: false as const, status: "inexistente" as const };
    return { ok: true as const, id: pagamento.id as string, status: pagamento.status as string, plano: pagamento.plano as string };
  });
