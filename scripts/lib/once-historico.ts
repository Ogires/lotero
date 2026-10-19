// Lectura del histórico mensual de juegosonce.es en Node con node-html-parser.
// La interpretación de cada bloque se comparte con el Worker (api/src/fuentes/once-historico).

import { HTMLElement, parse } from "node-html-parser";
import {
  type BloqueHistorico,
  premiosDeBloques,
  type ResultadoMes,
} from "../../api/src/fuentes/once-historico";

export { extraerCsrf, type ResultadoMes } from "../../api/src/fuentes/once-historico";

function leerBloques(html: string): BloqueHistorico[] | null {
  const contenedor = parse(html).querySelector(".detresult");
  if (!contenedor) return null;

  return contenedor.childNodes
    .filter((nodo): nodo is HTMLElement => nodo instanceof HTMLElement && nodo.tagName === "DIV")
    .map((bloque) => ({
      clases: bloque.classList.value,
      titulo: bloque.querySelector('[role="heading"]')?.text ?? "",
      textoFecha: bloque.querySelectorAll("p").find((p) => !p.hasAttribute("role"))?.text ?? "",
      textoNumero: bloque.querySelector(".num")?.text ?? "",
      serie: bloque.querySelector(".sequence")?.text ?? "",
    }));
}

export function parsearMesOnce(html: string, anio: number, mes: number): ResultadoMes {
  return premiosDeBloques(leerBloques(html), anio, mes);
}
