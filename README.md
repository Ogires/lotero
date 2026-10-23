# Lotero

Extensión de Chrome que, en las páginas de compra de [juegosonce.es](https://www.juegosonce.es), indica si el número de cupón propuesto ya ha salido premiado en algún sorteo anterior de la ONCE o de la Lotería Nacional.

No está afiliada a la ONCE ni a Loterías y Apuestas del Estado.

La Chrome Web Store no la admite (su política prohíbe las extensiones que facilitan loterías), así que la versión pública es la web de consulta: https://ogires.github.io/lotero/. La extensión se puede cargar sin empaquetar para uso personal.

## Estructura

| Carpeta | Contenido |
|---|---|
| `extension/` | Extensión de Chrome (Manifest V3) |
| `api/` | API y scraper: Cloudflare Worker + D1 |
| `scripts/` | Carga inicial del histórico de resultados (Node, se ejecuta en local) |
| `store/` | Textos y capturas para la ficha de la Chrome Web Store |
| `docs/` | Web pública en GitHub Pages: consulta de números y política de privacidad |

## Desarrollo

Requiere Node 22 o superior.

```sh
npm install
npm run check      # lint (Biome) + tipos + tests
npm run format     # aplica el formato de Biome
npm run test:live  # tests de contrato contra las webs reales (usa la red)
```

### Extensión

Content script en TypeScript, empaquetado con esbuild en `extension/dist/`. No pide permisos: la API acepta por CORS el origen de juegosonce.es.

```sh
npm run build -w extension        # compila en extension/dist (cargar "sin empaquetar" en chrome://extensions)
npm run test:e2e -w extension     # E2E con Playwright: páginas guardadas + API simulada
npm run empaquetar -w extension   # extension/lotero-<versión>.zip para la Chrome Web Store
npm run capturas -w extension     # capturas y mosaico de la ficha en store/capturas (usa la red)
node extension/iconos/generar.mjs # regenera los PNG del icono desde icono.svg
```

### API en local

```sh
cd api
npm run db:migrate:local   # crea el esquema en la D1 local
npm run dev                # http://localhost:8787/api/resultados/16056
```

### Carga del histórico

Los scripts descargan con pausas de 1,5 s entre peticiones y guardan una caché en `scripts/cache/` (el mes o año en curso siempre se vuelve a pedir). El SQL resultante queda en `scripts/salida/`.

```sh
npm run backfill:once -w scripts      # cupones ONCE, mes a mes desde 1996 (~10 min)
npm run backfill:lnac -w scripts      # Lotería Nacional desde 2007 (API de SELAE)
npm run importar:volcado -w scripts   # adicionales ONCE del volcado de 2019 (../legado-2019/Sqls Exportacion, fuera del repo)
npm run validar -w scripts            # compara lo descargado con el volcado

# Carga en la D1 local (o --remote para producción)
cd api
for f in once-historico lnac volcado-2019; do
  npx wrangler d1 execute lotero --local --file ../scripts/salida/$f.sql
done
```

### Actualización diaria

SELAE bloquea las peticiones que salen de Cloudflare, así que la recogida se hace en GitHub Actions:

1. El cron del Worker (22:00 y 07:00 UTC) dispara el workflow `actualizar.yml` (`workflow_dispatch`).
2. El workflow ejecuta `npm run actualizar -w scripts`, con tres tareas independientes:
   - `once-feed`: último sorteo de cada cupón, con los adicionales del Sueldazo;
   - `once-historico`: histórico del mes en curso (y del anterior los tres primeros días);
   - `lnac`: Lotería Nacional de los últimos diez días.
3. Cada tarea envía lo recogido a `POST /admin/ingesta`, que guarda los premios y registra la ejecución en la tabla `ejecuciones`.

Secretos:

| Dónde | Nombre | Uso |
|---|---|---|
| Worker | `ADMIN_TOKEN` | Autoriza `POST /admin/ingesta` |
| Worker | `GITHUB_DISPATCH_TOKEN` | Token de grano fino (solo este repo, Actions: lectura y escritura) para disparar el workflow |
| GitHub | `LOTERO_ADMIN_TOKEN` | El mismo valor que `ADMIN_TOKEN` |

```sh
gh workflow run actualizar.yml   # lanzarlo a mano
cd api && npx wrangler d1 execute lotero --remote --command "SELECT * FROM ejecuciones ORDER BY id DESC LIMIT 8"
```

El workflow `contrato.yml` ejecuta cada lunes los tests `live` y abre una issue si alguna fuente cambia.

La versión publicada en 2019 (Manifest V2) se conserva en el historial de git (commit `b0d8ccf`).

## Licencia

El código se publica bajo la [licencia MIT](LICENSE).

Las páginas de juegosonce.es guardadas en `*/test/fixtures/` (solo para los tests) y los resultados de los sorteos pertenecen a sus titulares (ONCE y Loterías y Apuestas del Estado) y no están cubiertos por esa licencia.
