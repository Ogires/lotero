// Descarga el histórico de la Lotería Nacional (API de SELAE, datos desde diciembre de 2007).
// Uso: npm run backfill:lnac -w scripts -- [--desde 2007] [--hasta AAAA] [--sin-cache]

import { parseArgs } from "node:util";
import { CABECERAS_LNAC, parsearSorteosLnac, urlBuscadorLnac } from "../api/src/fuentes/lnac";
import type { Premio } from "../api/src/tipos";
import { conCache, esperar, guardarSalida, SesionHttp } from "./lib/red";
import { resumenPorAnio } from "./lib/resumen";
import { sqlInsertarPremios } from "./lib/sql";

const PAUSA_MS = 1500;
const anioActual = new Date().getFullYear();
const { values: opciones } = parseArgs({
  options: {
    desde: { type: "string", default: "2007" },
    hasta: { type: "string", default: String(anioActual) },
    "sin-cache": { type: "boolean", default: false },
  },
});

const sesion = new SesionHttp(CABECERAS_LNAC);
const premios: Premio[] = [];

for (let anio = Number(opciones.desde); anio <= Number(opciones.hasta); anio++) {
  const cachear = !opciones["sin-cache"] && anio !== anioActual;
  const { contenido, deRed } = await conCache(`lnac/${anio}.json`, cachear, async () => {
    const texto = await sesion.texto(urlBuscadorLnac(`${anio}-01-01`, `${anio}-12-31`));
    await esperar(PAUSA_MS);
    return texto;
  });

  const delAnio = parsearSorteosLnac(JSON.parse(contenido));
  premios.push(...delAnio);
  console.log(`${anio} ${deRed ? "red  " : "caché"} ${String(delAnio.length).padStart(4)} premios`);
}

const sql = guardarSalida("lnac.sql", sqlInsertarPremios(premios));
guardarSalida("lnac.json", JSON.stringify(premios));
guardarSalida("lnac-resumen.json", JSON.stringify(resumenPorAnio(premios), null, 2));
console.log(`\n${premios.length} premios → ${sql}`);
