import { useState } from "react";
import { Check, Copy, CreditCard, QrCode, Sparkles } from "lucide-react";

export const PIX_COPIA_E_COLA =
  "00020101021126360014br.gov.bcb.pix0114+55119401104475204000053039865802BR5917JULIANA D TRUGLIA6007CAJAMAR62070503***6304AF5E";

export const FORMAS_PAGAMENTO = ["Pix", "Cartão de crédito", "Cartão de débito"] as const;

export const GRUPOS_PLANOS: { frequencia: string; valorSessao: string; opcoes: string[] }[] = [
  {
    frequencia: "2x na semana",
    valorSessao: "R$ 120 por sessão",
    opcoes: ["2x na semana — Mensal R$ 960", "2x na semana — Trimestral R$ 2.640"],
  },
  {
    frequencia: "3x na semana",
    valorSessao: "R$ 100 por sessão",
    opcoes: ["3x na semana — Mensal R$ 1.200", "3x na semana — Trimestral R$ 3.300"],
  },
  {
    frequencia: "4x na semana",
    valorSessao: "R$ 95 por sessão",
    opcoes: ["4x na semana — Mensal R$ 1.520", "4x na semana — Trimestral R$ 4.200"],
  },
];

/** Links da maquininha (InfinitePay) por plano escolhido. */
export const LINKS_CARTAO: Record<string, string> = {
  "2x na semana — Mensal R$ 960":
    "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-KlCPvaWOkm-960,00",
  "2x na semana — Trimestral R$ 2.640":
    "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-4ehdExTKeq-2640,00",
  "3x na semana — Mensal R$ 1.200":
    "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-A2xbzvw90d-1200,00",
  "3x na semana — Trimestral R$ 3.300":
    "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-2DrlXN0RA0-3300,00",
  "4x na semana — Mensal R$ 1.520":
    "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-HuMiWOe4bT-1520,00",
  "4x na semana — Trimestral R$ 4.200":
    "https://link.infinitepay.io/juliana-doro-truglia/VC1DLUMtUg-DDP3xcGqVC-4200,00",
};

type Props = {
  plano: string;
  setPlano: (v: string) => void;
  pagamento: string;
  setPagamento: (v: string) => void;
};

export default function Planos({ plano, setPlano, pagamento, setPagamento }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [pulando, setPulando] = useState("");

  const escolherPlano = (opcao: string) => {
    setPlano(opcao);
    setPulando(opcao);
    window.setTimeout(() => setPulando(""), 320);
  };

  const copiarPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_COPIA_E_COLA);
    } catch {
      const area = document.createElement("textarea");
      area.value = PIX_COPIA_E_COLA;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="mt-4 flex flex-col gap-5">
      {/* Planos */}
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Escolha o seu plano *</p>
        {GRUPOS_PLANOS.map((grupo) => (
          <div key={grupo.frequencia} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-lg italic text-primary">{grupo.frequencia}</span>
              <span className="text-xs font-semibold uppercase tracking-widest text-rosegold">
                {grupo.valorSessao}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {grupo.opcoes.map((opcao) => {
                const ativo = plano === opcao;
                return (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => escolherPlano(opcao)}
                    aria-pressed={ativo}
                    className={[
                      "rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200",
                      ativo
                        ? "border-primary bg-accent font-semibold text-accent-foreground shadow-sm"
                        : "border-border bg-background text-foreground",
                      pulando === opcao ? "scale-[1.05]" : "scale-100",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      {ativo && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      {opcao.split("—")[1]?.trim() ?? opcao}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Forma de pagamento */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          Qual forma de pagamento você vai usar? *
        </legend>
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

      {pagamento === "Pix" && (
        <div className="rounded-xl border border-primary/40 bg-accent/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <QrCode className="h-4 w-4" /> Pix Copia e Cola
          </p>
          <p className="mt-2 break-all rounded-lg border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground">
            {PIX_COPIA_E_COLA}
          </p>
          <button
            type="button"
            onClick={copiarPix}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Copy className="h-4 w-4" />
            Copiar código Pix
          </button>
          {copiado && (
            <p className="mt-2 text-center text-sm font-semibold text-whatsapp">
              ✓ Código Pix copiado!
            </p>
          )}
        </div>
      )}

      {(pagamento === "Cartão de crédito" || pagamento === "Cartão de débito") && (
        <div className="rounded-xl border border-rosegold/50 bg-secondary/60 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <CreditCard className="h-4 w-4" /> Pagamento por cartão
          </p>
          {plano && LINKS_CARTAO[plano] ? (
            <>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Pague com segurança na maquininha da Juliana:{" "}
                <Sparkles className="inline h-3.5 w-3.5 text-rosegold" />
              </p>
              <a
                href={LINKS_CARTAO[plano]}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-center text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform active:scale-[0.98]"
              >
                <CreditCard className="h-4 w-4" />
                Pagar {plano.split("—")[1]?.trim() ?? plano}
              </a>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Escolha o seu plano acima para liberar o link de pagamento por cartão.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
