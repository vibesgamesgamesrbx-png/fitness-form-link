import { Check, CreditCard, Sparkles } from "lucide-react";

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
};

export default function Planos({ plano, setPlano, pagamento, setPagamento }: Props) {
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
                    onClick={() => setPlano(opcao)}
                    aria-pressed={ativo}
                    className={[
                      "rounded-xl border px-3 py-3 text-left text-sm transition-all",
                      ativo
                        ? "border-primary bg-accent font-semibold text-accent-foreground shadow-sm"
                        : "border-border bg-background text-foreground",
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
        <legend className="mb-2 text-sm font-medium">Qual forma de pagamento você vai usar? *</legend>
        <div className="flex flex-col gap-2">
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
          <CreditCard className="h-4 w-4" /> Checkout InfinitePay
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Depois de enviar a ficha, o checkout seguro da InfinitePay será aberto para o pagamento.
          Pix e cartão ficam disponíveis no próprio checkout.
          <Sparkles className="ml-1 inline h-3.5 w-3.5 text-rosegold" />
        </p>
      </div>
    </div>
  );
}
