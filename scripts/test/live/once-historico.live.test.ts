import { describe, expect, it } from "vitest";
import { extraerCsrf, parsearMesOnce } from "../../lib/once-historico";
import { SesionHttp, USER_AGENT_BOT } from "../../lib/red";

const URL_HISTORICO = "https://www.juegosonce.es/historico-resultados-cupones-once";

// Contrato con juegosonce.es: búsqueda por mes con token CSRF y formato de los bloques.
describe("histórico real de la ONCE", () => {
  it("devuelve marzo de 2019 con el Cuponazo del día 1", async () => {
    const sesion = new SesionHttp({ "User-Agent": USER_AGENT_BOT });
    const csrf = extraerCsrf(await sesion.texto(URL_HISTORICO));
    expect(csrf).not.toBeNull();

    const html = await sesion.texto(URL_HISTORICO, {
      method: "POST",
      body: new URLSearchParams({ mes: "03", anio: "2019", "csrf-param": csrf ?? "" }),
      headers: { Referer: URL_HISTORICO, "Content-Type": "application/x-www-form-urlencoded" },
    });
    const { premios, avisos } = parsearMesOnce(html, 2019, 3);

    expect(avisos).toEqual([]);
    expect(premios).toHaveLength(32);
    expect(premios.find((p) => p.fecha === "2019-03-01")).toMatchObject({
      juego: "CUPONAZO",
      numero: "16056",
      serie: "129",
    });
  });
});
