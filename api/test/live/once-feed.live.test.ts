import { describe, expect, it } from "vitest";
import { parsearFeedOnce, URL_FEED_ONCE } from "../../src/fuentes/once-feed";

// Contrato con juegosonce.es: si falla, el formato del feed ha cambiado.
describe("feed real de la ONCE", () => {
  it("sigue siendo parseable y trae los tres cupones recientes", async () => {
    const respuesta = await fetch(URL_FEED_ONCE);
    expect(respuesta.ok).toBe(true);

    const premios = parsearFeedOnce(await respuesta.text());
    const juegos = new Set(premios.filter((p) => p.tipo === "PRINCIPAL").map((p) => p.juego));

    expect(juegos).toEqual(new Set(["CUPON_DIARIO", "CUPONAZO", "SUELDAZO"]));

    const hace15Dias = new Date(Date.now() - 15 * 86_400_000).toISOString().slice(0, 10);
    for (const p of premios) {
      expect(p.fecha >= hace15Dias, `fecha antigua en el feed: ${p.fecha}`).toBe(true);
    }
  });
});
