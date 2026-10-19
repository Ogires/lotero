// Parser del histórico mensual de juegosonce.es (/historico-resultados-cupones-once).
// Cada sorteo es un bloque hijo de `.detresult` cuya clase indica el juego:
// ORD (Cupón Diario), VIE (Cuponazo), DOM (Sueldazo) o extra (Cupón Extra).
// La fecha viene sin año ("Martes 19 de marzo"): se usa el año consultado.

import { HTMLElement, parse } from "node-html-parser";
import { type Juego, numeroCincoCifras, type Premio } from "../../api/src/tipos";

const JUEGO_POR_CLASE: Record<string, Juego> = {
  ORD: "CUPON_DIARIO",
  VIE: "CUPONAZO",
  DOM: "SUELDAZO",
  extra: "CUPON_EXTRA",
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export interface ResultadoMes {
  premios: Premio[];
  /** Bloques que no se han podido interpretar; si hay, conviene revisar el formato. */
  avisos: string[];
}

export function extraerCsrf(html: string): string | null {
  return /name="csrf-param" value="([^"]+)"/.exec(html)?.[1] ?? null;
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

export function parsearMesOnce(html: string, anio: number, mes: number): ResultadoMes {
  const contenedor = parse(html).querySelector(".detresult");
  if (!contenedor) return { premios: [], avisos: ["La página no contiene el bloque .detresult"] };

  const premios: Premio[] = [];
  const avisos: string[] = [];

  for (const bloque of contenedor.childNodes) {
    if (!(bloque instanceof HTMLElement) || bloque.tagName !== "DIV") continue;
    const clase = bloque.classList.value.find((c) => c in JUEGO_POR_CLASE);
    const titulo = bloque.querySelector('[role="heading"]')?.text.trim() ?? "";
    const juego = clase ? JUEGO_POR_CLASE[clase] : undefined;
    if (!juego) {
      avisos.push(`Juego desconocido: clase "${bloque.classList.toString()}" (${titulo})`);
      continue;
    }

    const textoFecha =
      bloque.querySelectorAll("p").find((p) => !p.hasAttribute("role"))?.text ?? "";
    const [, dia, nombreMes = ""] = /(\d{1,2})\s+de\s+(\p{L}+)/u.exec(textoFecha) ?? [];
    const mesBloque = MESES.indexOf(nombreMes.toLowerCase()) + 1;
    if (!dia || mesBloque !== mes) {
      avisos.push(`Fecha no válida o de otro mes: "${textoFecha.trim()}" (${titulo})`);
      continue;
    }

    const textoNumero = bloque.querySelector(".num")?.text ?? "";
    const numero = numeroCincoCifras(textoNumero);
    if (!numero) {
      avisos.push(`Número no válido: "${textoNumero.trim()}" (${titulo}, ${textoFecha.trim()})`);
      continue;
    }

    premios.push({
      organismo: "ONCE",
      juego,
      fecha: `${anio}-${dosDigitos(mes)}-${dosDigitos(Number(dia))}`,
      numero,
      serie: bloque.querySelector(".sequence")?.text.trim() ?? "",
      tipo: "PRINCIPAL",
      sorteo: juego === "CUPON_EXTRA" ? titulo : null,
      fuente: "once-historico",
    });
  }

  return { premios, avisos };
}
