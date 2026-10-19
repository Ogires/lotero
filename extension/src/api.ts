// Cliente de la API de Lotero. La API permite por CORS el origen de juegosonce.es,
// así que la extensión no necesita permisos de host.

import type { RespuestaConsulta } from "../../api/src/tipos";

export const URL_API = "https://lotero-api.lotero-api.workers.dev";

export type Pedir = (url: string) => Promise<Response>;
export type Consultar = (numero: string) => Promise<RespuestaConsulta>;

/** Crea una función de consulta con caché en memoria (los errores no se cachean). */
export function crearConsultor(pedir: Pedir = (url) => fetch(url), base = URL_API): Consultar {
  const cache = new Map<string, Promise<RespuestaConsulta>>();

  return (numero) => {
    const enCache = cache.get(numero);
    if (enCache) return enCache;

    const consulta = (async () => {
      const respuesta = await pedir(`${base}/api/resultados/${numero}`);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      return (await respuesta.json()) as RespuestaConsulta;
    })();
    cache.set(numero, consulta);
    consulta.catch(() => cache.delete(numero));
    return consulta;
  };
}
