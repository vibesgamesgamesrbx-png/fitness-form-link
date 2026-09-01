import { salvarFichaAnamnese } from "@/lib/fichas.functions";

export type FichaSecao = {
  titulo: string;
  itens: { rotulo: string; valor: string }[];
};

const W = 1080;
const PAD = 64;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Desenha a ficha preenchida como PNG e salva uma cópia segura no banco para o painel da Juliana. */
export async function gerarImagemFicha(
  nome: string,
  secoes: FichaSecao[],
): Promise<Blob | null> {
  try {
    const whatsapp = secoes
      .flatMap((s) => s.itens)
      .find((i) => i.rotulo === "WhatsApp")?.valor ?? "";
    if (nome.trim() && whatsapp.replace(/\D/g, "").length >= 10) {
      const salvo = await salvarFichaAnamnese({
        data: { nome: nome.trim(), whatsapp, secoes },
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("juliana_ficha_id", salvo.id);
      }
    }
  } catch (error) {
    console.error("[ficha] não foi possível salvar no painel:", error);
  }

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return null;

  const labelFont = "600 26px Georgia, 'Times New Roman', serif";
  const valueFont = "30px Georgia, 'Times New Roman', serif";
  const contentWidth = W - PAD * 2 - 48;

  let h = 300;
  const layout = secoes.map((secao) => {
    let alturaSecao = 92;
    const itens = secao.itens.map((item) => {
      measure.font = labelFont;
      const rotulo = item.rotulo;
      measure.font = valueFont;
      const linhas = wrap(measure, item.valor || "Não informado", contentWidth);
      const altura = 36 + linhas.length * 40 + 20;
      alturaSecao += altura;
      return { rotulo, linhas, altura };
    });
    alturaSecao += 24;
    h += alturaSecao;
    return { titulo: secao.titulo, itens, alturaSecao };
  });
  h += 190;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#fffafc";
  ctx.fillRect(0, 0, W, h);

  const grad = ctx.createLinearGradient(0, 0, W, 240);
  grad.addColorStop(0, "#d6336c");
  grad.addColorStop(1, "#f06595");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 240);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 54px Georgia, 'Times New Roman', serif";
  ctx.fillText("Ficha de Anamnese", W / 2, 100);
  ctx.font = "24px Georgia, serif";
  ctx.fillText("JULIANA TRUGLIA · PERSONAL TRAINER", W / 2, 146);
  ctx.font = "600 34px Georgia, serif";
  ctx.fillText(nome || "Cliente", W / 2, 202);

  ctx.textAlign = "left";
  let y = 300;

  for (const secao of layout) {
    ctx.fillStyle = "#fce4ec";
    ctx.beginPath();
    ctx.roundRect(PAD, y - 44, W - PAD * 2, 62, 16);
    ctx.fill();
    ctx.fillStyle = "#b02a5b";
    ctx.font = "600 30px Georgia, serif";
    ctx.fillText(secao.titulo.toUpperCase(), PAD + 24, y - 2);
    y += 48;

    for (const item of secao.itens) {
      ctx.fillStyle = "#c9748f";
      ctx.font = labelFont;
      ctx.fillText(item.rotulo, PAD + 24, y);
      y += 36;
      ctx.fillStyle = "#3d2733";
      ctx.font = valueFont;
      for (const linha of item.linhas) {
        ctx.fillText(linha, PAD + 24, y);
        y += 40;
      }
      ctx.strokeStyle = "#f3cdd9";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(PAD + 24, y - 12);
      ctx.lineTo(W - PAD - 24, y - 12);
      ctx.stroke();
      ctx.setLineDash([]);
      y += 20;
    }
    y += 24;
  }

  ctx.fillStyle = "#fce4ec";
  ctx.fillRect(0, h - 130, W, 130);
  ctx.textAlign = "center";
  ctx.fillStyle = "#b02a5b";
  ctx.font = "italic 34px Georgia, serif";
  ctx.fillText("Juntas somos mais fortes", W / 2, h - 74);
  ctx.font = "22px Georgia, serif";
  ctx.fillStyle = "#a86b81";
  ctx.fillText("@julianatruglia · (11) 94011-0447", W / 2, h - 36);

  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/png"),
  );
}
