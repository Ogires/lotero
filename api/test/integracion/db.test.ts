import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { buscarPremiosPorNumero, insertarPremios } from "../../src/db";
import type { Premio } from "../../src/tipos";

function premio(cambios: Partial<Premio>): Premio {
  return {
    organismo: "ONCE",
    juego: "CUPONAZO",
    fecha: "2019-03-01",
    numero: "16056",
    serie: "129",
    tipo: "PRINCIPAL",
    sorteo: null,
    fuente: "once-historico",
    ...cambios,
  };
}

beforeEach(async () => {
  await env.DB.exec("DELETE FROM premios");
});

describe("insertarPremios", () => {
  it("inserta los premios y devuelve cuántos son nuevos", async () => {
    const nuevos = await insertarPremios(env.DB, [
      premio({}),
      premio({ numero: "27094", serie: "070", tipo: "ADICIONAL" }),
    ]);
    expect(nuevos).toBe(2);
  });

  it("es idempotente: repetir la carga no duplica filas", async () => {
    const lote = [premio({}), premio({ numero: "27094", serie: "070", tipo: "ADICIONAL" })];
    await insertarPremios(env.DB, lote);
    const nuevos = await insertarPremios(env.DB, lote);

    expect(nuevos).toBe(0);
    const total = await env.DB.prepare("SELECT count(*) AS n FROM premios").first<number>("n");
    expect(total).toBe(2);
  });

  it("procesa lotes mayores que el tamaño de bloque", async () => {
    const lote = Array.from({ length: 120 }, (_, i) =>
      premio({ numero: String(i).padStart(5, "0") }),
    );
    expect(await insertarPremios(env.DB, lote)).toBe(120);
  });

  it("no hace nada con una lista vacía", async () => {
    expect(await insertarPremios(env.DB, [])).toBe(0);
  });
});

describe("buscarPremiosPorNumero", () => {
  it("devuelve solo los premios de ese número, del más reciente al más antiguo", async () => {
    await insertarPremios(env.DB, [
      premio({ fecha: "2001-05-04" }),
      premio({ fecha: "2019-03-01" }),
      premio({
        organismo: "LNAC",
        juego: "LN_SABADO",
        fecha: "2010-01-02",
        serie: "",
        tipo: "SEGUNDO",
        fuente: "lnac-api",
      }),
      premio({ numero: "99999" }),
    ]);

    const filas = await buscarPremiosPorNumero(env.DB, "16056");

    expect(filas.map((f) => [f.fecha, f.organismo, f.tipo])).toEqual([
      ["2019-03-01", "ONCE", "PRINCIPAL"],
      ["2010-01-02", "LNAC", "SEGUNDO"],
      ["2001-05-04", "ONCE", "PRINCIPAL"],
    ]);
  });

  it("devuelve una lista vacía si el número nunca ha salido", async () => {
    expect(await buscarPremiosPorNumero(env.DB, "12345")).toEqual([]);
  });
});
