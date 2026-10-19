// Utilidades HTTP comunes a los adaptadores de fuentes (Worker y scripts).

export const USER_AGENT_BOT = "LoteroBot/1.0 (+https://github.com/Ogires/lotero)";

/** Firma de `fetch`, inyectable para poder simular las fuentes en los tests. */
export type Pedir = (url: string, init?: RequestInit) => Promise<Response>;

/** Cuerpo de la respuesta como texto; lanza un error si el estado no es 2xx. */
export async function textoOk(respuesta: Response, url: string): Promise<string> {
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${url}`);
  return respuesta.text();
}
