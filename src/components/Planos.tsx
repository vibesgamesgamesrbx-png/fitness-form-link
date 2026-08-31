import { useState } from "react";
import { Check, CreditCard, Loader2, QrCode, Sparkles } from "lucide-react";
import { criarCheckoutInfinitePay } from "@/lib/payment.functions";

export const FORMAS_PAGAMENTO = ["Pix", "Cartão de crédito"] as const;

export const GRUPOS_PLANOS: {
  frequencia: string;
  valorSessao: string;
  opcoes: string[];
  economiaTrimestral: string;
}[] = [
  {
    frequencia: "2x na semana",
    valorSessao: "R$ 120 por aula",
    opcoes: ["2x na semana — Mensal R$ 960", "2x na semana — Trimestral R$ 2.640"],
    economiaTrimestral: "R$ 240",
  },
  {
    frequencia: "3x na semana",
    valorSessao: "R$ 100 por aula",
    opcoes: ["3x na semana — Mensal R$ 1.200", "3x na semana — Trimestral R$ 3.300"],
    economiaTrimestral: "R$ 300",
  },
  {
    frequencia: "4x na semana",
    valorSessao: "R$ 95 por aula",
    opcoes: ["4x na semana — Mensal R$ 1.520", "4x na semana — Trimestral R$ 4.200"],
    economiaTrimestral: "R$ 360",
  },
];

type Props = {
  plano: string;
  setPlano: (v: string) => void;
  pagamento: string;
  setPagamento: (v: string) => void;
  nome: string;
  whatsapp: string;
};

export default function Planos({ plano, setPlano, pagamento, setPagamento, nome, whatsapp }: Props) {
  const [pulando, setPulando] = useState("");
  const [pagando, setPagando] = useState(false);
  const [erro, setErro] = useState("");

  const escolherPlano = (opcao: string) => {
    setPlano(opcao);
    setPulando(opcao);
    window.setTimeout(() => setPulando(""), 320);
  };

  const iniciarPagamento = async () => {
    setErro("");
    if (!nome.trim() || whatsapp.replace(/\D/g, "").length < 10) {
      setErro("Preencha seu nome e WhatsApp na seção de dados pessoais antes de pagar.");
      return;
    }
    if (!plano) {
      setErro("Escolha um plano antes de continuar.");
      return;
    }

    setPagando(true);
    try {
      const result = await criarCheckoutInfinitePay({ data: { nome, whatsapp, plano } });
      localStorage.setItem(
        "juliana_pagamento_pendente",
        JSON.stringify({ orderNsu: result.orderNsu, nome, whatsapp, plano }),
      );
      window.location.assign(result.url);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.");
      setPagando(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Escolha o seu plano *</p>
        {GRUPOS_PLANOS.map((grupo) => (
          <div key={grupo.frequencia} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-lg italic text-primary">{grupo.frequencia}</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-rosegold">{grupo.valorSessao}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {grupo.opcoes.map((opcao) => {
                const ativo = plano === opcao;
                const ehTrimestral = opcao.includes("Trimestral");
                return (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => escolherPlano(opcao)}
                    aria-pressed={ativo}
                    className={[
                      "rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200",
                      ativo ? "border-primary bg-accent font-semibold text-accent-foreground shadow-sm" : "border-border bg-background text-foreground",
                      pulando === opcao ? "scale-[1.05]" : "scale-100",
                    ].join(" ")}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      {ativo && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      {opcao.split("—")[1]?.trim() ?? opcao}
                      {ehTrimestral && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                          trimestral: economize {grupo.economiaTrimestral}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Como você quer pagar? *</legend>
        <p className="mb-3 text-xs text-muted-foreground">
          O pagamento é processado com segurança pela InfinitePay. O checkout libera Pix e cartão conforme a configuração da conta da Juliana.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FORMAS_PAGAMENTO.map((opt) => (
            <label key={opt} className="radio-card">
              <input
                type="radio"
                name="pagamento"
                className="radio-dot"
                checked={pagamento === opt}
                onChange={() => setPagamento(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border border-primary/30 bg-accent/40 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <QrCode className="h-4 w-4" /> Pagamento seguro
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Você será levado ao checkout oficial da InfinitePay. O horário só poderá ser escolhido depois que o pagamento for confirmado automaticamente.
        </p>
        <button
          type="button"
          onClick={() => void iniciarPagamento()}
          disabled={pagando}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pagando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {pagando ? "Abrindo pagamento..." : "Pagar agora"}
          {!pagando && <Sparkles className="h-4 w-4 text-rosegold" />}
        </button>
        {erro && <p className="mt-2 text-sm font-medium text-destructive">{erro}</p>}
      </div>
    </div>
  );
}
