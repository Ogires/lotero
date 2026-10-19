import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { CargaIngesta, Premio } from "../../src/tipos";

const URL_INGESTA = "https://api.lotero.test/admin/ingesta";

const premio: Premio = {
  organismo: "ONCE",
  juego: "SUELDAZO",
  fecha: "2026-10-18",
  numero: "12345",
  serie: "042",
  tipo: "ADICIONAL",
  sorteo: null,
  fuente: "once-feed",
};

function carga(cambios: Partial<CargaIngesta> = {}): CargaIngesta {
  return {
    tarea: "once-feed",
    inicio: "2026-10-18T22:00:00.000Z",
    premios: [premio],
    error: null,
    ...cambios,
  };
}

function enviar(cuerpo: unknown, token = "token-de-prueba", metodo = "POST"): Promise<Response> {
  return exports.default.fetch(
    new Request(URL_INGESTA, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(metodo === "POST" ? { body: JSON.stringify(cuerpo) } : {}),
    }),
  );
}

async function ejecuciones() {
  const { results } = await env.DB.prepare(
    "SELECT tarea, inicio, filas_nuevas, error FROM ejecuciones ORDER BY id",
  ).run();
  return results;
}

beforeEach(async () => {
  await env.DB.exec("DELETE FROM premios");
  await env.DB.exec("DELETE FROM ejecuciones");
});

describe("POST /admin/ingesta", () => {
  it("guarda los premios y registra la ejecución", async () => {
    const respuesta = await enviar(carga());

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ filasNuevas: 1 });
    expect(await env.DB.prepare("SELECT numero, serie, tipo FROM premios").first()).toEqual({
      numero: "12345",
      serie: "042",
      tipo: "ADICIONAL",
    });
    expect(await ejecuciones()).toEqual([
      { tarea: "once-feed", inicio: "2026-10-18T22:00:00.000Z", filas_nuevas: 1, error: null },
    ]);
  });

  it("no duplica premios ya guardados", async () => {
    await enviar(carga());
    const segunda = await enviar(carga());
    expect(await segunda.json()).toEqual({ filasNuevas: 0 });
  });

  it("registra el error de una recogida fallida sin filas", async () => {
    const respuesta = await enviar(carga({ tarea: "lnac", premios: [], error: "HTTP 403" }));

    expect(respuesta.status).toBe(200);
    expect(await ejecuciones()).toEqual([
      expect.objectContaining({ tarea: "lnac", filas_nuevas: null, error: "HTTP 403" }),
    ]);
  });

  it("guarda lo recogido aunque haya avisos", async () => {
    await enviar(carga({ error: "2026-10: bloque raro" }));
    expect(await ejecuciones()).toEqual([
      expect.objectContaining({ filas_nuevas: 1, error: "2026-10: bloque raro" }),
    ]);
  });

  it.each([
    ["sin token", ""],
    ["con un token incorrecto", "otro-token"],
    ["con un prefijo del token", "token-de"],
  ])("rechaza la petición %s", async (_caso, token) => {
    const respuesta = await enviar(carga(), token);
    expect(respuesta.status).toBe(401);
    expect(await ejecuciones()).toEqual([]);
  });

  it.each<[string, unknown]>([
    ["una tarea desconocida", carga({ tarea: "otra" as CargaIngesta["tarea"] })],
    ["un inicio no válido", carga({ inicio: "ayer" })],
    ["un número de cuatro cifras", carga({ premios: [{ ...premio, numero: "1234" }] })],
    [
      "un juego desconocido",
      carga({ premios: [{ ...premio, juego: "BONOLOTO" as Premio["juego"] }] }),
    ],
    ["un juego de otro organismo", carga({ premios: [{ ...premio, organismo: "LNAC" }] })],
    [
      "un tipo heredado de Object",
      carga({ premios: [{ ...premio, tipo: "toString" as Premio["tipo"] }] }),
    ],
    ["una fecha no ISO", carga({ premios: [{ ...premio, fecha: "18/10/2026" }] })],
    ["una serie no numérica", carga({ premios: [{ ...premio, serie: "x" }] })],
    ["una fuente no permitida", carga({ premios: [{ ...premio, fuente: "volcado-2019" }] })],
    ["algo que no es un objeto", [1, 2, 3]],
  ])("rechaza una carga con %s", async (_caso, cuerpo) => {
    const respuesta = await enviar(cuerpo);
    expect(respuesta.status).toBe(400);
    expect(await respuesta.json()).toMatchObject({ error: "carga_invalida" });
    expect(await env.DB.prepare("SELECT count(*) n FROM premios").first("n")).toBe(0);
  });

  it("rechaza un cuerpo que no es JSON", async () => {
    const respuesta = await exports.default.fetch(
      new Request(URL_INGESTA, {
        method: "POST",
        headers: { Authorization: "Bearer token-de-prueba" },
        body: "no es json",
      }),
    );
    expect(respuesta.status).toBe(400);
  });

  it("solo acepta POST", async () => {
    const respuesta = await enviar(undefined, "token-de-prueba", "GET");
    expect(respuesta.status).toBe(405);
    expect(respuesta.headers.get("Allow")).toBe("POST");
  });
});
