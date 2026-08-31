import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const INFINITEPAY_HANDLE = "juliana-doro-truglia";

const PLANOS_VALORES: Record<string, number> = {
  "2x na semana — Mensal R$ 960": 96000,
  "2x na semana — Trimestral R$ 2.640": 264000,
  "3x na semana — Mensal R$ 1.200": 120000,
  "3x na semana — Trimestral R$ 3.300": 330000,
  "4x na semana — Mensal R$ 1.520": 152000,
  "4x na semana — Trimestral R$ 4.200": 420000,
};

export type CriarCheckoutInput = {
  nome: string;
  whatsapp: string;
  plano: string;
};

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export const criarCheckoutInfinitePay = createServerFn({ method: "POST" })
  .inputValidator((input: CriarCheckoutInput) => input)
  .handler(async ({ data }) => {
    const nome = String(data.nome ?? "").trim().slice(0, 120);
    const whatsapp = String(data.whatsapp ?? "").replace(/\D/g, "").slice(0, 13);
    const plano = String(data.plano ?? "").trim().slice(0, 120);
    const valorCentavos = PLANOS_VALORES[plano];

    if (!nome || whatsapp.length < 10 || !valorCentavos) {
      throw new Error("Dados do checkout incompletos ou plano inválido.");
    }

    const orderNsu = crypto.randomUUID();
    const appUrl = env("APP_URL").replace(/\/$/, "");
    const supabaseUrl = env("SUPABASE_URL").replace(/\/$/, "");
    const webhookUrl = `${supabaseUrl}/functions/v1/infinitepay-webhook`;

    const { error: insertError } = await supabaseAdmin.from("pagamentos").insert({
      order_nsu: orderNsu,
      nome,
      whatsapp,
      plano,
      valor_centavos: valorCentavos,
      status: "pendente",
    });

    if (insertError) throw new Error("Não foi possível iniciar o pagamento.");

    const response = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: INFINITEPAY_HANDLE,
        order_nsu: orderNsu,
        redirect_url: `${appUrl}/pagamento-concluido`,
        webhook_url: webhookUrl,
        customer: {
          name: nome,
          phone_number: `+55${whatsapp}`,
        },
        items: [
          {
            quantity: 1,
            price: valorCentavos,
            description: `Personal Trainer — ${plano}`,
          },
        ],
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.url) {
      await supabaseAdmin.from("pagamentos").update({ status: "erro" }).eq("order_nsu", orderNsu);
      console.error("InfinitePay checkout error", response.status, result);
      throw new Error("A InfinitePay não conseguiu criar o checkout.");
    }

    return { url: String(result.url), orderNsu };
  });

export const consultarPagamento = createServerFn({ method: "GET" })
  .inputValidator((input: { orderNsu: string }) => input)
  .handler(async ({ data }) => {
    const orderNsu = String(data.orderNsu ?? "").trim();
    if (!orderNsu) return { status: "invalido" as const };

    const { data: pagamento, error } = await supabaseAdmin
      .from("pagamentos")
      .select("order_nsu,status")
      .eq("order_nsu", orderNsu)
      .maybeSingle();

    if (error || !pagamento) return { status: "invalido" as const };

    return {
      status: pagamento.status as "pendente" | "pago" | "erro" | "cancelado" | "invalido",
    };
  });
