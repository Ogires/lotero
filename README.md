# Lotero

Extensión de Chrome que, en las páginas de compra de [juegosonce.es](https://www.juegosonce.es), indica si el número de cupón propuesto ya ha salido premiado en algún sorteo anterior de la ONCE o de la Lotería Nacional.

No está afiliada a la ONCE ni a Loterías y Apuestas del Estado.

## Estructura

> Relanzamiento en curso: `api/` y `scripts/` todavía no existen, y `extension/` contiene aún la versión de 2019 a la espera de migrarla a Manifest V3.

| Carpeta | Contenido |
|---|---|
| `extension/` | Extensión de Chrome (Manifest V3) |
| `api/` | API y scraper: Cloudflare Worker + D1 |
| `scripts/` | Carga inicial del histórico de resultados (Node, se ejecuta en local) |
| `store/` | Textos y capturas para la ficha de la Chrome Web Store |
| `docs/` | Web pública en GitHub Pages (política de privacidad) |

## Desarrollo

Requiere Node 22 o superior.

```sh
npm install
npm run check      # lint (Biome) + tipos + tests
npm run format     # aplica el formato de Biome
npm run test:live  # tests de contrato contra las webs reales (usa la red)
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
npm run importar:volcado -w scripts   # adicionales ONCE del volcado de 2019 (carpeta "Sqls Exportacion")
npm run validar -w scripts            # compara lo descargado con el volcado

# Carga en la D1 local (o --remote para producción)
cd api
for f in once-historico lnac volcado-2019; do
  npx wrangler d1 execute lotero --local --file ../scripts/salida/$f.sql
done
```

La versión publicada en 2019 (Manifest V2) se conserva en el historial de git (commit `b0d8ccf`).
