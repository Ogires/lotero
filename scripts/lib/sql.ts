// Generación de SQL para cargar premios en D1 con `wrangler d1 execute --file`.

import type { Premio } from "../../api/src/tipos";

function literal(valor: string | null): string {
  return valor === null ? "NULL" : `'${valor.replaceAll("'", "''")}'`;
}

/** Sentencias `INSERT OR IGNORE` de varias filas (idempotentes gracias al UNIQUE de la tabla). */
export function sqlInsertarPremios(premios: readonly Premio[], filasPorSentencia = 200): string {
  let sql = "";
  for (let i = 0; i < premios.length; i += filasPorSentencia) {
    const filas = premios.slice(i, i + filasPorSentencia).map((p) => {
      const valores = [
        p.organismo,
        p.juego,
        p.fecha,
        p.numero,
        p.serie,
        p.tipo,
        p.sorteo,
        p.fuente,
      ];
      return `(${valores.map(literal).join(", ")})`;
    });
    sql += `INSERT OR IGNORE INTO premios (organismo, juego, fecha, numero, serie, tipo, sorteo, fuente) VALUES\n${filas.join(",\n")};\n`;
  }
  return sql;
}
