// Adaptador de la API de Loterías y Apuestas del Estado (SELAE) para la Lotería Nacional.
// La API está detrás de Akamai: sin cabeceras de navegador responde 403. En particular exige
// `Accept-Encoding`, que Node añade solo pero el `fetch` de Workers no.
// Cuando no hay sorteos devuelve un texto en lugar de una lista.

import { type Juego, numeroCincoCifras, type Premio, type TipoPremio } from "../tipos";

const URL_BUSCADOR = "https://www.loteriasyapuestas.es/servicios/buscadorSorteos";

export const CABECERAS_LNAC: Readonly<Record<string, string>> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "es-ES,es;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  Referer: "https://www.loteriasyapuestas.es/es/resultados/loteria-nacional",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Dest": "empty",
};

/** URL del buscador para un rango de fechas ISO (ambas incluidas). */
export function urlBuscadorLnac(desde: string, hasta: string): string {
  const params = new URLSearchParams({
    game_id: "LNAC",
    celebrados: "true",
    fechaInicioInclusiva: desde.replaceAll("-", ""),
    fechaFinInclusiva: hasta.replaceAll("-", ""),
  });
  return `${URL_BUSCADOR}?${params}`;
}

/** Colapsa espacios y saltos de línea; `null` si no queda texto. */
export function normalizarNombreSorteo(nombre: unknown): string | null {
  if (typeof nombre !== "string") return null;
  const limpio = nombre.replace(/\s+/g, " ").trim();
  return limpio === "" ? null : limpio;
}

function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

// El código `tipoSorteo` no es fiable (hay sorteos "del jueves" con tipo U),
// así que se clasifica por el nombre y solo se usa el código si no hay nombre.
function juegoDelSorteo(nombre: string | null, tipoSorteo: unknown): Juego {
  if (nombre) {
    const clave = sinAcentos(nombre).toUpperCase();
    if (clave.includes("JUEVES")) return "LN_JUEVES";
    if (clave === "SORTEO DE LOTERIA NACIONAL") return "LN_SABADO";
    return "LN_EXTRAORDINARIO";
  }
  if (tipoSorteo === "J") return "LN_JUEVES";
  if (tipoSorteo === "X") return "LN_SABADO";
  return "LN_EXTRAORDINARIO";
}

type Objeto = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === "object" && valor !== null;
}

function decimos(valor: unknown): string[] {
  const lista = Array.isArray(valor) ? valor : [valor];
  return lista.flatMap((premio) =>
    esObjeto(premio) && typeof premio.decimo === "string" ? [premio.decimo] : [],
  );
}

const CAMPOS_PREMIO: ReadonlyArray<[campo: string, tipo: TipoPremio]> = [
  ["primerPremio", "PRINCIPAL"],
  ["segundoPremio", "SEGUNDO"],
  ["tercerosPremios", "TERCERO"],
  ["cuartosPremios", "CUARTO"],
  ["quintosPremios", "QUINTO"],
  ["extraccionesDeCincoCifras", "MENOR"],
];

/**
 * Convierte la respuesta del buscador en premios de cinco cifras.
 * El premio especial no se guarda: es el mismo número que el 1er premio.
 */
export function parsearSorteosLnac(respuesta: unknown): Premio[] {
  if (!Array.isArray(respuesta)) return [];
  const premios: Premio[] = [];

  for (const sorteo of respuesta) {
    if (!esObjeto(sorteo) || typeof sorteo.fecha_sorteo !== "string") continue;
    const fecha = /^\d{4}-\d{2}-\d{2}/.exec(sorteo.fecha_sorteo)?.[0];
    if (!fecha) continue;

    const nombre = normalizarNombreSorteo(sorteo.nombre);
    const juego = juegoDelSorteo(nombre, sorteo.tipoSorteo);
    const comun = {
      organismo: "LNAC",
      juego,
      fecha,
      serie: "",
      sorteo: juego === "LN_EXTRAORDINARIO" ? nombre : null,
      fuente: "lnac-api",
    } as const;

    // La API repite cada extracción de cinco cifras: se descartan los duplicados del sorteo.
    const vistos = new Set<string>();
    for (const [campo, tipo] of CAMPOS_PREMIO) {
      for (const decimo of decimos(sorteo[campo])) {
        const numero = numeroCincoCifras(decimo);
        if (!numero || vistos.has(`${tipo}:${numero}`)) continue;
        vistos.add(`${tipo}:${numero}`);
        premios.push({ ...comun, numero, tipo });
      }
    }
  }

  return premios;
}
