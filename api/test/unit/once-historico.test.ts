import { describe, expect, it } from "vitest";
import { formularioMes } from "../../src/fuentes/once-historico";
import { parsearMesOnce } from "../../src/fuentes/once-historico-html";
import junio1996 from "../fixtures/once-historico-1996-06.html?raw";
import marzo2019 from "../fixtures/once-historico-2019-03.html?raw";

function contarPorJuego(juegos: string[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const juego of juegos) cuenta[juego] = (cuenta[juego] ?? 0) + 1;
  return cuenta;
}

// Mismos casos que el lector de Node de los scripts: ambos deben interpretar igual la página.
describe("parsearMesOnce (HTMLRewriter) con marzo de 2019", async () => {
  const { premios, avisos } = await parsearMesOnce(marzo2019, 2019, 3);

  it("extrae todos los sorteos del mes sin avisos", () => {
    expect(avisos).toEqual([]);
    expect(contarPorJuego(premios.map((p) => p.juego))).toEqual({
      CUPON_DIARIO: 16,
      CUPONAZO: 5,
      SUELDAZO: 10,
      CUPON_EXTRA: 1,
    });
  });

  it("extrae número, serie y fecha de cada sorteo", () => {
    expect(premios.find((p) => p.fecha === "2019-03-01")).toEqual({
      organismo: "ONCE",
      juego: "CUPONAZO",
      fecha: "2019-03-01",
      numero: "16056",
      serie: "129",
      tipo: "PRINCIPAL",
      sorteo: null,
      fuente: "once-historico",
    });
    expect(premios.find((p) => p.fecha === "2019-03-31")).toMatchObject({
      juego: "SUELDAZO",
      numero: "79927",
      serie: "039",
    });
  });

  it("guarda el nombre de los sorteos extraordinarios", () => {
    expect(premios.find((p) => p.juego === "CUPON_EXTRA")).toMatchObject({
      fecha: "2019-03-19",
      numero: "22617",
      serie: "028",
      sorteo: "Cupón Extra Día del Padre",
    });
  });
});

describe("parsearMesOnce (HTMLRewriter) con junio de 1996", async () => {
  const { premios, avisos } = await parsearMesOnce(junio1996, 1996, 6);

  it("acepta sorteos antiguos sin serie", () => {
    expect(avisos).toEqual([]);
    expect(premios).toHaveLength(20);
    expect(premios.every((p) => p.serie === "")).toBe(true);
    expect(premios.find((p) => p.fecha === "1996-06-28")).toMatchObject({
      juego: "CUPONAZO",
      numero: "30408",
    });
  });
});

describe("parsearMesOnce (HTMLRewriter) con HTML inesperado", () => {
  it("avisa si la página no tiene el bloque de resultados", async () => {
    const { premios, avisos } = await parsearMesOnce(
      "<html><body>Mantenimiento</body></html>",
      2020,
      1,
    );
    expect(premios).toEqual([]);
    expect(avisos).toEqual(["La página no contiene el bloque .detresult"]);
  });

  it("solo lee los bloques hijos directos de .detresult", async () => {
    const html = `<div class="detresult">
      <div class="ORD"><div><p role="heading">Cupón Diario</p><p>Miércoles 8 de enero<span class="ocu">.</span></p></div>
        <div><span class="num">33333</span><span class="sequence">012</span></div></div>
    </div>`;
    const { premios, avisos } = await parsearMesOnce(html, 2020, 1);
    expect(avisos).toEqual([]);
    expect(premios).toMatchObject([
      { juego: "CUPON_DIARIO", fecha: "2020-01-08", numero: "33333", serie: "012" },
    ]);
  });
});

describe("formularioMes", () => {
  it("envía el mes con dos dígitos, el año y el token", () => {
    expect(formularioMes(2026, 3, "abc").toString()).toBe("mes=03&anio=2026&csrf-param=abc");
  });
});
