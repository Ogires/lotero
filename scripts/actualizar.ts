// Actualización diaria: recoge los premios recientes y los envía a la API.
// La ejecuta el workflow `actualizar.yml`, que dispara el cron del Worker.
// Uso: LOTERO_API_URL=... LOTERO_ADMIN_TOKEN=... npm run actualizar -w scripts

import { enviarIngesta } from "./lib/ingesta";
import { fechaMadrid, TAREAS } from "./lib/tareas";

const urlApi = process.env.LOTERO_API_URL;
const token = process.env.LOTERO_ADMIN_TOKEN;
if (!urlApi || !token) {
  console.error("Faltan las variables de entorno LOTERO_API_URL y LOTERO_ADMIN_TOKEN");
  process.exit(2);
}

const hoy = fechaMadrid(new Date());
let fallos = 0;

// Las tareas son independientes: el fallo de una no impide las demás.
for (const [nombre, tarea] of TAREAS) {
  const inicio = new Date().toISOString();
  let premios: Awaited<ReturnType<typeof tarea>>["premios"] = [];
  let error: string | null = null;
  try {
    const recogida = await tarea(fetch, hoy);
    premios = recogida.premios;
    if (recogida.avisos.length > 0) error = recogida.avisos.join("\n");
  } catch (e) {
    error = (e as Error).message;
    fallos++;
  }

  try {
    const { filasNuevas } = await enviarIngesta(fetch, urlApi, token, {
      tarea: nombre,
      inicio,
      premios,
      error,
    });
    console.log(
      `${nombre}: ${premios.length} recogidos, ${filasNuevas} nuevos${error ? `\n  ! ${error}` : ""}`,
    );
  } catch (e) {
    console.error(`${nombre}: ${(e as Error).message}`);
    fallos++;
  }
}

if (fallos > 0) process.exitCode = 1;
