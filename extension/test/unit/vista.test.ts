import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { RespuestaConsulta } from "../../../api/src/tipos";
import { crearIndicador, fechaCorta, textoResumen } from "../../src/vista";

const PREMIADO: RespuestaConsulta = {
  numero: "16056",
  hayResultados: true,
  resultados: [
    {
      fecha: "2025-12-22",
      organismo: "LNAC",
      juego: "LN_EXTRAORDINARIO",
      juegoNombre: "Lotería Nacional (extraordinario)",
      tipo: "QUINTO",
      tipoNombre: "5º premio",
      serie: null,
      sorteo: "SORTEO EXTRAORDINARIO DE NAVIDAD",
    },
    {
      fecha: "2019-03-01",
      organismo: "ONCE",
      juego: "CUPONAZO",
      juegoNombre: "Cuponazo",
      tipo: "PRINCIPAL",
      tipoNombre: "Premio principal",
      serie: "129",
      sorteo: null,
    },
  ],
};

beforeAll(() => {
  // jsdom no implementa los diálogos modales.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

beforeEach(() => {
  document.body.replaceChildren();
});

function montar(reintentar = () => {}) {
  const indicador = crearIndicador(document, reintentar);
  document.body.append(indicador.anfitrion);
  const sombra = indicador.anfitrion.shadowRoot as ShadowRoot;
  const estado = () => sombra.querySelector<HTMLElement>("[role=status]");
  return { indicador, sombra, estado };
}

describe("textos", () => {
  it("formatea la fecha sin depender de la zona horaria", () => {
    expect(fechaCorta("2019-03-01")).toBe("01/03/2019");
  });

  it("resume cuántas veces ha salido premiado", () => {
    expect(textoResumen(PREMIADO)).toBe("El 16056 ha salido premiado 2 veces");
    expect(textoResumen({ ...PREMIADO, resultados: PREMIADO.resultados.slice(1) })).toBe(
      "El 16056 ha salido premiado 1 vez",
    );
    expect(textoResumen({ numero: "00001", hayResultados: false, resultados: [] })).toBe(
      "El 00001 nunca ha salido premiado",
    );
  });
});

describe("crearIndicador", () => {
  it("empieza oculto y se muestra al consultar", () => {
    const { indicador, estado } = montar();
    indicador.mostrar({ tipo: "oculto" });
    expect(indicador.anfitrion.hidden).toBe(true);

    indicador.mostrar({ tipo: "consultando", numero: "16056" });
    expect(indicador.anfitrion.hidden).toBe(false);
    expect(estado()?.textContent).toBe("Comprobando el 16056…");
    expect(estado()?.getAttribute("aria-live")).toBe("polite");
  });

  it("muestra un número sin premios, sin botón de detalle", () => {
    const { indicador, sombra, estado } = montar();
    indicador.mostrar({
      tipo: "resultado",
      respuesta: { numero: "00001", hayResultados: false, resultados: [] },
    });
    expect(estado()?.textContent).toBe("El 00001 nunca ha salido premiado");
    expect(estado()?.classList.contains("indicador--nuevo")).toBe(true);
    expect(sombra.querySelector("button")).toBeNull();
  });

  it("abre el detalle de premios en un diálogo", () => {
    const { indicador, sombra, estado } = montar();
    indicador.mostrar({ tipo: "resultado", respuesta: PREMIADO });
    expect(estado()?.classList.contains("indicador--premiado")).toBe(true);

    sombra.querySelector<HTMLButtonElement>(".accion")?.click();
    const dialogo = sombra.querySelector("dialog");
    expect(dialogo?.open).toBe(true);
    expect(dialogo?.querySelector("h2")?.textContent).toBe("Premios del número 16056");

    const filas = [...(dialogo?.querySelectorAll("tbody tr") ?? [])].map((fila) =>
      [...fila.querySelectorAll("td")].map((td) => td.textContent),
    );
    expect(filas).toEqual([
      [
        "22/12/2025",
        "Lotería Nacional Lotería Nacional (extraordinario)SORTEO EXTRAORDINARIO DE NAVIDAD",
        "5º premio",
        "—",
      ],
      ["01/03/2019", "ONCE Cuponazo", "Premio principal", "129"],
    ]);

    dialogo?.querySelector<HTMLButtonElement>(".cerrar")?.click();
    expect(dialogo?.open).toBe(false);
  });

  it("no interpreta como HTML los textos que vienen de la API", () => {
    const { indicador, sombra } = montar();
    const [primero] = PREMIADO.resultados;
    indicador.mostrar({
      tipo: "resultado",
      respuesta: {
        ...PREMIADO,
        resultados: [
          {
            ...(primero as (typeof PREMIADO.resultados)[number]),
            sorteo: "<img src=x onerror=alert(1)>",
          },
        ],
      },
    });
    expect(sombra.querySelector("img")).toBeNull();
    expect(sombra.querySelector(".sorteo")?.textContent).toBe("<img src=x onerror=alert(1)>");
  });

  it("ofrece reintentar si falla la consulta", () => {
    const reintentar = vi.fn();
    const { indicador, sombra, estado } = montar(reintentar);
    indicador.mostrar({ tipo: "error", numero: "16056" });

    expect(estado()?.textContent).toContain("No se ha podido comprobar el número.");
    sombra.querySelector<HTMLButtonElement>(".accion")?.click();
    expect(reintentar).toHaveBeenCalledOnce();
  });

  it("descarta el diálogo anterior al cambiar de estado", () => {
    const { indicador, sombra } = montar();
    indicador.mostrar({ tipo: "resultado", respuesta: PREMIADO });
    indicador.mostrar({ tipo: "consultando", numero: "11111" });
    expect(sombra.querySelector("dialog")).toBeNull();
  });
});
