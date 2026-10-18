import { describe, expect, it } from "vitest";
import { parsearFeedOnce } from "../../src/fuentes/once-feed";
import type { Premio } from "../../src/tipos";
import feedReal from "../fixtures/once-feed-2026-10-18.xml?raw";

const base = { organismo: "ONCE", sorteo: null, fuente: "once-feed" } as const;

function item(campos: Record<string, string>): string {
  const xml = Object.entries(campos)
    .map(([etiqueta, valor]) => `<${etiqueta}><![CDATA[${valor}]]></${etiqueta}>`)
    .join("\n");
  return `<item>\n${xml}\n</item>`;
}

function feed(...items: string[]): string {
  return `<?xml version="1.0" encoding="utf-8" ?>\n<items>\n${items.join("\n")}\n</items>`;
}

describe("parsearFeedOnce con el feed real del 18/10/2026", () => {
  const premios = parsearFeedOnce(feedReal);

  it("extrae los premios principales de los tres cupones", () => {
    expect(premios.filter((p) => p.tipo === "PRINCIPAL")).toEqual<Premio[]>([
      {
        ...base,
        juego: "CUPON_DIARIO",
        fecha: "2026-10-15",
        numero: "16989",
        serie: "042",
        tipo: "PRINCIPAL",
      },
      {
        ...base,
        juego: "CUPONAZO",
        fecha: "2026-10-16",
        numero: "52532",
        serie: "092",
        tipo: "PRINCIPAL",
      },
      {
        ...base,
        juego: "SUELDAZO",
        fecha: "2026-10-17",
        numero: "21609",
        serie: "019",
        tipo: "PRINCIPAL",
      },
    ]);
  });

  it("extrae los números adicionales del Sueldazo (número + serie en <adic>)", () => {
    const adicionales = premios.filter((p) => p.tipo === "ADICIONAL");
    expect(adicionales.map((p) => [p.juego, p.fecha, p.numero, p.serie])).toEqual([
      ["SUELDAZO", "2026-10-17", "05050", "055"],
      ["SUELDAZO", "2026-10-17", "15327", "043"],
      ["SUELDAZO", "2026-10-17", "25197", "051"],
      ["SUELDAZO", "2026-10-17", "79863", "024"],
    ]);
  });

  it("ignora el resto de productos (Triplex, Dupla, Mi Día, Eurojackpot, Super 11)", () => {
    expect(premios).toHaveLength(7);
  });
});

describe("parsearFeedOnce con casos límite", () => {
  it("devuelve una lista vacía si no hay items", () => {
    expect(parsearFeedOnce("")).toEqual([]);
    expect(parsearFeedOnce(feed())).toEqual([]);
  });

  it("descarta items con número o fecha no válidos sin romper el resto", () => {
    const xml = feed(
      item({ tipo: "Cuponazo", fecha: "Viernes, 16/10/2026", numero: "5253", serie: "092" }),
      item({ tipo: "Cuponazo", fecha: "sin fecha", numero: "52532", serie: "092" }),
      item({ tipo: "Cuponazo", fecha: "Viernes, 09/10/2026", numero: "00123", serie: "" }),
    );
    expect(parsearFeedOnce(xml)).toEqual<Premio[]>([
      {
        ...base,
        juego: "CUPONAZO",
        fecha: "2026-10-09",
        numero: "00123",
        serie: "",
        tipo: "PRINCIPAL",
      },
    ]);
  });

  it("ignora adicionales mal formados", () => {
    const xml = feed(
      item({
        tipo: "Sueldazo Fin de Semana",
        fecha: "S&aacute;bado, 17/10/2026",
        numero: "21609",
        serie: "019",
        adic: "05050055--123-1532704x-79863024",
      }),
    );
    expect(parsearFeedOnce(xml).map((p) => `${p.tipo}:${p.numero}/${p.serie}`)).toEqual([
      "PRINCIPAL:21609/019",
      "ADICIONAL:05050/055",
      "ADICIONAL:79863/024",
    ]);
  });

  it("acepta campos sin CDATA", () => {
    const xml = feed(
      "<item><tipo>Cup&#243;n Diario</tipo><fecha>Lunes, 12/10/2026</fecha><numero>11111</numero><serie>001</serie></item>",
    );
    expect(parsearFeedOnce(xml)).toHaveLength(1);
  });
});
