import { useState } from "react";
import { Check, Heart } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import Pagamento from "@/components/Pagamento";
import Agenda from "@/components/Agenda";

export const Route = createFileRoute("/pagamento-confirmado")({
  component: PagamentoConfirmado,
});

function PagamentoConfirmado() {
  const [paymentId, setPaymentId] = useState("");
  const orderNsu = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("payment") ?? ""
    : "";

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <header className="text-center">
          <div className="mx-auto flex items-center justify-center gap-3">
            <Heart className="h-5 w-5 text-rosegold" fill="currentColor" />
            <h1 className="font-display text-3xl font-semibold italic text-primary">Juliana Truglia</h1>
            <Heart className="h-5 w-5 text-rosegold" fill="currentColor" />
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em]">Pagamento</p>
        </header>

        {!orderNsu ? (
          <div className="mt-8 rounded-2xl border border-destructive/40 bg-card p-5 text-center">
            <p className="font-semibold text-destructive">Pedido de pagamento não encontrado.</p>
          </div>
        ) : paymentId ? (
          <>
            <div className="mt-6 rounded-2xl border border-whatsapp/50 bg-accent/40 p-4 text-center">
              <Check className="mx-auto h-7 w-7 text-whatsapp" />
              <p className="mt-1 font-semibold text-primary">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground">Agora escolha seu horário.</p>
            </div>
            <Agenda pagamentoId={paymentId} />
          </>
        ) : (
          <Pagamento orderNsu={orderNsu} onPaid={setPaymentId} />
        )}
      </div>
    </main>
  );
}
