// Endpoint de administración: recibe los premios que recoge el workflow de GitHub
// (las fuentes bloquean a Cloudflare) y los guarda junto con el registro de la ejecución.

import { insertarPremios, registrarEjecucion } from "./db";
import { error, json } from "./http";
import {
  type CargaIngesta,
  type NOMBRE_JUEGO,
  NOMBRE_TIPO,
  numeroCincoCifras,
  type Premio,
  type RespuestaIngesta,
  TAREAS_INGESTA,
} from "./tipos";

const MAX_PREMIOS = 2000;
const ORGANISMO_POR_JUEGO: Record<string, string> = {
  CUPON_DIARIO: "ONCE",
  CUPONAZO: "ONCE",
  SUELDAZO: "ONCE",
  CUPON_EXTRA: "ONCE",
  LN_JUEVES: "LNAC",
  LN_SABADO: "LNAC",
  LN_EXTRAORDINARIO: "LNAC",
} satisfies Record<keyof typeof NOMBRE_JUEGO, string>;
const FUENTES = new Set(["once-historico", "once-feed", "lnac-api"]);

type Objeto = Record<string, unknown>;

function esObjeto(valor: unknown): valor is Objeto {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esFechaIso(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function validarPremio(p: unknown): Premio | null {
  if (!esObjeto(p)) return null;
  const { organismo, juego, fecha, numero, serie, tipo, sorteo, fuente } = p;
  if (typeof juego !== "string" || !Object.hasOwn(ORGANISMO_POR_JUEGO, juego)) return null;
  if (ORGANISMO_POR_JUEGO[juego] !== organismo) return null;
  if (typeof tipo !== "string" || !Object.hasOwn(NOMBRE_TIPO, tipo)) return null;
  if (!esFechaIso(fecha) || typeof numero !== "string" || numeroCincoCifras(numero) !== numero) {
    return null;
  }
  if (typeof serie !== "string" || !/^\d{0,3}$/.test(serie)) return null;
  if (sorteo !== null && (typeof sorteo !== "string" || sorteo.length > 200)) return null;
  if (typeof fuente !== "string" || !FUENTES.has(fuente)) return null;
  return p as unknown as Premio;
}

/** Valida el cuerpo completo; devuelve un mensaje de error si no es válido. */
export function validarCarga(cuerpo: unknown): CargaIngesta | string {
  if (!esObjeto(cuerpo)) return "El cuerpo debe ser un objeto JSON.";
  const { tarea, inicio, premios, error: errorTarea } = cuerpo;
  if (!TAREAS_INGESTA.includes(tarea as CargaIngesta["tarea"])) return "Tarea desconocida.";
  if (typeof inicio !== "string" || Number.isNaN(Date.parse(inicio))) return "Inicio no válido.";
  if (errorTarea !== null && typeof errorTarea !== "string") return "Error no válido.";
  if (!Array.isArray(premios) || premios.length > MAX_PREMIOS) return "Lista de premios no válida.";
  const indice = premios.findIndex((p) => validarPremio(p) === null);
  if (indice >= 0) return `Premio ${indice} no válido.`;
  return cuerpo as unknown as CargaIngesta;
}

async function resumen(texto: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
}

/** Compara el token en tiempo constante (sobre sus hashes, para igualar longitudes). */
export async function autorizado(request: Request, token: string | undefined): Promise<boolean> {
  const cabecera = request.headers.get("Authorization") ?? "";
  if (!token || !cabecera.startsWith("Bearer ")) return false;
  const [recibido, esperado] = await Promise.all([resumen(cabecera.slice(7)), resumen(token)]);
  return crypto.subtle.timingSafeEqual(recibido, esperado);
}

export async function ingesta(request: Request, env: Env): Promise<Response> {
  if (!(await autorizado(request, env.ADMIN_TOKEN))) {
    return error(401, "no_autorizado", "Token de administración no válido.");
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return error(400, "carga_invalida", "El cuerpo no es JSON válido.");
  }
  const carga = validarCarga(cuerpo);
  if (typeof carga === "string") return error(400, "carga_invalida", carga);

  const filasNuevas = await insertarPremios(env.DB, carga.premios);
  await registrarEjecucion(env.DB, {
    tarea: carga.tarea,
    inicio: carga.inicio,
    fin: new Date().toISOString(),
    // Si la recogida falló del todo no hay filas que contar.
    filasNuevas: carga.error !== null && carga.premios.length === 0 ? null : filasNuevas,
    error: carga.error,
  });
  return json({ filasNuevas } satisfies RespuestaIngesta);
}
