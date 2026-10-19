// Cliente del endpoint de administración de la API (`POST /admin/ingesta`).

import type { Pedir } from "../../api/src/fuentes/red";
import type { CargaIngesta, RespuestaIngesta } from "../../api/src/tipos";

export async function enviarIngesta(
  pedir: Pedir,
  urlApi: string,
  token: string,
  carga: CargaIngesta,
): Promise<RespuestaIngesta> {
  const url = new URL("/admin/ingesta", urlApi).toString();
  const respuesta = await pedir(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(carga),
  });
  if (!respuesta.ok) {
    throw new Error(
      `La API rechazó la ingesta (HTTP ${respuesta.status}): ${await respuesta.text()}`,
    );
  }
  return (await respuesta.json()) as RespuestaIngesta;
}
