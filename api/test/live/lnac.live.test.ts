import { describe, expect, it } from "vitest";
import { CABECERAS_LNAC, parsearSorteosLnac, urlBuscadorLnac } from "../../src/fuentes/lnac";

// Contrato con loteriasyapuestas.es: si falla, ha cambiado el formato o Akamai bloquea las cabeceras.
describe("API real de la Lotería Nacional", () => {
  it("devuelve los sorteos de marzo de 2019 con los premios conocidos", async () => {
    const respuesta = await fetch(urlBuscadorLnac("2019-03-01", "2019-03-31"), {
      headers: CABECERAS_LNAC,
    });
    expect(respuesta.status).toBe(200);

    const premios = parsearSorteosLnac(await respuesta.json());
    const jueves14 = premios.filter((p) => p.fecha === "2019-03-14").map((p) => p.numero);

    expect(jueves14).toEqual(["37680", "81168"]);
    expect(new Set(premios.map((p) => p.juego))).toContain("LN_SABADO");
  });
});
