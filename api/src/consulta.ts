// Caso de uso: ¿ha salido premiado este número alguna vez?

import { buscarPremiosPorNumero } from "./db";
import { type Juego, NOMBRE_JUEGO, NOMBRE_TIPO, type Organismo, type TipoPremio } from "./tipos";

export interface ResultadoConsulta {
  fecha: string;
  organismo: Organismo;
  juego: Juego;
  juegoNombre: string;
  tipo: TipoPremio;
  tipoNombre: string;
  serie: string | null;
  sorteo: string | null;
}

export interface RespuestaConsulta {
  numero: string;
  hayResultados: boolean;
  resultados: ResultadoConsulta[];
}

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
