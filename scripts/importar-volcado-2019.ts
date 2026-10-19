// Genera el SQL de los números adicionales de la ONCE del volcado de 2019,
// que la web ya no ofrece en el histórico. Los principales y la Lotería Nacional
// se obtienen de las fuentes oficiales; del volcado solo se usan para validar.
// Uso: npm run importar:volcado -w scripts -- [--dir "ruta/Sqls Exportacion"]

import { parseArgs } from "node:util";
import { guardarSalida } from "./lib/red";
import { sqlInsertarPremios } from "./lib/sql";
import { cargarVolcado, DIR_VOLCADO } from "./lib/volcado-2019";

const { values: opciones } = parseArgs({
  options: { dir: { type: "string", default: DIR_VOLCADO } },
});

const { premios, avisos } = cargarVolcado(opciones.dir);
const adicionales = premios.filter((p) => p.tipo === "ADICIONAL");
const sql = guardarSalida("volcado-2019.sql", sqlInsertarPremios(adicionales));

console.log(
  `Volcado: ${premios.length} premios leídos, ${adicionales.length} adicionales ONCE → ${sql}`,
);
if (avisos.length > 0) console.warn(`${avisos.length} avisos:\n${avisos.slice(0, 20).join("\n")}`);
