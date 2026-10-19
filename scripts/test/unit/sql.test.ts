import { describe, expect, it } from "vitest";
import type { Premio } from "../../../api/src/tipos";
import { sqlInsertarPremios } from "../../lib/sql";

const premio: Premio = {
  organismo: "LNAC",
  juego: "LN_EXTRAORDINARIO",
  fecha: "2024-11-09",
  numero: "47351",
  serie: "",
  tipo: "PRINCIPAL",
  sorteo: 'SORTEO DE "EL NIÑO" D\'ORS',
  fuente: "lnac-api",
};

describe("sqlInsertarPremios", () => {
  it("genera INSERT OR IGNORE escapando comillas simples y usando NULL", () => {
    const sql = sqlInsertarPremios([premio, { ...premio, numero: "00001", sorteo: null }]);

    expect(sql).toBe(
      "INSERT OR IGNORE INTO premios (organismo, juego, fecha, numero, serie, tipo, sorteo, fuente) VALUES\n" +
        "('LNAC', 'LN_EXTRAORDINARIO', '2024-11-09', '47351', '', 'PRINCIPAL', 'SORTEO DE \"EL NIÑO\" D''ORS', 'lnac-api'),\n" +
        "('LNAC', 'LN_EXTRAORDINARIO', '2024-11-09', '00001', '', 'PRINCIPAL', NULL, 'lnac-api');\n",
    );
  });

  it("divide en sentencias de como máximo el tamaño de bloque indicado", () => {
    const sql = sqlInsertarPremios(
      Array.from({ length: 5 }, (_, i) => ({ ...premio, numero: `0000${i}` })),
      2,
    );
    expect(sql.match(/INSERT OR IGNORE/g)).toHaveLength(3);
  });

  it("devuelve una cadena vacía si no hay premios", () => {
    expect(sqlInsertarPremios([])).toBe("");
  });
});
