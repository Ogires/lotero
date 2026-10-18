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

La versión publicada en 2019 (Manifest V2) se conserva en el historial de git (commit `b0d8ccf`).
