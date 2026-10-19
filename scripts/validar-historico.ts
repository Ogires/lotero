// Compara lo descargado de las fuentes oficiales con el volcado de 2019.
// Requiere haber ejecutado antes backfill:once y backfill:lnac.
// Uso: npm run validar -w scripts -- [--dir "ruta/Sqls Exportacion"]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { Premio } from "../api/src/tipos";
import { DIR_SALIDA } from "./lib/red";
import { cargarVolcado, DIR_VOLCADO } from "./lib/volcado-2019";

const { values: opciones } = parseArgs({
  options: { dir: { type: "string", default: DIR_VOLCADO } },
});

function leerSalida(nombre: string): Premio[] {
  return JSON.parse(readFileSync(join(DIR_SALIDA, nombre), "utf8")) as Premio[];
}

const clave = (p: Premio) => `${p.juego} ${p.fecha} ${p.tipo}`;

function indexar(premios: readonly Premio[]): Map<string, Set<string>> {
  const indice = new Map<string, Set<string>>();
  for (const p of premios) {
    const numeros = indice.get(clave(p)) ?? new Set<string>();
    numeros.add(p.numero);
    indice.set(clave(p), numeros);
  }
  return indice;
}

/** Compara premios del mismo juego, fecha y tipo dentro del periodo que cubre el volcado. */
function comparar(titulo: string, oficial: readonly Premio[], volcado: readonly Premio[]): void {
  const fechas = volcado.map((p) => p.fecha).sort();
  const [desde = "", hasta = ""] = [fechas[0], fechas.at(-1)];
  const enPeriodo = oficial.filter((p) => p.fecha >= desde && p.fecha <= hasta);
  const a = indexar(enPeriodo);
  const b = indexar(volcado);

  const coinciden: string[] = [];
  const distintos: string[] = [];
  const soloOficial: string[] = [];
  const soloVolcado: string[] = [];
  for (const [k, numeros] of a) {
    const otros = b.get(k);
    if (!otros) soloOficial.push(k);
    else if ([...numeros].sort().join() === [...otros].sort().join()) coinciden.push(k);
    else distintos.push(`${k}: oficial ${[...numeros]} / volcado ${[...otros]}`);
  }
  for (const k of b.keys()) if (!a.has(k)) soloVolcado.push(k);

  console.log(`\n== ${titulo} (${desde} → ${hasta})`);
  console.log(`  coinciden:            ${coinciden.length}`);
  console.log(`  números distintos:    ${distintos.length}`);
  console.log(`  solo en la fuente:    ${soloOficial.length}`);
  console.log(`  solo en el volcado:   ${soloVolcado.length}`);
  for (const [nombre, lista] of [
    ["Distintos", distintos],
    ["Solo en la fuente", soloOficial],
    ["Solo en el volcado", soloVolcado],
  ] as const) {
    if (lista.length > 0)
      console.log(`  ${nombre} (máx. 15):\n    ${lista.slice(0, 15).join("\n    ")}`);
  }
}

const { premios: volcado } = cargarVolcado(opciones.dir);
const once = leerSalida("once-historico.json");
const lnac = leerSalida("lnac.json");

comparar(
  "ONCE, premios principales",
  once.filter((p) => p.juego !== "CUPON_EXTRA"),
  volcado.filter((p) => p.organismo === "ONCE" && p.tipo === "PRINCIPAL"),
);
comparar(
  "Lotería Nacional, 1º y 2º premio",
  lnac.filter((p) => p.juego !== "LN_EXTRAORDINARIO" && ["PRINCIPAL", "SEGUNDO"].includes(p.tipo)),
  volcado.filter((p) => p.organismo === "LNAC"),
);
