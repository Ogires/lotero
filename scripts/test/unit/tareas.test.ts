import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Pedir } from "../../../api/src/fuentes/red";
import { fechaMadrid, type NombreTarea, TAREAS } from "../../lib/tareas";

function fixture(nombre: string): string {
  return readFileSync(new URL(`../../../api/test/fixtures/${nombre}`, import.meta.url), "utf8");
}

const feedXml = fixture("once-feed-2026-10-18.xml");
const marzo2019 = fixture("once-historico-2019-03.html");
const lnacJson = fixture("lnac-sorteos-seleccion.json");

interface Peticion {
  url: string;
  metodo: string;
  cabeceras: Headers;
  cuerpo: string;
}

interface Opciones {
  estadoLnac?: number;
  /** Respuestas del POST del histórico, en orden; después, la de marzo de 2019. */
  postsHistorico?: string[];
}

/** Simula juegosonce.es y SELAE con las respuestas reales guardadas en las fixtures. */
function fuentesSimuladas(opciones: Opciones = {}): { pedir: Pedir; peticiones: Peticion[] } {
  const { estadoLnac = 200, postsHistorico = [] } = opciones;
  const peticiones: Peticion[] = [];
  const pedir: Pedir = async (url, init = {}) => {
    const cuerpo = init.body ? String(init.body) : "";
    const metodo = init.method ?? "GET";
    peticiones.push({ url, metodo, cabeceras: new Headers(init.headers), cuerpo });

    if (url.includes("sorteos2.xml")) return new Response(feedXml);
    if (url.includes("historico-resultados-cupones-once")) {
      if (metodo !== "POST") {
        const headers = new Headers();
        headers.append("Set-Cookie", "sesion=abc; Path=/; HttpOnly");
        headers.append("Set-Cookie", "idioma=es; Path=/");
        return new Response(marzo2019, { headers });
      }
      const preparada = postsHistorico.shift();
      if (preparada !== undefined) return new Response(preparada);
      // Solo hay datos para marzo de 2019; otro mes devuelve un listado vacío.
      return new Response(cuerpo.includes("mes=03") ? marzo2019 : '<div class="detresult"></div>');
    }
    if (url.includes("loteriasyapuestas.es")) {
      return estadoLnac === 200
        ? new Response(lnacJson)
        : new Response("Access Denied", { status: estadoLnac });
    }
    return new Response("No encontrado", { status: 404 });
  };
  return { pedir, peticiones };
}

function tarea(nombre: NombreTarea) {
  const encontrada = TAREAS.find(([n]) => n === nombre);
  if (!encontrada) throw new Error(`Tarea ${nombre} inexistente`);
  return encontrada[1];
}

const hoy = fechaMadrid(new Date("2019-03-20T22:00:00Z"));

describe("tarea once-feed", () => {
  it("devuelve los premios del feed", async () => {
    const { premios, avisos } = await tarea("once-feed")(fuentesSimuladas().pedir, hoy);
    expect(premios.length).toBeGreaterThan(0);
    expect(avisos).toEqual([]);
  });

  it("falla si el feed no trae sorteos", async () => {
    const pedir: Pedir = async () => new Response("<rss></rss>");
    await expect(tarea("once-feed")(pedir, hoy)).rejects.toThrow(/no contiene sorteos/);
  });
});

describe("tarea once-historico", () => {
  it("devuelve los sorteos del mes en curso", async () => {
    const { premios, avisos } = await tarea("once-historico")(fuentesSimuladas().pedir, hoy);
    expect(premios).toHaveLength(32);
    expect(avisos).toEqual([]);
  });

  it("envía el token CSRF y las cookies de la sesión", async () => {
    const { pedir, peticiones } = fuentesSimuladas();
    await tarea("once-historico")(pedir, hoy);

    const post = peticiones.find((p) => p.metodo === "POST");
    expect(post?.cuerpo).toMatch(/^mes=03&anio=2019&csrf-param=[0-9a-f-]{36}$/);
    expect(post?.cabeceras.get("Cookie")).toBe("sesion=abc; idioma=es");
    expect(post?.cabeceras.get("User-Agent")).toMatch(/^LoteroBot\//);
  });

  it("relee el mes anterior en los primeros días del mes", async () => {
    const { pedir, peticiones } = fuentesSimuladas();
    await tarea("once-historico")(pedir, fechaMadrid(new Date("2019-04-02T07:00:00Z")));

    const meses = peticiones.filter((p) => p.metodo === "POST").map((p) => p.cuerpo.slice(0, 16));
    expect(meses).toEqual(["mes=03&anio=2019", "mes=04&anio=2019"]);
  });

  it("reintenta con sesión nueva si la web devuelve otra página", async () => {
    const { pedir, peticiones } = fuentesSimuladas({ postsHistorico: ["<html>Espere</html>"] });
    const { premios, avisos } = await tarea("once-historico")(pedir, hoy);

    expect(premios).toHaveLength(32);
    expect(avisos).toEqual([]);
    expect(peticiones.filter((p) => p.metodo === "GET")).toHaveLength(2);
  });

  it("devuelve un aviso si el reintento también falla", async () => {
    const pagina = "<html>Espere</html>";
    const { pedir } = fuentesSimuladas({ postsHistorico: [pagina, pagina] });
    const { premios, avisos } = await tarea("once-historico")(pedir, hoy);

    expect(premios).toEqual([]);
    expect(avisos).toEqual(["2019-03: La página no contiene el bloque .detresult"]);
  });
});

describe("tarea lnac", () => {
  it("consulta los últimos diez días con Accept-Encoding, sin el que Akamai responde 403", async () => {
    const { pedir, peticiones } = fuentesSimuladas();
    const { premios } = await tarea("lnac")(pedir, hoy);

    expect(premios.length).toBeGreaterThan(0);
    const selae = peticiones.find((p) => p.url.includes("loteriasyapuestas"));
    expect(selae?.url).toContain("fechaInicioInclusiva=20190310&fechaFinInclusiva=20190320");
    expect(selae?.cabeceras.get("Accept-Encoding")).toContain("gzip");
  });

  it("falla con el estado HTTP si SELAE bloquea", async () => {
    const { pedir } = fuentesSimuladas({ estadoLnac: 403 });
    await expect(tarea("lnac")(pedir, hoy)).rejects.toThrow(/HTTP 403/);
  });

  it("acepta la respuesta de texto de SELAE cuando no hay sorteos", async () => {
    const pedir: Pedir = async () =>
      new Response("No se ha encontrado ningún registro para los parámetros introducidos.");
    expect(await tarea("lnac")(pedir, hoy)).toEqual({ premios: [], avisos: [] });
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
