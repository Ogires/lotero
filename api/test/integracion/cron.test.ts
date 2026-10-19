import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { actualizar, fechaMadrid } from "../../src/cron";
import type { Pedir } from "../../src/fuentes/red";
import lnacJson from "../fixtures/lnac-sorteos-seleccion.json";
import feedXml from "../fixtures/once-feed-2026-10-18.xml?raw";
import marzo2019 from "../fixtures/once-historico-2019-03.html?raw";

interface Peticion {
  url: string;
  metodo: string;
  cabeceras: Headers;
  cuerpo: string;
}

/** Simula juegosonce.es y SELAE; `estadoLnac` permite provocar el bloqueo de Akamai. */
function fuentesSimuladas(estadoLnac = 200): { pedir: Pedir; peticiones: Peticion[] } {
  const peticiones: Peticion[] = [];
  const pedir: Pedir = async (url, init = {}) => {
    const cuerpo = init.body ? String(init.body) : "";
    peticiones.push({
      url,
      metodo: init.method ?? "GET",
      cabeceras: new Headers(init.headers),
      cuerpo,
    });

    if (url.includes("sorteos2.xml")) return new Response(feedXml);
    if (url.includes("historico-resultados-cupones-once")) {
      if (init.method !== "POST") {
        return new Response(marzo2019, {
          headers: [
            ["Set-Cookie", "sesion=abc; Path=/; HttpOnly"],
            ["Set-Cookie", "idioma=es; Path=/"],
          ],
        });
      }
      // Solo hay datos para marzo de 2019; otro mes devuelve un listado vacío.
      return new Response(cuerpo.includes("mes=03") ? marzo2019 : '<div class="detresult"></div>');
    }
    if (url.includes("loteriasyapuestas.es")) {
      return estadoLnac === 200
        ? Response.json(lnacJson)
        : new Response("Access Denied", { status: estadoLnac });
    }
    return new Response("No encontrado", { status: 404 });
  };
  return { pedir, peticiones };
}

async function ejecuciones() {
  const { results } = await env.DB.prepare(
    "SELECT tarea, filas_nuevas, error FROM ejecuciones ORDER BY id",
  ).run<{ tarea: string; filas_nuevas: number | null; error: string | null }>();
  return results;
}

beforeEach(async () => {
  await env.DB.exec("DELETE FROM premios");
  await env.DB.exec("DELETE FROM ejecuciones");
});

describe("actualizar", () => {
  const ahora = new Date("2019-03-20T22:00:00Z");

  it("guarda los premios de las tres fuentes y registra cada tarea", async () => {
    const resultados = await actualizar(env.DB, ahora, fuentesSimuladas().pedir);

    expect(resultados.map((r) => r.tarea)).toEqual(["once-feed", "once-historico", "lnac"]);
    expect(resultados.every((r) => r.error === null && (r.filasNuevas ?? 0) > 0)).toBe(true);
    expect(resultados.find((r) => r.tarea === "once-historico")?.filasNuevas).toBe(32);

    const filas = await ejecuciones();
    expect(filas.map((f) => [f.tarea, f.error])).toEqual([
      ["once-feed", null],
      ["once-historico", null],
      ["lnac", null],
    ]);

    const cupon = await env.DB.prepare(
      "SELECT juego, serie, fuente FROM premios WHERE numero = '16056'",
    ).first();
    expect(cupon).toEqual({ juego: "CUPONAZO", serie: "129", fuente: "once-historico" });
  });

  it("no duplica premios al repetirse", async () => {
    await actualizar(env.DB, ahora, fuentesSimuladas().pedir);
    const segunda = await actualizar(env.DB, ahora, fuentesSimuladas().pedir);
    expect(segunda.map((r) => r.filasNuevas)).toEqual([0, 0, 0]);
  });

  it("envía al histórico el token CSRF y las cookies de la sesión", async () => {
    const { pedir, peticiones } = fuentesSimuladas();
    await actualizar(env.DB, ahora, pedir);

    const post = peticiones.find((p) => p.metodo === "POST");
    expect(post?.cuerpo).toMatch(/^mes=03&anio=2019&csrf-param=[0-9a-f-]{36}$/);
    expect(post?.cabeceras.get("Cookie")).toBe("sesion=abc; idioma=es");
    expect(post?.cabeceras.get("User-Agent")).toMatch(/^LoteroBot\//);
  });

  it("relee el mes anterior en los primeros días del mes", async () => {
    const { pedir, peticiones } = fuentesSimuladas();
    await actualizar(env.DB, new Date("2019-04-02T07:00:00Z"), pedir);

    const meses = peticiones.filter((p) => p.metodo === "POST").map((p) => p.cuerpo.slice(0, 16));
    expect(meses).toEqual(["mes=03&anio=2019", "mes=04&anio=2019"]);
  });

  it("envía a SELAE Accept-Encoding, sin el que Akamai responde 403", async () => {
    const { pedir, peticiones } = fuentesSimuladas();
    await actualizar(env.DB, ahora, pedir);

    const selae = peticiones.find((p) => p.url.includes("loteriasyapuestas"));
    expect(selae?.cabeceras.get("Accept-Encoding")).toContain("gzip");
  });

  it("consulta en SELAE los últimos diez días", async () => {
    const { pedir, peticiones } = fuentesSimuladas();
    await actualizar(env.DB, ahora, pedir);

    const url = peticiones.find((p) => p.url.includes("loteriasyapuestas"))?.url ?? "";
    expect(url).toContain("fechaInicioInclusiva=20190310&fechaFinInclusiva=20190320");
  });

  it("registra el bloqueo de SELAE sin impedir las tareas de la ONCE", async () => {
    const resultados = await actualizar(env.DB, ahora, fuentesSimuladas(403).pedir);

    expect(resultados.find((r) => r.tarea === "lnac")).toEqual({
      tarea: "lnac",
      filasNuevas: null,
      error: expect.stringContaining("HTTP 403"),
    });
    expect(resultados.find((r) => r.tarea === "once-historico")?.filasNuevas).toBe(32);
    expect((await ejecuciones()).find((f) => f.tarea === "lnac")?.error).toContain("HTTP 403");
  });

  it("acepta la respuesta de texto de SELAE cuando no hay sorteos", async () => {
    const pedir: Pedir = async (url, init) =>
      url.includes("loteriasyapuestas")
        ? new Response("No se ha encontrado ningún registro para los parámetros introducidos.")
        : fuentesSimuladas().pedir(url, init);
    const resultados = await actualizar(env.DB, ahora, pedir);
    expect(resultados.find((r) => r.tarea === "lnac")).toEqual({
      tarea: "lnac",
      filasNuevas: 0,
      error: null,
    });
  });
});

describe("fechaMadrid", () => {
  it("usa la fecha peninsular, no la de UTC", () => {
    // 31/03/2019 22:30 UTC son las 00:30 del 1 de abril en horario de verano.
    expect(fechaMadrid(new Date("2019-03-31T22:30:00Z"))).toEqual({
      anio: 2019,
      mes: 4,
      dia: 1,
      iso: "2019-04-01",
    });
    expect(fechaMadrid(new Date("2019-01-15T22:30:00Z")).iso).toBe("2019-01-15");
  });
});
