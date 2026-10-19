// Compila la extensión en dist/ (content script empaquetado + manifest + iconos).
// Con --zip genera además lotero-<versión>.zip listo para subir a la Chrome Web Store.
// Uso: npm run build -w extension  |  npm run empaquetar -w extension

import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { build } from "esbuild";
import { zipSync } from "fflate";

const RAIZ = import.meta.dirname;
const DIST = join(RAIZ, "dist");
const manifest = JSON.parse(readFileSync(join(RAIZ, "manifest.json"), "utf8"));

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

await build({
  entryPoints: [join(RAIZ, "src", "principal.ts")],
  outfile: join(DIST, "contenido.js"),
  bundle: true,
  format: "iife",
  target: "chrome120",
  // Sin minificar: la revisión de la Chrome Web Store agradece código legible.
  minify: false,
  legalComments: "none",
  logLevel: "warning",
});

cpSync(join(RAIZ, "manifest.json"), join(DIST, "manifest.json"));
mkdirSync(join(DIST, "iconos"));
for (const icono of readdirSync(join(RAIZ, "iconos")).filter((f) => f.endsWith(".png"))) {
  cpSync(join(RAIZ, "iconos", icono), join(DIST, "iconos", icono));
}

function ficheros(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? ficheros(join(dir, e.name)) : [join(dir, e.name)],
  );
}

if (process.argv.includes("--zip")) {
  const entradas = Object.fromEntries(
    ficheros(DIST).map((f) => [relative(DIST, f).replaceAll("\\", "/"), readFileSync(f)]),
  );
  const zip = join(RAIZ, `lotero-${manifest.version}.zip`);
  writeFileSync(zip, zipSync(entradas, { level: 9 }));
  console.log(`Paquete: ${relative(process.cwd(), zip)}`);
}

console.log(`Compilada la extensión ${manifest.version} en ${relative(process.cwd(), DIST)}`);
