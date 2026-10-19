import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { dispararActualizacion } from "../../src/disparo";
import type { Pedir } from "../../src/fuentes/red";

async function ejecuciones() {
  const { results } = await env.DB.prepare(
    "SELECT tarea, filas_nuevas, error FROM ejecuciones ORDER BY id",
  ).run();
  return results;
}

function githubSimulado(respuesta: Response) {
  const peticiones: Array<{ url: string; init: RequestInit }> = [];
  const pedir: Pedir = async (url, init = {}) => {
    peticiones.push({ url, init });
    return respuesta;
  };
  return { pedir, peticiones };
}

beforeEach(async () => {
  await env.DB.exec("DELETE FROM ejecuciones");
});

describe("dispararActualizacion", () => {
  it("lanza el workflow en la rama configurada y lo registra", async () => {
    const { pedir, peticiones } = githubSimulado(new Response(null, { status: 204 }));
    await dispararActualizacion(env, pedir);

    expect(peticiones).toHaveLength(1);
    const [{ url, init }] = peticiones as [(typeof peticiones)[number]];
    expect(url).toBe(
      "https://api.github.com/repos/Ogires/lotero/actions/workflows/actualizar.yml/dispatches",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ ref: "main" });
    const cabeceras = new Headers(init.headers);
    expect(cabeceras.get("Authorization")).toBe("Bearer github-de-prueba");
    expect(cabeceras.get("User-Agent")).toBeTruthy();

    expect(await ejecuciones()).toEqual([{ tarea: "disparo", filas_nuevas: null, error: null }]);
  });

  it("registra el rechazo de GitHub y lanza un error", async () => {
    const { pedir } = githubSimulado(new Response("Bad credentials", { status: 401 }));

    await expect(dispararActualizacion(env, pedir)).rejects.toThrow(/HTTP 401/);
    expect(await ejecuciones()).toEqual([
      { tarea: "disparo", filas_nuevas: null, error: "HTTP 401: Bad credentials" },
    ]);
  });

  it("registra un fallo de red", async () => {
    const pedir: Pedir = async () => {
      throw new Error("sin conexión");
    };
    await expect(dispararActualizacion(env, pedir)).rejects.toThrow(/sin conexión/);
    expect((await ejecuciones())[0]).toMatchObject({ error: "sin conexión" });
  });
});
