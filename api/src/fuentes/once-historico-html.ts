// Lectura del histórico mensual de la ONCE en el Worker con HTMLRewriter: procesa la página
// en streaming en código nativo, así que cabe en el límite de CPU del plan gratuito.

import { type BloqueHistorico, premiosDeBloques, type ResultadoMes } from "./once-historico";

const BLOQUE = ".detresult > div";

type CampoTexto = "titulo" | "textoFecha" | "textoNumero" | "serie";

export async function parsearMesOnce(
  html: string,
  anio: number,
  mes: number,
): Promise<ResultadoMes> {
  let hayContenedor = false;
  const bloques: BloqueHistorico[] = [];

  const acumular = (campo: CampoTexto): HTMLRewriterElementContentHandlers => ({
    text(trozo) {
      const bloque = bloques.at(-1);
      if (bloque) bloque[campo] += trozo.text;
    },
  });

  await new HTMLRewriter()
    .on(".detresult", {
      element() {
        hayContenedor = true;
      },
    })
    .on(BLOQUE, {
      element(elemento) {
        const clases = (elemento.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
        bloques.push({ clases, titulo: "", textoFecha: "", textoNumero: "", serie: "" });
      },
    })
    .on(`${BLOQUE} [role="heading"]`, acumular("titulo"))
    .on(`${BLOQUE} p:not([role])`, acumular("textoFecha"))
    .on(`${BLOQUE} .num`, acumular("textoNumero"))
    .on(`${BLOQUE} .sequence`, acumular("serie"))
    .transform(new Response(html))
    .arrayBuffer();

  return premiosDeBloques(hayContenedor ? bloques : null, anio, mes);
}
