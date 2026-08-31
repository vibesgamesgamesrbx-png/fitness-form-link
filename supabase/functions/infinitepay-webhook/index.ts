import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    const orderNsu = String(payload.order_nsu ?? "").trim();
    const transactionNsu = String(payload.transaction_nsu ?? "").trim();
    const invoiceSlug = String(payload.invoice_slug ?? "").trim();
    const amount = Number(payload.amount ?? 0);
    const paidAmount = Number(payload.paid_amount ?? 0);

    if (!orderNsu || !transactionNsu || !invoiceSlug || !Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ success: false, message: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: pagamento, error: lookupError } = await supabase
      .from("pagamentos")
      .select("id, order_nsu, valor_centavos, status")
      .eq("order_nsu", orderNsu)
      .maybeSingle();

    if (lookupError || !pagamento) {
      return new Response(JSON.stringify({ success: false, message: "Pedido não encontrado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // O valor recebido precisa corresponder ao pedido criado pelo nosso backend.
    if (Number(pagamento.valor_centavos) !== amount) {
      return new Response(JSON.stringify({ success: false, message: "Valor do pedido não confere" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Webhooks são idempotentes: receber o mesmo evento novamente não quebra o pedido.
    const { error: updateError } = await supabase
      .from("pagamentos")
      .update({
        status: "pago",
        transaction_nsu: transactionNsu,
        invoice_slug: invoiceSlug,
        receipt_url: payload.receipt_url ?? null,
        capture_method: payload.capture_method ?? null,
        paid_amount: Number.isFinite(paidAmount) ? paidAmount : null,
        paid_at: new Date().toISOString(),
      })
      .eq("id", pagamento.id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, message: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("InfinitePay webhook error", error);
    return new Response(JSON.stringify({ success: false, message: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
