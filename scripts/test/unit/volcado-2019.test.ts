import { describe, expect, it } from "vitest";
import { leerVolcado, valoresInsert } from "../../lib/volcado-2019";

// Fragmentos con el formato exacto de `Sqls Exportacion` (MySQL, con BOM).
const SORTEOS = `﻿INSERT INTO \`Sorteos\` (\`Id\`,\`Fecha\`,\`LoteriaId\`) VALUES (22133,'2019-03-01',2);
INSERT INTO \`Sorteos\` (\`Id\`,\`Fecha\`,\`LoteriaId\`) VALUES (22134,'2019-03-02',3);
INSERT INTO \`Sorteos\` (\`Id\`,\`Fecha\`,\`LoteriaId\`) VALUES (23002,'2019-03-14',4);
INSERT INTO \`Sorteos\` (\`Id\`,\`Fecha\`,\`LoteriaId\`) VALUES (23003,'2019-03-16',5);
INSERT INTO \`Sorteos\` (\`Id\`,\`Fecha\`,\`LoteriaId\`) VALUES (23004,'2019-03-18',1);
`;

const COLUMNAS =
  "(`Id`,`Numero`,`NumeroInt`,`Orden`,`SorteoId`,`Serie`,`Fraccion`,`TipoResultado`)";
const RESULTADOS = [
  `﻿INSERT INTO \`Resultados\` ${COLUMNAS} VALUES (19604,'16056',16056,NULL,22133,'129',NULL,0);`,
  `INSERT INTO \`Resultados\` ${COLUMNAS} VALUES (19605,'6',6,NULL,22133,NULL,NULL,1);`,
  `INSERT INTO \`Resultados\` ${COLUMNAS} VALUES (19606,'27094',27094,NULL,22133,'070',NULL,2);`,
  `INSERT INTO \`Resultados\` ${COLUMNAS} VALUES (19612,'75894',0,NULL,22134,NULL,'6',0);`,
  `INSERT INTO \`Resultados\` ${COLUMNAS} VALUES (24050,'37680',0,NULL,23002,NULL,NULL,0);`,
  `INSERT INTO \`Resultados\` ${COLUMNAS} VALUES (24054,'81168',0,NULL,23002,NULL,NULL,2);`,
  `INSERT INTO \`Resultados\` ${COLUMNAS} VALUES (24060,'97422',0,NULL,23003,NULL,NULL,0);`,
  `INSERT INTO \`Resultados\` ${COLUMNAS} VALUES (24070,'5678',0,NULL,23004,NULL,NULL,0);`,
].join("\n");

describe("valoresInsert", () => {
  it("extrae los valores respetando comillas, comas y NULL", () => {
    expect(valoresInsert("INSERT INTO `T` (`a`,`b`,`c`) VALUES (1,'x, y',NULL);")).toEqual([
      "1",
      "x, y",
      null,
    ]);
    expect(valoresInsert("INSERT INTO `T` VALUES ('it''s');")).toEqual(["it's"]);
  });

  it("devuelve null en líneas que no son INSERT", () => {
    expect(valoresInsert("-- comentario")).toBeNull();
  });
});

describe("leerVolcado", () => {
  const { premios, avisos } = leerVolcado(SORTEOS, RESULTADOS);

  it("convierte cada resultado al modelo nuevo, sin reintegros", () => {
    expect(premios.map((p) => [p.juego, p.fecha, p.numero, p.serie, p.tipo])).toEqual([
      ["CUPONAZO", "2019-03-01", "16056", "129", "PRINCIPAL"],
      ["CUPONAZO", "2019-03-01", "27094", "070", "ADICIONAL"],
      ["SUELDAZO", "2019-03-02", "75894", "", "PRINCIPAL"],
      ["LN_JUEVES", "2019-03-14", "37680", "", "PRINCIPAL"],
      ["LN_JUEVES", "2019-03-14", "81168", "", "SEGUNDO"],
      ["LN_SABADO", "2019-03-16", "97422", "", "PRINCIPAL"],
    ]);
    expect(premios.every((p) => p.fuente === "volcado-2019")).toBe(true);
    expect(premios.filter((p) => p.organismo === "LNAC")).toHaveLength(3);
  });

  it("avisa de los números que no tienen cinco cifras", () => {
    expect(avisos).toEqual(["Resultado 24070: número no válido '5678'"]);
  });
});
