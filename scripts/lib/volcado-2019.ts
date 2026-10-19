// Lectura del volcado MySQL de 2019 (`Sqls Exportacion`): LotoDB_Sorteos_2.sql + LotoDB_Resultados_2.sql.
// Mapeo verificado contra la web y la API de SELAE (ver plan, §2.5):
//   LoteriaId 1 Cupón Diario · 2 Cuponazo · 3 Sueldazo · 4 LN jueves · 5 LN sábado
//   TipoResultado 0 principal · 1 reintegro (se descarta) · 2 adicional ONCE / 2º premio LN
// Ojo: en los sorteos especiales de LN el tipo 2 también incluye el 3er premio (validado
// contra la API de SELAE), y los sorteos especiales figuran como jueves o sábado normales.
// Por eso de la Lotería Nacional del volcado solo se usa para validar, nunca para cargar.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type Juego, numeroCincoCifras, type Organismo, type Premio } from "../../api/src/tipos";
import { DIR_SCRIPTS } from "./red";

/** Ubicación habitual del volcado: `legado-2019/` junto al repositorio (ver LEEME.md de la carpeta superior). */
export const DIR_VOLCADO = join(DIR_SCRIPTS, "..", "..", "legado-2019", "Sqls Exportacion");

const JUEGO_POR_LOTERIA: Record<string, { organismo: Organismo; juego: Juego }> = {
  "1": { organismo: "ONCE", juego: "CUPON_DIARIO" },
  "2": { organismo: "ONCE", juego: "CUPONAZO" },
  "3": { organismo: "ONCE", juego: "SUELDAZO" },
  "4": { organismo: "LNAC", juego: "LN_JUEVES" },
  "5": { organismo: "LNAC", juego: "LN_SABADO" },
};

/** Valores de un `INSERT ... VALUES (...)` de una sola fila; `null` si la línea no es un INSERT. */
export function valoresInsert(linea: string): Array<string | null> | null {
  const inicio = linea.indexOf("VALUES (");
  if (!linea.includes("INSERT INTO") || inicio < 0) return null;

  const valores: Array<string | null> = [];
  let i = inicio + "VALUES (".length;
  while (i < linea.length) {
    if (linea[i] === "'") {
      let texto = "";
      i++;
      while (i < linea.length) {
        if (linea[i] === "'" && linea[i + 1] === "'") {
          texto += "'";
          i += 2;
        } else if (linea[i] === "'") {
          i++;
          break;
        } else {
          texto += linea[i++];
        }
      }
      valores.push(texto);
    } else {
      const fin = linea.slice(i).search(/[,)]/);
      const crudo = linea.slice(i, fin < 0 ? undefined : i + fin).trim();
      valores.push(crudo === "NULL" ? null : crudo);
      i = fin < 0 ? linea.length : i + fin;
    }
    if (linea[i] === ")") break;
    i++; // coma
  }
  return valores;
}

function lineas(sql: string): string[] {
  return sql.replace(/^﻿/, "").split(/\r?\n/);
}

export interface ResultadoVolcado {
  premios: Premio[];
  avisos: string[];
}

export function leerVolcado(sqlSorteos: string, sqlResultados: string): ResultadoVolcado {
  const sorteos = new Map<string, { fecha: string; loteria: string }>();
  for (const linea of lineas(sqlSorteos)) {
    const [id, fecha, loteria] = valoresInsert(linea) ?? [];
    if (id && fecha && loteria) sorteos.set(id, { fecha, loteria });
  }

  const premios: Premio[] = [];
  const avisos: string[] = [];
  for (const linea of lineas(sqlResultados)) {
    const valores = valoresInsert(linea);
    if (!valores) continue;
    const [id, numeroCrudo, , , sorteoId, serie, , tipoResultado] = valores;
    if (tipoResultado === "1") continue; // reintegro

    const sorteo = sorteoId ? sorteos.get(sorteoId) : undefined;
    const juego = sorteo ? JUEGO_POR_LOTERIA[sorteo.loteria] : undefined;
    if (!sorteo || !juego) {
      avisos.push(`Resultado ${id}: sorteo ${sorteoId} desconocido`);
      continue;
    }
    const numero = numeroCincoCifras(numeroCrudo ?? "");
    if (!numero) {
      avisos.push(`Resultado ${id}: número no válido '${numeroCrudo}'`);
      continue;
    }

    const principal = tipoResultado === "0";
    premios.push({
      ...juego,
      fecha: sorteo.fecha,
      numero,
      serie: juego.organismo === "ONCE" ? (serie ?? "") : "",
      tipo: principal ? "PRINCIPAL" : juego.organismo === "ONCE" ? "ADICIONAL" : "SEGUNDO",
      sorteo: null,
      fuente: "volcado-2019",
    });
  }

  return { premios, avisos };
}

export function cargarVolcado(dir: string): ResultadoVolcado {
  return leerVolcado(
    readFileSync(join(dir, "LotoDB_Sorteos_2.sql"), "utf8"),
    readFileSync(join(dir, "LotoDB_Resultados_2.sql"), "utf8"),
  );
}
