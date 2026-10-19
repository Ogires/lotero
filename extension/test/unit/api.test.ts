import { describe, expect, it } from "vitest";
import { crearConsultor, type Pedir } from "../../src/api";

const RESPUESTA = { numero: "16056", hayResultados: false, resultados: [] };

function contador(respuestas: Response[]): { pedir: Pedir; urls: string[] } {
  const urls: string[] = [];
  return {
    urls,
    pedir: async (url) => {
      urls.push(url);
      return respuestas.shift() ?? Response.json(RESPUESTA);
    },
  };
}

describe("crearConsultor", () => {
  it("consulta la API con el número", async () => {
    const { pedir, urls } = contador([]);
    const consultar = crearConsultor(pedir, "https://api.test");

    expect(await consultar("16056")).toEqual(RESPUESTA);
    expect(urls).toEqual(["https://api.test/api/resultados/16056"]);
  });

  it("reutiliza la respuesta de un número ya consultado", async () => {
    const { pedir, urls } = contador([]);
    const consultar = crearConsultor(pedir, "https://api.test");

    await consultar("16056");
    await consultar("16056");
    expect(urls).toHaveLength(1);
  });

  it("falla con el estado HTTP y no cachea el error", async () => {
    const { pedir, urls } = contador([new Response("caído", { status: 503 })]);
    const consultar = crearConsultor(pedir, "https://api.test");

    await expect(consultar("16056")).rejects.toThrow("HTTP 503");
    expect(await consultar("16056")).toEqual(RESPUESTA);
    expect(urls).toHaveLength(2);
  });
});
