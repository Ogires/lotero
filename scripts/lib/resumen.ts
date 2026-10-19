import type { Premio } from "../../api/src/tipos";

/** Recuento de premios por año y juego, para revisar a simple vista que no faltan meses. */
export function resumenPorAnio(premios: readonly Premio[]): Record<string, Record<string, number>> {
  const resumen: Record<string, Record<string, number>> = {};
  for (const p of premios) {
    const anio = p.fecha.slice(0, 4);
    const clave = `${p.juego}:${p.tipo}`;
    const fila = resumen[anio] ?? {};
    fila[clave] = (fila[clave] ?? 0) + 1;
    resumen[anio] = fila;
  }
  return resumen;
}
