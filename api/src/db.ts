// Única capa que conoce SQL y D1.

import type { Juego, Organismo, Premio, TipoPremio } from "./tipos";

const TAMANO_BLOQUE = 50;

const SQL_INSERTAR = `INSERT OR IGNORE INTO premios
  (organismo, juego, fecha, numero, serie, tipo, sorteo, fuente)
  VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`;

export interface PremioGuardado {
  organismo: Organismo;
  juego: Juego;
  fecha: string;
  serie: string;
  tipo: TipoPremio;
  sorteo: string | null;
}

/** Inserta los premios ignorando los que ya existen. Devuelve cuántos son nuevos. */
export async function insertarPremios(db: D1Database, premios: readonly Premio[]): Promise<number> {
  const sentencia = db.prepare(SQL_INSERTAR);
  let nuevos = 0;

  for (let i = 0; i < premios.length; i += TAMANO_BLOQUE) {
    const bloque = premios.slice(i, i + TAMANO_BLOQUE);
    const resultados = await db.batch(
      bloque.map((p) =>
        sentencia.bind(
          p.organismo,
          p.juego,
          p.fecha,
          p.numero,
          p.serie,
          p.tipo,
          p.sorteo,
          p.fuente,
        ),
      ),
    );
    nuevos += resultados.reduce((suma, r) => suma + r.meta.changes, 0);
  }

  return nuevos;
}

/** Premios de un número, del sorteo más reciente al más antiguo. */
export async function buscarPremiosPorNumero(
  db: D1Database,
  numero: string,
): Promise<PremioGuardado[]> {
  const { results } = await db
    .prepare(
      `SELECT organismo, juego, fecha, serie, tipo, sorteo
       FROM premios
       WHERE numero = ?1
       ORDER BY fecha DESC, organismo, juego, tipo, serie`,
    )
    .bind(numero)
    .run<PremioGuardado>();
  return results;
}

export interface Ejecucion {
  inicio: string;
  fin: string;
  tarea: string;
  filasNuevas: number | null;
  error: string | null;
}

export async function registrarEjecucion(db: D1Database, e: Ejecucion): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ejecuciones (inicio, fin, tarea, filas_nuevas, error)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(e.inicio, e.fin, e.tarea, e.filasNuevas, e.error)
    .run();
}
