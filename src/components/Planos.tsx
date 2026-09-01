import { Check, CreditCard, Copy, Sparkles } from "lucide-react";
import { useState } from "react";

export const FORMAS_PAGAMENTO = ["Pix", "Cartão de crédito"] as const;

export const GRUPOS_PLANOS = [
  { frequencia: "2x na semana", valorSessao: "R$ 120 por aula", opcoes: ["2x na semana — Mensal R$ 960", "2x na semana — Trimestral R$ 2.640"], economiaTrimestral: "R$ 240" },
  { frequencia: "3x na semana", valorSessao: "R$ 100 por aula", opcoes: ["3x na semana — Mensal R$ 1.200", "3x na semana — Trimestral R$ 3.300"], economiaTrimestral: "R$ 300" },
  { frequencia: "4x na semana", valorSessao: "R$ 95 por aula", opcoes: ["4x na semana — Mensal R$ 1.520", "4x na semana — Trimestral R$ 4.200"], economiaTrimestral: "R$ 360" },
];

export const LINKS_CARTAO: Record<string, string> = {
  "2x na semana — Mensal R$ 960": "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-KlCPvaWOkm-960,00",
  "2x na semana — Trimestral R$ 2.640": "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-4ehdExTKeq-2640,00",
  "3x na semana — Mensal R$ 1.200": "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-A2xbzvw90d-1200,00",
  "3x na semana — Trimestral R$ 3.300": "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-2DrlXN0RA0-3300,00",
  "4x na semana — Mensal R$ 1.520": "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-HuMiWOe4bT-1520,00",
  "4x na semana — Trimestral R$ 4.200": "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-DDP3xcGqVC-4200,00",
};

export const PIX_COPIA_E_COLA = "00020101021126360014br.gov.bcb.pix0114+55119401104475204000053039865802BR5917JULIANA D TRUGLIA6007CAJAMAR62070503***6304AF5E";

type Props = { plano: string; setPlano: (v: string) => void; pagamento: string; setPagamento: (v: string) => void };

export default function Planos({ plano, setPlano, pagamento, setPagamento }: Props) {
  const [copiado, setCopiado] = useState(false);
  const linkCartao = LINKS_CARTAO[plano];

  const copiarPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_COPIA_E_COLA);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch { setCopiado(false); }
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
                  <button key={opcao} type="button" onClick={() => setPlano(opcao)} aria-pressed={ativo}
                    className={["rounded-xl border px-3 py-3 text-left text-sm transition-all", ativo ? "border-primary bg-accent font-semibold text-accent-foreground shadow-sm" : "border-border bg-background text-foreground"].join(" ")}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      {ativo && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      {opcao.split("—")[1]?.trim() ?? opcao}
                      {ehTrimestral && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">trimestral: economize {grupo.economiaTrimestral}</span>}
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
              <input type="radio" name="pagamento" className="radio-dot" checked={pagamento === opt} onChange={() => setPagamento(opt)} />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      {pagamento === "Pix" && (
        <div className="rounded-xl border border-primary/30 bg-accent/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">Pagamento via Pix</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Copie o código Pix abaixo e faça o pagamento pelo aplicativo do seu banco.</p>
          <div className="mt-3 rounded-lg border border-border bg-background p-3 text-xs break-all text-muted-foreground">{PIX_COPIA_E_COLA}</div>
          <button type="button" onClick={copiarPix} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <Copy className="h-4 w-4" />
            {copiado ? "Pix copiado!" : "Copiar código Pix"}
          </button>
        </div>
      )}

      {pagamento === "Cartão de crédito" && linkCartao && (
        <div className="rounded-xl border border-primary/30 bg-accent/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary"><CreditCard className="h-4 w-4" /> Pagamento com cartão</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Clique no botão abaixo para abrir o checkout da InfinitePay referente ao plano escolhido.</p>
          <a href={linkCartao} target="_blank" rel="noopener noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            <CreditCard className="h-4 w-4" /> Pagar com cartão
          </a>
        </div>
      )}

      {!pagamento && (
        <div className="rounded-xl border border-primary/30 bg-accent/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary"><CreditCard className="h-4 w-4" /> Formas de pagamento</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Escolha Pix ou cartão de crédito para visualizar as instruções de pagamento.<Sparkles className="ml-1 inline h-3.5 w-3.5 text-rosegold" /></p>
        </div>
      )}
    </div>
  );
}
