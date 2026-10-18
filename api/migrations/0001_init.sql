-- Premios de la ONCE y de la Lotería Nacional.
-- `serie` usa '' en lugar de NULL para que la restricción UNIQUE evite duplicados.
CREATE TABLE premios (
  id        INTEGER PRIMARY KEY,
  organismo TEXT NOT NULL CHECK (organismo IN ('ONCE', 'LNAC')),
  juego     TEXT NOT NULL,
  fecha     TEXT NOT NULL,
  numero    TEXT NOT NULL CHECK (length(numero) = 5),
  serie     TEXT NOT NULL DEFAULT '',
  tipo      TEXT NOT NULL,
  sorteo    TEXT,
  fuente    TEXT NOT NULL,
  creado    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organismo, juego, fecha, numero, serie, tipo)
);

CREATE INDEX ix_premios_numero ON premios (numero);

-- Trazabilidad de las ejecuciones del cron y de las cargas.
CREATE TABLE ejecuciones (
  id           INTEGER PRIMARY KEY,
  inicio       TEXT NOT NULL,
  fin          TEXT,
  tarea        TEXT NOT NULL,
  filas_nuevas INTEGER,
  error        TEXT
);
