// Modelo de dominio compartido por la API, el cron y los scripts de carga.
// Sin dependencias del runtime de Cloudflare para poder usarse también en Node.

export type Organismo = "ONCE" | "LNAC";

export type Juego =
  | "CUPON_DIARIO"
  | "CUPONAZO"
  | "SUELDAZO"
  | "CUPON_EXTRA"
  | "LN_JUEVES"
  | "LN_SABADO"
  | "LN_EXTRAORDINARIO";

export type TipoPremio =
  | "PRINCIPAL"
  | "ADICIONAL"
  | "SEGUNDO"
  | "TERCERO"
  | "CUARTO"
  | "QUINTO"
  | "MENOR";

export type Fuente = "once-historico" | "once-feed" | "lnac-api" | "volcado-2019";

export interface Premio {
  organismo: Organismo;
  juego: Juego;
  /** Fecha del sorteo en formato ISO (aaaa-mm-dd). */
  fecha: string;
  /** Exactamente cinco dígitos, con ceros a la izquierda. */
  numero: string;
  /** Serie del cupón; cadena vacía si no aplica. */
  serie: string;
  tipo: TipoPremio;
  /** Nombre del sorteo, solo para los extraordinarios (Cupón Extra y Lotería Nacional). */
  sorteo: string | null;
  fuente: Fuente;
}

/** Tareas de la actualización diaria (workflow de GitHub → `POST /admin/ingesta`). */
export const TAREAS_INGESTA = ["once-feed", "once-historico", "lnac"] as const;

/** Cuerpo de `POST /admin/ingesta`. */
export interface CargaIngesta {
  tarea: (typeof TAREAS_INGESTA)[number];
  /** Instante ISO en que empezó la recogida. */
  inicio: string;
  premios: Premio[];
  /** Error o avisos de la recogida; `null` si fue bien. */
  error: string | null;
}

export interface RespuestaIngesta {
  filasNuevas: number;
}

export const NOMBRE_JUEGO: Record<Juego, string> = {
  CUPON_DIARIO: "Cupón Diario",
  CUPONAZO: "Cuponazo",
  SUELDAZO: "Sueldazo Fin de Semana",
  CUPON_EXTRA: "Cupón Extra",
  LN_JUEVES: "Lotería Nacional (jueves)",
  LN_SABADO: "Lotería Nacional (sábado)",
  LN_EXTRAORDINARIO: "Lotería Nacional (extraordinario)",
};

export const NOMBRE_TIPO: Record<TipoPremio, string> = {
  PRINCIPAL: "Premio principal",
  ADICIONAL: "Número adicional",
  SEGUNDO: "2º premio",
  TERCERO: "3er premio",
  CUARTO: "4º premio",
  QUINTO: "5º premio",
  MENOR: "Premio menor",
};

/** Devuelve el número si tiene exactamente cinco dígitos; si no, `null`. */
export function numeroCincoCifras(valor: string): string | null {
  const limpio = valor.trim();
  return /^\d{5}$/.test(limpio) ? limpio : null;
}

/** Busca una fecha dd/mm/aaaa en el texto y la devuelve como aaaa-mm-dd si existe. */
export function fechaIsoDesdeDmy(texto: string): string | null {
  const coincidencia = /(\d{2})\/(\d{2})\/(\d{4})/.exec(texto);
  if (!coincidencia) return null;
  const [, dia, mes, anio] = coincidencia;
  const iso = `${anio}-${mes}-${dia}`;
  const fecha = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(iso) ? iso : null;
}

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  aacute: "á",
  eacute: "é",
  iacute: "í",
  oacute: "ó",
  uacute: "ú",
  Aacute: "Á",
  Eacute: "É",
  Iacute: "Í",
  Oacute: "Ó",
  Uacute: "Ú",
  ntilde: "ñ",
  Ntilde: "Ñ",
  uuml: "ü",
  Uuml: "Ü",
  ordm: "º",
  ordf: "ª",
  euro: "€",
};

/** Decodifica entidades HTML; las que no reconoce las deja tal cual. */
export function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entidad, cuerpo: string) => {
    if (cuerpo.startsWith("#")) {
      const hex = cuerpo[1] === "x" || cuerpo[1] === "X";
      const codigo = Number.parseInt(cuerpo.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : entidad;
    }
    return ENTIDADES[cuerpo] ?? entidad;
  });
}
