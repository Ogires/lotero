// Indicador bajo el cupón y diálogo con el detalle de premios.
// Todo vive en un Shadow DOM para no heredar ni alterar los estilos de la página, y se
// construye con textContent (nunca innerHTML) para que los datos no puedan inyectar HTML.

import type { RespuestaConsulta, ResultadoConsulta } from "../../api/src/tipos";
import { ESTILOS } from "./estilos";

export type Estado =
  | { tipo: "oculto" }
  | { tipo: "consultando"; numero: string }
  | { tipo: "resultado"; respuesta: RespuestaConsulta }
  | { tipo: "error"; numero: string };

export interface Indicador {
  /** Elemento que se inserta en la página. */
  anfitrion: HTMLElement;
  mostrar(estado: Estado): void;
}

const NOMBRE_ORGANISMO = { ONCE: "ONCE", LNAC: "Lotería Nacional" } as const;

function elemento<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  etiqueta: K,
  clase?: string,
  texto?: string,
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/** "2019-03-01" → "01/03/2019", sin pasar por Date para no depender de la zona horaria. */
export function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
}

export function textoResumen(respuesta: RespuestaConsulta): string {
  const n = respuesta.resultados.length;
  if (n === 0) return `El ${respuesta.numero} nunca ha salido premiado`;
  return `El ${respuesta.numero} ha salido premiado ${n === 1 ? "1 vez" : `${n} veces`}`;
}

function filaResultado(doc: Document, r: ResultadoConsulta): HTMLTableRowElement {
  const fila = elemento(doc, "tr", `fila fila--${r.organismo.toLowerCase()}`);
  fila.append(elemento(doc, "td", "", fechaCorta(r.fecha)));

  const sorteo = elemento(doc, "td");
  sorteo.append(
    elemento(
      doc,
      "span",
      `etiqueta etiqueta--${r.organismo.toLowerCase()}`,
      NOMBRE_ORGANISMO[r.organismo],
    ),
  );
  sorteo.append(" ", r.juegoNombre);
  if (r.sorteo) sorteo.append(elemento(doc, "span", "sorteo", r.sorteo));
  fila.append(sorteo);

  fila.append(elemento(doc, "td", r.tipo === "PRINCIPAL" ? "principal" : "", r.tipoNombre));
  fila.append(elemento(doc, "td", "", r.serie ?? "—"));
  return fila;
}

function crearDialogo(doc: Document, respuesta: RespuestaConsulta): HTMLDialogElement {
  const dialogo = elemento(doc, "dialog", "dialogo");
  dialogo.setAttribute("aria-labelledby", "lotero-titulo");

  const cabecera = elemento(doc, "header");
  const titulo = elemento(doc, "h2", "", `Premios del número ${respuesta.numero}`);
  titulo.id = "lotero-titulo";
  const cerrar = elemento(doc, "button", "cerrar", "×");
  cerrar.type = "button";
  cerrar.setAttribute("aria-label", "Cerrar");
  cerrar.addEventListener("click", () => dialogo.close());
  cabecera.append(titulo, cerrar);

  const tabla = elemento(doc, "table");
  const encabezado = elemento(doc, "tr");
  for (const columna of ["Fecha", "Sorteo", "Premio", "Serie"]) {
    const th = elemento(doc, "th", "", columna);
    th.scope = "col";
    encabezado.append(th);
  }
  tabla.append(elemento(doc, "thead"), elemento(doc, "tbody"));
  tabla.tHead?.append(encabezado);
  for (const r of respuesta.resultados) tabla.tBodies[0]?.append(filaResultado(doc, r));

  const nota = elemento(
    doc,
    "p",
    "nota",
    "Lotero no está afiliado a la ONCE ni a Loterías y Apuestas del Estado. Compruebe siempre los resultados oficiales.",
  );

  const contenido = elemento(doc, "div", "contenido");
  contenido.append(tabla);
  dialogo.append(cabecera, contenido, nota);
  // Cerrar al pulsar fuera del cuadro.
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
  return dialogo;
}

export function crearIndicador(doc: Document, reintentar: () => void): Indicador {
  const anfitrion = elemento(doc, "div");
  anfitrion.dataset.lotero = "";
  anfitrion.hidden = true;
  const sombra = anfitrion.attachShadow({ mode: "open" });

  const estilos = elemento(doc, "style", "", ESTILOS);
  const estado = elemento(doc, "div", "indicador");
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");
  sombra.append(estilos, estado);

  let dialogo: HTMLDialogElement | null = null;

  function mostrar(nuevo: Estado): void {
    dialogo?.remove();
    dialogo = null;
    estado.replaceChildren();
    estado.className = `indicador indicador--${nuevo.tipo}`;
    anfitrion.hidden = nuevo.tipo === "oculto";

    switch (nuevo.tipo) {
      case "oculto":
        return;
      case "consultando":
        estado.append(elemento(doc, "span", "texto", `Comprobando el ${nuevo.numero}…`));
        return;
      case "error": {
        estado.append(elemento(doc, "span", "texto", "No se ha podido comprobar el número."));
        const boton = elemento(doc, "button", "accion", "Reintentar");
        boton.type = "button";
        boton.addEventListener("click", reintentar);
        estado.append(boton);
        return;
      }
      case "resultado": {
        const { respuesta } = nuevo;
        estado.classList.add(respuesta.hayResultados ? "indicador--premiado" : "indicador--nuevo");
        estado.append(elemento(doc, "span", "texto", textoResumen(respuesta)));
        if (!respuesta.hayResultados) return;

        const abrir = elemento(doc, "button", "accion", "Ver premios");
        abrir.type = "button";
        const creado = crearDialogo(doc, respuesta);
        dialogo = creado;
        abrir.addEventListener("click", () => creado.showModal());
        estado.append(abrir);
        sombra.append(creado);
        return;
      }
    }
  }

  return { anfitrion, mostrar };
}
