// Actualización periódica de premios. Tres tareas independientes: el fallo de una
// (p. ej. un 403 de Akamai en SELAE) no impide las demás y queda registrado en `ejecuciones`.

import { insertarPremios, registrarEjecucion } from "./db";
import { CABECERAS_LNAC, parsearSorteosLnac, urlBuscadorLnac } from "./fuentes/lnac";
import { parsearFeedOnce, URL_FEED_ONCE } from "./fuentes/once-feed";
import { extraerCsrf, formularioMes, URL_HISTORICO_ONCE } from "./fuentes/once-historico";
import { parsearMesOnce } from "./fuentes/once-historico-html";
import { type Pedir, textoOk, USER_AGENT_BOT } from "./fuentes/red";
import type { Premio } from "./tipos";

/** Días hacia atrás que se consultan en SELAE para recuperar sorteos perdidos. */
const DIAS_LNAC = 10;
/** Hasta este día del mes también se relee el mes anterior (últimos sorteos del mes). */
const DIA_RELEER_MES_ANTERIOR = 3;

export interface FechaMadrid {
  anio: number;
  mes: number;
  dia: number;
  /** aaaa-mm-dd */
  iso: string;
}

/** Fecha civil en España: los sorteos se fechan en hora peninsular, no en UTC. */
export function fechaMadrid(instante: Date): FechaMadrid {
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(instante);
  const [anio = 0, mes = 0, dia = 0] = iso.split("-").map(Number);
  return { anio, mes, dia, iso };
}

function restarDias(fecha: FechaMadrid, dias: number): string {
  const instante = new Date(`${fecha.iso}T12:00:00Z`);
  instante.setUTCDate(instante.getUTCDate() - dias);
  return instante.toISOString().slice(0, 10);
}

interface Recogida {
  premios: Premio[];
  avisos: string[];
}

type Tarea = (pedir: Pedir, hoy: FechaMadrid) => Promise<Recogida>;

async function onceFeed(pedir: Pedir): Promise<Recogida> {
  const xml = await textoOk(
    await pedir(URL_FEED_ONCE, { headers: { "User-Agent": USER_AGENT_BOT } }),
    URL_FEED_ONCE,
  );
  const premios = parsearFeedOnce(xml);
  if (premios.length === 0)
    throw new Error("El feed no contiene sorteos: ¿ha cambiado el formato?");
  return { premios, avisos: [] };
}

/** Relee el histórico del mes en curso (y del anterior a principios de mes) para cubrir huecos. */
async function onceHistorico(pedir: Pedir, hoy: FechaMadrid): Promise<Recogida> {
  const meses: Array<[anio: number, mes: number]> = [];
  if (hoy.dia <= DIA_RELEER_MES_ANTERIOR) {
    meses.push(hoy.mes === 1 ? [hoy.anio - 1, 12] : [hoy.anio, hoy.mes - 1]);
  }
  meses.push([hoy.anio, hoy.mes]);

  // El formulario exige el token CSRF y las cookies de sesión de la página.
  const cabeceras = new Headers({ "User-Agent": USER_AGENT_BOT });
  const portada = await pedir(URL_HISTORICO_ONCE, { headers: cabeceras });
  const cookies = portada.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  let csrf = extraerCsrf(await textoOk(portada, URL_HISTORICO_ONCE));
  if (!csrf) throw new Error("No se encuentra el token CSRF en la página del histórico");
  if (cookies) cabeceras.set("Cookie", cookies);
  cabeceras.set("Referer", URL_HISTORICO_ONCE);

  const recogida: Recogida = { premios: [], avisos: [] };
  for (const [anio, mes] of meses) {
    const html = await textoOk(
      await pedir(URL_HISTORICO_ONCE, {
        method: "POST",
        headers: cabeceras,
        body: formularioMes(anio, mes, csrf),
      }),
      URL_HISTORICO_ONCE,
    );
    csrf = extraerCsrf(html) ?? csrf;
    const { premios, avisos } = await parsearMesOnce(html, anio, mes);
    recogida.premios.push(...premios);
    recogida.avisos.push(...avisos.map((a) => `${anio}-${String(mes).padStart(2, "0")}: ${a}`));
  }
  return recogida;
}

async function lnac(pedir: Pedir, hoy: FechaMadrid): Promise<Recogida> {
  const url = urlBuscadorLnac(restarDias(hoy, DIAS_LNAC), hoy.iso);
  const texto = await textoOk(await pedir(url, { headers: CABECERAS_LNAC }), url);
  // Sin sorteos en el rango la API responde con un texto en lugar de JSON.
  let respuesta: unknown = texto;
  try {
    respuesta = JSON.parse(texto);
  } catch {}
  return { premios: parsearSorteosLnac(respuesta), avisos: [] };
}

const TAREAS: ReadonlyArray<[nombre: string, tarea: Tarea]> = [
  ["once-feed", onceFeed],
  ["once-historico", onceHistorico],
  ["lnac", lnac],
];

export interface ResultadoTarea {
  tarea: string;
  filasNuevas: number | null;
  error: string | null;
}

export async function actualizar(
  db: D1Database,
  ahora: Date,
  pedir: Pedir = fetch,
): Promise<ResultadoTarea[]> {
  const hoy = fechaMadrid(ahora);
  const resultados: ResultadoTarea[] = [];

  for (const [nombre, tarea] of TAREAS) {
    const inicio = new Date().toISOString();
    let resultado: ResultadoTarea;
    try {
      const { premios, avisos } = await tarea(pedir, hoy);
      const filasNuevas = await insertarPremios(db, premios);
      resultado = { tarea: nombre, filasNuevas, error: avisos.length ? avisos.join("\n") : null };
    } catch (e) {
      resultado = { tarea: nombre, filasNuevas: null, error: (e as Error).message };
    }
    await registrarEjecucion(db, { ...resultado, inicio, fin: new Date().toISOString() });
    resultados.push(resultado);
  }

  return resultados;
}
