import { consultarNumero } from "./consulta";
import { cabecerasCors, conCabeceras, error, json, METODOS_PERMITIDOS } from "./http";
import { numeroCincoCifras } from "./tipos";

const SEGUNDOS_CACHE = 3600;
const RUTA_RESULTADOS = /^\/api\/resultados\/([^/]*)$/;

async function resultados(
  request: Request,
  numeroCrudo: string,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  // Sin decodificar: un número válido solo tiene dígitos, y un "%" mal formado lanzaría un error.
  const numero = numeroCincoCifras(numeroCrudo);
  if (!numero) {
    return error(400, "numero_invalido", "El número debe tener exactamente cinco dígitos.");
  }

  // La caché guarda la respuesta sin CORS: las cabeceras CORS dependen de cada petición.
  const clave = new Request(new URL(`/api/resultados/${numero}`, request.url));
  const cache = caches.default;
  const cacheada = await cache.match(clave);
  if (cacheada) return cacheada;

  const respuesta = json(await consultarNumero(env.DB, numero), {
    headers: { "Cache-Control": `public, max-age=${SEGUNDOS_CACHE}` },
  });
  ctx.waitUntil(cache.put(clave, respuesta.clone()));
  return respuesta;
}

async function enrutar(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const { pathname } = new URL(request.url);
  const coincidencia = RUTA_RESULTADOS.exec(pathname);

  if (!coincidencia) return error(404, "no_encontrado", "Ruta no encontrada.");
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "GET") {
    const respuesta = error(405, "metodo_no_permitido", "Método no permitido.");
    respuesta.headers.set("Allow", METODOS_PERMITIDOS);
    return respuesta;
  }
  return resultados(request, coincidencia[1] ?? "", env, ctx);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    let respuesta: Response;
    try {
      respuesta = await enrutar(request, env, ctx);
    } catch (e) {
      console.error("Error no controlado", e);
      respuesta = error(500, "error_interno", "Error interno del servidor.");
    }
    return conCabeceras(respuesta, cabecerasCors(request, env.ORIGENES_PERMITIDOS));
  },
} satisfies ExportedHandler<Env>;
