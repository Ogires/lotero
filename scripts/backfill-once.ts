// Descarga el histórico mensual de cupones de juegosonce.es y genera SQL para D1.
// Uso: npm run backfill:once -w scripts -- [--desde 1996-01] [--hasta AAAA-MM] [--sin-cache]

import { parseArgs } from "node:util";
import { formularioMes, URL_HISTORICO_ONCE } from "../api/src/fuentes/once-historico";
import type { Premio } from "../api/src/tipos";
import { extraerCsrf, parsearMesOnce } from "./lib/once-historico";
import { conCache, esperar, guardarSalida, SesionHttp, USER_AGENT_BOT } from "./lib/red";
import { resumenPorAnio } from "./lib/resumen";
import { sqlInsertarPremios } from "./lib/sql";

const URL_HISTORICO = URL_HISTORICO_ONCE;
const PAUSA_MS = 1500;

const hoy = new Date();
const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
const { values: opciones } = parseArgs({
  options: {
    desde: { type: "string", default: "1996-01" },
    hasta: { type: "string", default: mesActual },
    "sin-cache": { type: "boolean", default: false },
  },
});

function* meses(desde: string, hasta: string): Generator<[anio: number, mes: number]> {
  let [anio, mes] = desde.split("-").map(Number) as [number, number];
  const [anioFin, mesFin] = hasta.split("-").map(Number) as [number, number];
  while (anio < anioFin || (anio === anioFin && mes <= mesFin)) {
    yield [anio, mes];
    mes = mes === 12 ? 1 : mes + 1;
    if (mes === 1) anio++;
  }
}

const sesion = new SesionHttp({ "User-Agent": USER_AGENT_BOT });
let csrf: string | null = null;

async function nuevaSesion(): Promise<void> {
  csrf = extraerCsrf(await sesion.texto(URL_HISTORICO));
  if (!csrf) throw new Error("No se encuentra el token CSRF en la página del histórico");
  await esperar(PAUSA_MS);
}

async function descargarMes(anio: number, mes: number): Promise<string> {
  if (!csrf) await nuevaSesion();
  const html = await sesion.texto(URL_HISTORICO, {
    method: "POST",
    body: formularioMes(anio, mes, csrf ?? ""),
    headers: { Referer: URL_HISTORICO, "Content-Type": "application/x-www-form-urlencoded" },
  });
  csrf = extraerCsrf(html) ?? csrf;
  await esperar(PAUSA_MS);
  return html;
}

const premios: Premio[] = [];
const avisos: string[] = [];

for (const [anio, mes] of meses(opciones.desde, opciones.hasta)) {
  const clave = `${anio}-${String(mes).padStart(2, "0")}`;
  const cachear = !opciones["sin-cache"] && clave !== mesActual;
  let { contenido, deRed } = await conCache(`once/${clave}.html`, cachear, () =>
    descargarMes(anio, mes),
  );
  let resultado = parsearMesOnce(contenido, anio, mes);

  // Si la sesión ha caducado la web devuelve otra página: se reintenta una vez con sesión nueva.
  if (resultado.avisos.some((a) => a.includes(".detresult"))) {
    console.warn(`  ! ${clave}: respuesta inesperada, renovando sesión`);
    await nuevaSesion();
    ({ contenido, deRed } = await conCache(`once/${clave}.html`, false, () =>
      descargarMes(anio, mes),
    ));
    resultado = parsearMesOnce(contenido, anio, mes);
  }

  premios.push(...resultado.premios);
  avisos.push(...resultado.avisos.map((a) => `${clave}: ${a}`));
  console.log(
    `${clave} ${deRed ? "red  " : "caché"} ${String(resultado.premios.length).padStart(3)} sorteos`,
  );
}

const sql = guardarSalida("once-historico.sql", sqlInsertarPremios(premios));
guardarSalida("once-historico.json", JSON.stringify(premios));
guardarSalida("once-historico-resumen.json", JSON.stringify(resumenPorAnio(premios), null, 2));

console.log(`\n${premios.length} premios → ${sql}`);
if (avisos.length > 0) {
  console.warn(`\n${avisos.length} avisos (revisar):\n${avisos.join("\n")}`);
  process.exitCode = 1;
}
