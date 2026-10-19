// Tareas de la actualización diaria: cada una recoge los premios recientes de una fuente.
// Se ejecutan en GitHub Actions (SELAE bloquea las peticiones que salen de Cloudflare).

import { CABECERAS_LNAC, parsearSorteosLnac, urlBuscadorLnac } from "../../api/src/fuentes/lnac";
import { parsearFeedOnce, URL_FEED_ONCE } from "../../api/src/fuentes/once-feed";
import { formularioMes, URL_HISTORICO_ONCE } from "../../api/src/fuentes/once-historico";
import { type Pedir, textoOk, USER_AGENT_BOT } from "../../api/src/fuentes/red";
import type { Premio } from "../../api/src/tipos";
import { extraerCsrf, parsearMesOnce } from "./once-historico";

/** Días hacia atrás que se consultan en SELAE para recuperar sorteos perdidos. */
const DIAS_LNAC = 10;
/** Hasta este día del mes también se relee el mes anterior (últimos sorteos del mes). */
const DIA_RELEER_MES_ANTERIOR = 3;

export type NombreTarea = "once-feed" | "once-historico" | "lnac";

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

export interface Recogida {
  premios: Premio[];
  /** Problemas que no impiden guardar lo recogido (p. ej. un bloque con formato raro). */
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

/** Sesión del histórico: el formulario exige el token CSRF y las cookies de la página. */
async function abrirSesionHistorico(pedir: Pedir): Promise<{ cabeceras: Headers; csrf: string }> {
  const cabeceras = new Headers({ "User-Agent": USER_AGENT_BOT });
  const portada = await pedir(URL_HISTORICO_ONCE, { headers: cabeceras });
  const cookies = portada.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
  const csrf = extraerCsrf(await textoOk(portada, URL_HISTORICO_ONCE));
  if (!csrf) throw new Error("No se encuentra el token CSRF en la página del histórico");
  if (cookies) cabeceras.set("Cookie", cookies);
  cabeceras.set("Referer", URL_HISTORICO_ONCE);
  return { cabeceras, csrf };
}

/** Relee el histórico del mes en curso (y del anterior a principios de mes) para cubrir huecos. */
async function onceHistorico(pedir: Pedir, hoy: FechaMadrid): Promise<Recogida> {
  const meses: Array<[anio: number, mes: number]> = [];
  if (hoy.dia <= DIA_RELEER_MES_ANTERIOR) {
    meses.push(hoy.mes === 1 ? [hoy.anio - 1, 12] : [hoy.anio, hoy.mes - 1]);
  }
  meses.push([hoy.anio, hoy.mes]);

  const recogida: Recogida = { premios: [], avisos: [] };
  for (const [anio, mes] of meses) {
    // Si la web devuelve otra página (sesión caducada, límite de peticiones), se reintenta
    // una vez con sesión nueva.
    let resultado = await descargarMes(pedir, anio, mes);
    if (resultado.avisos.some((a) => a.includes(".detresult"))) {
      resultado = await descargarMes(pedir, anio, mes);
    }
    recogida.premios.push(...resultado.premios);
    recogida.avisos.push(
      ...resultado.avisos.map((a) => `${anio}-${String(mes).padStart(2, "0")}: ${a}`),
    );
  }
  return recogida;
}

async function descargarMes(pedir: Pedir, anio: number, mes: number): Promise<Recogida> {
  const { cabeceras, csrf } = await abrirSesionHistorico(pedir);
  const html = await textoOk(
    await pedir(URL_HISTORICO_ONCE, {
      method: "POST",
      headers: cabeceras,
      body: formularioMes(anio, mes, csrf),
    }),
    URL_HISTORICO_ONCE,
  );
  return parsearMesOnce(html, anio, mes);
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

export const TAREAS: ReadonlyArray<[nombre: NombreTarea, tarea: Tarea]> = [
  ["once-feed", onceFeed],
  ["once-historico", onceHistorico],
  ["lnac", lnac],
];
