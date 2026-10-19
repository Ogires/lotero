// Cron del Worker: dispara el workflow de GitHub que recoge los premios.
// GitHub desactiva los `schedule` de los repos públicos tras 60 días sin actividad;
// un `workflow_dispatch` lanzado desde aquí no tiene ese problema.

import { registrarEjecucion } from "./db";
import type { Pedir } from "./fuentes/red";

export async function dispararActualizacion(env: Env, pedir: Pedir = fetch): Promise<void> {
  const inicio = new Date().toISOString();
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW}/dispatches`;
  let fallo: string | null = null;

  try {
    const respuesta = await pedir(url, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        "User-Agent": "lotero-api",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: env.GITHUB_RAMA }),
    });
    if (!respuesta.ok)
      fallo = `HTTP ${respuesta.status}: ${(await respuesta.text()).slice(0, 300)}`;
  } catch (e) {
    fallo = (e as Error).message;
  }

  await registrarEjecucion(env.DB, {
    tarea: "disparo",
    inicio,
    fin: new Date().toISOString(),
    filasNuevas: null,
    error: fallo,
  });
  // Lanzar marca la invocación como fallida en el panel de Cloudflare.
  if (fallo) throw new Error(`No se pudo disparar el workflow: ${fallo}`);
}
