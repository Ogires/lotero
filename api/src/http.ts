// Utilidades HTTP: respuestas JSON y CORS.

export const METODOS_PERMITIDOS = "GET, OPTIONS";

export function json(cuerpo: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(cuerpo), { ...init, headers });
}

export function error(status: number, codigo: string, mensaje: string): Response {
  return json({ error: codigo, mensaje }, { status });
}

/** Cabeceras CORS para el origen de la petición, solo si está en la lista permitida. */
export function cabecerasCors(request: Request, origenesPermitidos: string): Headers {
  const headers = new Headers({ Vary: "Origin" });
  const origen = request.headers.get("Origin");
  const permitidos = origenesPermitidos.split(",").map((o) => o.trim());

  if (origen && permitidos.includes(origen)) {
    headers.set("Access-Control-Allow-Origin", origen);
    headers.set("Access-Control-Allow-Methods", METODOS_PERMITIDOS);
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

/** Copia la respuesta añadiendo cabeceras (las respuestas de la caché son inmutables). */
export function conCabeceras(respuesta: Response, extra: Headers): Response {
  const copia = new Response(respuesta.body, respuesta);
  for (const [nombre, valor] of extra) {
    if (nombre.toLowerCase() === "vary") copia.headers.append(nombre, valor);
    else copia.headers.set(nombre, valor);
  }
  return copia;
}
