// Genera los PNG del icono a partir de icono.svg con el Chromium de Playwright.
// Uso: node iconos/generar.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const svg = readFileSync(join(import.meta.dirname, "icono.svg"), "utf8");
const navegador = await chromium.launch();
for (const tam of [16, 32, 48, 128]) {
  const pagina = await navegador.newPage({ viewport: { width: tam, height: tam } });
  await pagina.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${tam}px;height:${tam}px}</style>${svg}`,
  );
  await pagina.screenshot({
    path: join(import.meta.dirname, `icono-${tam}.png`),
    omitBackground: true,
  });
  await pagina.close();
}
await navegador.close();
