import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Heart,
  Dumbbell,
  Salad,
  MoonStar,
  Baby,
  Target,
  User,
  MessageCircleHeart,
  Send,
} from "lucide-react";
import { gerarImagemFicha, type FichaSecao } from "@/lib/fichaImagem";
import Planos, { LINKS_CARTAO } from "@/components/Planos";


export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Juliana Truglia — Ficha de Anamnese | Personal Trainer Feminino" },
      {
        name: "description",
        content:
          "Preencha sua ficha de anamnese online e envie pelo WhatsApp para a Personal Trainer Juliana Truglia. Mais força para a sua melhor versão!",
      },
      { property: "og:title", content: "Juliana Truglia — Ficha de Anamnese" },
      {
        property: "og:description",
        content:
          "Preencha sua ficha de anamnese online e envie pelo WhatsApp. Personal Trainer Feminino.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

const TRAINER_WHATSAPP = "5511940110447";
const MIN_YEAR = 1900;
const MAX_YEAR = 2020;
const MIN_AGE = 5;
const MAX_AGE = 110;

const OBJETIVOS_OPCOES = [
  "Saúde e qualidade de vida",
  "Emagrecimento",
  "Ganho de massa muscular",
  "Fortalecimento",
];

const na = (v: string) => (v.trim() ? v.trim() : "Não informado");

function formatBirthdate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

function calcAge(iso: string): number | null {
  if (!iso) return null;
  const birth = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const year = birth.getFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < MIN_AGE || age > MAX_AGE) return null;
  return age;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function Index() {
  const [nome, setNome] = useState("");
  const [whatsappCliente, setWhatsappCliente] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [idadeManual, setIdadeManual] = useState("");

  const [objetivos, setObjetivos] = useState<string[]>([]);
  

  const [treinaAtualmente, setTreinaAtualmente] = useState("");
  const [tempoParada, setTempoParada] = useState("");
  const [jaTreinou, setJaTreinou] = useState("");
  const [tempoTreinou, setTempoTreinou] = useState("");

  const [problemaSaude, setProblemaSaude] = useState("");
  const [qualProblema, setQualProblema] = useState("");

  const [temFilhos, setTemFilhos] = useState("");
  const [quantosFilhos, setQuantosFilhos] = useState("");

  const [sono, setSono] = useState("");
  const [alimentacao, setAlimentacao] = useState("");
  const [adicionais, setAdicionais] = useState("");

  const [plano, setPlano] = useState("");
  const [pagamento, setPagamento] = useState("");

  const [errors, setErrors] = useState<string[]>([]);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [enviado, setEnviado] = useState(false);


  const idadeAuto = useMemo(() => calcAge(nascimento), [nascimento]);
  const idade = idadeAuto !== null ? String(idadeAuto) : idadeManual;

  const handleNascimento = (value: string) => {
    setNascimento(value);
    const age = calcAge(value);
    if (age !== null) setIdadeManual(String(age));
  };

  const handleIdade = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 3);
    if (digits === "") return setIdadeManual("");
    const num = Math.min(Number(digits), MAX_AGE);
    setIdadeManual(String(num));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: string[] = [];
    const phoneDigits = whatsappCliente.replace(/\D/g, "");
    const idadeNum = Number(idade);

    if (!nome.trim()) errs.push("Informe seu nome completo.");
    if (phoneDigits.length < 10) errs.push("Informe um WhatsApp válido com DDD.");
    if (!nascimento) {
      errs.push("Informe sua data de nascimento.");
    } else {
      const year = Number(nascimento.split("-")[0]);
      if (year < MIN_YEAR || year > MAX_YEAR)
        errs.push(`A data de nascimento deve ser entre ${MIN_YEAR} e ${MAX_YEAR}.`);
    }
    if (!idade || Number.isNaN(idadeNum) || idadeNum < MIN_AGE || idadeNum > MAX_AGE)
      errs.push(`A idade deve ser entre ${MIN_AGE} e ${MAX_AGE} anos.`);
    if (objetivos.length === 0) errs.push("Selecione pelo menos um objetivo com o treino.");
    if (problemaSaude === "Sim" && !qualProblema.trim())
      errs.push("Descreva qual problema de saúde você precisa destacar.");
    if (temFilhos === "Sim" && !quantosFilhos.trim()) errs.push("Informe quantos filhos você tem.");
    if (!plano) errs.push("Escolha o plano desejado na seção Plano e Pagamento.");
    if (!pagamento) errs.push("Escolha a forma de pagamento.");

    setErrors(errs);
    if (errs.length > 0) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return;
    }

    const secoes: FichaSecao[] = [
      {
        titulo: "Dados pessoais",
        itens: [
          { rotulo: "Nome completo", valor: na(nome) },
          { rotulo: "WhatsApp", valor: na(whatsappCliente) },
          { rotulo: "Data de nascimento", valor: na(formatBirthdate(nascimento)) },
          { rotulo: "Idade", valor: na(idade) },
        ],
      },
      {
        titulo: "Objetivo",
        itens: [{ rotulo: "Principal objetivo", valor: na(objetivos.join(", ")) }],
      },
      {
        titulo: "Atividade física",
        itens: [
          { rotulo: "Treina atualmente", valor: na(treinaAtualmente) },
          {
            rotulo: "Tempo parada",
            valor: treinaAtualmente === "Não" ? na(tempoParada) : "—",
          },
          { rotulo: "Já treinou anteriormente", valor: na(jaTreinou) },
          {
            rotulo: "Por quanto tempo",
            valor: jaTreinou === "Já treinei antes" ? na(tempoTreinou) : "—",
          },
        ],
      },
      {
        titulo: "Saúde",
        itens: [
          { rotulo: "Possui problema de saúde", valor: na(problemaSaude) },
          { rotulo: "Qual", valor: problemaSaude === "Sim" ? na(qualProblema) : "—" },
        ],
      },
      {
        titulo: "Filhos",
        itens: [
          { rotulo: "Possui filhos", valor: na(temFilhos) },
          { rotulo: "Quantidade", valor: temFilhos === "Sim" ? na(quantosFilhos) : "—" },
        ],
      },
      { titulo: "Sono", itens: [{ rotulo: "Qualidade do sono", valor: na(sono) }] },
      { titulo: "Alimentação", itens: [{ rotulo: "Como se alimenta", valor: na(alimentacao) }] },
      {
        titulo: "Informações adicionais",
        itens: [{ rotulo: "Observações", valor: na(adicionais) }],
      },
      {
        titulo: "Plano e pagamento",
        itens: [
          { rotulo: "Plano", valor: na(plano) },
          { rotulo: "Pagamento", valor: na(pagamento) },
          ...(pagamento?.startsWith("Cartão") && LINKS_CARTAO[plano]
            ? [{ rotulo: "Link de pagamento", valor: LINKS_CARTAO[plano] }]
            : []),
        ],
      },
    ];

    const observacaoPagamento =
      pagamento === "Pix"
        ? "Pagamento via Pix Copia e Cola disponível na página da ficha."
        : pagamento?.startsWith("Cartão") && LINKS_CARTAO[plano]
          ? `Pague por cartão aqui: ${LINKS_CARTAO[plano]}`
          : "";

    const message = [
      "🏋️ NOVA FICHA DE ANAMNESE",
      "",
      ...secoes.flatMap((s) => [
        s.titulo === "Plano e pagamento" ? "💳 PLANO E PAGAMENTO" : s.titulo.toUpperCase(),
        ...s.itens.map((i) => `${i.rotulo}: ${i.valor}`),
        ...(s.titulo === "Plano e pagamento" && observacaoPagamento ? [observacaoPagamento] : []),
        "",
      ]),
      "Ficha preenchida pelo site. 💗",
    ].join("\n");

    const url = `https://wa.me/${TRAINER_WHATSAPP}?text=${encodeURIComponent(message)}`;
    setWhatsappUrl(url);

    // Gera a ficha como IMAGEM (PNG) bonitinha
    let blob: Blob | null = null;
    try {
      blob = await gerarImagemFicha(nome, secoes);
    } catch {
      blob = null;
    }

    if (blob) {
      const objectUrl = URL.createObjectURL(blob);
      setImagemUrl(objectUrl);

      const file = new File([blob], `ficha-anamnese-${nome.trim() || "cliente"}.png`, {
        type: "image/png",
      });

      // Compartilha a IMAGEM direto para o WhatsApp (celular)
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] }) &&
        navigator.share
      ) {
        try {
          await navigator.share({
            files: [file],
            text: `Ficha de anamnese — ${nome.trim() || "Cliente"}`,
          });
          setEnviado(true);
          return;
        } catch {
          // usuária cancelou ou não deu — segue para o WhatsApp com o texto
        }
      } else {
        // Computador: baixa a imagem para anexar na conversa que vai abrir
        const dl = document.createElement("a");
        dl.href = objectUrl;
        dl.download = file.name;
        document.body.appendChild(dl);
        dl.click();
        dl.remove();
      }
    }

    setEnviado(true);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };


  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <header className="px-5 pt-10 pb-6 text-center">
        <div className="mx-auto flex max-w-xl items-center justify-center gap-3">
          <Heart className="h-5 w-5 text-rosegold" fill="currentColor" />
          <h1
            className="font-display text-4xl font-semibold italic text-primary sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Juliana Truglia
          </h1>
          <Heart className="h-5 w-5 text-rosegold" fill="currentColor" />
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-foreground">
          Personal Trainer <span className="text-primary">Feminino</span>
        </p>
        <div className="divider-heart mx-auto mt-5 max-w-xs text-sm">
          <Heart className="h-4 w-4 shrink-0" fill="currentColor" />
        </div>
        <h2 className="mt-5 text-2xl font-bold uppercase tracking-[0.18em] text-primary sm:text-3xl">
          Ficha de Anamnese
        </h2>
        <p className="mt-2 font-display text-lg italic text-rosegold">
          "Mais força para a sua melhor versão!"
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-5 px-4">
        {/* 1. Dados Pessoais */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <User className="h-3.5 w-3.5" /> 1. Dados Pessoais
          </span>
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Nome completo *
              <input
                className="field-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                maxLength={100}
                autoComplete="name"
              />
            </label>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
                Data de nascimento *
                <input
                  type="date"
                  className="field-input"
                  value={nascimento}
                  onChange={(e) => handleNascimento(e.target.value)}
                  min={`${MIN_YEAR}-01-01`}
                  max={`${MAX_YEAR}-12-31`}
                />
              </label>
              <label className="flex w-24 shrink-0 flex-col gap-1.5 text-sm font-medium">
                Idade *
                <input
                  className="field-input"
                  value={idade}
                  onChange={(e) => handleIdade(e.target.value)}
                  inputMode="numeric"
                  placeholder="00"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Seu WhatsApp (com DDD) *
              <input
                className="field-input"
                value={whatsappCliente}
                onChange={(e) => setWhatsappCliente(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          </div>
        </section>

        {/* 2. Objetivo */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <Target className="h-3.5 w-3.5" /> 2. Objetivo
          </span>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">
              Qual o seu principal objetivo com o treino? *
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OBJETIVOS_OPCOES.map((opt) => {
                const checked = objetivos.includes(opt);
                return (
                  <label
                    key={opt}
                    className={[
                      "radio-card",
                      checked ? "border-primary bg-accent font-semibold text-accent-foreground" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      className="radio-dot"
                      checked={checked}
                      onChange={() => {
                        setObjetivos((prev) =>
                          prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
                        );
                      }}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </section>

        {/* 3. Atividade Física */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <Dumbbell className="h-3.5 w-3.5" /> 3. Atividade Física
          </span>
          <div className="mt-4 flex flex-col gap-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                Você treina musculação atualmente?
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {["Sim", "Não"].map((opt) => (
                  <label key={opt} className="radio-card">
                    <input
                      type="radio"
                      name="treina"
                      className="radio-dot"
                      checked={treinaAtualmente === opt}
                      onChange={() => setTreinaAtualmente(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
            {treinaAtualmente === "Não" && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Se não, há quanto tempo está parada?
                <input
                  className="field-input"
                  value={tempoParada}
                  onChange={(e) => setTempoParada(e.target.value)}
                  placeholder="Ex.: 6 meses, 2 anos..."
                  maxLength={100}
                />
              </label>
            )}
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Você já treinou anteriormente?</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {["Nunca treinei", "Já treinei antes"].map((opt) => (
                  <label key={opt} className="radio-card">
                    <input
                      type="radio"
                      name="jatreinou"
                      className="radio-dot"
                      checked={jaTreinou === opt}
                      onChange={() => setJaTreinou(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
            {jaTreinou === "Já treinei antes" && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Se já treinou, por quanto tempo?
                <input
                  className="field-input"
                  value={tempoTreinou}
                  onChange={(e) => setTempoTreinou(e.target.value)}
                  placeholder="Ex.: 1 ano, 3 anos..."
                  maxLength={100}
                />
              </label>
            )}
          </div>
        </section>

        {/* 4. Saúde */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <Heart className="h-3.5 w-3.5" /> 4. Saúde
          </span>
          <div className="mt-4 flex flex-col gap-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">
                Você tem algum problema de saúde que precise destacar?
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {["Sim", "Não"].map((opt) => (
                  <label key={opt} className="radio-card">
                    <input
                      type="radio"
                      name="saude"
                      className="radio-dot"
                      checked={problemaSaude === opt}
                      onChange={() => setProblemaSaude(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
            {problemaSaude === "Sim" && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Se sim, qual? *
                <textarea
                  className="field-input min-h-20 resize-y"
                  value={qualProblema}
                  onChange={(e) => setQualProblema(e.target.value)}
                  placeholder="Descreva o problema de saúde..."
                  maxLength={500}
                />
              </label>
            )}
          </div>
        </section>

        {/* 5. Filhos */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <Baby className="h-3.5 w-3.5" /> 5. Filhos
          </span>
          <div className="mt-4 flex flex-col gap-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Você tem filhos?</legend>
              <div className="grid grid-cols-2 gap-2">
                {["Sim", "Não"].map((opt) => (
                  <label key={opt} className="radio-card">
                    <input
                      type="radio"
                      name="filhos"
                      className="radio-dot"
                      checked={temFilhos === opt}
                      onChange={() => setTemFilhos(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
            {temFilhos === "Sim" && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Quantos? *
                <input
                  className="field-input w-28"
                  value={quantosFilhos}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setQuantosFilhos(d === "" ? "" : String(Math.min(Number(d), 20)));
                  }}
                  inputMode="numeric"
                  placeholder="0"
                />
              </label>
            )}
          </div>
        </section>

        {/* 6. Sono */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <MoonStar className="h-3.5 w-3.5" /> 6. Sono
          </span>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium">
              Como você avalia a qualidade do seu sono?
            </legend>
            <div className="flex flex-col gap-2">
              {["Durmo bem", "Durmo razoavelmente", "Tenho dificuldades para dormir"].map((opt) => (
                <label key={opt} className="radio-card">
                  <input
                    type="radio"
                    name="sono"
                    className="radio-dot"
                    checked={sono === opt}
                    onChange={() => setSono(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        {/* 7. Alimentação */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <Salad className="h-3.5 w-3.5" /> 7. Alimentação
          </span>
          <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">
            Como você descreveria sua alimentação atualmente?
            <textarea
              className="field-input min-h-24 resize-y"
              value={alimentacao}
              onChange={(e) => setAlimentacao(e.target.value)}
              placeholder="Ex.: como de 3 em 3 horas, pulo café da manhã..."
              maxLength={500}
            />
          </label>
        </section>

        {/* 8. Informações Adicionais */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <MessageCircleHeart className="h-3.5 w-3.5" /> 8. Informações Adicionais
          </span>
          <label className="mt-4 flex flex-col gap-1.5 text-sm font-medium">
            Há algo mais que você acha importante compartilhar?
            <textarea
              className="field-input min-h-24 resize-y"
              value={adicionais}
              onChange={(e) => setAdicionais(e.target.value)}
              placeholder="Qualquer informação relevante para o seu treino..."
              maxLength={1000}
            />
          </label>
        </section>

        {/* 9. Plano e Pagamento */}
        <section className="card-outline p-5">
          <span className="section-chip">
            <Heart className="h-3.5 w-3.5" /> 9. Plano e Pagamento
          </span>
          <Planos
            plano={plano}
            setPlano={setPlano}
            pagamento={pagamento}
            setPagamento={setPagamento}
          />
        </section>



        {errors.length > 0 && (
          <div className="card-outline border-destructive/60 p-4" role="alert">
            <p className="text-sm font-semibold text-destructive">
              Quase lá! Verifique os campos abaixo:
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-destructive/90">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-whatsapp px-6 py-4 text-lg font-bold uppercase tracking-wide text-whatsapp-foreground shadow-lg transition-transform active:scale-[0.98]"
        >
          <Send className="h-5 w-5" />
          Enviar ficha pelo WhatsApp
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Ao tocar no botão, o WhatsApp abre com a ficha pronta. Confira suas informações e clique
          em enviar no WhatsApp. Nenhum dado fica salvo neste site.
        </p>
        {imagemUrl && (
          <div className="card-outline flex flex-col items-center gap-3 p-4">
            <p className="text-center text-sm text-muted-foreground">
              Sua ficha em imagem está pronta 💗
            </p>
            <img
              src={imagemUrl}
              alt="Ficha de anamnese preenchida"
              className="w-full rounded-xl border border-border"
            />
            <a
              href={imagemUrl}
              download="ficha-anamnese.png"
              className="text-sm font-semibold text-primary underline underline-offset-4"
            >
              Baixar a imagem da ficha
            </a>
          </div>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-sm font-semibold text-primary underline underline-offset-4"
          >
            {enviado
              ? "Se o WhatsApp não abrir, toque aqui para enviar a ficha"
              : "Abrir o WhatsApp"}
          </a>
        )}

      </form>

      <footer className="mt-10 px-5 text-center">
        <div className="divider-heart mx-auto max-w-xs text-sm">
          <Heart className="h-4 w-4 shrink-0" fill="currentColor" />
        </div>
        <p className="mt-4 font-display text-xl italic text-primary">Juntas somos mais fortes</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
          @julianatruglia · (11) 94011-0447
        </p>
      </footer>
    </div>
  );
}
