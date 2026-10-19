import { describe, expect, it } from "vitest";
import {
  normalizarNombreSorteo,
  parsearSorteosLnac,
  urlBuscadorLnac,
} from "../../src/fuentes/lnac";
import type { Premio } from "../../src/tipos";
import seleccion from "../fixtures/lnac-sorteos-seleccion.json";

const premios = parsearSorteosLnac(seleccion);

function delSorteo(fecha: string): string[] {
  return premios.filter((p) => p.fecha === fecha).map((p) => `${p.tipo}:${p.numero}`);
}

describe("parsearSorteosLnac con sorteos reales", () => {
  it("clasifica el sorteo del jueves y guarda 1º y 2º premio", () => {
    expect(premios.filter((p) => p.fecha === "2019-03-14")).toEqual<Premio[]>([
      {
        organismo: "LNAC",
        juego: "LN_JUEVES",
        fecha: "2019-03-14",
        numero: "37680",
        serie: "",
        tipo: "PRINCIPAL",
        sorteo: null,
        fuente: "lnac-api",
      },
      {
        organismo: "LNAC",
        juego: "LN_JUEVES",
        fecha: "2019-03-14",
        numero: "81168",
        serie: "",
        tipo: "SEGUNDO",
        sorteo: null,
        fuente: "lnac-api",
      },
    ]);
  });

  it("clasifica el sorteo ordinario del sábado", () => {
    expect(premios.find((p) => p.fecha === "2019-03-16")?.juego).toBe("LN_SABADO");
  });

  it("clasifica por el nombre aunque el código de tipo no sea J", () => {
    expect(premios.find((p) => p.fecha === "2011-12-29")?.juego).toBe("LN_JUEVES");
  });

  it("guarda todos los premios mayores del sorteo de Navidad", () => {
    expect(delSorteo("2025-12-22")).toEqual([
      "PRINCIPAL:79432",
      "SEGUNDO:70048",
      "TERCERO:90693",
      "CUARTO:25508",
      "CUARTO:78477",
      "QUINTO:23112",
      "QUINTO:25412",
      "QUINTO:18669",
      "QUINTO:41716",
      "QUINTO:60649",
      "QUINTO:61366",
      "QUINTO:77715",
      "QUINTO:94273",
    ]);
    const navidad = premios.find((p) => p.fecha === "2025-12-22");
    expect(navidad?.juego).toBe("LN_EXTRAORDINARIO");
    expect(navidad?.sorteo).toBe("SORTEO EXTRAORDINARIO DE NAVIDAD");
  });

  it("guarda las extracciones de cinco cifras como premios menores, sin repetir", () => {
    // La API lista cada extracción dos veces: 24 entradas para 12 números distintos.
    const cultura = premios.filter((p) => p.fecha === "2024-11-09");
    expect(cultura.filter((p) => p.tipo === "MENOR")).toHaveLength(12);
    expect(cultura[0]?.sorteo).toBe("SORTEO EXTRAORDINARIO DE LA CULTURA");
  });

  it("no devuelve premios duplicados", () => {
    const claves = premios.map((p) => `${p.juego}|${p.fecha}|${p.numero}|${p.tipo}`);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("trata como extraordinario un sorteo especial sin nombre", () => {
    const sinNombre = premios.find((p) => p.fecha === "2008-10-04");
    expect(sinNombre?.juego).toBe("LN_EXTRAORDINARIO");
    expect(sinNombre?.sorteo).toBeNull();
  });

  it("limpia espacios y saltos de línea del nombre del sorteo", () => {
    expect(premios.find((p) => p.fecha === "2012-05-05")?.sorteo).toBe("SORTEO ESPECIAL CRUZ ROJA");
  });
});

describe("parsearSorteosLnac con entradas no válidas", () => {
  it("acepta el mensaje de texto que devuelve la API cuando no hay sorteos", () => {
    expect(
      parsearSorteosLnac("No se ha encontrado ningún registro para los parámetros introducidos."),
    ).toEqual([]);
  });

  it("descarta premios sin número de cinco cifras y sorteos sin fecha", () => {
    const datos = [
      {
        fecha_sorteo: "2020-01-02 21:00:00",
        nombre: "SORTEO DEL JUEVES",
        primerPremio: { decimo: "123" },
      },
      { nombre: "SORTEO DEL JUEVES", primerPremio: { decimo: "12345" } },
      {
        fecha_sorteo: "2020-01-09 21:00:00",
        nombre: "SORTEO DEL JUEVES",
        primerPremio: { decimo: "00045" },
      },
    ];
    expect(parsearSorteosLnac(datos).map((p) => `${p.fecha}:${p.numero}`)).toEqual([
      "2020-01-09:00045",
    ]);
  });
});

describe("utilidades", () => {
  it("normaliza nombres de sorteo", () => {
    expect(normalizarNombreSorteo('  SORTEO EXTRAORDINARIO    "DIA DEL PADRE" ')).toBe(
      'SORTEO EXTRAORDINARIO "DIA DEL PADRE"',
    );
    expect(normalizarNombreSorteo(null)).toBeNull();
    expect(normalizarNombreSorteo("   ")).toBeNull();
  });

  it("construye la URL del buscador para un rango de fechas", () => {
    expect(urlBuscadorLnac("2019-03-01", "2019-03-31")).toBe(
      "https://www.loteriasyapuestas.es/servicios/buscadorSorteos?game_id=LNAC&celebrados=true&fechaInicioInclusiva=20190301&fechaFinInclusiva=20190331",
    );
  });
});
