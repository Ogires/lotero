// Adaptador del feed XML de juegosonce.es con los últimos resultados.
// Formato: <item><tipo/><fecha>Jueves, 15/10/2026</fecha><numero/><serie/><adic/></item>
// <adic> trae los números adicionales como "NNNNNSSS" (número + serie) separados por guiones.

import {
  decodificarEntidades,
  fechaIsoDesdeDmy,
  type Juego,
  numeroCincoCifras,
  type Premio,
} from "../tipos";

export const URL_FEED_ONCE = "https://www.juegosonce.es/rss/sorteos2.xml";

const JUEGO_POR_PRODUCTO: Record<string, Juego> = {
  "cupón diario": "CUPON_DIARIO",
  cuponazo: "CUPONAZO",
  "sueldazo fin de semana": "SUELDAZO",
};

function campo(item: string, etiqueta: string): string {
  const coincidencia = new RegExp(`<${etiqueta}>([\\s\\S]*?)</${etiqueta}>`).exec(item);
  const crudo = coincidencia?.[1] ?? "";
  const sinCdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(crudo)?.[1] ?? crudo;
  return decodificarEntidades(sinCdata).trim();
}

function adicionales(texto: string): Array<{ numero: string; serie: string }> {
  return texto
    .split("-")
    .map((parte) => /^(\d{5})(\d{3})$/.exec(parte.trim()))
    .filter((c): c is RegExpExecArray => c !== null)
    .map(([, numero = "", serie = ""]) => ({ numero, serie }));
}

/** Convierte el feed en premios de los cupones de la ONCE; ignora el resto de productos. */
export function parsearFeedOnce(xml: string): Premio[] {
  const premios: Premio[] = [];

  for (const [, item = ""] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const juego = JUEGO_POR_PRODUCTO[campo(item, "tipo").toLowerCase()];
    const fecha = fechaIsoDesdeDmy(campo(item, "fecha"));
    const numero = numeroCincoCifras(campo(item, "numero"));
    if (!juego || !fecha || !numero) continue;

    const comun = { organismo: "ONCE", juego, fecha, sorteo: null, fuente: "once-feed" } as const;
    premios.push({ ...comun, numero, serie: campo(item, "serie"), tipo: "PRINCIPAL" });
    for (const adicional of adicionales(campo(item, "adic"))) {
      premios.push({ ...comun, ...adicional, tipo: "ADICIONAL" });
    }
  }

  return premios;
}
