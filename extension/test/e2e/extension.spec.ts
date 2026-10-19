// E2E: la extensión compilada (dist/) cargada en Chromium sobre copias guardadas de las
// páginas de juegosonce.es, servidas en su URL real con `route`, y con la API simulada.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type BrowserContext, chromium, expect, type Page, test } from "@playwright/test";
import type { RespuestaConsulta } from "../../../api/src/tipos";

const DIST = join(import.meta.dirname, "..", "..", "dist");
const FIXTURES = join(import.meta.dirname, "..", "fixtures");
const ORIGEN = "https://www.juegosonce.es";
const API = "https://lotero-api.webninja.workers.dev/api/resultados/";

const PREMIADO: RespuestaConsulta = {
  numero: "16056",
  hayResultados: true,
  resultados: [
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
    {
      fecha: "2008-05-10",
      organismo: "LNAC",
      juego: "LN_SABADO",
      juegoNombre: "Lotería Nacional (sábado)",
      tipo: "SEGUNDO",
      tipoNombre: "2º premio",
      serie: null,
      sorteo: null,
    },
  ],
};

let contexto: BrowserContext;
let estadoApi = 200;
const consultas: string[] = [];

test.beforeEach(async () => {
  estadoApi = 200;
  consultas.length = 0;
  contexto = await chromium.launchPersistentContext("", {
    channel: "chromium",
    args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
  });

  await contexto.route(`${ORIGEN}/**`, async (ruta) => {
    const { pathname } = new URL(ruta.request().url());
    const pagina = pathname.slice(1);
    if (["cupon-diario", "cuponazo", "sueldazo-fin-de-semana"].includes(pagina)) {
      await ruta.fulfill({
        contentType: "text/html; charset=utf-8",
        body: readFileSync(join(FIXTURES, `${pagina}.html`), "utf8"),
      });
    } else {
      // Sin red: ni scripts ni estilos de la web real.
      await ruta.abort();
    }
  });
  await contexto.route(/^https:\/\/(?!www\.juegosonce\.es\/|lotero-api\.).*/, (ruta) =>
    ruta.abort(),
  );

  await contexto.route(`${API}*`, async (ruta) => {
    const numero = ruta.request().url().slice(API.length);
    consultas.push(numero);
    const cabeceras = { "Access-Control-Allow-Origin": ORIGEN };
    if (estadoApi !== 200) {
      await ruta.fulfill({ status: estadoApi, headers: cabeceras, json: { error: "caida" } });
      return;
    }
    const cuerpo =
      numero === PREMIADO.numero ? PREMIADO : { numero, hayResultados: false, resultados: [] };
    await ruta.fulfill({ headers: cabeceras, json: cuerpo });
  });
});

test.afterEach(async () => {
  await contexto.close();
});

/** Hace lo mismo que la web al elegir un dígito: sustituir su <span>. */
async function elegirNumero(pagina: Page, numero: string): Promise<void> {
  await pagina.evaluate((digitos) => {
    const spans = document.querySelectorAll(".buscacupon-ticket__numero span");
    digitos.split("").forEach((digito, i) => {
      const nuevo = document.createElement("span");
      nuevo.setAttribute("aria-hidden", "true");
      nuevo.textContent = digito;
      spans[i]?.replaceWith(nuevo);
    });
  }, numero);
}

for (const producto of ["cupon-diario", "cuponazo", "sueldazo-fin-de-semana"]) {
  test(`${producto}: indica si el número ya ha salido premiado`, async () => {
    const pagina = await contexto.newPage();
    await pagina.goto(`${ORIGEN}/${producto}`);

    const indicador = pagina.locator("[data-lotero]");
    await expect(indicador).toBeAttached();
    await expect(indicador).toBeHidden();

    await elegirNumero(pagina, "16056");
    const estado = pagina.locator("[data-lotero]").getByRole("status");
    await expect(estado).toContainText("El 16056 ha salido premiado 2 veces");

    await pagina.locator("[data-lotero]").getByRole("button", { name: "Ver premios" }).click();
    const dialogo = pagina.getByRole("dialog", { name: "Premios del número 16056" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator("tbody tr")).toHaveCount(2);
    await expect(dialogo.locator("tbody tr").first()).toContainText("01/03/2019");
    await pagina.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();

    await elegirNumero(pagina, "00001");
    await expect(estado).toContainText("El 00001 nunca ha salido premiado");
    expect(consultas).toEqual(["16056", "00001"]);
  });
}

test("no consulta mientras el número está incompleto", async () => {
  const pagina = await contexto.newPage();
  await pagina.goto(`${ORIGEN}/cupon-diario`);
  await elegirNumero(pagina, "160");
  await pagina.waitForTimeout(600);
  expect(consultas).toEqual([]);
  await expect(pagina.locator("[data-lotero]")).toBeHidden();
});

test("avisa si la API no responde y permite reintentar", async () => {
  estadoApi = 503;
  const pagina = await contexto.newPage();
  await pagina.goto(`${ORIGEN}/cuponazo`);
  await elegirNumero(pagina, "16056");

  const estado = pagina.locator("[data-lotero]").getByRole("status");
  await expect(estado).toContainText("No se ha podido comprobar el número.");

  estadoApi = 200;
  await pagina.locator("[data-lotero]").getByRole("button", { name: "Reintentar" }).click();
  await expect(estado).toContainText("El 16056 ha salido premiado 2 veces");
});
