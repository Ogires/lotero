import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extraerCsrf, parsearMesOnce } from "../../lib/once-historico";

function fixture(nombre: string): string {
  return readFileSync(new URL(`../fixtures/${nombre}`, import.meta.url), "utf8");
}

function contarPorJuego(juegos: string[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const juego of juegos) cuenta[juego] = (cuenta[juego] ?? 0) + 1;
  return cuenta;
}

describe("parsearMesOnce con marzo de 2019", () => {
  const { premios, avisos } = parsearMesOnce(fixture("once-historico-2019-03.html"), 2019, 3);

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

describe("parsearMesOnce con junio de 1996", () => {
  const { premios, avisos } = parsearMesOnce(fixture("once-historico-1996-06.html"), 1996, 6);

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

describe("parsearMesOnce con HTML inesperado", () => {
  it("avisa si la página no tiene el bloque de resultados", () => {
    const { premios, avisos } = parsearMesOnce("<html><body>Mantenimiento</body></html>", 2020, 1);
    expect(premios).toEqual([]);
    expect(avisos).toEqual(["La página no contiene el bloque .detresult"]);
  });

  it("avisa de bloques con juego desconocido, número no válido o mes distinto", () => {
    const html = `<div class="detresult">
      <div class="RARO"><p role="heading">Otro</p><p>Lunes 6 de enero</p><span class="num">11111</span></div>
      <div class="ORD"><p role="heading">Cupón Diario</p><p>Martes 7 de enero</p><span class="num">123</span></div>
      <div class="ORD"><p role="heading">Cupón Diario</p><p>Martes 4 de febrero</p><span class="num">22222</span></div>
      <div class="ORD"><p role="heading">Cupón Diario</p><p>Miércoles 8 de enero</p><span class="num">33333</span></div>
    </div>`;
    const { premios, avisos } = parsearMesOnce(html, 2020, 1);

    expect(premios.map((p) => `${p.fecha}:${p.numero}`)).toEqual(["2020-01-08:33333"]);
    expect(avisos).toHaveLength(3);
  });
});

describe("extraerCsrf", () => {
  it("obtiene el token del formulario de búsqueda", () => {
    expect(extraerCsrf(fixture("once-historico-2019-03.html"))).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("devuelve null si no hay token", () => {
    expect(extraerCsrf("<form></form>")).toBeNull();
  });
});
