// Interpretación del histórico mensual de juegosonce.es (/historico-resultados-cupones-once).
// Cada sorteo es un bloque hijo de `.detresult` cuya clase indica el juego:
// ORD (Cupón Diario), VIE (Cuponazo), DOM (Sueldazo) o extra (Cupón Extra).
// La fecha viene sin año ("Martes 19 de marzo"): se usa el año consultado.
// La lectura del HTML depende del entorno (HTMLRewriter en el Worker, node-html-parser en
// los scripts); aquí solo está la parte común, sin dependencias del runtime.

import { type Juego, numeroCincoCifras, type Premio } from "../tipos";

export const URL_HISTORICO_ONCE = "https://www.juegosonce.es/historico-resultados-cupones-once";

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

/** Textos en bruto de un bloque de sorteo, tal como aparecen en la página. */
export interface BloqueHistorico {
  clases: string[];
  titulo: string;
  textoFecha: string;
  textoNumero: string;
  serie: string;
}

export interface ResultadoMes {
  premios: Premio[];
  /** Bloques que no se han podido interpretar; si hay, conviene revisar el formato. */
  avisos: string[];
}

export function extraerCsrf(html: string): string | null {
  return /name="csrf-param" value="([^"]+)"/.exec(html)?.[1] ?? null;
}

/** Cuerpo del formulario del histórico para un mes. */
export function formularioMes(anio: number, mes: number, csrf: string): URLSearchParams {
  return new URLSearchParams({ mes: dosDigitos(mes), anio: String(anio), "csrf-param": csrf });
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Convierte los bloques de un mes en premios; `null` indica que no había `.detresult`. */
export function premiosDeBloques(
  bloques: readonly BloqueHistorico[] | null,
  anio: number,
  mes: number,
): ResultadoMes {
  if (!bloques) return { premios: [], avisos: ["La página no contiene el bloque .detresult"] };

  const premios: Premio[] = [];
  const avisos: string[] = [];

  for (const bloque of bloques) {
    const clase = bloque.clases.find((c) => c in JUEGO_POR_CLASE);
    const titulo = bloque.titulo.trim();
    const juego = clase ? JUEGO_POR_CLASE[clase] : undefined;
    if (!juego) {
      avisos.push(`Juego desconocido: clase "${bloque.clases.join(" ")}" (${titulo})`);
      continue;
    }

    const textoFecha = bloque.textoFecha.trim();
    const [, dia, nombreMes = ""] = /(\d{1,2})\s+de\s+(\p{L}+)/u.exec(textoFecha) ?? [];
    const mesBloque = MESES.indexOf(nombreMes.toLowerCase()) + 1;
    if (!dia || mesBloque !== mes) {
      avisos.push(`Fecha no válida o de otro mes: "${textoFecha}" (${titulo})`);
      continue;
    }

    const numero = numeroCincoCifras(bloque.textoNumero);
    if (!numero) {
      avisos.push(`Número no válido: "${bloque.textoNumero.trim()}" (${titulo}, ${textoFecha})`);
      continue;
    }

    premios.push({
      organismo: "ONCE",
      juego,
      fecha: `${anio}-${dosDigitos(mes)}-${dosDigitos(Number(dia))}`,
      numero,
      serie: bloque.serie.trim(),
      tipo: "PRINCIPAL",
      sorteo: juego === "CUPON_EXTRA" ? titulo : null,
      fuente: "once-historico",
    });
  }

  return { premios, avisos };
}
