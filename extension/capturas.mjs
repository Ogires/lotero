// Capturas para la ficha de la Chrome Web Store (1280×800) y mosaico promocional (440×280).
// Carga dist/ en Chromium sobre las páginas guardadas de test/fixtures, servidas en su URL
// real; los estilos de juegosonce.es y la API de Lotero se piden a la red de verdad.
// Uso: npm run build && npm run capturas

import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const DIST = join(import.meta.dirname, "dist");
const FIXTURES = join(import.meta.dirname, "test", "fixtures");
const SALIDA = join(import.meta.dirname, "..", "store", "capturas");
const ORIGEN = "https://www.juegosonce.es";
const PAGINAS = ["cupon-diario", "cuponazo", "sueldazo-fin-de-semana"];

mkdirSync(SALIDA, { recursive: true });

const contexto = await chromium.launchPersistentContext("", {
  channel: "chromium",
  viewport: { width: 1280, height: 800 },
  locale: "es-ES",
  args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
});

await contexto.route(`${ORIGEN}/**`, async (ruta) => {
  const pagina = new URL(ruta.request().url()).pathname.slice(1);
  if (PAGINAS.includes(pagina)) {
    await ruta.fulfill({
      contentType: "text/html; charset=utf-8",
      body: readFileSync(join(FIXTURES, `${pagina}.html`), "utf8"),
    });
  } else {
    await ruta.abort();
  }
});
// Solo estilos e imágenes de juegosonce.es y la API: sin scripts, cookies ni analítica.
await contexto.route(/^https:\/\/(?!www\.juegosonce\.es\/|lotero-api\.)/, (ruta) => {
  const tipo = ruta.request().resourceType();
  const url = ruta.request().url();
  if (url.includes("juegosonce.es") && ["stylesheet", "image", "font"].includes(tipo)) {
    return ruta.continue();
  }
  return ruta.abort();
});

/** Hace lo mismo que la web al elegir un dígito: sustituir su <span>. */
async function elegirNumero(pagina, numero) {
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

async function abrir(producto, numero, texto) {
  const pagina = await contexto.newPage();
  await pagina.goto(`${ORIGEN}/${producto}`, { waitUntil: "load" });
  await elegirNumero(pagina, numero);
  const indicador = pagina.locator("[data-lotero]");
  await indicador.getByRole("status").filter({ hasText: texto }).waitFor();
  // El indicador queda en la mitad inferior de la pantalla, con el cupón encima.
  await indicador.evaluate((el) => {
    const { top } = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + top - 520);
  });
  return pagina;
}

let pagina = await abrir("cuponazo", "54732", "ha salido premiado 2 veces");
await pagina.screenshot({ path: join(SALIDA, "1-premiado.png") });
await pagina.locator("[data-lotero]").getByRole("button", { name: "Ver premios" }).click();
await pagina.getByRole("dialog", { name: "Premios del número 54732" }).waitFor();
await pagina.screenshot({ path: join(SALIDA, "2-detalle.png") });
await pagina.close();

pagina = await abrir("cupon-diario", "12345", "nunca ha salido premiado");
await pagina.screenshot({ path: join(SALIDA, "3-nunca-premiado.png") });
await pagina.close();

// Mosaico promocional: icono y lema, sin marcas de terceros.
pagina = await contexto.newPage();
await pagina.setViewportSize({ width: 440, height: 280 });
const icono = readFileSync(join(DIST, "iconos", "icono-128.png")).toString("base64");
await pagina.setContent(`<!doctype html><meta charset="utf-8">
<style>
  body { margin: 0; width: 440px; height: 280px; display: flex; align-items: center; gap: 24px;
    padding: 0 32px; box-sizing: border-box; font-family: "Segoe UI", system-ui, sans-serif;
    background: linear-gradient(135deg, #14244d, #2b4a9a); color: #fff; }
  img { width: 112px; height: 112px; flex: none; }
  h1 { margin: 0 0 8px; font-size: 40px; }
  p { margin: 0; font-size: 19px; line-height: 1.3; }
</style>
<img src="data:image/png;base64,${icono}" alt="">
<div><h1>Lotero</h1><p>¿Ya ha salido premiado este número?</p></div>`);
await pagina.screenshot({ path: join(SALIDA, "mosaico-440x280.png") });

await contexto.close();
console.log(`Capturas en ${SALIDA}`);
