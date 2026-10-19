// Caso de uso: ¿ha salido premiado este número alguna vez?

import { buscarPremiosPorNumero } from "./db";
import { NOMBRE_JUEGO, NOMBRE_TIPO, type RespuestaConsulta } from "./tipos";

export type { RespuestaConsulta, ResultadoConsulta } from "./tipos";

export async function consultarNumero(db: D1Database, numero: string): Promise<RespuestaConsulta> {
  const premios = await buscarPremiosPorNumero(db, numero);
  return {
    numero,
    hayResultados: premios.length > 0,
    resultados: premios.map((p) => ({
      fecha: p.fecha,
      organismo: p.organismo,
      juego: p.juego,
      juegoNombre: NOMBRE_JUEGO[p.juego],
      tipo: p.tipo,
      tipoNombre: NOMBRE_TIPO[p.tipo],
      serie: p.serie === "" ? null : p.serie,
      sorteo: p.sorteo,
    })),
  };
}
