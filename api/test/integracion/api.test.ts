import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { RespuestaConsulta } from "../../src/consulta";
import { insertarPremios } from "../../src/db";

const ORIGEN = "https://www.juegosonce.es";
const BASE = "https://api.lotero.test";

function pedir(ruta: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`${BASE}${ruta}`, init));
}

beforeEach(async () => {
  await env.DB.exec("DELETE FROM premios");
});

// Cada test usa un número distinto: la Cache API persiste entre tests.
describe("GET /api/resultados/:numero", () => {
  it("devuelve los premios del número, del más reciente al más antiguo", async () => {
    await insertarPremios(env.DB, [
      {
        organismo: "ONCE",
        juego: "CUPONAZO",
        fecha: "2019-03-01",
        numero: "16056",
        serie: "129",
        tipo: "PRINCIPAL",
        sorteo: null,
        fuente: "once-historico",
      },
      {
        organismo: "LNAC",
        juego: "LN_JUEVES",
        fecha: "2019-03-14",
        numero: "16056",
        serie: "",
        tipo: "SEGUNDO",
        sorteo: null,
        fuente: "lnac-api",
      },
    ]);

    const respuesta = await pedir("/api/resultados/16056");

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("content-type")).toContain("application/json");
    expect(await respuesta.json()).toEqual<RespuestaConsulta>({
      numero: "16056",
      hayResultados: true,
      resultados: [
        {
          fecha: "2019-03-14",
          organismo: "LNAC",
          juego: "LN_JUEVES",
          juegoNombre: "Lotería Nacional (jueves)",
          tipo: "SEGUNDO",
          tipoNombre: "2º premio",
          serie: null,
          sorteo: null,
        },
        {
          fecha: "2019-03-01",
          organismo: "ONCE",
          juego: "CUPONAZO",
          juegoNombre: "Cuponazo",
          tipo: "PRINCIPAL",
          tipoNombre: "Premio principal",
          serie: "129",
          sorteo: null,
        },
      ],
    });
  });

  it("indica que no hay resultados si el número nunca ha salido", async () => {
    const respuesta = await pedir("/api/resultados/00001");

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({
      numero: "00001",
      hayResultados: false,
      resultados: [],
    });
  });

  it.each(["123", "123456", "12a45", "%20%20", "%E0"])(
    "rechaza el número no válido %j con 400",
    async (numero) => {
      const respuesta = await pedir(`/api/resultados/${numero}`);

      expect(respuesta.status).toBe(400);
      expect(await respuesta.json()).toMatchObject({ error: "numero_invalido" });
    },
  );

  it("permite cachear la respuesta", async () => {
    const respuesta = await pedir("/api/resultados/00002");

    expect(respuesta.headers.get("cache-control")).toBe("public, max-age=3600");
  });
});

describe("CORS", () => {
  it("autoriza el origen de juegosonce.es", async () => {
    const respuesta = await pedir("/api/resultados/00003", { headers: { Origin: ORIGEN } });

    expect(respuesta.headers.get("access-control-allow-origin")).toBe(ORIGEN);
    expect(respuesta.headers.get("vary")).toContain("Origin");
  });

  it("autoriza el origen de la web de consulta", async () => {
    const respuesta = await pedir("/api/resultados/00006", {
      headers: { Origin: "https://ogires.github.io" },
    });

    expect(respuesta.headers.get("access-control-allow-origin")).toBe("https://ogires.github.io");
  });

  it("no autoriza otros orígenes", async () => {
    const respuesta = await pedir("/api/resultados/00004", {
      headers: { Origin: "https://otra-web.example" },
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("responde a la petición preflight", async () => {
    const respuesta = await pedir("/api/resultados/00005", {
      method: "OPTIONS",
      headers: { Origin: ORIGEN, "Access-Control-Request-Method": "GET" },
    });

    expect(respuesta.status).toBe(204);
    expect(respuesta.headers.get("access-control-allow-origin")).toBe(ORIGEN);
    expect(respuesta.headers.get("access-control-allow-methods")).toContain("GET");
  });
});

describe("rutas y métodos", () => {
  it("devuelve 404 en rutas desconocidas", async () => {
    const respuesta = await pedir("/no-existe");

    expect(respuesta.status).toBe(404);
    expect(await respuesta.json()).toMatchObject({ error: "no_encontrado" });
  });

  it("devuelve 405 con métodos no admitidos", async () => {
    const respuesta = await pedir("/api/resultados/16056", { method: "POST" });

    expect(respuesta.status).toBe(405);
    expect(respuesta.headers.get("allow")).toBe("GET, OPTIONS");
  });
});
