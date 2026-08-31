import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import Agenda from "@/components/Agenda";
import { consultarPagamento } from "@/lib/payment.functions";

export const Route = createFileRoute("/pagamento-concluido")({
  component: PagamentoConcluido,
});

type ClientePagamento = {
  orderNsu: string;
  nome: string;
  whatsapp: string;
  plano: string;
};

function PagamentoConcluido() {
  const [cliente, setCliente] = useState<ClientePagamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    const carregar = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderNsu = params.get("order_nsu")?.trim() || "";

        let pendente: Partial<ClientePagamento> = {};
        try {
          const salvo = window.localStorage.getItem("juliana_pagamento_pendente");
          if (salvo) pendente = JSON.parse(salvo) as Partial<ClientePagamento>;
        } catch {
          // Ignora dados locais inválidos; a consulta do pagamento é a fonte confiável.
        }

        const id = orderNsu || pendente.orderNsu || "";
        if (!id) {
          if (ativo) setErro("Não encontramos o pedido do pagamento. Volte ao formulário e tente novamente.");
          return;
        }

        const resultado = await consultarPagamento({ data: { orderNsu: id } });
        if (!ativo) return;

        if (resultado.status === "invalido") {
          setErro("Não encontramos esse pagamento. Volte ao formulário e tente novamente.");
          return;
        }

        setCliente({
          orderNsu: id,
          nome: resultado.nome || pendente.nome || "",
          whatsapp: resultado.whatsapp || pendente.whatsapp || "",
          plano: resultado.plano || pendente.plano || "",
        });
      } catch {
        if (ativo) setErro("Não foi possível carregar os dados do pagamento agora.");
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    void carregar();
    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
          <p className="mt-3 font-display text-2xl italic text-primary">Voltando para sua agenda...</p>
        </div>
      </main>
    );
  }

  if (erro || !cliente) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5">
        <div className="w-full max-w-xl rounded-2xl border border-destructive/40 bg-card p-6 text-center">
          <p className="font-display text-2xl italic text-primary">Não foi possível continuar</p>
          <p className="mt-2 text-sm text-muted-foreground">{erro}</p>
          <a
            href="/"
            className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground"
          >
            Voltar para a ficha
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-16 pt-10">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-whatsapp" />
          <h1 className="mt-3 font-display text-3xl font-semibold italic text-primary">
            Obrigada pelo pagamento! 💗
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Estamos confirmando sua transação. Assim que a InfinitePay confirmar o pagamento, sua agenda será liberada automaticamente.
          </p>
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-primary">Plano selecionado</p>
          <p className="mt-1 text-sm text-foreground">{cliente.plano}</p>
        </section>

        <Agenda
          nome={cliente.nome}
          whatsapp={cliente.whatsapp}
          plano={cliente.plano}
          pagamento="Checkout InfinitePay"
          orderNsu={cliente.orderNsu}
          onConfirmado={() => {
            try {
              window.localStorage.removeItem("juliana_pagamento_pendente");
            } catch {
              // Sem problema se o armazenamento local estiver indisponível.
            }
          }}
        />
      </div>
    </main>
  );
}
