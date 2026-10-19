// Acceso a red para los scripts de carga: cookies, reintentos y caché en disco.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DIR_SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), "..");
export const DIR_CACHE = join(DIR_SCRIPTS, "cache");
export const DIR_SALIDA = join(DIR_SCRIPTS, "salida");

export const USER_AGENT_BOT = "LoteroBot/1.0 (+https://github.com/Ogires/lotero)";

export function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/** Sesión HTTP mínima que conserva cookies entre peticiones y reintenta errores transitorios. */
export class SesionHttp {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly cabeceras: Record<string, string> = {}) {}

  async texto(url: string, init: RequestInit = {}, reintentos = 3): Promise<string> {
    for (let intento = 0; ; intento++) {
      try {
        const headers = new Headers({
          ...this.cabeceras,
          ...(init.headers as Record<string, string>),
        });
        if (this.cookies.size > 0) {
          headers.set("Cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
        }
        const respuesta = await fetch(url, { ...init, headers });
        for (const cookie of respuesta.headers.getSetCookie()) {
          const [par = ""] = cookie.split(";");
          const separador = par.indexOf("=");
          if (separador > 0) this.cookies.set(par.slice(0, separador), par.slice(separador + 1));
        }
        if (respuesta.status === 429 || respuesta.status >= 500) {
          throw new Error(`HTTP ${respuesta.status}`);
        }
        if (!respuesta.ok) throw new ErrorDefinitivo(`HTTP ${respuesta.status} en ${url}`);
        return await respuesta.text();
      } catch (error) {
        if (error instanceof ErrorDefinitivo || intento >= reintentos) throw error;
        const espera = 2000 * 2 ** intento;
        console.warn(`  ! ${(error as Error).message}; reintento en ${espera / 1000} s`);
        await esperar(espera);
      }
    }
  }
}

class ErrorDefinitivo extends Error {}

/** Devuelve el contenido cacheado o lo obtiene y lo guarda (si `cachear` es true). */
export async function conCache(
  ruta: string,
  cachear: boolean,
  obtener: () => Promise<string>,
): Promise<{ contenido: string; deRed: boolean }> {
  const fichero = join(DIR_CACHE, ruta);
  if (cachear && existsSync(fichero)) {
    return { contenido: readFileSync(fichero, "utf8"), deRed: false };
  }
  const contenido = await obtener();
  if (cachear) {
    mkdirSync(dirname(fichero), { recursive: true });
    writeFileSync(fichero, contenido);
  }
  return { contenido, deRed: true };
}

export function guardarSalida(nombre: string, contenido: string): string {
  mkdirSync(DIR_SALIDA, { recursive: true });
  const fichero = join(DIR_SALIDA, nombre);
  writeFileSync(fichero, contenido);
  return fichero;
}
